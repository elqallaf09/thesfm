import { NextResponse } from 'next/server';
import { normalizeAssetType } from '@/lib/market/marketService';
import { normalizeShariahStatus, SHARIAH_STATUSES, type ShariahStatus } from '@/lib/market/shariah-screening';
import { computeShariahCounts } from '@/lib/market/shariahAdminCatalog';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminJson(payload: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(payload, { ...init, headers });
}

function cleanText(value: unknown, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function validateStatus(value: unknown): ShariahStatus | null {
  const status = normalizeShariahStatus(value, null);
  return status && SHARIAH_STATUSES.includes(status) ? status : null;
}

function reviewedAtValue(value: unknown) {
  const text = cleanText(value, 64);
  if (!text) return new Date().toISOString();
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard');
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const q = cleanText(searchParams.get('q') ?? searchParams.get('query'), 80);
  const limit = cleanLimit(searchParams.get('limit'));

  let query = auth.admin
    .from('market_symbols')
    .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (q) {
    const like = `%${q.replace(/[%,]/g, '')}%`;
    query = query.or(`symbol.ilike.${like},display_symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},company_name_ar.ilike.${like},company_name_en.ilike.${like}`);
  }

  const [{ data, error }, counts] = await Promise.all([
    query,
    computeShariahCounts(auth.admin),
  ]);
  if (error) {
    return adminJson({ ok: false, code: 'LOAD_FAILED', message: error.message }, { status: 500 });
  }

  return adminJson({ ok: true, items: data ?? [], counts });
}

async function saveOverride(request: Request) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard');
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, { status: auth.status });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return adminJson({ ok: false, code: 'INVALID_JSON' }, { status: 400 });

  const symbol = cleanText(body.symbol, 32).toUpperCase();
  const exchange = cleanText(body.exchange, 64) || null;
  const status = validateStatus(body.status ?? body.shariahStatus ?? body.shariah_status);
  const reviewedAt = reviewedAtValue(body.reviewedAt ?? body.shariahLastReviewedAt ?? body.shariah_last_reviewed_at);
  if (!symbol) return adminJson({ ok: false, code: 'SYMBOL_REQUIRED' }, { status: 400 });
  if (!status) return adminJson({ ok: false, code: 'INVALID_STATUS' }, { status: 400 });
  if (!reviewedAt) return adminJson({ ok: false, code: 'INVALID_REVIEW_DATE' }, { status: 400 });

  const reviewedBy = cleanText(body.reviewedBy ?? body.shariahReviewedBy, 160)
    || auth.access.email
    || auth.user.email
    || auth.user.id;
  const reason = cleanText(body.reason ?? body.shariahReason, 1000) || null;
  const source = cleanText(body.source ?? body.shariahSource, 240) || 'manual_admin_review';
  const screeningData = body.screeningData && typeof body.screeningData === 'object' && !Array.isArray(body.screeningData)
    ? body.screeningData as Record<string, unknown>
    : {};
  const audit = {
    ...screeningData,
    manualOverride: {
      updatedAt: new Date().toISOString(),
      reviewedAt,
      reviewedBy,
      reviewerUserId: auth.user.id,
      reviewerEmail: auth.user.email ?? auth.access.email,
    },
  };

  let lookup = auth.admin
    .from('market_symbols')
    .select('id,symbol,exchange')
    .eq('symbol', symbol)
    .limit(1);
  if (exchange) lookup = lookup.eq('exchange', exchange);
  const existing = await lookup.maybeSingle();
  if (existing.error && existing.error.code !== 'PGRST116') {
    return adminJson({ ok: false, code: 'LOOKUP_FAILED', message: existing.error.message }, { status: 500 });
  }

  const patch = {
    shariah_status: status,
    shariah_reason: reason,
    shariah_source: source,
    shariah_last_reviewed_at: reviewedAt,
    shariah_manual_override: true,
    shariah_reviewed_by: reviewedBy,
    shariah_screening_data: audit,
    updated_at: new Date().toISOString(),
  };

  const result = existing.data?.id
    ? await auth.admin
        .from('market_symbols')
        .update(patch)
        .eq('id', existing.data.id)
        .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,updated_at')
        .single()
    : await auth.admin
        .from('market_symbols')
        .insert({
          symbol,
          provider_symbol: cleanText(body.providerSymbol ?? body.provider_symbol, 48).toUpperCase() || symbol,
          name: cleanText(body.name, 240) || symbol,
          asset_type: normalizeAssetType(body.assetType ?? body.asset_type),
          exchange,
          country: cleanText(body.country, 80) || null,
          currency: cleanText(body.currency, 12).toUpperCase() || null,
          source: 'manual_admin_seed',
          is_active: true,
          ...patch,
        })
        .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,updated_at')
        .single();

  if (result.error) {
    return adminJson({ ok: false, code: 'SAVE_FAILED', message: result.error.message }, { status: 500 });
  }

  return adminJson({ ok: true, item: result.data });
}

export async function POST(request: Request) {
  return saveOverride(request);
}

export async function PATCH(request: Request) {
  return saveOverride(request);
}

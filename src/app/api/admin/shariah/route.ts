import { normalizeAssetType } from '@/lib/market/marketService';
import { normalizeShariahStatus, SHARIAH_STATUSES, type ShariahStatus } from '@/lib/market/shariah-screening';
import { computeShariahCounts } from '@/lib/market/shariahAdminCatalog';
import { createAdminApiRoute, type AdminApiContext } from '@/lib/server/adminApiRoute';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export const GET = createAdminApiRoute({
  permission: 'admin_dashboard',
  rateLimit: { max: 60, windowMs: 60_000, prefix: 'admin-shariah-read' },
}, async ({ request, auth, json }) => {
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
    console.error('[admin-shariah] load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return json({ ok: true, items: data ?? [], counts });
});

async function saveOverride({ request, auth, json }: AdminApiContext) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });

  const symbol = cleanText(body.symbol, 32).toUpperCase();
  const exchange = cleanText(body.exchange, 64) || null;
  const status = validateStatus(body.status ?? body.shariahStatus ?? body.shariah_status);
  const reviewedAt = reviewedAtValue(body.reviewedAt ?? body.shariahLastReviewedAt ?? body.shariah_last_reviewed_at);
  if (!symbol) return json({ ok: false, code: 'SYMBOL_REQUIRED' }, { status: 400 });
  if (!status) return json({ ok: false, code: 'INVALID_STATUS' }, { status: 400 });
  if (!reviewedAt) return json({ ok: false, code: 'INVALID_REVIEW_DATE' }, { status: 400 });

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
    console.error('[admin-shariah] lookup failed', { code: existing.error.code, message: existing.error.message });
    return json({ ok: false, code: 'LOOKUP_FAILED' }, { status: 500 });
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
    console.error('[admin-shariah] save failed', { code: result.error.code, message: result.error.message });
    return json({ ok: false, code: 'SAVE_FAILED' }, { status: 500 });
  }

  return json({ ok: true, item: result.data });
}

const writeOptions = {
  permission: 'admin_dashboard' as const,
  rateLimit: { max: 30, windowMs: 60_000, prefix: 'admin-shariah-write' },
};

export const POST = createAdminApiRoute(writeOptions, saveOverride);
export const PATCH = createAdminApiRoute(writeOptions, saveOverride);

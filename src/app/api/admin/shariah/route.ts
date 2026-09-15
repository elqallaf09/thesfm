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
  if (!value?.trim()) return 50;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

function validateStatus(value: unknown): ShariahStatus | null {
  if (value === 'unclassified') return 'unclassified';
  const status = normalizeShariahStatus(value, null);
  return status && SHARIAH_STATUSES.includes(status) ? status : null;
}

function reviewedAtValue(value: unknown) {
  const text = cleanText(value, 64);
  if (!text) return new Date().toISOString();
  const date = new Date(text);
  return Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000 ? null : date.toISOString();
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
    .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,shariah_refresh_error,shariah_next_refresh_at,updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (q) {
    const like = `%${q.replace(/[^\p{L}\p{N}. _-]/gu, '')}%`;
    query = query.or(`symbol.ilike.${like},display_symbol.ilike.${like},provider_symbol.ilike.${like},name.ilike.${like},company_name_ar.ilike.${like},company_name_en.ilike.${like}`);
  }

  const [rows, countsResult, diagnosticsResult] = await Promise.allSettled([
    query.abortSignal(AbortSignal.timeout(8_000)),
    computeShariahCounts(auth.admin),
    auth.admin.from('shariah_refresh_runs').select('id,status,finished_at,result').order('started_at', { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(5_000)).maybeSingle(),
  ]);
  if (rows.status !== 'fulfilled' || rows.value.error) {
    console.error('[admin-shariah] load failed', { code: 'CATALOG_ROWS_UNAVAILABLE' });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 503 });
  }
  // Counts and diagnostics are optional metadata: their failure must not hide
  // successfully persisted symbol results or fail the entire page refresh.
  const counts = countsResult.status === 'fulfilled' ? countsResult.value : null;
  const countsError = countsResult.status === 'rejected' ? 'SHARIAH_COUNTS_UNAVAILABLE' : null;
  const diagnostics = diagnosticsResult.status === 'fulfilled' ? diagnosticsResult.value : null;
  if (countsError) console.warn('[admin-shariah] counts unavailable', { code: countsError });
  return json({ ok: true, items: rows.value.data ?? [], counts, countsError,
    lastRun: diagnostics?.data ?? null,
    diagnosticsError: !diagnostics || diagnostics.error ? 'REFRESH_DIAGNOSTICS_UNAVAILABLE' : null });
});

async function saveOverride({ request, auth, json }: AdminApiContext) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, code: 'INVALID_ORIGIN' }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ ok: false, code: 'INVALID_JSON' }, { status: 400 });

  const symbol = cleanText(body.symbol, 32).toUpperCase();
  const exchange = cleanText(body.exchange, 64) || null;
  const status = validateStatus(body.status ?? body.shariahStatus ?? body.shariah_status);
  const reviewedAt = reviewedAtValue(body.reviewedAt ?? body.shariahLastReviewedAt ?? body.shariah_last_reviewed_at);
  if (!symbol) return json({ ok: false, code: 'SYMBOL_REQUIRED' }, { status: 400 });
  if (!status) return json({ ok: false, code: 'INVALID_STATUS' }, { status: 400 });
  if (!reviewedAt) return json({ ok: false, code: 'INVALID_REVIEW_DATE' }, { status: 400 });

  const reviewedBy = auth.access.email
    || auth.user.email
    || auth.user.id;
  const reason = cleanText(body.reason ?? body.shariahReason, 1000) || null;
  const source = cleanText(body.source ?? body.shariahSource, 240) || 'manual_admin_review';
  if (['compliant', 'non_compliant'].includes(status) && (!reason || source === 'manual_admin_review')) {
    return json({ ok: false, code: 'REASON_AND_SOURCE_REQUIRED' }, { status: 400 });
  }
  const screeningData = {};
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
    .select('id,symbol,exchange,shariah_screening_data')
    .eq('symbol', symbol)
    .limit(2);
  if (exchange) lookup = lookup.eq('exchange', exchange);
  const lookupResult = await lookup;
  if ((lookupResult.data?.length ?? 0) > 1) return json({ ok: false, code: 'EXCHANGE_REQUIRED' }, { status: 409 });
  const existing = { data: lookupResult.data?.[0], error: lookupResult.error };
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
    shariah_screening_data: { ...(existing.data?.shariah_screening_data ?? {}), ...audit },
    updated_at: new Date().toISOString(),
  };

  const result = existing.data?.id
    ? await auth.admin
        .from('market_symbols')
        .update(patch)
        .eq('id', existing.data.id)
        .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,shariah_refresh_error,shariah_next_refresh_at,updated_at')
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
        .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data,shariah_refresh_error,shariah_next_refresh_at,updated_at')
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

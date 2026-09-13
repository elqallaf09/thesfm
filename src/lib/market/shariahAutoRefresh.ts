import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classifyShariahCompliance,
  getExternalShariahProviderConfig,
  normalizeShariahStatus,
  type ShariahClassification,
  type ShariahScreeningData,
  type ShariahStatus,
} from '@/lib/market/shariah-screening';

type MarketSymbolRow = {
  id: string;
  symbol: string;
  display_symbol?: string | null;
  provider_symbol?: string | null;
  name?: string | null;
  company_name_ar?: string | null;
  company_name_en?: string | null;
  asset_type?: string | null;
  exchange?: string | null;
  country?: string | null;
  currency?: string | null;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  shariah_status?: string | null;
  shariah_reason?: string | null;
  shariah_source?: string | null;
  shariah_last_reviewed_at?: string | null;
  shariah_manual_override?: boolean | null;
  shariah_reviewed_by?: string | null;
  shariah_screening_data?: ShariahScreeningData | null;
};

type ZoyaReport = {
  symbol?: string | null;
  rawSymbol?: string | null;
  name?: string | null;
  exchange?: string | null;
  status?: string | null;
  reportDate?: string | null;
  purificationRatio?: number | null;
  businessScreen?: string | null;
  financialScreen?: string | null;
  compliantRevenue?: number | null;
  nonCompliantRevenue?: number | null;
  questionableRevenue?: number | null;
};

type ProviderResult = {
  classification: ShariahClassification | null;
  provider: string | null;
  attempted: boolean;
  reason: string | null;
};

export type ShariahRefreshResult = {
  ok: boolean;
  scanned: number;
  updated: number;
  external: number;
  internal: number;
  skippedManual: number;
  failed: Array<{ symbol: string; reason: string }>;
  provider: string | null;
  providerConfigured: boolean;
};

const DEFAULT_REFRESH_LIMIT = 50;
const MAX_REFRESH_LIMIT = 100;
const DEFAULT_STALE_HOURS = 24;
const ZOYA_LIVE_URL = 'https://api.zoya.finance/graphql';

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_REFRESH_LIMIT;
  return Math.min(MAX_REFRESH_LIMIT, Math.max(1, Math.trunc(parsed)));
}

function staleHours() {
  const parsed = Number(process.env.SHARIAH_REFRESH_STALE_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALE_HOURS;
}

function isStale(row: MarketSymbolRow, force: boolean) {
  if (force) return true;
  if (!row.shariah_last_reviewed_at) return true;
  const reviewed = new Date(row.shariah_last_reviewed_at).getTime();
  if (!Number.isFinite(reviewed)) return true;
  return Date.now() - reviewed >= staleHours() * 60 * 60 * 1000;
}

function providerConfig() {
  const generic = getExternalShariahProviderConfig();
  const provider = cleanText(process.env.SHARIAH_SCREENING_PROVIDER || generic.provider || (process.env.ZOYA_API_KEY ? 'zoya' : ''));
  const apiKey = cleanText(process.env.ZOYA_API_KEY || process.env.SHARIAH_SCREENING_API_KEY);
  const baseUrl = cleanText(process.env.ZOYA_API_URL || process.env.SHARIAH_SCREENING_BASE_URL || (provider.toLowerCase() === 'zoya' ? ZOYA_LIVE_URL : ''));
  const sandbox = /^sandbox-/i.test(apiKey) || /sandbox-api\.zoya\.finance/i.test(baseUrl);
  return {
    provider: provider || null,
    apiKey: apiKey || null,
    baseUrl: baseUrl || null,
    configured: Boolean(provider && apiKey && baseUrl && !sandbox),
    sandbox,
  };
}

function isUsSecurity(row: MarketSymbolRow) {
  const country = cleanText(row.country).toUpperCase();
  const exchange = cleanText(row.exchange).toUpperCase();
  if (['US', 'USA', 'UNITED STATES'].includes(country)) return true;
  return /(NASDAQ|NYSE|AMEX|ARCA|BATS|IEX)/.test(exchange);
}

function zoyaStatus(value: unknown): ShariahStatus {
  const raw = cleanText(value).toUpperCase();
  if (raw === 'QUESTIONABLE') return 'needs_review';
  if (raw === 'UNRATED') return 'unclassified';
  return normalizeShariahStatus(raw, 'unclassified') ?? 'unclassified';
}

function zoyaClassification(report: ZoyaReport, row: MarketSymbolRow): ShariahClassification {
  const status = zoyaStatus(report.status);
  const reportDate = cleanText(report.reportDate) || new Date().toISOString();
  const screeningData: ShariahScreeningData = {
    ...(row.shariah_screening_data ?? {}),
    provider: 'zoya',
    methodology: 'AAOIFI',
    providerSymbol: cleanText(report.symbol || report.rawSymbol || row.provider_symbol || row.symbol),
    providerExchange: cleanText(report.exchange) || null,
    providerStatus: cleanText(report.status) || null,
    purificationRatio: finiteNumber(report.purificationRatio),
    businessScreen: cleanText(report.businessScreen) || null,
    financialScreen: cleanText(report.financialScreen) || null,
    compliantRevenue: finiteNumber(report.compliantRevenue),
    nonCompliantRevenue: finiteNumber(report.nonCompliantRevenue),
    questionableRevenue: finiteNumber(report.questionableRevenue),
    fetchedAt: new Date().toISOString(),
  };

  const reason = status === 'compliant'
    ? 'Zoya AAOIFI screening reports this security as Shariah-compliant.'
    : status === 'non_compliant'
      ? 'Zoya AAOIFI screening reports this security as not Shariah-compliant.'
      : status === 'needs_review'
        ? 'Zoya AAOIFI screening reports this security as questionable and requiring review.'
        : 'Zoya does not currently provide a definitive Shariah rating for this security.';

  return {
    shariahStatus: status,
    shariahReason: reason,
    shariahSource: 'Zoya AAOIFI API',
    shariahLastReviewedAt: reportDate,
    shariahManualOverride: false,
    shariahReviewedBy: 'automatic:zoya',
    shariahScreeningData: screeningData,
    shariahMethod: 'external_provider',
  };
}

async function postZoya(row: MarketSymbolRow, apiKey: string, baseUrl: string): Promise<ZoyaReport | null> {
  const symbol = cleanText(row.provider_symbol || row.display_symbol || row.symbol).toUpperCase();
  const basic = isUsSecurity(row);
  const query = basic
    ? `query GetBasicCompliance($symbol: String!) {\n  basicCompliance {\n    report(symbol: $symbol) {\n      symbol\n      name\n      exchange\n      status\n      purificationRatio\n      reportDate\n    }\n  }\n}`
    : `query GetAdvancedCompliance($symbol: String!) {\n  advancedCompliance {\n    report(input: { symbol: $symbol, methodology: AAOIFI }) {\n      symbol\n      rawSymbol\n      name\n      exchange\n      status\n      reportDate\n      businessScreen\n      financialScreen\n      compliantRevenue\n      nonCompliantRevenue\n      questionableRevenue\n    }\n  }\n}`;

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { symbol } }),
    cache: 'no-store',
    signal: AbortSignal.timeout(9_000),
  });

  if (!response.ok) throw new Error(`zoya_http_${response.status}`);
  const payload = await response.json().catch(() => null) as {
    data?: {
      basicCompliance?: { report?: ZoyaReport | null } | null;
      advancedCompliance?: { report?: ZoyaReport | null } | null;
    } | null;
    errors?: Array<{ message?: string }>;
  } | null;

  if (!payload) throw new Error('zoya_invalid_json');
  const report = basic ? payload.data?.basicCompliance?.report : payload.data?.advancedCompliance?.report;
  if (report) return report;
  if (payload.errors?.length) throw new Error('zoya_graphql_error');
  return null;
}

export async function fetchExternalShariahClassification(row: MarketSymbolRow): Promise<ProviderResult> {
  const config = providerConfig();
  if (config.sandbox) {
    return { classification: null, provider: config.provider, attempted: false, reason: 'sandbox_provider_not_allowed' };
  }
  if (!config.configured || !config.apiKey || !config.baseUrl || !config.provider) {
    return { classification: null, provider: config.provider, attempted: false, reason: 'provider_not_configured' };
  }
  if (config.provider.toLowerCase() !== 'zoya') {
    return { classification: null, provider: config.provider, attempted: false, reason: 'unsupported_provider' };
  }

  try {
    const report = await postZoya(row, config.apiKey, config.baseUrl);
    return {
      classification: report ? zoyaClassification(report, row) : null,
      provider: config.provider,
      attempted: true,
      reason: report ? null : 'provider_no_report',
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'provider_request_failed';
    return { classification: null, provider: config.provider, attempted: true, reason };
  }
}

function internalClassification(row: MarketSymbolRow, providerReason: string | null): ShariahClassification {
  const classification = classifyShariahCompliance({
    symbol: row.symbol,
    name: row.company_name_en || row.name || row.company_name_ar || row.symbol,
    assetType: row.asset_type,
    exchange: row.exchange,
    country: row.country,
    sector: row.sector,
    industry: row.industry,
    businessDescription: row.description,
    shariahScreeningData: row.shariah_screening_data,
  });
  const now = new Date().toISOString();
  return {
    ...classification,
    shariahLastReviewedAt: now,
    shariahReviewedBy: 'automatic:internal',
    shariahScreeningData: {
      ...classification.shariahScreeningData,
      automaticRefresh: {
        reviewedAt: now,
        providerFallbackReason: providerReason,
      },
    },
  };
}

async function refreshOne(admin: SupabaseClient, row: MarketSymbolRow) {
  if (row.shariah_manual_override) return { kind: 'manual' as const };

  const external = await fetchExternalShariahClassification(row);
  const classification = external.classification ?? internalClassification(row, external.reason);
  const reviewedAt = classification.shariahLastReviewedAt || new Date().toISOString();
  const { error } = await admin
    .from('market_symbols')
    .update({
      shariah_status: classification.shariahStatus,
      shariah_reason: classification.shariahReason,
      shariah_source: classification.shariahSource,
      shariah_last_reviewed_at: reviewedAt,
      shariah_manual_override: false,
      shariah_reviewed_by: classification.shariahReviewedBy,
      shariah_screening_data: classification.shariahScreeningData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('shariah_manual_override', false);

  if (error) throw new Error(`db_update_${error.code || 'failed'}`);
  return { kind: external.classification ? 'external' as const : 'internal' as const };
}

export async function refreshShariahClassifications(
  admin: SupabaseClient,
  options: { limit?: number; force?: boolean } = {},
): Promise<ShariahRefreshResult> {
  const limit = clampLimit(options.limit);
  const force = options.force === true;
  const config = providerConfig();
  const fetchLimit = Math.min(MAX_REFRESH_LIMIT * 3, Math.max(limit, limit * 3));
  const { data, error } = await admin
    .from('market_symbols')
    .select('id,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,exchange,country,currency,sector,industry,description,shariah_status,shariah_reason,shariah_source,shariah_last_reviewed_at,shariah_manual_override,shariah_reviewed_by,shariah_screening_data')
    .eq('is_active', true)
    .in('asset_type', ['stock', 'etf'])
    .order('shariah_last_reviewed_at', { ascending: true, nullsFirst: true })
    .limit(fetchLimit);

  if (error) {
    return {
      ok: false,
      scanned: 0,
      updated: 0,
      external: 0,
      internal: 0,
      skippedManual: 0,
      failed: [{ symbol: 'market_symbols', reason: `load_${error.code || 'failed'}` }],
      provider: config.provider,
      providerConfigured: config.configured,
    };
  }

  const candidates = ((data ?? []) as MarketSymbolRow[])
    .filter(row => !row.shariah_manual_override && isStale(row, force))
    .slice(0, limit);

  let external = 0;
  let internal = 0;
  let skippedManual = 0;
  const failed: Array<{ symbol: string; reason: string }> = [];

  for (let index = 0; index < candidates.length; index += 3) {
    const chunk = candidates.slice(index, index + 3);
    const results = await Promise.allSettled(chunk.map(row => refreshOne(admin, row)));
    results.forEach((result, offset) => {
      const row = chunk[offset];
      if (result.status === 'rejected') {
        failed.push({ symbol: row.symbol, reason: result.reason instanceof Error ? result.reason.message : 'refresh_failed' });
        return;
      }
      if (result.value.kind === 'external') external += 1;
      if (result.value.kind === 'internal') internal += 1;
      if (result.value.kind === 'manual') skippedManual += 1;
    });
    if (index + 3 < candidates.length) await new Promise(resolve => setTimeout(resolve, 175));
  }

  return {
    ok: failed.length === 0,
    scanned: candidates.length,
    updated: external + internal,
    external,
    internal,
    skippedManual,
    failed,
    provider: config.provider,
    providerConfigured: config.configured,
  };
}

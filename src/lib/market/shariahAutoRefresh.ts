import type { SupabaseClient } from '@supabase/supabase-js';
import {
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

const ZOYA_LIVE_URL = 'https://api.zoya.finance/graphql';

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

  if (baseUrl !== ZOYA_LIVE_URL) throw new Error('unapproved_provider_endpoint');
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

/** Deprecated entry point delegates to the single source-validated worker. */
export async function refreshShariahClassifications(admin: SupabaseClient, options: { limit?: number; force?: boolean } = {}) {
  const { refreshSfmShariahClassifications } = await import('./shariahSelfScreening');
  return refreshSfmShariahClassifications(admin, options);
}

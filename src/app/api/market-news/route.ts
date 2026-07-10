import { NextRequest, NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type {
  ConsolidatedNewsStory,
  FinancialEventType,
  FinancialAssetType,
  ExpectedImpact,
  NewsFetchParams,
  NewsSentiment,
  NewsSourceType,
  VerificationStatus,
} from '@/lib/market-news/types';
import { EXPECTED_IMPACTS, FINANCIAL_ASSET_TYPES, NEWS_SENTIMENTS, VERIFICATION_STATUSES } from '@/lib/market-news/types';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems } from '@/lib/translation/translateNewsText';
import { checkRateLimit, getClientIp, rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=600',
};
const UNAVAILABLE_HEADERS = {
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300',
};
const MAX_QUERY_LENGTH = 180;
const MAX_FILTER_VALUES = 24;
const MAX_RANGE_DAYS = 90;

const EVENT_TYPES = new Set<FinancialEventType>([
  'unknown', 'earnings_results', 'earnings_guidance', 'dividend_announcement', 'dividend_cancellation',
  'merger_acquisition', 'acquisition_offer', 'ipo_listing', 'delisting', 'trading_suspension',
  'regulatory_action', 'lawsuit_legal_decision', 'credit_rating_change', 'debt_issuance', 'capital_increase',
  'share_buyback', 'insider_transaction', 'management_change', 'major_contract', 'product_launch',
  'cybersecurity_incident', 'operational_disruption', 'bankruptcy_restructuring', 'analyst_rating_change',
  'macroeconomic_release', 'interest_rate_decision', 'inflation_report', 'employment_report',
  'commodity_price_event', 'currency_event', 'geopolitical_event', 'exchange_announcement',
  'shariah_classification_update', 'other_material_event',
]);

const SOURCE_TYPES = new Set<NewsSourceType>([
  'official_exchange', 'regulator', 'central_bank', 'government_agency', 'regulatory_filing', 'company_ir',
  'corporate_press_release', 'financial_news_agency', 'financial_publication', 'market_data_provider',
  'regional_market_publication', 'industry_publication', 'public_rss', 'social_signal', 'other',
]);

function integer(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

function cleanText(value: string | null, max = 80) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(searchParams: URLSearchParams, keys: string[], maxLength = 80) {
  const values = keys.flatMap(key => searchParams.getAll(key).flatMap(value => value.split(',')));
  return [...new Set(values.map(value => cleanText(value, maxLength)).filter(Boolean))].slice(0, MAX_FILTER_VALUES);
}

function symbolList(searchParams: URLSearchParams) {
  return list(searchParams, ['symbol', 'symbols', 'selectedSymbols', 'watchSymbols'], 32)
    .map(value => value.toUpperCase())
    .filter(value => /^[A-Z0-9._:\-=^]{1,32}$/.test(value));
}

function dateOnly(value: string | null) {
  const clean = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const parsed = new Date(`${clean}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : clean;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function parseRange(searchParams: URLSearchParams) {
  const defaults = defaultRange();
  const from = searchParams.has('from') ? dateOnly(searchParams.get('from')) : defaults.from;
  const to = searchParams.has('to') ? dateOnly(searchParams.get('to')) : defaults.to;
  if (!from || !to) return null;
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  if (end < start || (end - start) / 86400000 > MAX_RANGE_DAYS) return null;
  return { from, to };
}

function parseSort(value: string | null): 'latest' | 'importance' | 'official' | 'relevance' {
  return value === 'importance' || value === 'official' || value === 'relevance' ? value : 'latest';
}

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true' || value === 'yes';
}

function toUiStory(story: ConsolidatedNewsStory & Record<string, unknown>) {
  const supportingSources = Array.isArray(story.supportingSources)
    ? story.supportingSources.map(source => {
      const row = source as Record<string, unknown>;
      return {
        sourceName: String(row.sourceName ?? ''),
        sourceDomain: row.sourceDomain ? String(row.sourceDomain) : null,
        originalUrl: String(row.originalUrl ?? ''),
        publishedAt: String(row.publishedAt ?? ''),
        isOfficial: row.isOfficial === true,
        reliabilityScore: typeof row.reliabilityScore === 'number' ? row.reliabilityScore : null,
      };
    })
    : [];
  return {
    id: story.id,
    title: story.title,
    headline: story.title,
    summary: story.summary,
    description: story.summary,
    originalLanguage: story.originalLanguage,
    sourceId: story.sourceId,
    sourceName: story.sourceName,
    source: story.sourceName,
    sourceType: story.sourceType,
    sourceDomain: story.sourceDomain,
    sourceReliability: story.sourceReliability,
    isOfficial: story.isOfficial,
    publishedAt: story.publishedAt,
    published_at: story.publishedAt,
    updatedAt: story.updatedAt,
    earliestPublishedAt: story.earliestPublishedAt,
    latestUpdatedAt: story.latestUpdatedAt,
    originalUrl: story.originalUrl,
    url: story.originalUrl,
    canonicalUrl: story.canonicalUrl,
    marketCodes: story.marketCodes,
    exchangeCodes: story.exchangeCodes,
    countries: story.countries,
    sectors: story.sectors,
    industries: story.industries,
    symbols: story.symbols,
    relatedSymbols: story.symbols,
    companyNames: story.companyNames,
    assetTypes: story.assetTypes,
    currencies: story.currencies,
    eventType: story.eventType,
    category: story.eventType,
    relevanceScore: story.relevanceScore,
    importanceScore: story.importanceScore,
    entityConfidenceScore: story.entityConfidenceScore,
    confidenceScore: story.confidenceScore,
    sentiment: story.sentiment,
    expectedImpact: story.expectedImpact,
    impact: story.expectedImpact,
    impactDirection: story.impactDirection,
    impactHorizon: story.impactHorizon,
    impactReason: story.impactReason,
    verificationStatus: story.verificationStatus,
    corroboratingSourceCount: story.corroboratingSourceCount,
    independentSourceCount: story.independentSourceCount,
    supportingSources,
    conflictSummary: story.conflictSummary ?? null,
    whyItMatters: story.whyItMatters ?? null,
  };
}

async function translatedStories(items: Array<ConsolidatedNewsStory & Record<string, unknown>>, language: 'ar' | 'en' | 'fr') {
  if (!isNewsTranslationEnabled()) return items;
  const translated = await translateNewsItems(items.map(item => ({
    ...item,
    source: item.sourceName,
    url: item.originalUrl,
    headline: item.title,
    summary: item.summary ?? '',
    titleOriginal: item.title,
    summaryOriginal: item.summary ?? item.title,
    languageOriginal: item.originalLanguage,
  })), language);
  return translated as unknown as Array<ConsolidatedNewsStory & Record<string, unknown>>;
}

function invalidRequest() {
  return NextResponse.json({
    ok: false,
    success: false,
    code: 'NEWS_INVALID_REQUEST',
    items: [],
    stories: [],
    total: 0,
  }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 60, windowMs: 60_000, prefix: 'market-news' });
  if (limited) return limited;

  const searchParams = request.nextUrl.searchParams;
  const query = cleanText(searchParams.get('q') ?? searchParams.get('search'), MAX_QUERY_LENGTH);
  const scope = cleanText(searchParams.get('scope') || 'general', 16);
  const range = parseRange(searchParams);
  const symbols = symbolList(searchParams);
  if (!range || !['general', 'market', 'asset'].includes(scope) || (scope === 'asset' && symbols.length === 0)) return invalidRequest();

  const refreshRequested = searchParams.has('refresh');
  if (refreshRequested && !checkRateLimit(getClientIp(request), { max: 8, windowMs: 60_000, prefix: 'market-news-refresh' })) {
    return NextResponse.json({ ok: false, success: false, code: 'NEWS_REFRESH_RATE_LIMITED', items: [], stories: [] }, {
      status: 429,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '60' },
    });
  }

  const page = integer(searchParams.get('page'), 1, 1, 10_000);
  const pageSize = integer(searchParams.get('limit') ?? searchParams.get('pageSize'), 24, 1, 60);
  const language = normalizeNewsLanguage(searchParams.get('lang') ?? searchParams.get('language'));
  const eventTypes = list(searchParams, ['eventType', 'eventTypes'], 48).filter((value): value is FinancialEventType => EVENT_TYPES.has(value as FinancialEventType));
  const sourceTypes = list(searchParams, ['sourceType', 'sourceTypes'], 48).filter((value): value is NewsSourceType => SOURCE_TYPES.has(value as NewsSourceType));
  const verificationStatuses = list(searchParams, ['verification', 'verificationStatus', 'verificationStatuses'], 32)
    .filter((value): value is VerificationStatus => (VERIFICATION_STATUSES as readonly string[]).includes(value));
  const impactLevels = list(searchParams, ['impact', 'impactLevel', 'impactLevels'], 24)
    .filter((value): value is ExpectedImpact => (EXPECTED_IMPACTS as readonly string[]).includes(value));
  const sentiments = list(searchParams, ['sentiment', 'sentiments'], 24)
    .filter((value): value is NewsSentiment => (NEWS_SENTIMENTS as readonly string[]).includes(value));
  const sourceLanguages = list(searchParams, ['sourceLanguage', 'sourceLanguages'], 12)
    .map(value => value.toLowerCase()).filter(value => /^[a-z]{2,8}$/.test(value));
  const isins = list(searchParams, ['isin', 'isins'], 20).map(value => value.toUpperCase())
    .filter(value => /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(value));
  const indexCodes = list(searchParams, ['index', 'indexCode', 'indexCodes'], 32);
  const commodities = list(searchParams, ['commodity', 'commodities'], 60);
  const companyNames = list(searchParams, ['company', 'companyName'], 100);
  const effectiveQuery = [query, ...companyNames, ...isins, ...indexCodes, ...commodities].filter(Boolean).join(' ').slice(0, MAX_QUERY_LENGTH);

  const params: NewsFetchParams = {
    query: effectiveQuery || undefined,
    symbols,
    companyNames,
    marketCodes: list(searchParams, ['market', 'markets', 'marketCode', 'selectedMarket'], 40),
    exchangeCodes: list(searchParams, ['exchange', 'exchanges', 'exchangeCode'], 40),
    countries: list(searchParams, ['country', 'countries'], 40),
    sectors: list(searchParams, ['sector', 'sectors'], 60),
    industries: list(searchParams, ['industry', 'industries'], 60),
    assetTypes: list(searchParams, ['assetType', 'assetTypes'], 40)
      .filter((value): value is FinancialAssetType => (FINANCIAL_ASSET_TYPES as readonly string[]).includes(value)),
    currencies: list(searchParams, ['currency', 'currencies'], 16).map(value => value.toUpperCase()),
    isins,
    indexCodes,
    commodities,
    eventTypes,
    sourceTypes,
    sourceIds: list(searchParams, ['sourceId', 'sourceIds'], 100),
    sourceNames: list(searchParams, ['source', 'sourceName', 'sourceNames'], 160),
    verificationStatuses,
    impactLevels,
    sentiments,
    languages: sourceLanguages,
    language,
    from: range.from,
    to: range.to,
    officialOnly: parseBoolean(searchParams.get('officialOnly')),
    strictEntityFilter: symbols.length > 0,
    limit: Math.min(200, Math.max(pageSize * 4, 60)),
    forceRefresh: refreshRequested,
  };

  const result = await aggregateFinancialNews(params, {
    page,
    pageSize,
    sort: parseSort(searchParams.get('sort')),
    forceExternal: refreshRequested,
  });
  const stories = await translatedStories(result.stories as Array<ConsolidatedNewsStory & Record<string, unknown>>, language);
  const items = stories.map(toUiStory);
  const unavailable = !result.liveUpdatesAvailable && !result.storedFallbackUsed && items.length === 0;
  const code = unavailable
    ? 'MARKET_NEWS_LIVE_UNAVAILABLE'
    : result.partialFailure
      ? 'MARKET_NEWS_PARTIAL_COVERAGE'
      : items.length === 0
        ? 'NEWS_NO_RESULTS'
        : null;

  return NextResponse.json({
    ok: !unavailable,
    success: !unavailable,
    status: unavailable ? 'unavailable' : result.partialFailure ? 'degraded' : 'success',
    code,
    source: 'multi-source',
    provider: 'multi-source',
    items,
    stories: items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    filters: result.appliedFilters,
    appliedFilters: result.appliedFilters,
    providerCoverage: result.providerCoverage,
    partialFailure: result.partialFailure,
    liveUpdatesAvailable: result.liveUpdatesAvailable,
    storedFallbackUsed: result.storedFallbackUsed,
    warnings: result.warnings,
    updated_at: result.lastUpdated,
    lastUpdated: result.lastUpdated,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    cached: result.cacheStatus === 'hit' || result.cacheStatus === 'stale' || result.cacheStatus === 'stored',
    stale: result.cacheStatus === 'stale' || result.cacheStatus === 'stored',
    cacheStatus: result.cacheStatus,
    searchDurationMs: result.searchDurationMs,
    diagnostics: {
      providerCoverage: result.providerCoverage,
      partialFailure: result.partialFailure,
      liveUpdatesAvailable: result.liveUpdatesAvailable,
      storedFallbackUsed: result.storedFallbackUsed,
      searchDurationMs: result.searchDurationMs,
    },
    relevance: {
      returned: items.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    },
  }, {
    status: 200,
    headers: unavailable ? UNAVAILABLE_HEADERS : SUCCESS_HEADERS,
  });
}

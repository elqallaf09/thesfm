import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import type {
  ConsolidatedNewsStory,
  FinancialNewsProviderErrorCode,
  NewsSourceType,
  NormalizedNewsItem,
  ProviderHealthResult,
  ProviderHealthStatus,
  ProviderRateLimitState,
} from './types';
import { areDuplicateStories } from './processing';
import { publisherNetworkKey } from './providers/shared';

type AdminClient = NonNullable<ReturnType<typeof createServerSupabaseAdmin>>;
type UnknownRecord = Record<string, unknown>;

export type StoredNewsSort = 'latest' | 'importance' | 'official' | 'relevance';

export type StoredNewsSearchParams = {
  query?: string | null;
  page?: number;
  pageSize?: number;
  limit?: number;
  from?: string | null;
  to?: string | null;
  marketCodes?: string[];
  exchangeCodes?: string[];
  symbols?: string[];
  companyNames?: string[];
  countries?: string[];
  sectors?: string[];
  industries?: string[];
  assetTypes?: string[];
  currencies?: string[];
  eventTypes?: string[];
  sourceTypes?: string[];
  sourceIds?: string[];
  sourceNames?: string[];
  languages?: string[];
  verificationStatuses?: string[];
  impactLevels?: string[];
  sentiments?: string[];
  officialOnly?: boolean;
  sort?: StoredNewsSort;
};

export type StoredNewsSearchResult = {
  stories: ConsolidatedNewsStory[];
  total: number;
  lastSuccessfulUpdate: string | null;
  available: boolean;
};

export type PersistNewsResult = {
  saved: number;
  deduplicated: number;
  available: boolean;
};

export type ProviderFetchPersistenceReport = {
  providerId: string;
  providerName?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  sourceType?: NewsSourceType | string | null;
  sourceDomain?: string | null;
  sourceNetwork?: string | null;
  reliabilityScore?: number | null;
  priority?: number | null;
  officialSource?: boolean | null;
  supportedMarkets?: string[] | null;
  fetchKind?: 'background' | 'on_demand' | 'health_check' | 'manual';
  runId?: string | null;
  status?: string | null;
  healthStatus?: ProviderHealthStatus | string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  checkedAt?: string | null;
  lastSuccessfulFetch?: string | null;
  lastFailedFetch?: string | null;
  latencyMs?: number | null;
  durationMs?: number | null;
  fetchedCount?: number | null;
  acceptedCount?: number | null;
  rejectedCount?: number | null;
  deduplicatedCount?: number | null;
  savedCount?: number | null;
  responseStatus?: number | null;
  rateLimitState?: ProviderRateLimitState | string | null;
  rateLimitRemaining?: number | null;
  rateLimitResetsAt?: string | null;
  disabledUntil?: string | null;
  errorCode?: FinancialNewsProviderErrorCode | string | null;
  errorSummary?: string | null;
  requestMarketCodes?: string[] | null;
  rateLimited?: boolean | null;
};

export type MarketNewsAdminProviderStatus = {
  providerId: string;
  providerName: string;
  sourceType: string;
  sourceDomain: string | null;
  reliabilityScore: number;
  priority: number;
  officialSource: boolean;
  supportedMarkets: string[];
  enabled: boolean;
  healthStatus: string;
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  averageLatency: number | null;
  failureCount: number;
  rateLimitState: string;
  disabledUntil: string | null;
  latestErrorSummary: string | null;
  latestFetch: {
    startedAt: string | null;
    status: string;
    fetched: number;
    rejected: number;
    deduplicated: number;
    saved: number;
  } | null;
};

export type MarketNewsAdminStatusResult = {
  providers: MarketNewsAdminProviderStatus[];
  available: boolean;
  generatedAt: string;
};

const DEFAULT_PROCESSING_VERSION = '1';
const WRITE_CHUNK_SIZE = 200;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text || null;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  return Math.max(0, Math.trunc(asNumber(value, fallback)));
}

function asHttpStatus(value: unknown) {
  const status = Math.trunc(asNumber(value, 0));
  return status >= 100 && status <= 599 ? status : null;
}

function clamp(value: unknown, minimum: number, maximum: number, fallback = minimum) {
  return Math.min(maximum, Math.max(minimum, asNumber(value, fallback)));
}

function uniqueStrings(values: unknown, options: { upper?: boolean } = {}) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => options.upper ? value.toUpperCase() : value)));
}

function validIso(value: unknown, fallback?: string | null) {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallback ?? null;
}

function validHttpUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeErrorSummary(value: unknown) {
  const text = asString(value);
  if (!text) return null;
  return text
    .replace(/\b(api[_-]?key|authorization|bearer|password|secret|token)\b\s*[:=]?\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/https?:\/\/[^\s/@]+:[^\s/@]+@/gi, 'https://[redacted]@')
    .slice(0, 300);
}

function jsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function chunks<T>(items: T[], size = WRITE_CHUNK_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function upsertRows(
  admin: AdminClient,
  table: string,
  rows: UnknownRecord[],
  onConflict: string,
  selectColumn: string,
) {
  if (rows.length === 0) return { ok: true, count: 0 };
  let count = 0;
  for (const batch of chunks(rows)) {
    const result = await admin.from(table).upsert(batch, { onConflict }).select(selectColumn);
    if (result.error) return { ok: false, count };
    count += result.data?.length ?? batch.length;
  }
  return { ok: true, count };
}

function normalizePage(value: unknown) {
  return Math.max(1, Math.trunc(asNumber(value, 1)));
}

function normalizePageSize(value: unknown) {
  return Math.min(100, Math.max(1, Math.trunc(asNumber(value, 20))));
}

function normalizedFilter(values: string[] | undefined, upper = false) {
  return uniqueStrings(values, { upper });
}

function storedStoryFromRow(value: unknown): ConsolidatedNewsStory | null {
  const row = asRecord(value);
  const payload = asRecord(row.story_payload);
  const id = asString(row.id, asString(payload.id));
  if (!id) return null;
  return {
    ...payload,
    id,
    duplicateGroupId: asString(row.id, asString(payload.duplicateGroupId, id)),
    title: asString(row.best_title, asString(payload.title)),
    summary: asNullableString(row.summary) ?? (typeof payload.summary === 'string' ? payload.summary : null),
    earliestPublishedAt: validIso(row.earliest_published_at, asString(payload.earliestPublishedAt)) ?? new Date(0).toISOString(),
    latestUpdatedAt: validIso(row.latest_updated_at, asString(payload.latestUpdatedAt)) ?? new Date(0).toISOString(),
    verificationStatus: asString(row.verification_status, asString(payload.verificationStatus, 'single_source')),
    importanceScore: clamp(row.importance_score, 0, 100),
    relevanceScore: clamp(row.relevance_score, 0, 100),
  } as ConsolidatedNewsStory;
}

export async function searchStoredNews(params: StoredNewsSearchParams = {}): Promise<StoredNewsSearchResult> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { stories: [], total: 0, lastSuccessfulUpdate: null, available: false };

  const page = normalizePage(params.page);
  const pageSize = normalizePageSize(params.pageSize ?? params.limit);
  const offset = (page - 1) * pageSize;

  try {
    let query = admin
      .from('market_news_story_clusters')
      .select('id,best_title,summary,earliest_published_at,latest_updated_at,verification_status,relevance_score,importance_score,story_payload', { count: 'exact' })
      .eq('is_published', true);

    const search = asString(params.query).slice(0, 240);
    if (search) query = query.textSearch('search_vector', search, { config: 'simple', type: 'websearch' });

    const markets = normalizedFilter(params.marketCodes, true);
    const exchanges = normalizedFilter(params.exchangeCodes, true);
    const symbols = normalizedFilter(params.symbols, true);
    const sectors = normalizedFilter(params.sectors);
    const countries = normalizedFilter(params.countries, true);
    const industries = normalizedFilter(params.industries);
    const assetTypes = normalizedFilter(params.assetTypes);
    const currencies = normalizedFilter(params.currencies, true);
    const eventTypes = normalizedFilter(params.eventTypes);
    const sourceTypes = normalizedFilter(params.sourceTypes);
    const sourceIds = normalizedFilter(params.sourceIds);
    const sourceNames = normalizedFilter(params.sourceNames);
    const languages = normalizedFilter(params.languages);
    const verification = normalizedFilter(params.verificationStatuses);
    const impacts = normalizedFilter(params.impactLevels);
    const sentiments = normalizedFilter(params.sentiments);

    if (markets.length) query = query.overlaps('market_codes', markets);
    if (exchanges.length) query = query.overlaps('exchange_codes', exchanges);
    if (symbols.length) query = query.overlaps('symbols', symbols);
    if (sectors.length) query = query.overlaps('sectors', sectors);
    if (countries.length) query = query.overlaps('countries', countries);
    if (industries.length) query = query.overlaps('industries', industries);
    if (assetTypes.length) query = query.overlaps('asset_types', assetTypes);
    if (currencies.length) query = query.overlaps('currencies', currencies);
    if (eventTypes.length) query = query.in('event_type', eventTypes);
    if (sourceTypes.length) query = query.overlaps('source_types', sourceTypes);
    if (sourceIds.length) query = query.overlaps('source_ids', sourceIds);
    if (sourceNames.length) query = query.overlaps('source_names', sourceNames);
    if (languages.length) query = query.in('original_language', languages);
    if (verification.length) query = query.in('verification_status', verification);
    if (impacts.length) query = query.in('expected_impact', impacts);
    if (sentiments.length) query = query.in('sentiment', sentiments);
    if (params.officialOnly) query = query.eq('verification_status', 'official');

    const from = validIso(params.from);
    const to = validIso(params.to);
    if (from) query = query.gte('earliest_published_at', from);
    if (to) {
      const end = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(asString(params.to))) end.setUTCDate(end.getUTCDate() + 1);
      else end.setTime(end.getTime() + 1);
      query = query.lt('earliest_published_at', end.toISOString());
    }

    if (params.sort === 'importance') {
      query = query.order('importance_score', { ascending: false }).order('earliest_published_at', { ascending: false });
    } else if (params.sort === 'official') {
      query = query.order('is_official', { ascending: false }).order('earliest_published_at', { ascending: false });
    } else if (params.sort === 'relevance') {
      query = query.order('relevance_score', { ascending: false }).order('earliest_published_at', { ascending: false });
    } else {
      query = query.order('earliest_published_at', { ascending: false }).order('importance_score', { ascending: false });
    }

    const [storyResult, healthResult] = await Promise.all([
      query.range(offset, offset + pageSize - 1),
      admin
        .from('market_news_source_health')
        .select('last_successful_fetch')
        .not('last_successful_fetch', 'is', null)
        .order('last_successful_fetch', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (storyResult.error) {
      return { stories: [], total: 0, lastSuccessfulUpdate: null, available: false };
    }

    return {
      stories: (storyResult.data ?? []).map(storedStoryFromRow).filter((story): story is ConsolidatedNewsStory => Boolean(story)),
      total: storyResult.count ?? 0,
      lastSuccessfulUpdate: healthResult.error ? null : validIso(healthResult.data?.last_successful_fetch),
      available: true,
    };
  } catch {
    return { stories: [], total: 0, lastSuccessfulUpdate: null, available: false };
  }
}

function sourceRow(item: NormalizedNewsItem): UnknownRecord {
  return {
    source_id: item.sourceId,
    source_name: item.sourceName,
    source_type: item.sourceType,
    source_domain: item.sourceDomain,
    publisher_network: item.sourceNetworkId || item.sourceNetwork || null,
    reliability_score: clamp(item.sourceReliability, 0, 1, 0.5),
    priority: Math.min(5, Math.max(1, Math.trunc(asNumber(item.sourcePriority, 4)))),
    official_source: item.isOfficial,
    supported_markets: uniqueStrings(item.marketCodes, { upper: true }),
    updated_at: new Date().toISOString(),
  };
}

function fallbackStory(item: NormalizedNewsItem, id: string): ConsolidatedNewsStory {
  return {
    ...item,
    id,
    duplicateGroupId: id,
    supportingSources: [],
    independentSourceCount: 1,
    earliestPublishedAt: item.publishedAt,
    latestUpdatedAt: item.updatedAt ?? item.publishedAt,
    conflictSummary: null,
    whyItMatters: item.eventType && item.eventType !== 'unknown' ? `event:${item.eventType}` : null,
  };
}

function storyRow(story: ConsolidatedNewsStory): UnknownRecord {
  return {
    id: story.id,
    primary_source_id: story.sourceId,
    best_title: story.title,
    normalized_title: story.normalizedTitle || story.title.toLocaleLowerCase(),
    summary: story.summary,
    original_language: story.originalLanguage,
    earliest_published_at: validIso(story.earliestPublishedAt, story.publishedAt),
    latest_updated_at: validIso(story.latestUpdatedAt, story.updatedAt ?? story.publishedAt),
    verification_status: story.verificationStatus,
    corroborating_source_count: Math.max(0, story.corroboratingSourceCount),
    supporting_source_count: story.supportingSources.length,
    has_conflicts: story.verificationStatus === 'conflicting' || Boolean(story.conflictSummary),
    conflict_summary: story.conflictSummary,
    event_type: story.eventType ?? 'unknown',
    market_codes: uniqueStrings(story.marketCodes, { upper: true }),
    exchange_codes: uniqueStrings(story.exchangeCodes, { upper: true }),
    countries: uniqueStrings(story.countries, { upper: true }),
    sectors: uniqueStrings(story.sectors),
    industries: uniqueStrings(story.industries),
    symbols: uniqueStrings(story.symbols, { upper: true }),
    company_names: uniqueStrings(story.companyNames.map(name => name.toLocaleLowerCase('und'))),
    asset_types: uniqueStrings(story.assetTypes),
    currencies: uniqueStrings(story.currencies, { upper: true }),
    source_ids: uniqueStrings([story.sourceId, ...story.supportingSources.map(source => source.sourceId)]),
    source_types: uniqueStrings([story.sourceType, ...story.supportingSources.map(source => source.sourceType)]),
    source_names: uniqueStrings([story.sourceName, ...story.supportingSources.map(source => source.sourceName)]),
    is_official: story.isOfficial || story.verificationStatus === 'official',
    relevance_score: clamp(story.relevanceScore, 0, 100),
    importance_score: clamp(story.importanceScore, 0, 100),
    verification_confidence: clamp(story.confidenceScore, 0, 1),
    entity_match_confidence: clamp(story.entityConfidenceScore ?? story.entityConfidence, 0, 1),
    sentiment: story.sentiment,
    expected_impact: story.expectedImpact,
    impact_horizon: story.impactHorizon,
    impact_reason: story.impactReason,
    why_it_matters: story.whyItMatters,
    story_payload: jsonValue(story),
    is_published: true,
    processing_version: story.processingVersion || DEFAULT_PROCESSING_VERSION,
    updated_at: new Date().toISOString(),
  };
}

function entityConfidence(item: Pick<NormalizedNewsItem, 'entityConfidenceScore' | 'entityConfidence'>) {
  return clamp(item.entityConfidenceScore ?? item.entityConfidence, 0, 1);
}

function articleRow(item: NormalizedNewsItem, clusterId: string, runId?: string | null): UnknownRecord | null {
  const originalUrl = validHttpUrl(item.originalUrl);
  const publishedAt = validIso(item.publishedAt);
  const fetchedAt = validIso(item.fetchedAt);
  if (!item.id || !item.sourceId || !item.title.trim() || !originalUrl || !publishedAt || !fetchedAt) return null;

  const processingStatus = item.processingStatus === 'rejected'
    ? 'rejected'
    : item.processingStatus === 'failed'
      ? 'failed'
      : item.processingStatus === 'pending'
        ? 'pending'
        : 'completed';

  return {
    id: item.id,
    provider_item_id: item.id,
    canonical_url: validHttpUrl(item.canonicalUrl),
    original_url: originalUrl,
    title: item.title.trim(),
    normalized_title: item.normalizedTitle || item.title.toLocaleLowerCase(),
    summary: item.summary,
    original_language: item.originalLanguage || 'unknown',
    source_id: item.sourceId,
    source_name: item.sourceName,
    source_type: item.sourceType,
    source_domain: item.sourceDomain,
    source_reliability: clamp(item.sourceReliability, 0, 1, 0.5),
    is_official: item.isOfficial,
    published_at: publishedAt,
    provider_updated_at: validIso(item.updatedAt),
    fetched_at: fetchedAt,
    market_codes: uniqueStrings(item.marketCodes, { upper: true }),
    exchange_codes: uniqueStrings(item.exchangeCodes, { upper: true }),
    countries: uniqueStrings(item.countries, { upper: true }),
    sectors: uniqueStrings(item.sectors),
    industries: uniqueStrings(item.industries),
    symbols: uniqueStrings(item.symbols, { upper: true }),
    company_names: uniqueStrings(item.companyNames),
    asset_types: uniqueStrings(item.assetTypes),
    currencies: uniqueStrings(item.currencies, { upper: true }),
    event_type: item.eventType ?? 'unknown',
    relevance_score: clamp(item.relevanceScore, 0, 100),
    importance_score: clamp(item.importanceScore, 0, 100),
    confidence_score: clamp(item.confidenceScore, 0, 1),
    entity_match_confidence: entityConfidence(item),
    sentiment: item.sentiment,
    expected_impact: item.expectedImpact,
    impact_horizon: item.impactHorizon,
    verification_status: item.verificationStatus,
    corroborating_source_count: asNonNegativeInteger(item.corroboratingSourceCount),
    duplicate_group_id: clusterId,
    content_hash: asNullableString(item.contentHash),
    event_fingerprint: asNullableString(item.eventFingerprint),
    ingestion_run_id: asNullableString(runId),
    processing_status: processingStatus,
    processing_version: item.processingVersion || DEFAULT_PROCESSING_VERSION,
    is_published: processingStatus !== 'rejected' && processingStatus !== 'failed',
    rejected_at: processingStatus === 'rejected' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

function processingRow(item: NormalizedNewsItem): UnknownRecord {
  return {
    article_id: item.id,
    processing_version: item.processingVersion || DEFAULT_PROCESSING_VERSION,
    status: item.processingStatus === 'rejected' ? 'rejected' : item.processingStatus === 'failed' ? 'failed' : item.processingStatus === 'pending' ? 'pending' : 'completed',
    classification_result: {
      eventType: item.eventType ?? 'unknown',
      sentiment: item.sentiment,
      expectedImpact: item.expectedImpact,
      impactDirection: item.impactDirection,
      impactHorizon: item.impactHorizon,
      impactReason: item.impactReason,
    },
    entity_resolution_result: {
      symbols: item.symbols,
      companyNames: item.companyNames,
      marketCodes: item.marketCodes,
      exchangeCodes: item.exchangeCodes,
      confidence: entityConfidence(item),
    },
    scoring_result: {
      sourceReliability: item.sourceReliability,
      relevance: item.relevanceScore,
      importance: item.importanceScore,
      confidence: item.confidenceScore,
    },
    conflict_result: {
      verificationStatus: item.verificationStatus,
      corroboratingSourceCount: item.corroboratingSourceCount,
    },
    input_hash: item.contentHash ?? null,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function relationRows(items: NormalizedNewsItem[]) {
  return {
    symbols: items.flatMap(item => uniqueStrings(item.symbols, { upper: true }).map((symbol, index) => ({
      article_id: item.id,
      symbol,
      exchange_code: asString(item.exchangeCodes[index], asString(item.exchangeCodes[0])).toUpperCase(),
      company_name: asNullableString(item.companyNames[index] ?? item.companyNames[0]),
      match_confidence: entityConfidence(item),
      match_method: 'normalized_entity_resolution',
      is_primary: index === 0,
    }))),
    markets: items.flatMap(item => uniqueStrings(item.marketCodes, { upper: true }).map((marketCode, index) => ({
      article_id: item.id,
      market_code: marketCode,
      exchange_code: asString(item.exchangeCodes[index], asString(item.exchangeCodes[0])).toUpperCase(),
      country_code: asNullableString(item.countries[index] ?? item.countries[0]),
      match_confidence: entityConfidence(item),
      is_primary: index === 0,
    }))),
    sectors: items.flatMap(item => uniqueStrings(item.sectors).map((sector, index) => ({
      article_id: item.id,
      sector,
      industry: asString(item.industries[index], asString(item.industries[0])),
      match_confidence: entityConfidence(item),
      is_primary: index === 0,
    }))),
  };
}

function translationRows(items: NormalizedNewsItem[]) {
  return items.flatMap(item => {
    const language = asString(item.translatedLanguage).toLowerCase();
    const title = asString(item.translatedTitle);
    if (!title || !['ar', 'en', 'fr'].includes(language)) return [];
    return [{
      news_url: item.canonicalUrl || item.originalUrl,
      source: item.sourceName,
      original_title: item.title,
      original_summary: item.summary,
      language,
      translated_title: title,
      translated_summary: item.translatedSummary ?? null,
      article_id: item.id,
      source_language: item.originalLanguage,
      input_hash: item.contentHash ?? null,
      processing_version: item.processingVersion || DEFAULT_PROCESSING_VERSION,
      updated_at: new Date().toISOString(),
    }];
  });
}

export async function persistNewsItems(
  items: NormalizedNewsItem[],
  stories: ConsolidatedNewsStory[] = [],
  runId?: string | null,
): Promise<PersistNewsResult> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { saved: 0, deduplicated: 0, available: false };

  const validItems = items.filter(item => Boolean(
    item.id && item.sourceId && item.title?.trim() && validHttpUrl(item.originalUrl) && validIso(item.publishedAt) && validIso(item.fetchedAt),
  ));
  if (validItems.length === 0) return { saved: 0, deduplicated: 0, available: true };

  try {
    const sourcesById = new Map(validItems.map(item => [item.sourceId, sourceRow(item)]));
    const sourceWrite = await upsertRows(admin, 'market_news_sources', Array.from(sourcesById.values()), 'source_id', 'source_id');
    if (!sourceWrite.ok) return { saved: 0, deduplicated: 0, available: false };

    const clusterByItemId = new Map<string, string>();
    const storyById = new Map<string, ConsolidatedNewsStory>();
    const primaryArticleByStoryId = new Map<string, string>();

    for (const story of stories) {
      if (!story.id) continue;
      const relatedItems = validItems.filter(item => (
        areDuplicateStories(item, story)
        || story.supportingSources.some(source => (
          item.sourceId === source.sourceId
          && (item.originalUrl === source.originalUrl || item.publishedAt === source.publishedAt)
        ))
      ));
      const primaryItem = validItems.find(item => (
        item.sourceId === story.sourceId
        && (item.originalUrl === story.originalUrl || item.canonicalUrl === story.canonicalUrl)
      )) ?? validItems.find(item => item.sourceId === story.sourceId && item.title === story.title);
      if (!primaryItem && relatedItems.length === 0) continue;
      storyById.set(story.id, story);
      if (primaryItem) primaryArticleByStoryId.set(story.id, primaryItem.id);
      relatedItems.forEach(item => clusterByItemId.set(item.id, story.id));
      if (primaryItem) clusterByItemId.set(primaryItem.id, story.id);
    }

    for (const item of validItems) {
      if (clusterByItemId.has(item.id)) continue;
      const id = asString(item.duplicateGroupId, `story:${item.id}`);
      clusterByItemId.set(item.id, id);
      if (!storyById.has(id)) {
        storyById.set(id, fallbackStory(item, id));
        primaryArticleByStoryId.set(id, item.id);
      }
    }

    const clusterWrite = await upsertRows(
      admin,
      'market_news_story_clusters',
      Array.from(storyById.values()).map(storyRow),
      'id',
      'id',
    );
    if (!clusterWrite.ok) return { saved: 0, deduplicated: 0, available: false };

    const articleRows = validItems
      .map(item => articleRow(item, clusterByItemId.get(item.id) ?? `story:${item.id}`, runId))
      .filter((row): row is UnknownRecord => Boolean(row));
    const articleWrite = await upsertRows(admin, 'market_news_articles', articleRows, 'id', 'id');
    if (!articleWrite.ok) return { saved: articleWrite.count, deduplicated: 0, available: false };

    for (const batch of chunks(Array.from(storyById.values()).filter(story => primaryArticleByStoryId.has(story.id)), 20)) {
      await Promise.allSettled(batch.map(story => admin
        .from('market_news_story_clusters')
        .update({ primary_article_id: primaryArticleByStoryId.get(story.id) ?? null })
        .eq('id', story.id)));
    }

    const relations = relationRows(validItems);
    const currentArticleIds = new Set(validItems.map(item => item.id));
    const existingNetworksByCluster = new Map<string, Set<string>>();
    const clusterIds = Array.from(storyById.keys());
    if (clusterIds.length > 0) {
      const existingSources = await admin
        .from('market_news_story_sources')
        .select('cluster_id,article_id,publisher_network,source_id')
        .in('cluster_id', clusterIds);
      if (!existingSources.error) {
        for (const row of existingSources.data ?? []) {
          if (currentArticleIds.has(asString(row.article_id))) continue;
          const clusterId = asString(row.cluster_id);
          const network = publisherNetworkKey(asString(row.publisher_network || row.source_id));
          if (!clusterId || !network) continue;
          const networks = existingNetworksByCluster.get(clusterId) ?? new Set<string>();
          networks.add(network);
          existingNetworksByCluster.set(clusterId, networks);
        }
      }
    }
    const storySources = Array.from(storyById.values()).flatMap(story => {
      const primaryArticleId = primaryArticleByStoryId.get(story.id);
      const networks = new Set(existingNetworksByCluster.get(story.id) ?? []);
      return validItems
        .filter(item => clusterByItemId.get(item.id) === story.id)
        .sort((left, right) => left.id === primaryArticleId ? -1 : right.id === primaryArticleId ? 1 : 0)
        .map(item => {
          const network = publisherNetworkKey(item.sourceNetworkId || item.sourceNetwork || item.sourceDomain || item.sourceName);
          const independent = !networks.has(network);
          networks.add(network);
          return {
            cluster_id: story.id,
            article_id: item.id,
            source_id: item.sourceId,
            source_role: item.id === primaryArticleId ? 'primary' : story.verificationStatus === 'conflicting' ? 'conflicting' : 'supporting',
            independent_confirmation: independent,
            publisher_network: item.sourceNetworkId || item.sourceNetwork || null,
            source_rank: Math.min(100, Math.max(1, item.sourcePriority)),
          };
        });
    });
    const conflicts = Array.from(storyById.values()).filter(story => story.verificationStatus === 'conflicting' || Boolean(story.conflictSummary)).map(story => ({
      conflict_key: `${story.id}:${story.conflictSummary || 'material'}`,
      cluster_id: story.id,
      conflict_type: story.conflictSummary || 'material_report_conflict',
      description: story.conflictSummary || 'conflicting_sources',
      differing_claims: [],
      official_source_id: story.isOfficial ? story.sourceId : null,
      resolution_status: 'open',
      updated_at: new Date().toISOString(),
    }));

    await Promise.allSettled([
      upsertRows(admin, 'market_news_article_symbols', relations.symbols, 'article_id,symbol,exchange_code', 'article_id'),
      upsertRows(admin, 'market_news_article_markets', relations.markets, 'article_id,market_code,exchange_code', 'article_id'),
      upsertRows(admin, 'market_news_article_sectors', relations.sectors, 'article_id,sector,industry', 'article_id'),
      upsertRows(admin, 'market_news_story_sources', storySources, 'cluster_id,article_id', 'cluster_id'),
      upsertRows(admin, 'market_news_conflicts', conflicts, 'conflict_key', 'id'),
      upsertRows(admin, 'market_news_processing_results', validItems.map(processingRow), 'article_id,processing_version', 'id'),
      upsertRows(admin, 'news_translations', translationRows(validItems), 'news_url,language', 'id'),
    ]);

    const consolidatedCount = stories.length || storyById.size;
    return {
      saved: articleWrite.count,
      deduplicated: Math.max(0, validItems.length - consolidatedCount),
      available: true,
    };
  } catch {
    return { saved: 0, deduplicated: 0, available: false };
  }
}

function fetchStatus(value: unknown) {
  const status = asString(value).toLowerCase();
  if (status === 'success' || status === 'completed') return 'completed';
  if (status === 'partial') return 'partial';
  if (status === 'failed') return 'failed';
  if (status === 'rate_limited') return 'rate_limited';
  if (status === 'started') return 'started';
  return 'skipped';
}

function healthStatus(report: ProviderFetchPersistenceReport) {
  if (report.rateLimited) return 'rate_limited';
  const explicit = asString(report.healthStatus).toLowerCase();
  if (['healthy', 'degraded', 'unhealthy', 'rate_limited', 'disabled', 'unknown'].includes(explicit)) return explicit;
  const status = report.rateLimited ? 'rate_limited' : fetchStatus(report.status);
  if (status === 'completed') return 'healthy';
  if (status === 'partial') return 'degraded';
  if (status === 'rate_limited') return 'rate_limited';
  if (status === 'failed') return 'unhealthy';
  return 'unknown';
}

export async function persistProviderFetch(report: ProviderFetchPersistenceReport) {
  const admin = createServerSupabaseAdmin();
  if (!admin) return { available: false };

  const sourceId = asString(report.sourceId, asString(report.providerId)).slice(0, 160);
  if (!sourceId) return { available: false };
  const now = new Date().toISOString();
  const status = report.rateLimited ? 'rate_limited' : fetchStatus(report.status);
  const successful = status === 'completed' || status === 'partial';
  const startedAt = validIso(report.startedAt, validIso(report.checkedAt, now)) ?? now;
  const completedAt = validIso(report.completedAt, validIso(report.checkedAt, now)) ?? now;
  const reportedLatency = report.latencyMs ?? report.durationMs;
  const latencyMs = reportedLatency == null ? null : asNonNegativeInteger(reportedLatency);

  try {
    const [existingSource, previous] = await Promise.all([
      admin
        .from('market_news_sources')
        .select('source_name,source_type,source_domain,publisher_network,reliability_score,priority,official_source,supported_markets')
        .eq('source_id', sourceId)
        .maybeSingle(),
      admin
        .from('market_news_source_health')
        .select('health_status,last_successful_fetch,last_failed_fetch,last_latency_ms,average_latency_ms,success_count,failure_count,consecutive_failure_count,rate_limit_state,disabled_until,latest_error_code,latest_error_summary')
        .eq('source_id', sourceId)
        .maybeSingle(),
    ]);
    const priorSource = existingSource.error ? {} : asRecord(existingSource.data);
    const prior = previous.error ? {} : asRecord(previous.data);
    const sourceWrite = await upsertRows(admin, 'market_news_sources', [{
      source_id: sourceId,
      source_name: asString(report.sourceName, asString(report.providerName, asString(priorSource.source_name, sourceId))),
      source_type: asString(report.sourceType, asString(priorSource.source_type, 'other')),
      source_domain: report.sourceDomain === undefined ? asNullableString(priorSource.source_domain) : asNullableString(report.sourceDomain),
      publisher_network: report.sourceNetwork === undefined ? asNullableString(priorSource.publisher_network) : asNullableString(report.sourceNetwork),
      reliability_score: report.reliabilityScore == null
        ? clamp(priorSource.reliability_score, 0, 1, 0.5)
        : clamp(report.reliabilityScore, 0, 1, 0.5),
      priority: Math.min(5, Math.max(1, Math.trunc(asNumber(report.priority, asNumber(priorSource.priority, 4))))),
      official_source: report.officialSource == null ? priorSource.official_source === true : report.officialSource,
      supported_markets: report.supportedMarkets == null
        ? uniqueStrings(priorSource.supported_markets, { upper: true })
        : uniqueStrings(report.supportedMarkets, { upper: true }),
      updated_at: now,
    }], 'source_id', 'source_id');
    if (!sourceWrite.ok) return { available: false };

    const attempted = status !== 'skipped';
    const successCount = asNonNegativeInteger(prior.success_count) + (successful ? 1 : 0);
    const failureCount = asNonNegativeInteger(prior.failure_count) + (attempted && !successful ? 1 : 0);
    const totalBefore = asNonNegativeInteger(prior.success_count) + asNonNegativeInteger(prior.failure_count);
    const averageLatency = latencyMs == null
      ? (prior.average_latency_ms == null ? null : asNonNegativeInteger(prior.average_latency_ms))
      : attempted
        ? Math.round(((asNonNegativeInteger(prior.average_latency_ms) * totalBefore) + latencyMs) / (totalBefore + 1))
        : (prior.average_latency_ms == null ? null : asNonNegativeInteger(prior.average_latency_ms));
    const nextHealth = attempted ? healthStatus(report) : asString(prior.health_status, healthStatus(report));
    const errorSummary = safeErrorSummary(report.errorSummary);

    const healthWrite = await upsertRows(admin, 'market_news_source_health', [{
      source_id: sourceId,
      health_status: nextHealth,
      last_successful_fetch: validIso(report.lastSuccessfulFetch) ?? (successful ? completedAt : validIso(prior.last_successful_fetch)),
      last_failed_fetch: validIso(report.lastFailedFetch) ?? (attempted && !successful ? completedAt : validIso(prior.last_failed_fetch)),
      last_latency_ms: latencyMs ?? (prior.last_latency_ms == null ? null : asNonNegativeInteger(prior.last_latency_ms)),
      average_latency_ms: averageLatency,
      success_count: successCount,
      failure_count: failureCount,
      consecutive_failure_count: successful ? 0 : attempted ? asNonNegativeInteger(prior.consecutive_failure_count) + 1 : asNonNegativeInteger(prior.consecutive_failure_count),
      rate_limit_state: asNullableString(report.rateLimitState) ?? asNullableString(prior.rate_limit_state),
      rate_limit_remaining: report.rateLimitRemaining == null ? null : asNonNegativeInteger(report.rateLimitRemaining),
      rate_limit_resets_at: validIso(report.rateLimitResetsAt),
      disabled_until: validIso(report.disabledUntil) ?? validIso(prior.disabled_until),
      latest_error_code: successful ? null : attempted ? asNullableString(report.errorCode) : asNullableString(prior.latest_error_code),
      latest_error_summary: successful ? null : attempted ? errorSummary : asNullableString(prior.latest_error_summary),
      updated_at: now,
    }], 'source_id', 'source_id');
    if (!healthWrite.ok) return { available: false };

    const writes: Array<PromiseLike<unknown>> = [
      admin.from('market_news_fetch_logs').insert({
        run_id: asNullableString(report.runId),
        source_id: sourceId,
        fetch_kind: report.fetchKind ?? 'background',
        status,
        request_market_codes: uniqueStrings(report.requestMarketCodes, { upper: true }),
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: latencyMs,
        articles_fetched: asNonNegativeInteger(report.fetchedCount),
        articles_rejected: asNonNegativeInteger(report.rejectedCount),
        articles_deduplicated: asNonNegativeInteger(report.deduplicatedCount),
        articles_saved: asNonNegativeInteger(report.savedCount ?? report.acceptedCount),
        response_status: asHttpStatus(report.responseStatus),
        rate_limit_state: asNullableString(report.rateLimitState),
        error_code: successful ? null : asNullableString(report.errorCode),
        error_summary: successful ? null : errorSummary,
      }),
    ];
    if (attempted) writes.push(admin.from('market_news_source_health_history').insert({
        source_id: sourceId,
        health_status: nextHealth,
        latency_ms: latencyMs,
        successful,
        http_status: asHttpStatus(report.responseStatus),
        rate_limit_state: asNullableString(report.rateLimitState),
        error_code: successful ? null : asNullableString(report.errorCode),
        error_summary: successful ? null : errorSummary,
        checked_at: completedAt,
      }));
    await Promise.allSettled(writes);
    return { available: true };
  } catch {
    return { available: false };
  }
}

export async function persistProviderHealth(
  health: ProviderHealthResult,
  source: Omit<ProviderFetchPersistenceReport, 'providerId' | 'status' | 'healthStatus' | 'latencyMs'> = {},
) {
  const state = health.healthStatus ?? health.status ?? 'unknown';
  return persistProviderFetch({
    ...source,
    providerId: health.providerId,
    providerName: health.providerName,
    supportedMarkets: health.supportedMarkets,
    status: state === 'healthy' ? 'completed' : state === 'degraded' ? 'partial' : state,
    healthStatus: state,
    fetchKind: 'health_check',
    checkedAt: health.checkedAt ?? new Date().toISOString(),
    latencyMs: health.latencyMs ?? health.averageLatency,
    lastSuccessfulFetch: health.lastSuccessfulFetch,
    lastFailedFetch: health.lastFailedFetch,
    rateLimitState: health.rateLimitState,
    disabledUntil: health.disabledUntil,
    errorCode: health.errorCode,
    errorSummary: health.lastError,
  });
}

export async function getStoredProviderHealth(): Promise<ProviderHealthResult[]> {
  const admin = createServerSupabaseAdmin();
  if (!admin) return [];
  try {
    const [sources, health] = await Promise.all([
      admin.from('market_news_sources').select('source_id,source_name,enabled,supported_markets,updated_at').order('priority', { ascending: true }),
      admin.from('market_news_source_health').select('source_id,health_status,last_successful_fetch,last_failed_fetch,last_latency_ms,average_latency_ms,success_count,failure_count,rate_limit_state,disabled_until,latest_error_code,latest_error_summary,updated_at'),
    ]);
    if (sources.error || health.error) return [];
    const healthBySource = new Map((health.data ?? []).map(row => [String(row.source_id), asRecord(row)]));
    return (sources.data ?? []).map(source => {
      const current = healthBySource.get(String(source.source_id)) ?? {};
      const enabled = source.enabled !== false;
      const successCount = asNonNegativeInteger(current.success_count);
      const failureCount = asNonNegativeInteger(current.failure_count);
      const totalCount = successCount + failureCount;
      return {
        providerId: String(source.source_id),
        providerName: asString(source.source_name, String(source.source_id)),
        enabled,
        healthStatus: (enabled ? asString(current.health_status, 'unknown') : 'disabled') as ProviderHealthResult['healthStatus'],
        status: (enabled ? asString(current.health_status, 'unknown') : 'disabled') as ProviderHealthResult['status'],
        checkedAt: validIso(current.updated_at, validIso(source.updated_at, new Date(0).toISOString())) ?? new Date(0).toISOString(),
        latencyMs: current.last_latency_ms == null ? null : asNonNegativeInteger(current.last_latency_ms),
        lastSuccessfulFetch: validIso(current.last_successful_fetch),
        lastFailedFetch: validIso(current.last_failed_fetch),
        averageLatency: current.average_latency_ms == null ? 0 : asNonNegativeInteger(current.average_latency_ms),
        failureCount,
        successRate: totalCount ? successCount / totalCount : null,
        failureRate: totalCount ? failureCount / totalCount : null,
        lastError: safeErrorSummary(current.latest_error_summary),
        rateLimitState: asNullableString(current.rate_limit_state),
        disabledUntil: validIso(current.disabled_until),
        supportedMarkets: uniqueStrings(source.supported_markets, { upper: true }),
        errorCode: asNullableString(current.latest_error_code) as ProviderHealthResult['errorCode'],
      };
    });
  } catch {
    return [];
  }
}

export const getProviderHealth = getStoredProviderHealth;

export async function getMarketNewsAdminProviderStatus(
  suppliedAdmin?: AdminClient,
): Promise<MarketNewsAdminStatusResult> {
  const admin = suppliedAdmin ?? createServerSupabaseAdmin();
  const generatedAt = new Date().toISOString();
  if (!admin) return { providers: [], available: false, generatedAt };

  try {
    const [sources, health, logs] = await Promise.all([
      admin.from('market_news_sources').select('source_id,source_name,source_type,source_domain,reliability_score,priority,official_source,supported_markets,enabled').order('priority', { ascending: true }).order('source_name', { ascending: true }),
      admin.from('market_news_source_health').select('source_id,health_status,last_successful_fetch,last_failed_fetch,average_latency_ms,failure_count,rate_limit_state,disabled_until,latest_error_summary'),
      admin.from('market_news_fetch_logs').select('source_id,status,started_at,articles_fetched,articles_rejected,articles_deduplicated,articles_saved').order('started_at', { ascending: false }).limit(1000),
    ]);
    if (sources.error) return { providers: [], available: false, generatedAt };

    const healthBySource = new Map((health.error ? [] : health.data ?? []).map(row => [String(row.source_id), asRecord(row)]));
    const latestLogBySource = new Map<string, UnknownRecord>();
    for (const log of logs.error ? [] : logs.data ?? []) {
      const sourceId = String(log.source_id);
      if (!latestLogBySource.has(sourceId)) latestLogBySource.set(sourceId, asRecord(log));
    }

    const providers = (sources.data ?? []).map(source => {
      const current = healthBySource.get(String(source.source_id)) ?? {};
      const latest = latestLogBySource.get(String(source.source_id));
      return {
        providerId: String(source.source_id),
        providerName: asString(source.source_name, String(source.source_id)),
        sourceType: asString(source.source_type, 'other'),
        sourceDomain: asNullableString(source.source_domain),
        reliabilityScore: clamp(source.reliability_score, 0, 1, 0.5),
        priority: Math.min(5, Math.max(1, Math.trunc(asNumber(source.priority, 4)))),
        officialSource: source.official_source === true,
        supportedMarkets: uniqueStrings(source.supported_markets, { upper: true }),
        enabled: source.enabled !== false,
        healthStatus: source.enabled === false ? 'disabled' : asString(current.health_status, 'unknown'),
        lastSuccessfulFetch: validIso(current.last_successful_fetch),
        lastFailedFetch: validIso(current.last_failed_fetch),
        averageLatency: current.average_latency_ms == null ? null : asNonNegativeInteger(current.average_latency_ms),
        failureCount: asNonNegativeInteger(current.failure_count),
        rateLimitState: asString(current.rate_limit_state, 'unknown'),
        disabledUntil: validIso(current.disabled_until),
        latestErrorSummary: safeErrorSummary(current.latest_error_summary),
        latestFetch: latest ? {
          startedAt: validIso(latest.started_at),
          status: asString(latest.status, 'unknown'),
          fetched: asNonNegativeInteger(latest.articles_fetched),
          rejected: asNonNegativeInteger(latest.articles_rejected),
          deduplicated: asNonNegativeInteger(latest.articles_deduplicated),
          saved: asNonNegativeInteger(latest.articles_saved),
        } : null,
      } satisfies MarketNewsAdminProviderStatus;
    });

    return { providers, available: !health.error && !logs.error, generatedAt };
  } catch {
    return { providers: [], available: false, generatedAt };
  }
}

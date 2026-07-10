import 'server-only';

import { randomUUID } from 'node:crypto';
import { createFinancialNewsProviders } from './registry';
import {
  areDuplicateStories,
  choosePrimarySource,
  clusterRelatedStories,
  detectConflicts,
  normalizeNewsItem,
  processNewsItems,
} from './processing';
import { logMarketNewsEvent } from './logger';
import {
  persistNewsItems,
  persistProviderFetch,
  searchStoredNews,
} from './persistence';
import { publisherNetworkKey } from './providers/shared';
import type {
  ConsolidatedNewsStory,
  FinancialNewsProvider,
  NewsFetchParams,
  NormalizedNewsItem,
  ProviderCoverage,
  ProviderHealthResult,
} from './types';

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;
const DEFAULT_CONCURRENCY = 4;
const CACHE_TTL_MS = 90_000;
const CACHE_STALE_MS = 15 * 60_000;
const INDEXED_FRESHNESS_MS = 30 * 60_000;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 5 * 60_000;

type ProviderRuntimeState = {
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  averageLatency: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'rate_limited' | 'disabled';
  disabledUntil: string | null;
  lastErrorCode: string | null;
  rateLimitState: string | null;
};

type ProviderFetchOutcome = {
  provider: FinancialNewsProvider;
  items: NormalizedNewsItem[];
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  errorCode: string | null;
  rateLimited: boolean;
  retryAfterMs: number;
};

export type FinancialNewsAggregationOptions = {
  page?: number;
  pageSize?: number;
  sort?: 'latest' | 'importance' | 'official' | 'relevance';
  mode?: 'search' | 'ingest';
  forceExternal?: boolean;
  providers?: FinancialNewsProvider[];
  skipPersistence?: boolean;
  requestId?: string;
};

export type FinancialNewsAggregationResult = {
  stories: ConsolidatedNewsStory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  appliedFilters: Record<string, unknown>;
  providerCoverage: ProviderCoverage[];
  partialFailure: boolean;
  liveUpdatesAvailable: boolean;
  storedFallbackUsed: boolean;
  lastUpdated: string | null;
  lastSuccessfulUpdate: string | null;
  cacheStatus: 'hit' | 'miss' | 'stale' | 'stored';
  searchDurationMs: number;
  warnings: string[];
};

type CacheEntry = {
  value: FinancialNewsAggregationResult;
  expiresAt: number;
  staleUntil: number;
};

const runtimeHealth = new Map<string, ProviderRuntimeState>();
const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<FinancialNewsAggregationResult>>();

function clampInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.trunc(parsed))) : fallback;
}

function configuredConcurrency() {
  return clampInteger(process.env.MARKET_NEWS_MAX_CONCURRENCY, DEFAULT_CONCURRENCY, 1, 8);
}

function initialHealth(provider: FinancialNewsProvider): ProviderRuntimeState {
  return {
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    lastSuccessfulFetch: null,
    lastFailedFetch: null,
    averageLatency: 0,
    healthStatus: provider.enabled === false ? 'disabled' : 'healthy',
    disabledUntil: null,
    lastErrorCode: null,
    rateLimitState: null,
  };
}

function providerState(provider: FinancialNewsProvider) {
  const current = runtimeHealth.get(provider.id) ?? initialHealth(provider);
  runtimeHealth.set(provider.id, current);
  return current;
}

function stableParams(params: Partial<NewsFetchParams>, options: FinancialNewsAggregationOptions) {
  const normalized = {
    query: params.query ?? '',
    symbols: [...(params.symbols ?? [])].sort(),
    companyNames: [...(params.companyNames ?? [])].sort(),
    marketCodes: [...(params.marketCodes ?? [])].sort(),
    exchangeCodes: [...(params.exchangeCodes ?? [])].sort(),
    countries: [...(params.countries ?? [])].sort(),
    sectors: [...(params.sectors ?? [])].sort(),
    industries: [...(params.industries ?? [])].sort(),
    assetTypes: [...(params.assetTypes ?? [])].sort(),
    currencies: [...(params.currencies ?? [])].sort(),
    languages: [...(params.languages ?? [])].sort(),
    verificationStatuses: [...(params.verificationStatuses ?? [])].sort(),
    impactLevels: [...(params.impactLevels ?? [])].sort(),
    sentiments: [...(params.sentiments ?? [])].sort(),
    isins: [...(params.isins ?? [])].sort(),
    indexCodes: [...(params.indexCodes ?? [])].sort(),
    commodities: [...(params.commodities ?? [])].sort(),
    eventTypes: [...(params.eventTypes ?? [])].sort(),
    sourceTypes: [...(params.sourceTypes ?? [])].sort(),
    sourceIds: [...(params.sourceIds ?? [])].sort(),
    sourceNames: [...(params.sourceNames ?? [])].sort(),
    language: params.language ?? '',
    from: params.from ?? '',
    to: params.to ?? '',
    officialOnly: params.officialOnly === true,
    strictEntityFilter: params.strictEntityFilter === true,
    page: options.page ?? 1,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    sort: options.sort ?? 'latest',
  };
  return JSON.stringify(normalized);
}

function errorMetadata(error: unknown) {
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const code = String(record.code ?? record.name ?? 'provider_failed').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 80);
  const retryAfterMsDirect = Number(record.retryAfterMs ?? record.retry_after_ms ?? 0);
  const retryAfterSeconds = Number(record.retryAfterSeconds ?? record.retry_after_seconds ?? 0);
  const retryAfterMs = retryAfterMsDirect > 0 ? retryAfterMsDirect : retryAfterSeconds > 0 ? retryAfterSeconds * 1_000 : 0;
  const status = Number(record.status ?? record.httpStatus ?? 0);
  return {
    code: code || 'provider_failed',
    retryAfterMs: Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 0,
    rateLimited: status === 429 || code.includes('rate_limit'),
    retryable: status === 408 || status === 425 || status === 429 || status >= 500 || code.includes('timeout') || code.includes('unavailable'),
  };
}

function wait(delayMs: number) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function updateProviderHealth(provider: FinancialNewsProvider, outcome: ProviderFetchOutcome) {
  const current = providerState(provider);
  const now = new Date().toISOString();
  const requestCount = current.successCount + current.failureCount;
  current.averageLatency = Math.round(((current.averageLatency * requestCount) + outcome.durationMs) / Math.max(1, requestCount + 1));

  if (outcome.status === 'success') {
    current.successCount += 1;
    current.consecutiveFailures = 0;
    current.lastSuccessfulFetch = now;
    current.healthStatus = 'healthy';
    current.disabledUntil = null;
    current.lastErrorCode = null;
    current.rateLimitState = null;
  } else if (outcome.status === 'failed') {
    current.failureCount += 1;
    current.consecutiveFailures += 1;
    current.lastFailedFetch = now;
    current.lastErrorCode = outcome.errorCode;
    current.healthStatus = outcome.rateLimited ? 'rate_limited' : current.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD ? 'unhealthy' : 'degraded';
    if (current.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD || outcome.rateLimited) {
      current.disabledUntil = new Date(Date.now() + Math.max(CIRCUIT_OPEN_MS, outcome.retryAfterMs)).toISOString();
      current.rateLimitState = outcome.rateLimited ? 'temporarily_limited' : null;
    }
  }
  runtimeHealth.set(provider.id, current);
}

function circuitOpen(provider: FinancialNewsProvider) {
  if (provider.enabled === false) return true;
  const disabledUntil = providerState(provider).disabledUntil;
  if (!disabledUntil) return false;
  if (new Date(disabledUntil).getTime() <= Date.now()) {
    const state = providerState(provider);
    state.disabledUntil = null;
    state.healthStatus = 'degraded';
    runtimeHealth.set(provider.id, state);
    return false;
  }
  return true;
}

export async function fetchFromProvider(provider: FinancialNewsProvider, params: NewsFetchParams): Promise<ProviderFetchOutcome> {
  if (circuitOpen(provider)) {
    return { provider, items: [], status: 'skipped', durationMs: 0, errorCode: 'circuit_open', rateLimited: providerState(provider).healthStatus === 'rate_limited', retryAfterMs: 0 };
  }

  const startedAt = Date.now();
  logMarketNewsEvent('provider_fetch_started', { providerId: provider.id, sourceType: provider.sourceType, markets: params.marketCodes ?? [] });
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const items = params.query && provider.searchNews
        ? await provider.searchNews(params)
        : await provider.fetchNews(params);
      const outcome: ProviderFetchOutcome = {
        provider,
        items: Array.isArray(items) ? items : [],
        status: 'success',
        durationMs: Date.now() - startedAt,
        errorCode: null,
        rateLimited: false,
        retryAfterMs: 0,
      };
      updateProviderHealth(provider, outcome);
      logMarketNewsEvent('provider_fetch_completed', { providerId: provider.id, durationMs: outcome.durationMs, articleCount: outcome.items.length, attempt: attempt + 1 });
      return outcome;
    } catch (error) {
      lastError = error;
      const meta = errorMetadata(error);
      if (!meta.retryable || meta.rateLimited || attempt === 1) break;
      await wait(150 * (2 ** attempt));
    }
  }

  const meta = errorMetadata(lastError);
  const outcome: ProviderFetchOutcome = {
    provider,
    items: [],
    status: 'failed',
    durationMs: Date.now() - startedAt,
    errorCode: meta.code,
    rateLimited: meta.rateLimited,
    retryAfterMs: meta.retryAfterMs,
  };
  updateProviderHealth(provider, outcome);
  logMarketNewsEvent('provider_fetch_failed', { providerId: provider.id, durationMs: outcome.durationMs, code: meta.code, rateLimited: meta.rateLimited });
  return outcome;
}

export async function fetchFromAllProviders(providers: FinancialNewsProvider[], params: NewsFetchParams) {
  const results = new Array<ProviderFetchOutcome>(providers.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < providers.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchFromProvider(providers[index], params);
    }
  };
  await Promise.allSettled(Array.from({ length: Math.min(configuredConcurrency(), Math.max(1, providers.length)) }, () => worker()));
  return results.filter(Boolean);
}

function coverageFor(outcome: ProviderFetchOutcome): ProviderCoverage {
  return {
    providerId: outcome.provider.id,
    providerName: outcome.provider.name,
    sourceType: outcome.provider.sourceType,
    status: outcome.status,
    articleCount: outcome.items.length,
    durationMs: outcome.durationMs,
    errorCode: outcome.errorCode,
    supportedMarkets: outcome.provider.supportedMarkets,
  };
}

function supportingNetwork(source: { sourceNetworkId?: string | null; sourceDomain?: string | null; sourceName: string }) {
  return publisherNetworkKey(source.sourceNetworkId || source.sourceDomain || source.sourceName);
}

function mergeStory(existing: ConsolidatedNewsStory, incoming: ConsolidatedNewsStory): ConsolidatedNewsStory {
  const primary = (choosePrimarySource([existing, incoming]) ?? existing) as ConsolidatedNewsStory;
  const other = primary.id === existing.id ? incoming : existing;
  const candidateSources = [
    ...primary.supportingSources,
    ...other.supportingSources,
    {
      sourceId: other.sourceId,
      sourceName: other.sourceName,
      sourceDomain: other.sourceDomain,
      sourceNetworkId: other.sourceNetworkId,
      originalUrl: other.originalUrl,
      publishedAt: other.publishedAt,
      isOfficial: other.isOfficial,
      sourceType: other.sourceType,
      reliabilityScore: other.sourceReliability,
    },
  ];
  const supportingSources = candidateSources.filter((source, index) => {
    const key = `${supportingNetwork(source)}|${source.originalUrl}`;
    return candidateSources.findIndex(candidate => `${supportingNetwork(candidate)}|${candidate.originalUrl}` === key) === index;
  });
  const independentSourceCount = new Set([supportingNetwork(primary), ...supportingSources.map(supportingNetwork)]).size;
  const credibleNetworks = new Set([
    ...(primary.isOfficial || (primary.sourceType !== 'social_signal' && primary.sourceReliability >= 0.6) ? [supportingNetwork(primary)] : []),
    ...supportingSources
      .filter(source => source.isOfficial || (source.sourceType !== 'social_signal' && source.reliabilityScore >= 0.6))
      .map(supportingNetwork),
  ]);
  const crossRunConflict = detectConflicts([existing, incoming]);
  const conflicting = existing.verificationStatus === 'conflicting' || incoming.verificationStatus === 'conflicting' || crossRunConflict.conflicting;
  const verificationStatus: ConsolidatedNewsStory['verificationStatus'] = conflicting
    ? 'conflicting'
    : primary.isOfficial
      ? 'official'
      : credibleNetworks.size >= 2
        ? 'confirmed'
        : primary.sourceType === 'social_signal' || primary.sourceReliability < 0.5
          ? 'unverified'
          : 'single_source';
  const result: ConsolidatedNewsStory = {
    ...primary,
    id: existing.id,
    duplicateGroupId: existing.id,
    symbols: [...new Set([...existing.symbols, ...incoming.symbols])],
    companyNames: [...new Set([...existing.companyNames, ...incoming.companyNames])],
    marketCodes: [...new Set([...existing.marketCodes, ...incoming.marketCodes])],
    exchangeCodes: [...new Set([...existing.exchangeCodes, ...incoming.exchangeCodes])],
    sectors: [...new Set([...existing.sectors, ...incoming.sectors])],
    supportingSources,
    independentSourceCount,
    corroboratingSourceCount: Math.max(0, credibleNetworks.size - 1),
    verificationStatus,
    conflictSummary: existing.conflictSummary || incoming.conflictSummary || crossRunConflict.code,
    earliestPublishedAt: [existing.earliestPublishedAt, incoming.earliestPublishedAt].sort()[0],
    latestUpdatedAt: [existing.latestUpdatedAt, incoming.latestUpdatedAt].sort().at(-1) ?? primary.latestUpdatedAt,
    importanceScore: Math.max(existing.importanceScore, incoming.importanceScore),
    confidenceScore: Math.max(existing.confidenceScore, incoming.confidenceScore),
  };
  if (conflicting) {
    result.expectedImpact = 'unknown';
    result.impactDirection = 'unknown';
    result.impactHorizon = 'unknown';
    result.impactReason = 'conflicting_sources';
  }
  return result;
}

export function mergeConsolidatedStories(stored: ConsolidatedNewsStory[], incoming: ConsolidatedNewsStory[]) {
  const result = stored.slice();
  for (const story of incoming) {
    const index = result.findIndex(existing => areDuplicateStories(existing, story));
    if (index === -1) result.push(story);
    else result[index] = mergeStory(result[index], story);
  }
  return result;
}

function filterStories(stories: ConsolidatedNewsStory[], params: Partial<NewsFetchParams>) {
  const set = (values: readonly string[] | undefined) => new Set((values ?? []).map(value => value.toLowerCase()));
  const normalizedCompany = (value: string) => value.normalize('NFKC').toLocaleLowerCase('und').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const symbols = set(params.symbols);
  const companyNames = (params.companyNames ?? []).map(normalizedCompany).filter(value => value.length >= 2);
  const markets = set(params.marketCodes);
  const exchanges = set(params.exchangeCodes);
  const sectors = set(params.sectors);
  const countries = set(params.countries);
  const industries = set(params.industries);
  const assetTypes = set(params.assetTypes);
  const currencies = set(params.currencies);
  const languages = set(params.languages);
  const events = set(params.eventTypes);
  const sources = set(params.sourceTypes);
  const sourceIds = set(params.sourceIds);
  const sourceNames = set(params.sourceNames);
  const verification = set(params.verificationStatuses);
  const impacts = set(params.impactLevels);
  const sentiments = set(params.sentiments);
  return stories.filter(story => {
    if (params.officialOnly && !story.isOfficial) return false;
    if (params.strictEntityFilter && symbols.size > 0 && !story.symbols.some(value => symbols.has(value.toLowerCase()))) return false;
    if (companyNames.length > 0 && !story.companyNames.some(value => {
      const candidate = normalizedCompany(value);
      return companyNames.some(requested => candidate === requested || candidate.includes(requested) || requested.includes(candidate));
    })) return false;
    if (markets.size > 0 && !story.marketCodes.some(value => markets.has(value.toLowerCase()))) return false;
    if (exchanges.size > 0 && !story.exchangeCodes.some(value => exchanges.has(value.toLowerCase()))) return false;
    if (sectors.size > 0 && !story.sectors.some(value => sectors.has(value.toLowerCase()))) return false;
    if (countries.size > 0 && !story.countries.some(value => countries.has(value.toLowerCase()))) return false;
    if (industries.size > 0 && !story.industries.some(value => industries.has(value.toLowerCase()))) return false;
    if (assetTypes.size > 0 && !story.assetTypes.some(value => assetTypes.has(value.toLowerCase()))) return false;
    if (currencies.size > 0 && !story.currencies.some(value => currencies.has(value.toLowerCase()))) return false;
    if (languages.size > 0 && !languages.has(story.originalLanguage.toLowerCase())) return false;
    if (events.size > 0 && !events.has(story.eventType.toLowerCase())) return false;
    if (sources.size > 0 && !sources.has(story.sourceType.toLowerCase())) return false;
    if (sourceIds.size > 0 && ![story.sourceId, ...story.supportingSources.map(source => source.sourceId)].some(value => sourceIds.has(value.toLowerCase()))) return false;
    if (sourceNames.size > 0 && ![story.sourceName, ...story.supportingSources.map(source => source.sourceName)].some(value => sourceNames.has(value.toLowerCase()))) return false;
    if (verification.size > 0 && !verification.has(story.verificationStatus.toLowerCase())) return false;
    if (impacts.size > 0 && !impacts.has(story.expectedImpact.toLowerCase())) return false;
    if (sentiments.size > 0 && !sentiments.has(story.sentiment.toLowerCase())) return false;
    return true;
  });
}

function sortStories(stories: ConsolidatedNewsStory[], sort: FinancialNewsAggregationOptions['sort']) {
  return stories.sort((left, right) => {
    if (sort === 'official' && Number(right.isOfficial) !== Number(left.isOfficial)) return Number(right.isOfficial) - Number(left.isOfficial);
    if (sort === 'importance' && right.importanceScore !== left.importanceScore) return right.importanceScore - left.importanceScore;
    if (sort === 'relevance' && right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;
    return new Date(right.latestUpdatedAt || right.publishedAt).getTime() - new Date(left.latestUpdatedAt || left.publishedAt).getTime();
  });
}

function appliedFilters(params: Partial<NewsFetchParams>) {
  return {
    query: params.query ?? null,
    symbols: params.symbols ?? [],
    companyNames: params.companyNames ?? [],
    strictEntityFilter: params.strictEntityFilter === true,
    markets: params.marketCodes ?? [],
    exchanges: params.exchangeCodes ?? [],
    countries: params.countries ?? [],
    sectors: params.sectors ?? [],
    industries: params.industries ?? [],
    assetTypes: params.assetTypes ?? [],
    currencies: params.currencies ?? [],
    sourceLanguages: params.languages ?? [],
    eventTypes: params.eventTypes ?? [],
    sourceTypes: params.sourceTypes ?? [],
    sourceIds: params.sourceIds ?? [],
    sourceNames: params.sourceNames ?? [],
    verificationStatuses: params.verificationStatuses ?? [],
    impactLevels: params.impactLevels ?? [],
    sentiments: params.sentiments ?? [],
    language: params.language ?? null,
    from: params.from ?? null,
    to: params.to ?? null,
    officialOnly: params.officialOnly === true,
  };
}

function newestTimestamp(stories: ConsolidatedNewsStory[]) {
  return stories.map(story => story.latestUpdatedAt || story.publishedAt).filter(Boolean).sort().at(-1) ?? null;
}

function resultFromStories(options: {
  stories: ConsolidatedNewsStory[];
  params: Partial<NewsFetchParams>;
  aggregation: FinancialNewsAggregationOptions;
  coverage: ProviderCoverage[];
  startedAt: number;
  storedFallbackUsed: boolean;
  cacheStatus: FinancialNewsAggregationResult['cacheStatus'];
  lastSuccessfulUpdate?: string | null;
  totalOverride?: number;
  prePaginated?: boolean;
}) {
  const page = clampInteger(options.aggregation.page, 1, 1, 10_000);
  const pageSize = clampInteger(options.aggregation.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const filtered = sortStories(filterStories(options.stories, options.params), options.aggregation.sort ?? 'latest');
  const total = options.totalOverride ?? filtered.length;
  const start = (page - 1) * pageSize;
  const successCount = options.coverage.filter(item => item.status === 'success').length;
  const failedCount = options.coverage.filter(item => item.status === 'failed').length;
  const skippedCount = options.coverage.filter(item => item.status === 'skipped').length;
  const attemptedCount = options.coverage.length;
  const partialFailure = successCount > 0 && (failedCount > 0 || skippedCount > 0);
  const lastSuccessAt = Date.parse(options.lastSuccessfulUpdate ?? '');
  const indexedStoreFresh = Number.isFinite(lastSuccessAt) && Date.now() - lastSuccessAt <= INDEXED_FRESHNESS_MS;
  const liveUpdatesAvailable = successCount > 0
    || (attemptedCount === 0 && options.stories.length > 0 && indexedStoreFresh && !options.storedFallbackUsed);
  const warnings = [
    ...(partialFailure ? ['PARTIAL_PROVIDER_COVERAGE'] : []),
    ...(!liveUpdatesAvailable && options.storedFallbackUsed ? ['LIVE_UPDATES_UNAVAILABLE_STORED_RESULTS'] : []),
    ...(!liveUpdatesAvailable && !options.storedFallbackUsed && attemptedCount > 0 ? ['ALL_PROVIDERS_UNAVAILABLE'] : []),
  ];
  return {
    stories: options.prePaginated ? filtered.slice(0, pageSize) : filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    appliedFilters: appliedFilters(options.params),
    providerCoverage: options.coverage,
    partialFailure,
    liveUpdatesAvailable,
    storedFallbackUsed: options.storedFallbackUsed,
    lastUpdated: newestTimestamp(filtered),
    lastSuccessfulUpdate: options.lastSuccessfulUpdate ?? newestTimestamp(filtered),
    cacheStatus: options.cacheStatus,
    searchDurationMs: Date.now() - options.startedAt,
    warnings,
  } satisfies FinancialNewsAggregationResult;
}

async function runAggregation(params: NewsFetchParams, options: FinancialNewsAggregationOptions): Promise<FinancialNewsAggregationResult> {
  const startedAt = Date.now();
  const runId = options.requestId || randomUUID();
  const page = clampInteger(options.page, 1, 1, 10_000);
  const pageSize = clampInteger(options.pageSize, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const stored = await searchStoredNews({
    ...params,
    symbols: params.strictEntityFilter ? params.symbols : [],
    companyNames: params.companyNames,
    page,
    pageSize,
    sort: options.sort ?? 'latest',
  });

  const providers = options.providers ?? createFinancialNewsProviders(params);
  const storedPageEnd = ((page - 1) * pageSize) + stored.stories.length;
  const storedPageComplete = stored.available && (
    stored.stories.length >= pageSize
    || (stored.total > 0 && storedPageEnd >= stored.total)
  );
  // External providers return a fresh result window rather than a stable,
  // cursor-addressable global corpus. Merge that window only into page one;
  // later pages are served from the indexed store populated by ingestion/page
  // one searches, preventing double offsets and duplicate/missing rows.
  const shouldFetchExternal = options.mode === 'ingest'
    || (page === 1 && (options.forceExternal === true || !storedPageComplete));
  let outcomes: ProviderFetchOutcome[] = [];
  let externalItems: NormalizedNewsItem[] = [];
  let externalStories: ConsolidatedNewsStory[] = [];
  let rejectedItems: Array<{ item: NormalizedNewsItem; reason: string }> = [];

  if (shouldFetchExternal && providers.length > 0) {
    outcomes = await fetchFromAllProviders(providers, params);
    externalItems = outcomes.flatMap(outcome => outcome.items);
    const processed = processNewsItems(externalItems, params);
    externalItems = processed.items;
    externalStories = processed.stories;
    rejectedItems = processed.rejected;
  }

  const coverage = outcomes.map(coverageFor);
  const successfulOutcomes = outcomes.filter(outcome => outcome.status === 'success');
  const liveSucceeded = successfulOutcomes.length > 0;
  const liveFetchAttempted = outcomes.length > 0;
  let stories = mergeConsolidatedStories(stored.stories, externalStories);
  const novelExternalStoryCount = Math.max(0, stories.length - stored.stories.length);
  let storedFallbackUsed = stored.stories.length > 0 && liveFetchAttempted && !liveSucceeded;

  let persistenceAvailable = false;
  if (!options.skipPersistence && externalItems.length > 0) {
    const persisted = await persistNewsItems(externalItems, stories, runId);
    persistenceAvailable = persisted.available;
    logMarketNewsEvent('news_saved', { runId, saved: persisted.saved, deduplicated: persisted.deduplicated, persistenceAvailable: persisted.available });
  }
  if (!options.skipPersistence && outcomes.length > 0) {
    await Promise.allSettled(outcomes.map(outcome => {
      const acceptedItems = externalItems.filter(item => item.providerId === outcome.provider.id);
      const rejectedCount = rejectedItems.filter(entry => entry.item.providerId === outcome.provider.id).length;
      const providerClusterIds = new Set(acceptedItems.flatMap(item => {
        const story = externalStories.find(candidate => areDuplicateStories(item, candidate));
        return story ? [story.id] : [];
      }));
      const runtime = providerState(outcome.provider);
      return persistProviderFetch({
      runId,
      providerId: outcome.provider.id,
      providerName: outcome.provider.name,
      sourceId: outcome.provider.sourceId,
      sourceName: outcome.provider.sourceName,
      sourceType: outcome.provider.sourceType,
      sourceDomain: outcome.provider.sourceDomain,
      sourceNetwork: outcome.provider.sourceNetworkId,
      reliabilityScore: outcome.provider.reliabilityScore,
      priority: outcome.provider.priority,
      officialSource: outcome.provider.officialSource,
      supportedMarkets: outcome.provider.supportedMarkets,
      fetchKind: options.mode === 'ingest' ? 'background' : 'on_demand',
      status: outcome.status,
      healthStatus: runtime.healthStatus,
      lastSuccessfulFetch: runtime.lastSuccessfulFetch,
      lastFailedFetch: runtime.lastFailedFetch,
      disabledUntil: runtime.disabledUntil,
      latencyMs: outcome.durationMs,
      fetchedCount: outcome.items.length,
      acceptedCount: acceptedItems.length,
      rejectedCount,
      deduplicatedCount: Math.max(0, acceptedItems.length - providerClusterIds.size),
      savedCount: persistenceAvailable ? acceptedItems.length : 0,
      errorCode: outcome.errorCode,
      rateLimitState: runtime.rateLimitState ?? (outcome.rateLimited ? 'limited' : 'available'),
      requestMarketCodes: params.marketCodes ?? [],
      });
    }));
  }

  const cacheKey = stableParams(params, options);
  if (!liveSucceeded && stored.stories.length === 0) {
    const stale = responseCache.get(cacheKey);
    if (stale && stale.staleUntil > Date.now()) {
      const failedOrSkipped = coverage.filter(item => item.status !== 'success').length;
      return {
        ...stale.value,
        providerCoverage: coverage.length > 0 ? coverage : stale.value.providerCoverage,
        cacheStatus: 'stale',
        liveUpdatesAvailable: false,
        storedFallbackUsed: false,
        partialFailure: coverage.some(item => item.status === 'success') && failedOrSkipped > 0,
        searchDurationMs: Date.now() - startedAt,
        warnings: [...new Set([...stale.value.warnings, 'LIVE_UPDATES_UNAVAILABLE_CACHED_RESULTS'])],
      };
    }
  }

  if (options.mode === 'ingest' && stories.length === 0 && externalStories.length > 0) stories = clusterRelatedStories(externalItems.map(item => normalizeNewsItem(item, params)));
  storedFallbackUsed = storedFallbackUsed || (liveFetchAttempted && !liveSucceeded && stored.stories.length > 0);
  const result = resultFromStories({
    stories,
    params,
    aggregation: { ...options, pageSize },
    coverage,
    startedAt,
    storedFallbackUsed,
    cacheStatus: stored.available && !shouldFetchExternal ? 'stored' : storedFallbackUsed ? 'stored' : 'miss',
    lastSuccessfulUpdate: liveSucceeded ? new Date().toISOString() : stored.lastSuccessfulUpdate,
    totalOverride: stored.available
      ? shouldFetchExternal
        ? stored.total + novelExternalStoryCount
        : stored.total
      : undefined,
    prePaginated: !shouldFetchExternal && stored.available,
  });
  responseCache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS, staleUntil: Date.now() + CACHE_STALE_MS });
  return result;
}

export async function aggregateFinancialNews(params: NewsFetchParams, options: FinancialNewsAggregationOptions = {}) {
  const cacheKey = stableParams(params, options);
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() && !options.forceExternal && options.mode !== 'ingest') {
    return { ...cached.value, cacheStatus: 'hit' as const, searchDurationMs: 0 };
  }
  const pending = inFlight.get(cacheKey);
  if (pending && !options.forceExternal) return pending;
  const request = runAggregation(params, options).finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, request);
  return request;
}

export function getRuntimeProviderHealth(providers: FinancialNewsProvider[] = createFinancialNewsProviders({} as NewsFetchParams)): ProviderHealthResult[] {
  return providers.map(provider => {
    const state = providerState(provider);
    const total = state.successCount + state.failureCount;
    return {
      providerId: provider.id,
      providerName: provider.name,
      enabled: provider.enabled !== false,
      healthStatus: state.healthStatus,
      lastSuccessfulFetch: state.lastSuccessfulFetch,
      lastFailedFetch: state.lastFailedFetch,
      averageLatency: state.averageLatency,
      failureCount: state.failureCount,
      successRate: total ? state.successCount / total : null,
      failureRate: total ? state.failureCount / total : null,
      lastError: state.lastErrorCode,
      rateLimitState: state.rateLimitState,
      disabledUntil: state.disabledUntil,
      supportedMarkets: provider.supportedMarkets,
    };
  });
}

export function resetMarketNewsRuntimeForTests() {
  runtimeHealth.clear();
  responseCache.clear();
  inFlight.clear();
}

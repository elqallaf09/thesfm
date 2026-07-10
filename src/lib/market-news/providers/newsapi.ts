import 'server-only';

import {
  normalizeCanonicalUrl,
  safeFetchText,
  safePublicHttpUrl,
  sanitizeExternalText,
  sourceDomainFromUrl,
} from '../security';
import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
  type FinancialNewsProvider,
  type NewsFetchParams,
  type NewsSearchParams,
  type NormalizedNewsItem,
  type ProviderRateLimitState,
} from '../types';
import {
  asProviderError,
  clampProviderLimit,
  cleanCredential,
  contentHash,
  deduplicateProviderItems,
  itemMatchesQuery,
  itemWithinDateRange,
  normalizeProviderTitle,
  publisherEvidenceProfile,
  publisherNetworkKey,
  publisherSourceId,
  ProviderRuntimeState,
  stableProviderId,
  strictIsoDate,
  uniqueStrings,
  validateDateRange,
} from './shared';

const PROVIDER_ID = 'newsapi';
const PROVIDER_NAME = 'NewsAPI';
const NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything';
const JSON_CONTENT_TYPES = ['application/json', 'application/problem+json', 'text/json'] as const;
const SUPPORTED_LANGUAGES = new Set(['ar', 'de', 'en', 'es', 'fr', 'he', 'it', 'nl', 'no', 'pt', 'ru', 'sv', 'ud', 'zh']);
const DEFAULT_QUERY = '(stocks OR shares OR earnings OR financial markets OR central bank)';

type NewsApiArticle = {
  source?: {
    id?: string | null;
    name?: string | null;
  } | null;
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsApiPayload = {
  status?: string;
  totalResults?: number;
  articles?: unknown;
};

function safeSearchQuery(params: NewsFetchParams) {
  const requested = sanitizeExternalText(params.query, 240);
  if (requested) return requested;
  const entities = uniqueStrings([
    ...(params.symbols ?? []),
    ...(params.companyNames ?? []),
    ...(params.marketCodes ?? []),
    ...(params.sectors ?? []),
    ...(params.isins ?? []),
    ...(params.indexCodes ?? []),
    ...(params.commodities ?? []),
  ]).slice(0, 12);
  return entities.length > 0 ? entities.map(value => `"${value.replace(/"/g, '')}"`).join(' OR ') : DEFAULT_QUERY;
}

function requestLanguage(params: NewsFetchParams) {
  // `language` is the requested UI/translation locale. Only `languages`
  // explicitly constrains the provider's original article language.
  const language = String(params.languages?.[0] ?? '').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(language) ? language : null;
}

function sourceNetworkId(domain: string | null, sourceId: string, sourceName: string) {
  if (domain) return publisherNetworkKey(domain);
  const value = sourceId || sourceName;
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || PROVIDER_ID;
}

function normalizeArticle(article: NewsApiArticle, params: NewsFetchParams, fetchedAt: string): NormalizedNewsItem | null {
  const title = sanitizeExternalText(article.title, 320);
  const originalUrl = safePublicHttpUrl(article.url, PROVIDER_ID);
  const publishedAt = strictIsoDate(article.publishedAt ?? '');
  if (!title || title === '[Removed]' || !originalUrl || !publishedAt) return null;

  const summary = sanitizeExternalText(article.description, 800) || null;
  const canonicalUrl = normalizeCanonicalUrl(originalUrl, PROVIDER_ID);
  const sourceName = sanitizeExternalText(article.source?.name, 160) || PROVIDER_NAME;
  const upstreamSourceId = sanitizeExternalText(article.source?.id, 100);
  const sourceDomain = sourceDomainFromUrl(originalUrl);
  const networkId = sourceNetworkId(sourceDomain, upstreamSourceId, sourceName);
  const evidence = publisherEvidenceProfile(sourceDomain);
  const normalizedTitle = normalizeProviderTitle(title);

  return {
    id: stableProviderId(PROVIDER_ID, upstreamSourceId, canonicalUrl ?? originalUrl, normalizedTitle),
    providerId: PROVIDER_ID,
    providerName: PROVIDER_NAME,
    canonicalUrl,
    originalUrl,
    imageUrl: safePublicHttpUrl(article.urlToImage, PROVIDER_ID),
    title,
    normalizedTitle,
    summary,
    originalLanguage: requestLanguage(params) ?? 'unknown',
    translatedLanguage: null,
    translatedTitle: null,
    translatedSummary: null,
    sourceId: publisherSourceId(networkId),
    sourceName,
    sourceType: evidence.sourceType,
    sourceDomain,
    sourceNetworkId: networkId,
    sourceNetwork: networkId,
    sourceReliability: evidence.reliability,
    sourcePriority: 3,
    isOfficial: false,
    publishedAt,
    updatedAt: null,
    fetchedAt,
    marketCodes: [],
    exchangeCodes: [],
    countries: [],
    sectors: [],
    industries: [],
    // NewsAPI is a text-search provider; entity resolution must verify matches later.
    symbols: [],
    companyNames: [],
    assetTypes: [],
    currencies: [],
    eventType: 'unknown',
    relevanceScore: 0,
    importanceScore: 0,
    entityConfidenceScore: 0,
    entityConfidence: 0,
    confidenceScore: evidence.reliability,
    sentiment: 'unknown',
    expectedImpact: 'unknown',
    impactDirection: 'unknown',
    impactHorizon: 'unknown',
    impactReason: null,
    verificationStatus: 'single_source',
    corroboratingSourceCount: 0,
    duplicateGroupId: null,
    contentHash: contentHash(title, summary, publishedAt),
    eventFingerprint: null,
    processingStatus: 'normalized',
    processingVersion: null,
  };
}

export class NewsApiFinancialNewsProvider implements FinancialNewsProvider {
  readonly id = PROVIDER_ID;
  readonly name = PROVIDER_NAME;
  readonly sourceId = PROVIDER_ID;
  readonly sourceName = PROVIDER_NAME;
  readonly sourceType = 'market_data_provider' as const;
  readonly sourceDomain = 'newsapi.org';
  readonly sourceNetworkId = 'newsapi.org';
  readonly sourceNetwork = 'newsapi.org';
  readonly reliabilityScore = 0.76;
  readonly priority = 3;
  readonly officialSource = false;
  readonly supportedMarkets = ['GLOBAL'];
  readonly enabled = true;

  private readonly apiKey: string;
  private readonly runtime = new ProviderRuntimeState(true);

  constructor(apiKey: string) {
    const credential = cleanCredential(apiKey);
    if (!credential) {
      throw new FinancialNewsProviderError(PROVIDER_ID, FinancialNewsProviderErrorCode.NOT_CONFIGURED);
    }
    this.apiKey = credential;
  }

  get lastSuccessfulFetch() {
    return this.runtime.lastSuccessfulFetch;
  }

  get lastFailedFetch() {
    return this.runtime.lastFailedFetch;
  }

  get averageLatency() {
    return this.runtime.averageLatency;
  }

  get healthStatus() {
    return this.runtime.healthStatus;
  }

  get failureCount() {
    return this.runtime.failureCount;
  }

  get rateLimitState(): ProviderRateLimitState {
    return this.runtime.rateLimitState;
  }

  get disabledUntil() {
    return this.runtime.disabledUntil;
  }

  async fetchNews(params: NewsFetchParams) {
    return this.load(params);
  }

  async searchNews(params: NewsSearchParams | NewsFetchParams) {
    return this.load(params);
  }

  async healthCheck() {
    try {
      await this.load({ query: 'financial markets', limit: 1, forceRefresh: true });
    } catch {
      // Runtime state already contains a credential-safe error code.
    }
    return this.runtime.health(this.id, this.name, true, this.supportedMarkets);
  }

  private requestUrl(params: NewsFetchParams) {
    const url = new URL(NEWS_API_ENDPOINT);
    url.searchParams.set('q', safeSearchQuery(params));
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', String(clampProviderLimit(params.limit, 50, 100)));
    url.searchParams.set('page', String(Math.min(5, Math.max(1, Math.trunc(params.page ?? 1)))));
    if (params.from) url.searchParams.set('from', new Date(params.from).toISOString());
    if (params.to) url.searchParams.set('to', new Date(params.to).toISOString());
    const language = requestLanguage(params);
    if (language) url.searchParams.set('language', language);
    return url;
  }

  private async load(params: NewsFetchParams) {
    validateDateRange(params, this.id);
    const startedAt = Date.now();
    try {
      const response = await safeFetchText(this.requestUrl(params), {
        providerId: this.id,
        timeoutMs: 8_000,
        maxBytes: 3 * 1024 * 1024,
        maxRedirects: 0,
        allowedContentTypes: JSON_CONTENT_TYPES,
        cache: params.forceRefresh ? 'no-store' : undefined,
        revalidateSeconds: params.forceRefresh ? undefined : 180,
        signal: params.signal,
        headers: {
          accept: 'application/json',
          'x-api-key': this.apiKey,
        },
      });
      let payload: NewsApiPayload;
      try {
        payload = JSON.parse(response.text) as NewsApiPayload;
      } catch {
        throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
      }
      if (payload.status !== 'ok' || !Array.isArray(payload.articles)) {
        throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
      }

      const fetchedAt = new Date().toISOString();
      const items = (payload.articles as NewsApiArticle[]).flatMap(article => {
        const item = normalizeArticle(article, params, fetchedAt);
        return item ? [item] : [];
      });
      this.runtime.recordSuccess(startedAt);
      return deduplicateProviderItems(items)
        .filter(item => itemWithinDateRange(item, params) && itemMatchesQuery(item, params.query))
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
        .slice(0, clampProviderLimit(params.limit));
    } catch (error) {
      const providerError = asProviderError(error, this.id);
      this.runtime.recordFailure(startedAt, providerError);
      throw providerError;
    }
  }
}

export function createNewsApiProvider(apiKey: string): FinancialNewsProvider {
  return new NewsApiFinancialNewsProvider(apiKey);
}

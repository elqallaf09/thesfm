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
  cleanSymbol,
  contentHash,
  deduplicateProviderItems,
  defaultProviderDateRange,
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

const PROVIDER_ID = 'finnhub';
const PROVIDER_NAME = 'Finnhub';
const MAX_COMPANY_SYMBOLS = 5;
const JSON_CONTENT_TYPES = ['application/json', 'application/problem+json', 'text/json'] as const;

type FinnhubArticle = {
  id?: number | string | null;
  category?: string | null;
  datetime?: number | null;
  headline?: string | null;
  image?: string | null;
  related?: string | null;
  source?: string | null;
  summary?: string | null;
  url?: string | null;
};

type FinnhubRequest = {
  url: URL;
  requestedSymbol: string | null;
};

function sourceNetworkId(sourceDomain: string | null, sourceName: string) {
  if (sourceDomain) return publisherNetworkKey(sourceDomain);
  return sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || PROVIDER_ID;
}

function normalizeArticle(
  article: FinnhubArticle,
  request: FinnhubRequest,
  params: NewsFetchParams,
  fetchedAt: string,
): NormalizedNewsItem | null {
  const title = sanitizeExternalText(article.headline, 320);
  const originalUrl = safePublicHttpUrl(article.url, PROVIDER_ID);
  const publishedAt = typeof article.datetime === 'number'
    ? strictIsoDate(article.datetime * 1_000)
    : null;
  if (!title || !originalUrl || !publishedAt) return null;

  const summary = sanitizeExternalText(article.summary, 800) || null;
  const canonicalUrl = normalizeCanonicalUrl(originalUrl, PROVIDER_ID);
  const sourceName = sanitizeExternalText(article.source, 160) || PROVIDER_NAME;
  const sourceDomain = sourceDomainFromUrl(originalUrl);
  const networkId = sourceNetworkId(sourceDomain, sourceName);
  const evidence = publisherEvidenceProfile(sourceDomain);
  const relatedSymbols = String(article.related ?? '')
    .split(/[,;\s]+/)
    .map(cleanSymbol)
    .filter(Boolean);
  const symbols = uniqueStrings([request.requestedSymbol, ...relatedSymbols]).slice(0, 12);
  const normalizedTitle = normalizeProviderTitle(title);
  const providerArticleId = sanitizeExternalText(String(article.id ?? ''), 100);

  return {
    id: stableProviderId(PROVIDER_ID, providerArticleId || canonicalUrl || originalUrl, normalizedTitle),
    providerId: PROVIDER_ID,
    providerName: PROVIDER_NAME,
    canonicalUrl,
    originalUrl,
    imageUrl: safePublicHttpUrl(article.image, PROVIDER_ID),
    title,
    normalizedTitle,
    summary,
    originalLanguage: 'en',
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
    symbols,
    companyNames: [],
    assetTypes: ['equity'],
    currencies: [],
    eventType: 'unknown',
    relevanceScore: 0,
    importanceScore: 0,
    entityConfidenceScore: request.requestedSymbol ? 0.9 : symbols.length > 0 ? 0.65 : 0,
    entityConfidence: request.requestedSymbol ? 0.9 : symbols.length > 0 ? 0.65 : 0,
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

export class FinnhubFinancialNewsProvider implements FinancialNewsProvider {
  readonly id = PROVIDER_ID;
  readonly name = PROVIDER_NAME;
  readonly sourceId = PROVIDER_ID;
  readonly sourceName = PROVIDER_NAME;
  readonly sourceType = 'market_data_provider' as const;
  readonly sourceDomain = 'finnhub.io';
  readonly sourceNetworkId = 'finnhub.io';
  readonly sourceNetwork = 'finnhub.io';
  readonly reliabilityScore = 0.8;
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
    return this.loadAndFilter(params, params.query);
  }

  async searchNews(params: NewsSearchParams | NewsFetchParams) {
    return this.loadAndFilter(params, params.query);
  }

  async healthCheck() {
    try {
      await this.loadAndFilter({ limit: 1, forceRefresh: true }, null);
    } catch {
      // Runtime state already contains a credential-safe error code.
    }
    return this.runtime.health(this.id, this.name, true, this.supportedMarkets);
  }

  private requests(params: NewsFetchParams) {
    const range = defaultProviderDateRange();
    const from = params.from ? new Date(params.from).toISOString().slice(0, 10) : range.from;
    const to = params.to ? new Date(params.to).toISOString().slice(0, 10) : range.to;
    const requests: FinnhubRequest[] = [
      {
        url: new URL('https://finnhub.io/api/v1/news?category=general'),
        requestedSymbol: null,
      },
    ];
    const symbols = uniqueStrings(params.symbols?.map(cleanSymbol)).filter(Boolean).slice(0, MAX_COMPANY_SYMBOLS);
    for (const symbol of symbols) {
      const url = new URL('https://finnhub.io/api/v1/company-news');
      url.searchParams.set('symbol', symbol);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      requests.push({ url, requestedSymbol: symbol });
    }
    return requests;
  }

  private async fetchRequest(request: FinnhubRequest, params: NewsFetchParams) {
    const response = await safeFetchText(request.url, {
      providerId: this.id,
      timeoutMs: 8_000,
      maxBytes: 2 * 1024 * 1024,
      maxRedirects: 0,
      allowedContentTypes: JSON_CONTENT_TYPES,
      cache: params.forceRefresh ? 'no-store' : undefined,
      revalidateSeconds: params.forceRefresh ? undefined : 120,
      signal: params.signal,
      headers: {
        accept: 'application/json',
        'x-finnhub-token': this.apiKey,
      },
    });
    let payload: unknown;
    try {
      payload = JSON.parse(response.text);
    } catch {
      throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
    }
    if (!Array.isArray(payload)) {
      throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
    }
    return payload as FinnhubArticle[];
  }

  private async loadAndFilter(params: NewsFetchParams, query: string | null | undefined) {
    validateDateRange(params, this.id);
    const startedAt = Date.now();
    try {
      const requests = this.requests(params);
      const settled = await Promise.allSettled(
        requests.map(async request => ({
          request,
          articles: await this.fetchRequest(request, params),
        })),
      );
      const fulfilled = settled.filter((result): result is PromiseFulfilledResult<{ request: FinnhubRequest; articles: FinnhubArticle[] }> => result.status === 'fulfilled');
      if (fulfilled.length === 0) {
        const firstFailure = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        throw asProviderError(firstFailure?.reason, this.id);
      }

      const fetchedAt = new Date().toISOString();
      const items = fulfilled.flatMap(result => result.value.articles.flatMap(article => {
        const item = normalizeArticle(article, result.value.request, params, fetchedAt);
        return item ? [item] : [];
      }));
      this.runtime.recordSuccess(startedAt);
      if (fulfilled.length < settled.length) this.runtime.healthStatus = 'degraded';
      return deduplicateProviderItems(items)
        .filter(item => itemWithinDateRange(item, params) && itemMatchesQuery(item, query))
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
        .slice(0, clampProviderLimit(params.limit));
    } catch (error) {
      const providerError = asProviderError(error, this.id);
      this.runtime.recordFailure(startedAt, providerError);
      throw providerError;
    }
  }
}

export function createFinnhubNewsProvider(apiKey: string): FinancialNewsProvider {
  return new FinnhubFinancialNewsProvider(apiKey);
}

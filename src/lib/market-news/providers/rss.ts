import 'server-only';

import { parseFinancialNewsFeed, type RssFeedMetadata } from '../rssParser';
import {
  assertSafePublicHttpUrl,
  safeFetchText,
  sourceDomainFromUrl,
} from '../security';
import {
  FinancialNewsProviderError,
  FinancialNewsProviderErrorCode,
  type FinancialAssetType,
  type FinancialNewsProvider,
  type NewsFetchParams,
  type NewsSearchParams,
  type NewsSourceType,
  type NormalizedNewsItem,
  type ProviderRateLimitState,
} from '../types';
import {
  asProviderError,
  clampProviderLimit,
  deduplicateProviderItems,
  itemMatchesQuery,
  itemWithinDateRange,
  ProviderRuntimeState,
  validateDateRange,
} from './shared';

const RSS_CONTENT_TYPES = [
  'application/rss+xml',
  'application/atom+xml',
  'application/xml',
  'text/xml',
  'text/plain',
] as const;

export type RssNewsProviderConfig = {
  id: string;
  name: string;
  url: string;
  sourceType: NewsSourceType;
  priority: number;
  reliabilityScore: number;
  officialSource: boolean;
  supportedMarkets: string[];
  sourceNetworkId?: string | null;
  originalLanguage?: string;
  marketCodes?: string[];
  exchangeCodes?: string[];
  countries?: string[];
  sectors?: string[];
  industries?: string[];
  symbols?: string[];
  companyNames?: string[];
  assetTypes?: FinancialAssetType[];
  currencies?: string[];
  enabled?: boolean;
  revalidateSeconds?: number;
  timeoutMs?: number;
  maxBytes?: number;
};

function overlap(requested: string[] | undefined, supported: string[]) {
  if (!requested?.length || supported.length === 0 || supported.includes('GLOBAL')) return true;
  const supportedSet = new Set(supported.map(value => value.toLowerCase()));
  return requested.some(value => supportedSet.has(value.toLowerCase()));
}

function appliesToRequest(config: RssNewsProviderConfig, params: NewsFetchParams) {
  if (params.officialOnly && !config.officialSource) return false;
  if (params.sourceTypes?.length && !params.sourceTypes.includes(config.sourceType)) return false;
  return overlap(params.marketCodes, config.supportedMarkets);
}

function filterItems(items: NormalizedNewsItem[], params: NewsFetchParams, query?: string | null) {
  const languages = new Set(
    (params.languages ?? [])
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  );
  return items.filter(item => {
    if (!itemWithinDateRange(item, params)) return false;
    if (languages.size > 0 && !languages.has(item.originalLanguage.toLowerCase())) return false;
    return itemMatchesQuery(item, query);
  });
}

export class RssFinancialNewsProvider implements FinancialNewsProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceId: string;
  readonly sourceName: string;
  readonly sourceType: NewsSourceType;
  readonly sourceDomain: string | null;
  readonly sourceNetworkId: string | null;
  readonly sourceNetwork: string | null;
  readonly reliabilityScore: number;
  readonly priority: number;
  readonly officialSource: boolean;
  readonly supportedMarkets: string[];
  readonly enabled: boolean;

  private readonly feedUrl: URL;
  private readonly runtime: ProviderRuntimeState;
  private readonly config: RssNewsProviderConfig;

  constructor(config: RssNewsProviderConfig) {
    this.feedUrl = assertSafePublicHttpUrl(config.url, config.id);
    this.id = config.id;
    this.name = config.name;
    this.sourceId = config.id;
    this.sourceName = config.name;
    this.sourceType = config.sourceType;
    this.sourceDomain = sourceDomainFromUrl(this.feedUrl);
    this.sourceNetworkId = config.sourceNetworkId ?? this.sourceDomain;
    this.sourceNetwork = this.sourceNetworkId;
    this.reliabilityScore = Math.min(1, Math.max(0, config.reliabilityScore));
    this.priority = Math.min(5, Math.max(1, Math.trunc(config.priority)));
    this.officialSource = config.officialSource;
    this.supportedMarkets = [...new Set(config.supportedMarkets.map(value => value.trim()).filter(Boolean))];
    this.enabled = config.enabled !== false;
    this.config = config;
    this.runtime = new ProviderRuntimeState(this.enabled);
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

  async fetchNews(params: NewsFetchParams): Promise<NormalizedNewsItem[]> {
    if (!this.enabled) {
      throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.DISABLED);
    }
    validateDateRange(params, this.id);
    if (!appliesToRequest(this.config, params)) return [];
    const items = await this.load(params);
    return filterItems(items, params, params.query).slice(0, clampProviderLimit(params.limit));
  }

  async searchNews(params: NewsSearchParams | NewsFetchParams): Promise<NormalizedNewsItem[]> {
    if (!this.enabled) {
      throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.DISABLED);
    }
    validateDateRange(params, this.id);
    if (!appliesToRequest(this.config, params)) return [];
    const items = await this.load({ ...params, limit: 100 });
    return filterItems(items, params, params.query).slice(0, clampProviderLimit(params.limit));
  }

  async healthCheck() {
    try {
      await this.load({ limit: 1, forceRefresh: true });
    } catch {
      // Runtime state already contains the safe failure code.
    }
    return this.runtime.health(this.id, this.name, this.enabled, this.supportedMarkets);
  }

  private parserMetadata(): RssFeedMetadata {
    return {
      providerId: this.id,
      providerName: this.name,
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      sourceType: this.sourceType,
      sourceDomain: this.sourceDomain,
      sourceNetworkId: this.sourceNetworkId,
      sourceReliability: this.reliabilityScore,
      sourcePriority: this.priority,
      isOfficial: this.officialSource,
      originalLanguage: this.config.originalLanguage,
      marketCodes: this.config.marketCodes ?? this.supportedMarkets,
      exchangeCodes: this.config.exchangeCodes,
      countries: this.config.countries,
      sectors: this.config.sectors,
      industries: this.config.industries,
      symbols: this.config.symbols,
      companyNames: this.config.companyNames,
      assetTypes: this.config.assetTypes,
      currencies: this.config.currencies,
    };
  }

  private async load(params: NewsFetchParams) {
    const startedAt = Date.now();
    try {
      const response = await safeFetchText(this.feedUrl, {
        providerId: this.id,
        timeoutMs: this.config.timeoutMs ?? 8_000,
        maxBytes: this.config.maxBytes ?? 2 * 1024 * 1024,
        maxRedirects: 3,
        allowedContentTypes: RSS_CONTENT_TYPES,
        signal: params.signal,
        cache: params.forceRefresh ? 'no-store' : undefined,
        revalidateSeconds: params.forceRefresh ? undefined : (this.config.revalidateSeconds ?? 300),
        headers: {
          accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
          'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
        },
      });
      if (!/<(?:rss|feed|rdf:RDF)\b/i.test(response.text)) {
        throw new FinancialNewsProviderError(this.id, FinancialNewsProviderErrorCode.INVALID_RESPONSE);
      }
      const parsed = parseFinancialNewsFeed(response.text, this.parserMetadata());
      this.runtime.recordSuccess(startedAt);
      return deduplicateProviderItems(parsed.items);
    } catch (error) {
      const providerError = asProviderError(error, this.id);
      this.runtime.recordFailure(startedAt, providerError);
      throw providerError;
    }
  }
}

export function createRssNewsProvider(config: RssNewsProviderConfig): FinancialNewsProvider {
  return new RssFinancialNewsProvider(config);
}

export const NEWS_SOURCE_TYPES = [
  'official_exchange',
  'regulator',
  'central_bank',
  'government_agency',
  'regulatory_filing',
  'company_ir',
  'corporate_press_release',
  'financial_news_agency',
  'financial_publication',
  'market_data_provider',
  'regional_market_publication',
  'industry_publication',
  'public_rss',
  'social_signal',
  'other',
] as const;
export type NewsSourceType = (typeof NEWS_SOURCE_TYPES)[number];

export const FINANCIAL_EVENT_TYPES = [
  'unknown',
  'earnings_results',
  'earnings_guidance',
  'dividend_announcement',
  'dividend_cancellation',
  'merger_acquisition',
  'acquisition_offer',
  'ipo_listing',
  'delisting',
  'trading_suspension',
  'regulatory_action',
  'lawsuit_legal_decision',
  'credit_rating_change',
  'debt_issuance',
  'capital_increase',
  'share_buyback',
  'insider_transaction',
  'management_change',
  'major_contract',
  'product_launch',
  'cybersecurity_incident',
  'operational_disruption',
  'bankruptcy_restructuring',
  'analyst_rating_change',
  'macroeconomic_release',
  'interest_rate_decision',
  'inflation_report',
  'employment_report',
  'commodity_price_event',
  'currency_event',
  'geopolitical_event',
  'exchange_announcement',
  'shariah_classification_update',
  'other_material_event',
] as const;
export type FinancialEventType = (typeof FINANCIAL_EVENT_TYPES)[number];

export const NEWS_SENTIMENTS = ['positive', 'negative', 'neutral', 'mixed', 'unknown'] as const;
export type NewsSentiment = (typeof NEWS_SENTIMENTS)[number];

export const IMPACT_DIRECTIONS = ['positive', 'negative', 'neutral', 'mixed', 'unknown'] as const;
export type ImpactDirection = (typeof IMPACT_DIRECTIONS)[number];

export const EXPECTED_IMPACTS = ['high', 'medium', 'low', 'unknown'] as const;
export type ExpectedImpact = (typeof EXPECTED_IMPACTS)[number];

export const IMPACT_HORIZONS = ['immediate', 'short_term', 'medium_term', 'long_term', 'unknown'] as const;
export type ImpactHorizon = (typeof IMPACT_HORIZONS)[number];

export const VERIFICATION_STATUSES = ['official', 'confirmed', 'single_source', 'conflicting', 'unverified'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ProviderHealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  RATE_LIMITED: 'rate_limited',
  DISABLED: 'disabled',
  UNKNOWN: 'unknown',
} as const;
export type ProviderHealthStatus = (typeof ProviderHealthStatus)[keyof typeof ProviderHealthStatus];

export const ProviderRateLimitState = {
  AVAILABLE: 'available',
  APPROACHING_LIMIT: 'approaching_limit',
  LIMITED: 'limited',
  UNKNOWN: 'unknown',
} as const;
export type ProviderRateLimitState = (typeof ProviderRateLimitState)[keyof typeof ProviderRateLimitState];

export const PROVIDER_COVERAGE_STATUSES = ['success', 'partial', 'failed', 'skipped', 'not_configured', 'disabled'] as const;
export type ProviderCoverageStatus = (typeof PROVIDER_COVERAGE_STATUSES)[number];

export const AGGREGATION_CACHE_STATUSES = ['hit', 'miss', 'stale', 'bypass', 'stored'] as const;
export type AggregationCacheStatus = (typeof AGGREGATION_CACHE_STATUSES)[number];

export const NEWS_PROCESSING_STATUSES = ['pending', 'normalized', 'classified', 'clustered', 'saved', 'rejected', 'failed'] as const;
export type NewsProcessingStatus = (typeof NEWS_PROCESSING_STATUSES)[number];

export const FINANCIAL_ASSET_TYPES = [
  'equity', 'etf', 'fund', 'index', 'bond', 'currency', 'commodity', 'crypto', 'derivative', 'other',
] as const;
export type FinancialAssetType = (typeof FINANCIAL_ASSET_TYPES)[number];

export const FinancialNewsProviderErrorCode = {
  NOT_CONFIGURED: 'not_configured',
  DISABLED: 'disabled',
  INVALID_REQUEST: 'invalid_request',
  UNSAFE_URL: 'unsafe_url',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNAUTHORIZED: 'unauthorized',
  RATE_LIMITED: 'rate_limited',
  UPSTREAM_ERROR: 'upstream_error',
  INVALID_RESPONSE: 'invalid_response',
  UNSUPPORTED_CONTENT_TYPE: 'unsupported_content_type',
  RESPONSE_TOO_LARGE: 'response_too_large',
  REDIRECT_LIMIT: 'redirect_limit',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
} as const;
export type FinancialNewsProviderErrorCode = (typeof FinancialNewsProviderErrorCode)[keyof typeof FinancialNewsProviderErrorCode];

const SAFE_PROVIDER_ERROR_MESSAGES: Record<FinancialNewsProviderErrorCode, string> = {
  [FinancialNewsProviderErrorCode.NOT_CONFIGURED]: 'The news provider is not configured.',
  [FinancialNewsProviderErrorCode.DISABLED]: 'The news provider is disabled.',
  [FinancialNewsProviderErrorCode.INVALID_REQUEST]: 'The news provider request is invalid.',
  [FinancialNewsProviderErrorCode.UNSAFE_URL]: 'The configured news source URL is not allowed.',
  [FinancialNewsProviderErrorCode.NETWORK_ERROR]: 'The news provider could not be reached.',
  [FinancialNewsProviderErrorCode.TIMEOUT]: 'The news provider request timed out.',
  [FinancialNewsProviderErrorCode.UNAUTHORIZED]: 'The news provider rejected its server credential.',
  [FinancialNewsProviderErrorCode.RATE_LIMITED]: 'The news provider rate limit was reached.',
  [FinancialNewsProviderErrorCode.UPSTREAM_ERROR]: 'The news provider returned an error.',
  [FinancialNewsProviderErrorCode.INVALID_RESPONSE]: 'The news provider returned an invalid response.',
  [FinancialNewsProviderErrorCode.UNSUPPORTED_CONTENT_TYPE]: 'The news provider returned an unsupported content type.',
  [FinancialNewsProviderErrorCode.RESPONSE_TOO_LARGE]: 'The news provider response exceeded the allowed size.',
  [FinancialNewsProviderErrorCode.REDIRECT_LIMIT]: 'The news provider exceeded the redirect limit.',
  [FinancialNewsProviderErrorCode.TEMPORARILY_UNAVAILABLE]: 'The news provider is temporarily unavailable.',
};

export class FinancialNewsProviderError extends Error {
  readonly providerId: string;
  readonly code: FinancialNewsProviderErrorCode;
  readonly retryable: boolean;
  readonly httpStatus: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    providerId: string,
    code: FinancialNewsProviderErrorCode,
    options: {
      retryable?: boolean;
      httpStatus?: number | null;
      retryAfterSeconds?: number | null;
    } = {},
  ) {
    super(SAFE_PROVIDER_ERROR_MESSAGES[code]);
    this.name = 'FinancialNewsProviderError';
    this.providerId = providerId.replace(/[^a-z0-9:_-]/gi, '').slice(0, 100) || 'unknown';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.httpStatus = options.httpStatus ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

export type ProviderHealthResult = {
  providerId: string;
  providerName?: string;
  enabled?: boolean;
  healthStatus?: ProviderHealthStatus;
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  averageLatency: number | null;
  failureCount: number;
  successRate?: number | null;
  failureRate?: number | null;
  lastError?: string | null;
  rateLimitState: string | null;
  disabledUntil: string | null;
  supportedMarkets?: string[];
  status?: ProviderHealthStatus;
  checkedAt?: string;
  latencyMs?: number | null;
  errorCode?: FinancialNewsProviderErrorCode | null;
};

export type FinancialNewsSource = {
  sourceId: string;
  sourceName: string;
  sourceType: NewsSourceType;
  sourceDomain: string | null;
  sourceNetworkId: string | null;
  sourceNetwork?: string | null;
  reliabilityScore: number;
  priority: number;
  officialSource: boolean;
  supportedMarkets: string[];
  lastSuccessfulFetch: string | null;
  lastFailedFetch: string | null;
  averageLatency: number | null;
  healthStatus: ProviderHealthStatus;
  failureCount: number;
  enabled: boolean;
  rateLimitState: ProviderRateLimitState;
  disabledUntil: string | null;
};

export type NewsFetchParams = {
  query?: string | null;
  language?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  page?: number;
  languages?: string[];
  marketCodes?: string[];
  exchangeCodes?: string[];
  countries?: string[];
  sectors?: string[];
  industries?: string[];
  symbols?: string[];
  companyNames?: string[];
  isins?: string[];
  indexCodes?: string[];
  currencies?: string[];
  commodities?: string[];
  assetTypes?: FinancialAssetType[];
  eventTypes?: FinancialEventType[];
  sourceTypes?: NewsSourceType[];
  sourceIds?: string[];
  sourceNames?: string[];
  verificationStatuses?: VerificationStatus[];
  impactLevels?: ExpectedImpact[];
  sentiments?: NewsSentiment[];
  officialOnly?: boolean;
  /** Require resolved symbols to intersect `symbols`; broad watchlists leave this false. */
  strictEntityFilter?: boolean;
  forceRefresh?: boolean;
  signal?: AbortSignal;
};

export type NewsSearchParams = NewsFetchParams & {
  query: string;
};

export type NormalizedNewsItem = {
  id: string;
  providerId: string;
  providerName: string;
  canonicalUrl: string | null;
  originalUrl: string;
  imageUrl?: string | null;
  title: string;
  normalizedTitle: string;
  summary: string | null;
  originalLanguage: string;
  translatedLanguage?: string | null;
  translatedTitle?: string | null;
  translatedSummary?: string | null;
  sourceId: string;
  sourceName: string;
  sourceType: NewsSourceType;
  sourceDomain: string | null;
  sourceNetworkId: string | null;
  sourceNetwork?: string | null;
  sourceReliability: number;
  sourcePriority: number;
  isOfficial: boolean;
  publishedAt: string;
  updatedAt?: string | null;
  fetchedAt: string;
  marketCodes: string[];
  exchangeCodes: string[];
  countries: string[];
  sectors: string[];
  industries: string[];
  symbols: string[];
  companyNames: string[];
  assetTypes: string[];
  currencies: string[];
  eventType: FinancialEventType;
  relevanceScore: number;
  importanceScore: number;
  entityConfidenceScore: number;
  entityConfidence?: number;
  confidenceScore: number;
  sentiment: NewsSentiment;
  expectedImpact: ExpectedImpact;
  impactDirection: ImpactDirection;
  impactHorizon: ImpactHorizon;
  impactReason: string | null;
  verificationStatus: VerificationStatus;
  corroboratingSourceCount: number;
  duplicateGroupId?: string | null;
  contentHash?: string | null;
  eventFingerprint?: string | null;
  processingStatus?: NewsProcessingStatus;
  processingVersion?: string | null;
};

export interface FinancialNewsProvider extends FinancialNewsSource {
  readonly id: string;
  readonly name: string;
  fetchNews(params: NewsFetchParams): Promise<NormalizedNewsItem[]>;
  searchNews(params: NewsSearchParams | NewsFetchParams): Promise<NormalizedNewsItem[]>;
  healthCheck?(): Promise<ProviderHealthResult>;
}

export type NewsSupportingSource = {
  sourceId: string;
  sourceName: string;
  sourceDomain: string | null;
  sourceNetworkId: string | null;
  reliabilityScore: number;
  isOfficial: boolean;
  sourceType?: NewsSourceType;
  originalUrl: string;
  publishedAt: string;
};

export type StorySupportingSource = NewsSupportingSource & {
  itemId?: string;
  providerId?: string;
  sourceType?: NewsSourceType;
  sourcePriority?: number;
  title?: string;
  independent?: boolean;
};

export type StoryConflict = {
  detected: boolean;
  summary: string | null;
  differingFields: string[];
  sourceItemIds: string[];
};

export type ConsolidatedNewsStory = NormalizedNewsItem & {
  earliestPublishedAt: string;
  latestUpdatedAt: string;
  independentSourceCount: number;
  supportingSources: NewsSupportingSource[];
  conflictSummary: string | null;
  whyItMatters: string | null;
};

export type ProviderCoverage = {
  providerId: string;
  providerName: string;
  status: ProviderCoverageStatus;
  sourceType: NewsSourceType;
  supportedMarkets: string[];
  articleCount: number;
  durationMs: number;
  errorCode: string | null;
  sourcePriority?: number;
  officialSource?: boolean;
  requested?: boolean;
  fetchedCount?: number;
  acceptedCount?: number;
  rejectedCount?: number;
  deduplicatedCount?: number;
  latencyMs?: number | null;
  lastSuccessfulFetch?: string | null;
};

export type NewsAggregationFilters = Omit<NewsFetchParams, 'signal' | 'forceRefresh' | 'query'> & {
  query?: string | null;
};

export type NewsAggregationResult = {
  stories: ConsolidatedNewsStory[];
  filters: NewsAggregationFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  providerCoverage: ProviderCoverage[];
  partialFailure: boolean;
  warningCode: string | null;
  lastUpdatedAt: string | null;
  cacheStatus: AggregationCacheStatus;
  searchDurationMs: number;
};

export type ProviderRegistryIssue = {
  providerId: string | null;
  code: FinancialNewsProviderErrorCode;
};

export type FinancialNewsProviderRegistry = {
  providers: FinancialNewsProvider[];
  sources: FinancialNewsSource[];
  configurationIssues: ProviderRegistryIssue[];
};

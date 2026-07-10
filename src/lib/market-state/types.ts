import type { ProviderApiStatus } from '@/lib/providers/shared';
import type { ShariahStatus } from '@/lib/market/shariah-screening';

export type { ProviderApiStatus, ShariahStatus };

/** Is the underlying provider/service reachable and usable right now. */
export const PROVIDER_CONNECTION_STATUSES = [
  'connected',
  'degraded',
  'disconnected',
  'rate_limited',
  'misconfigured',
  'disabled',
  'unknown',
] as const;
export type ProviderConnectionStatus = typeof PROVIDER_CONNECTION_STATUSES[number];

/** Lifecycle of a single feature's data (news, quotes, earnings, ...) as shown to the user. */
export const FEATURE_DATA_STATUSES = [
  'idle',
  'loading',
  'fresh',
  'stale',
  'partial',
  'empty',
  'unavailable',
  'error',
] as const;
export type FeatureDataStatus = typeof FEATURE_DATA_STATUSES[number];

/** Lifecycle of a derived research/analysis output (recommendations, Shariah research jobs, technical signals). */
export const RESEARCH_OR_ANALYSIS_STATUSES = [
  'not_started',
  'queued',
  'running',
  'partial',
  'completed',
  'insufficient_data',
  'failed',
] as const;
export type ResearchOrAnalysisStatus = typeof RESEARCH_OR_ANALYSIS_STATUSES[number];

export const MARKET_CAPABILITY_KEYS = [
  'symbols',
  'quotes',
  'historical_prices',
  'profiles',
  'logos',
  'technical_data',
  'recommendations',
  'news',
  'earnings',
  'dividends',
  'ipos',
  'economic_calendar',
  'forex',
  'crypto',
  'commodities',
  'gcc_markets',
  'shariah_financials',
] as const;
export type MarketCapabilityKey = typeof MARKET_CAPABILITY_KEYS[number];

export const MARKET_PROVIDER_IDS = [
  'fmp',
  'twelvedata',
  'eodhd',
  'finnhub',
  'marketstack',
  'yahoo',
  'tradingeconomics',
  'newsapi',
  'rss',
] as const;
export type MarketProviderId = typeof MARKET_PROVIDER_IDS[number];

/** Which fetch-order context a priority declaration applies to — see providerResolver.ts §5 of the plan. */
export type ProviderPriorityContext = 'general' | 'trader_terminal';

export type ProviderCapabilityCell = {
  provider: MarketProviderId;
  capability: MarketCapabilityKey;
  status: ProviderConnectionStatus;
  configured: boolean;
  healthy: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorReason: string | null;
  rateLimitedUntil: string | null;
  nextRetryAt: string | null;
  latencyMs: number | null;
};

export type CapabilityMatrix = ProviderCapabilityCell[];

export type ProviderAttempt = {
  provider: MarketProviderId;
  outcome: 'success' | 'failed' | 'skipped';
  reason: string | null;
};

export type ProviderResolution = {
  selected: MarketProviderId | null;
  attempted: ProviderAttempt[];
  fallbackUsed: boolean;
  reason: string | null;
  context: ProviderPriorityContext;
  timestamp: string;
  cached: boolean;
  delayed: boolean;
};

export type Freshness = {
  asOf: string | null;
  ageSeconds: number | null;
  isStale: boolean;
  isDelayed: boolean;
  thresholdSeconds: number;
};

export type Completeness = {
  requested: number;
  returned: number;
  missing: number;
  percentage: number;
};

export type StatusMessage = {
  code: string;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type MarketFeatureEnvelope<T = unknown> = {
  success: boolean;
  feature: string;
  status: FeatureDataStatus;
  provider: ProviderResolution;
  freshness: Freshness;
  completeness: Completeness;
  data: T;
  warnings: StatusMessage[];
  errors: StatusMessage[];
};

export type CatalogBreakdown = {
  discovered: number;
  metadataAvailable: number;
  /** null means "not measured this pass" — never fabricated as equal to `discovered`. */
  liveQuoteAvailable: number | null;
  delayedQuoteAvailable: number | null;
  staleRecords: number;
  duplicates: number;
  malformed: number;
  failed: number;
  lastSyncAt: string | null;
};

export type MarketSystemState = {
  generatedAt: string;
  overall: ProviderConnectionStatus;
  providers: Partial<Record<MarketProviderId, {
    status: ProviderConnectionStatus;
    configured: boolean;
    healthy: boolean;
    latencyMs: number | null;
  }>>;
  capabilityMatrix: CapabilityMatrix;
  featuresSucceeded: MarketCapabilityKey[];
  featuresDegraded: MarketCapabilityKey[];
  featuresFailed: MarketCapabilityKey[];
  catalog: CatalogBreakdown;
  lastSynchronizedAt: string | null;
};

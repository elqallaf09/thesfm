import type {
  MarketCapabilityKey,
  MarketProviderId,
  MarketSystemState,
  ProviderConnectionStatus,
} from '@/lib/market-state/types';
import type { MarketNewsAdminProviderStatus } from '@/lib/market-news/persistence';
import type { ShariahStatus } from '@/lib/market/shariah-screening';
import type { ResearchJobStatus } from '@/lib/sharia-research/types';
import type { AiUsageFeature } from '@/lib/server/aiUsage';

/**
 * Every field with no real backing data uses this shape instead of a bare `0`/`null` — a `0` or
 * `null` can look like a genuinely measured value. `scope` records what kind of instrumentation
 * WOULD answer the question, so the UI can say precisely why it can't today: 'process' (would
 * need per-process telemetry we don't collect), 'request' (would need per-request/per-route
 * timing), 'provider' (would need a new per-provider tracker), 'unavailable' (no known path today).
 */
export type NotInstrumented = {
  instrumented: false;
  reasonKey: string;
  requiredInfraKey: string;
  scope: 'process' | 'request' | 'provider' | 'unavailable';
};

export type Instrumented<T> = { instrumented: true; value: T };
export type Maybe<T> = Instrumented<T> | NotInstrumented;

export function notInstrumented(reasonKey: string, requiredInfraKey: string, scope: NotInstrumented['scope']): NotInstrumented {
  return { instrumented: false, reasonKey, requiredInfraKey, scope };
}

export function instrumented<T>(value: T): Instrumented<T> {
  return { instrumented: true, value };
}

export const OPS_HEALTH_LEVELS = ['healthy', 'degraded', 'critical', 'maintenance', 'unmeasured'] as const;
export type OpsHealthLevel = typeof OPS_HEALTH_LEVELS[number];

export const OPS_FEATURE_HEALTH_STATUSES = ['healthy', 'partial', 'failed', 'disabled', 'maintenance', 'unmeasured', 'uninstrumented'] as const;
export type OpsFeatureHealthStatus = typeof OPS_FEATURE_HEALTH_STATUSES[number];

export const OPS_FEATURE_KEYS = [
  'market_data',
  'news',
  'economic_calendar',
  'earnings',
  'dividends',
  'ipos',
  'recommendations',
  'technical_analysis',
  'shariah_research',
  'ai_services',
  'authentication',
  'email',
  'notifications',
  'storage',
  'database',
] as const;
export type OpsFeatureKey = typeof OPS_FEATURE_KEYS[number];

/** A safe diagnostic observation, never credentials, delivery destinations, or user content. */
export type OpsHealthEvidence = {
  source: string;
  scope: 'runtime' | 'configuration' | 'none';
  capability?: string;
  provider?: string | null;
  status?: OpsFeatureHealthStatus;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  reasonKey: string | null;
  reason: string | null;
  latencyMs?: number | null;
};

export type OpsFeatureMeasurement = {
  status: OpsFeatureHealthStatus;
  /** Human-readable scope or explanation; a successful narrow probe still needs its scope. */
  detailKey: string | null;
  evidence?: OpsHealthEvidence[];
};

export type FeatureHealthRow = OpsFeatureMeasurement & { feature: OpsFeatureKey };

export const OPS_SEVERITIES = ['critical', 'warning', 'info'] as const;
export type OpsSeverity = typeof OPS_SEVERITIES[number];

export type RootCauseIssue = {
  id: string;
  /** Missing observation is an information item, not evidence of a service outage. */
  kind?: 'incident' | 'measurement_gap' | 'configuration';
  problemKey: string;
  problemParams: Record<string, string | number>;
  severity: OpsSeverity;
  rootCauseKey: string;
  rootCauseParams: Record<string, string | number>;
  affectedFeature: OpsFeatureKey | null;
  affectedProvider: MarketProviderId | string | null;
  firstOccurrence: string | null;
  lastOccurrence: string | null;
  suggestedFixKey: string;
  retryAvailable: boolean;
  expectedImpactKey: string;
};

export type SymbolCoverage = {
  discovered: number;
  /** Always not-instrumented today — no composite per-symbol flag exists (see symbolCoverage.ts). */
  fullySupported: NotInstrumented;
  metadataOnly: number;
  quotesAvailable: { live: number | null; delayed: number | null };
  technicalAvailable: NotInstrumented;
  newsAvailable: NotInstrumented;
  recommendationsAvailable: NotInstrumented;
  shariahReady: number;
  missing: number;
  /** Not instrumented: the raw catalog diagnostics carry a per-symbol unsupported-provider list,
   *  but it is not currently surfaced on the aggregated MarketSystemState snapshot this reads. */
  unsupported: NotInstrumented;
};

export type JobRecord = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  errorSummary: string | null;
};

export type JobSourceStats = {
  sourceKey: 'shariah_research' | 'market_news_fetch' | 'subscription_reminders';
  queued: number;
  running: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  averageDurationMs: number | null;
  recent: JobRecord[];
};

export type ErrorCenterCategory = 'provider' | 'api' | 'shariah' | 'email' | 'ai' | 'database' | 'notifications' | 'storage';
export type NotInstrumentedErrorCategory = 'database' | 'frontend' | 'notifications' | 'storage' | 'ai';

export type ErrorCenterEntry = {
  id: string;
  category: ErrorCenterCategory;
  severity: OpsSeverity;
  occurredAt: string | null;
  retryAvailable: boolean;
  logKey: string;
  recommendationKey: string;
  affectedFeature?: OpsFeatureKey | null;
  affectedProvider?: string | null;
  kind?: RootCauseIssue['kind'];
  reasonKey?: string;
  reason?: string | null;
};

export type DataQualityBucket = 'fresh' | 'delayed' | 'cached' | 'partial' | 'stale' | 'unavailable';

export type OpsAction = {
  id: string;
  labelKey: string;
  kind: 'retry_market_providers' | 'refresh_symbol_catalog' | 'retry_shariah_job' | 'reconnect_provider' | 'recalculate_recommendations' | 'check_service_health' | 'refresh_economic_calendar';
  available: boolean;
  disabledReasonKey?: string;
};

export type AiUsageFeatureRow = {
  feature: AiUsageFeature;
  eventCount24h: number;
};

export type OperationsCenterState = {
  calendarHealth?: OpsFeatureHealthStatus;
  /** Read-only probes supplied by the server; absent means no observation was provided. */
  featureMeasurements?: Partial<Record<OpsFeatureKey, OpsFeatureMeasurement>>;
  generatedAt: string;

  overview: {
    overall: OpsHealthLevel;
    /** Score of measured services only; null when there is no eligible measurement. */
    healthScorePercent: number | null;
    criticalIssueCount: number;
    warningCount: number;
    healthyServiceCount: number;
    lastSyncAt: string | null;
    processUptimeSeconds: number;
    measurementCoveragePercent?: number | null;
    measuredServiceCount?: number;
    eligibleServiceCount?: number;
    totalServiceCount?: number;
    unmeasuredServiceCount?: number;
    uninstrumentedServiceCount?: number;
    disabledServiceCount?: number;
    maintenanceServiceCount?: number;
    partialServiceCount?: number;
    failedServiceCount?: number;
    measurementGapCount?: number;
  };

  market: MarketSystemState;
  marketNews: MarketNewsAdminProviderStatus[];

  featureHealth: FeatureHealthRow[];
  rootCause: RootCauseIssue[];
  symbolCoverage: SymbolCoverage;

  shariah: {
    counts: Record<ShariahStatus, number>;
    recentJobs: Array<{
      id: string;
      status: ResearchJobStatus;
      currentStep: string;
      progress: number;
      createdAt: string;
      completedAt: string | null;
      errorCode: string | null;
    }>;
  };

  subscriptionReminders: {
    recentRuns: Array<{
      id: string;
      runType: string;
      status: string;
      startedAt: string | null;
      finishedAt: string | null;
      emailSentCount: number;
      emailFailedCount: number;
      message: string | null;
    }>;
  };

  backgroundJobs: {
    shariahResearch: JobSourceStats;
    marketNewsFetch: JobSourceStats;
    subscriptionReminders: JobSourceStats;
    genericQueue: NotInstrumented;
  };

  errorCenter: {
    byCategory: Record<ErrorCenterCategory, ErrorCenterEntry[]>;
    notInstrumented: NotInstrumentedErrorCategory[];
  };

  dataQuality: Record<DataQualityBucket, number>;

  performance: {
    processUptimeSeconds: number;
    memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    loadAvg: [number, number, number] | null;
    averageProviderLatencyMs: number | null;
    slowestProviders: Array<{ provider: MarketProviderId; latencyMs: number }>;
    apiRouteTiming: NotInstrumented;
    cacheHitRate: NotInstrumented;
    mostExpensiveFunctions: NotInstrumented;
    backgroundQueueDepth: NotInstrumented;
  };

  aiUsage: {
    last24h: AiUsageFeatureRow[];
    blockedUsersCount: number;
    distinctUsersToday: number;
    healthScore: NotInstrumented;
  };

  actions: OpsAction[];

  /** Per-source degradation flags — true if that section's underlying query failed this pass. */
  degradedSources: Partial<Record<'market' | 'marketNews' | 'shariah' | 'shariahJobs' | 'subscriptionReminders' | 'aiUsage', string>>;
};

export type { ProviderConnectionStatus, MarketCapabilityKey };

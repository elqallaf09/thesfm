import type { Completeness, Freshness, MarketFeatureEnvelope, ProviderResolution, StatusMessage } from './types';
import { FEATURE_DATA_STATUSES, type FeatureDataStatus } from './types';

export function buildFeatureEnvelope<T>(args: {
  feature: string;
  status: FeatureDataStatus;
  provider: ProviderResolution;
  freshness: Freshness;
  completeness: Completeness;
  data: T;
  warnings?: StatusMessage[];
  errors?: StatusMessage[];
}): MarketFeatureEnvelope<T> {
  return {
    success: args.status !== 'error' && args.status !== 'unavailable',
    feature: args.feature,
    status: args.status,
    provider: args.provider,
    freshness: args.freshness,
    completeness: args.completeness,
    data: args.data,
    warnings: args.warnings ?? [],
    errors: args.errors ?? [],
  };
}

const EMPTY_PROVIDER_RESOLUTION: ProviderResolution = {
  selected: null,
  attempted: [],
  fallbackUsed: false,
  reason: null,
  context: 'general',
  timestamp: new Date(0).toISOString(),
  cached: false,
  delayed: false,
};

export function buildErrorEnvelope(feature: string, code: string, messageKey: string): MarketFeatureEnvelope<null> {
  return {
    success: false,
    feature,
    status: 'error',
    provider: { ...EMPTY_PROVIDER_RESOLUTION, timestamp: new Date().toISOString() },
    freshness: { asOf: null, ageSeconds: null, isStale: false, isDelayed: false, thresholdSeconds: 0 },
    completeness: { requested: 0, returned: 0, missing: 0, percentage: 0 },
    data: null,
    warnings: [],
    errors: [{ code, messageKey }],
  };
}

export function isValidFeatureDataStatus(value: unknown): value is FeatureDataStatus {
  return typeof value === 'string' && (FEATURE_DATA_STATUSES as readonly string[]).includes(value);
}

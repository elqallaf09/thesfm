import type {
  FactorFreshness,
  FreshnessState,
  IntelligenceAssetType,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';

type MarketStatus = 'OPEN' | 'CLOSED' | 'UNKNOWN';
type ProviderState = 'LIVE' | 'DELAYED' | 'CACHED' | 'UNAVAILABLE';

const BASE_TTL_SECONDS: Record<IntelligenceHorizon, number> = {
  INTRADAY: 90,
  SHORT_TERM: 300,
  SWING: 900,
  POSITION: 3600,
  LONG_TERM: 21_600,
};

const ASSET_MULTIPLIERS: Record<IntelligenceAssetType, number> = {
  STOCK: 1,
  CRYPTO: 0.65,
  FOREX: 0.75,
  INDEX: 1,
  COMMODITY: 1,
  FUND: 2,
};

const DELAYED_EOD_GRACE_SECONDS = 4 * 24 * 60 * 60;
const DELAYED_EOD_MINIMUM_THRESHOLD_SECONDS = BASE_TTL_SECONDS.SWING;
const DELAYED_DECISION_HORIZONS = new Set<IntelligenceHorizon>(['SWING', 'POSITION', 'LONG_TERM']);

export function freshnessThresholdSeconds(input: {
  assetType: IntelligenceAssetType;
  horizon: IntelligenceHorizon;
  marketStatus?: MarketStatus;
  providerUpdateSeconds?: number | null;
}) {
  const marketMultiplier = input.marketStatus === 'CLOSED' ? 4 : 1;
  const calculated = Math.round(BASE_TTL_SECONDS[input.horizon] * ASSET_MULTIPLIERS[input.assetType] * marketMultiplier);
  return Math.max(calculated, Math.max(0, Math.round(input.providerUpdateSeconds ?? 0)));
}

function delayedFreshnessUpperBound(input: { thresholdSeconds: number; providerState?: ProviderState }) {
  const ordinaryUpperBound = input.thresholdSeconds * 3;
  if (input.providerState !== 'DELAYED' || input.thresholdSeconds < DELAYED_EOD_MINIMUM_THRESHOLD_SECONDS) {
    return ordinaryUpperBound;
  }
  return Math.max(ordinaryUpperBound, DELAYED_EOD_GRACE_SECONDS);
}

export function calculateFreshness(input: {
  observedAt: string | null;
  thresholdSeconds: number;
  providerState?: ProviderState;
  now?: number;
}): FactorFreshness {
  if (!input.observedAt || input.providerState === 'UNAVAILABLE') {
    return {
      state: 'UNAVAILABLE',
      observedAt: input.observedAt,
      ageSeconds: null,
      thresholdSeconds: input.thresholdSeconds,
    };
  }

  const observedAtMs = Date.parse(input.observedAt);
  if (!Number.isFinite(observedAtMs)) {
    return {
      state: 'UNAVAILABLE',
      observedAt: input.observedAt,
      ageSeconds: null,
      thresholdSeconds: input.thresholdSeconds,
    };
  }

  const ageSeconds = Math.max(0, Math.round(((input.now ?? Date.now()) - observedAtMs) / 1000));
  const delayedUpperBound = delayedFreshnessUpperBound(input);
  let state: FreshnessState = ageSeconds <= input.thresholdSeconds
    ? 'FRESH'
    : ageSeconds <= delayedUpperBound
      ? 'DELAYED'
      : 'STALE';

  if (input.providerState === 'CACHED') state = ageSeconds > input.thresholdSeconds * 3 ? 'STALE' : 'DELAYED';
  if (input.providerState === 'DELAYED' && state === 'FRESH') state = 'DELAYED';

  return {
    state,
    observedAt: input.observedAt,
    ageSeconds,
    thresholdSeconds: input.thresholdSeconds,
  };
}

export function isDecisionFreshnessEligible(input: {
  providerState: ProviderState;
  freshnessState: FreshnessState;
  horizon: IntelligenceHorizon;
}) {
  if (input.providerState === 'LIVE') return input.freshnessState === 'FRESH';
  if (input.providerState !== 'DELAYED' || !DELAYED_DECISION_HORIZONS.has(input.horizon)) return false;
  return input.freshnessState === 'FRESH' || input.freshnessState === 'DELAYED';
}

export function expirationFrom(generatedAt: string, thresholdSeconds: number) {
  return new Date(Date.parse(generatedAt) + thresholdSeconds * 1000).toISOString();
}

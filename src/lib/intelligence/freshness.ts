import type {
  FactorFreshness,
  FreshnessState,
  IntelligenceAssetType,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';

type MarketStatus = 'OPEN' | 'CLOSED' | 'UNKNOWN';

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

export function calculateFreshness(input: {
  observedAt: string | null;
  thresholdSeconds: number;
  providerState?: 'LIVE' | 'DELAYED' | 'CACHED' | 'UNAVAILABLE';
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
  let state: FreshnessState = ageSeconds <= input.thresholdSeconds
    ? 'FRESH'
    : ageSeconds <= input.thresholdSeconds * 3
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

export function expirationFrom(generatedAt: string, thresholdSeconds: number) {
  return new Date(Date.parse(generatedAt) + thresholdSeconds * 1000).toISOString();
}

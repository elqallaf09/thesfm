import type {
  AnalysisResult,
  IntelligenceAssetType,
  IntelligenceHorizon,
  IntelligenceRecommendation,
} from '@/domain/intelligence/contracts';
import type {
  IntelligenceConfidenceBucket,
  IntelligenceDirectionalOutcome,
  IntelligenceEvaluationWindow,
  IntelligenceHistoricalPricePoint,
  IntelligenceOutcomePolicySnapshot,
} from '@/domain/intelligence/outcomes';

export const INTELLIGENCE_OUTCOME_METHODOLOGY_VERSION = 'outcome-evaluation-v1';
export const INTELLIGENCE_CALIBRATION_METHODOLOGY_VERSION = 'confidence-calibration-foundation-v1';
export const INTELLIGENCE_DRIFT_METHODOLOGY_VERSION = 'intelligence-drift-v1';
export const INTELLIGENCE_CALIBRATION_MINIMUM_DIRECTIONAL_SAMPLE = 30;

type OutcomeWindowConfig = {
  durationSeconds: number;
  interval: string;
  historyPeriod: string;
  entryToleranceSeconds: number;
  finalToleranceSeconds: number;
};

// These are documented methodology values, not exchange-session assertions. A provider
// candle is always required at/after each boundary, so closures and holidays are explicit.
const HORIZON_WINDOWS: Record<IntelligenceHorizon, OutcomeWindowConfig> = {
  INTRADAY: {
    durationSeconds: 4 * 60 * 60,
    interval: '5m',
    historyPeriod: '5d',
    entryToleranceSeconds: 60 * 60,
    finalToleranceSeconds: 3 * 24 * 60 * 60,
  },
  SHORT_TERM: {
    durationSeconds: 7 * 24 * 60 * 60,
    interval: '1d',
    historyPeriod: '3mo',
    entryToleranceSeconds: 3 * 24 * 60 * 60,
    finalToleranceSeconds: 7 * 24 * 60 * 60,
  },
  SWING: {
    durationSeconds: 30 * 24 * 60 * 60,
    interval: '1d',
    historyPeriod: '6mo',
    entryToleranceSeconds: 3 * 24 * 60 * 60,
    finalToleranceSeconds: 10 * 24 * 60 * 60,
  },
  POSITION: {
    durationSeconds: 90 * 24 * 60 * 60,
    interval: '1d',
    historyPeriod: '1y',
    entryToleranceSeconds: 5 * 24 * 60 * 60,
    finalToleranceSeconds: 14 * 24 * 60 * 60,
  },
  LONG_TERM: {
    durationSeconds: 365 * 24 * 60 * 60,
    interval: '1d',
    historyPeriod: '2y',
    entryToleranceSeconds: 7 * 24 * 60 * 60,
    finalToleranceSeconds: 21 * 24 * 60 * 60,
  },
};

const NEUTRAL_BAND_BPS: Record<IntelligenceAssetType, number> = {
  STOCK: 50,
  CRYPTO: 150,
  FOREX: 25,
  INDEX: 35,
  COMMODITY: 75,
  FUND: 40,
};

function validDate(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export function confidenceBucket(confidence: number): IntelligenceConfidenceBucket {
  if (confidence < 40) return '0_39';
  if (confidence < 60) return '40_59';
  if (confidence < 80) return '60_79';
  return '80_100';
}

export function getOutcomeWindowConfig(horizon: IntelligenceHorizon) {
  return { ...HORIZON_WINDOWS[horizon] };
}

export function getNeutralBandPercent(assetType: IntelligenceAssetType) {
  return NEUTRAL_BAND_BPS[assetType] / 100;
}

export function createOutcomePolicySnapshot(input: {
  horizon: IntelligenceHorizon;
  assetType: IntelligenceAssetType;
}): IntelligenceOutcomePolicySnapshot {
  const config = getOutcomeWindowConfig(input.horizon);
  return {
    methodologyVersion: INTELLIGENCE_OUTCOME_METHODOLOGY_VERSION,
    horizon: input.horizon,
    durationSeconds: config.durationSeconds,
    interval: config.interval,
    historyPeriod: config.historyPeriod,
    entryToleranceSeconds: config.entryToleranceSeconds,
    finalToleranceSeconds: config.finalToleranceSeconds,
    neutralBandPercent: getNeutralBandPercent(input.assetType),
  };
}

export function createEvaluationWindow(
  analysis: Pick<AnalysisResult, 'horizon' | 'generatedAt' | 'dataAsOf'>,
  policy?: Pick<IntelligenceOutcomePolicySnapshot, 'methodologyVersion' | 'horizon' | 'durationSeconds' | 'interval' | 'entryToleranceSeconds' | 'finalToleranceSeconds'>,
): IntelligenceEvaluationWindow {
  const generatedAt = validDate(analysis.generatedAt);
  if (!generatedAt) throw new Error('INVALID_ANALYSIS_GENERATED_AT');
  const suppliedDataAsOf = validDate(analysis.dataAsOf);
  const generatedMs = Date.parse(generatedAt);
  const dataAsOfMs = suppliedDataAsOf ? Date.parse(suppliedDataAsOf) : Number.NaN;
  const useDataAsOf = Number.isFinite(dataAsOfMs) && dataAsOfMs <= generatedMs + 5 * 60 * 1000;
  const referenceAt = useDataAsOf ? suppliedDataAsOf! : generatedAt;
  const config = policy ?? {
    methodologyVersion: INTELLIGENCE_OUTCOME_METHODOLOGY_VERSION,
    horizon: analysis.horizon,
    ...HORIZON_WINDOWS[analysis.horizon],
  };
  if (config.horizon !== analysis.horizon || !Number.isFinite(config.durationSeconds) || config.durationSeconds <= 0) {
    throw new Error('INVALID_OUTCOME_POLICY_SNAPSHOT');
  }
  const startMs = Date.parse(referenceAt);
  const endMs = startMs + config.durationSeconds * 1000;

  return {
    methodologyVersion: config.methodologyVersion,
    horizon: analysis.horizon,
    referenceAt,
    referenceSource: useDataAsOf ? 'DATA_AS_OF' : 'GENERATED_AT',
    startAt: referenceAt,
    endAt: new Date(endMs).toISOString(),
    eligibleAt: new Date(endMs).toISOString(),
    entryToleranceSeconds: config.entryToleranceSeconds,
    finalToleranceSeconds: config.finalToleranceSeconds,
    interval: config.interval,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validNonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function validPositiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/**
 * Rebuild the evaluation inputs solely from the immutable pending outcome.
 * There is deliberately no fallback to the currently deployed configuration:
 * an incomplete legacy snapshot is terminally un-replayable rather than being
 * silently reinterpreted by a later rules release.
 */
export function resolvePersistedOutcomePolicy(input: {
  horizon: IntelligenceHorizon;
  evaluationWindow: IntelligenceEvaluationWindow;
  methodologySnapshot: Record<string, unknown>;
}) {
  const policy = record(input.methodologySnapshot.evaluationPolicy);
  const methodologyVersion = typeof policy?.methodologyVersion === 'string' ? policy.methodologyVersion : null;
  const horizon = typeof policy?.horizon === 'string' ? policy.horizon : null;
  const interval = typeof policy?.interval === 'string' ? policy.interval : null;
  const historyPeriod = typeof policy?.historyPeriod === 'string' ? policy.historyPeriod : null;
  const durationSeconds = validPositiveInteger(policy?.durationSeconds);
  const entryToleranceSeconds = validNonNegativeNumber(policy?.entryToleranceSeconds);
  const finalToleranceSeconds = validNonNegativeNumber(policy?.finalToleranceSeconds);
  const neutralBandPercent = validNonNegativeNumber(policy?.neutralBandPercent);
  const startMs = Date.parse(input.evaluationWindow.startAt);
  const endMs = Date.parse(input.evaluationWindow.endAt);

  if (!methodologyVersion || horizon !== input.horizon || !interval || !historyPeriod
    || durationSeconds === null || entryToleranceSeconds === null || finalToleranceSeconds === null
    || neutralBandPercent === null || neutralBandPercent > 100
    || !Number.isFinite(startMs) || !Number.isFinite(endMs)
    || endMs - startMs !== durationSeconds * 1000
    || input.evaluationWindow.horizon !== input.horizon
    || input.evaluationWindow.methodologyVersion !== methodologyVersion
    || input.evaluationWindow.interval !== interval
    || input.evaluationWindow.entryToleranceSeconds !== entryToleranceSeconds
    || input.evaluationWindow.finalToleranceSeconds !== finalToleranceSeconds) {
    return null;
  }

  const persistedPolicy: IntelligenceOutcomePolicySnapshot = {
    methodologyVersion,
    horizon: input.horizon,
    durationSeconds,
    interval,
    historyPeriod,
    entryToleranceSeconds,
    finalToleranceSeconds,
    neutralBandPercent,
  };
  return {
    policy: persistedPolicy,
    window: {
      ...input.evaluationWindow,
      entryToleranceSeconds,
      finalToleranceSeconds,
      interval,
    },
  };
}

export function isEvaluationEligible(window: IntelligenceEvaluationWindow, now = Date.now()) {
  return Date.parse(window.eligibleAt) <= now;
}

export function referencePointAfter(
  points: IntelligenceHistoricalPricePoint[],
  boundary: string,
  toleranceSeconds: number,
) {
  const boundaryMs = Date.parse(boundary);
  if (!Number.isFinite(boundaryMs)) return null;
  const latestAllowed = boundaryMs + toleranceSeconds * 1000;
  return [...points]
    .filter(point => Number.isFinite(Date.parse(point.at)))
    .filter(point => Date.parse(point.at) >= boundaryMs && Date.parse(point.at) <= latestAllowed)
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))[0] ?? null;
}

export function calculateDirectionalReturn(
  recommendation: IntelligenceRecommendation,
  entryPrice: number,
  finalPrice: number,
) {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(finalPrice) || finalPrice <= 0) return null;
  const raw = ((finalPrice - entryPrice) / entryPrice) * 100;
  if (recommendation === 'BUY') return raw;
  if (recommendation === 'SELL') return -raw;
  return null;
}

export function classifyDirectionalOutcome(input: {
  recommendation: IntelligenceRecommendation;
  assetType: IntelligenceAssetType;
  directionalReturn: number | null;
  neutralBandPercent?: number;
}): IntelligenceDirectionalOutcome {
  if (input.recommendation === 'WAIT' || input.recommendation === 'INSUFFICIENT_DATA') return 'NOT_APPLICABLE';
  if (input.directionalReturn === null) return 'NOT_APPLICABLE';
  const neutralBand = Number.isFinite(input.neutralBandPercent) && Number(input.neutralBandPercent) >= 0
    ? Number(input.neutralBandPercent)
    : getNeutralBandPercent(input.assetType);
  if (Math.abs(input.directionalReturn) <= neutralBand) return 'NEUTRAL';
  return input.directionalReturn > 0 ? 'CORRECT' : 'INCORRECT';
}

export function calculateExcursions(input: {
  recommendation: IntelligenceRecommendation;
  entryPrice: number;
  points: IntelligenceHistoricalPricePoint[];
}) {
  if (input.recommendation !== 'BUY' && input.recommendation !== 'SELL') {
    return { maximumFavorableExcursion: null, maximumAdverseExcursion: null, complete: false };
  }
  if (!Number.isFinite(input.entryPrice) || input.entryPrice <= 0) {
    return { maximumFavorableExcursion: null, maximumAdverseExcursion: null, complete: false };
  }
  const prices = input.points.map(point => ({
    high: Number.isFinite(point.high) && Number(point.high) > 0 ? Number(point.high) : null,
    low: Number.isFinite(point.low) && Number(point.low) > 0 ? Number(point.low) : null,
  }));
  if (!prices.length || prices.some(point => point.high === null || point.low === null)) {
    return { maximumFavorableExcursion: null, maximumAdverseExcursion: null, complete: false };
  }
  const highs = prices.map(point => point.high!);
  const lows = prices.map(point => point.low!);
  const rawMfe = input.recommendation === 'BUY'
    ? ((Math.max(...highs) - input.entryPrice) / input.entryPrice) * 100
    : ((input.entryPrice - Math.min(...lows)) / input.entryPrice) * 100;
  const rawMae = input.recommendation === 'BUY'
    ? ((Math.min(...lows) - input.entryPrice) / input.entryPrice) * 100
    : ((input.entryPrice - Math.max(...highs)) / input.entryPrice) * 100;
  return {
    maximumFavorableExcursion: Math.max(0, Number(rawMfe.toFixed(6))),
    maximumAdverseExcursion: Math.min(0, Number(rawMae.toFixed(6))),
    complete: true,
  };
}

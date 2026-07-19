import type {
  IntelligenceAssetType,
  IntelligenceFactorKey,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';

export const INTELLIGENCE_ENGINE_VERSION = '6.1.0';
export const INTELLIGENCE_RULES_VERSION = 'recommendation-policy-v1';
export const INTELLIGENCE_WEIGHTING_VERSION = 'asset-horizon-weights-v1';
export const INTELLIGENCE_CONFIDENCE_VERSION = 'deterministic-confidence-v1';

type FactorWeights = Record<IntelligenceFactorKey, number>;

const BASE_WEIGHTS: Record<IntelligenceAssetType, FactorWeights> = {
  STOCK: {
    TECHNICAL: 0.22,
    FUNDAMENTAL: 0.18,
    SENTIMENT: 0.08,
    NEWS: 0.10,
    MACRO: 0.08,
    MOMENTUM: 0.12,
    LIQUIDITY: 0.06,
    VOLATILITY: 0.07,
    RISK: 0.09,
    SHARIA: 0,
  },
  CRYPTO: {
    TECHNICAL: 0.25,
    FUNDAMENTAL: 0.03,
    SENTIMENT: 0.12,
    NEWS: 0.10,
    MACRO: 0.04,
    MOMENTUM: 0.18,
    LIQUIDITY: 0.10,
    VOLATILITY: 0.09,
    RISK: 0.09,
    SHARIA: 0,
  },
  FOREX: {
    TECHNICAL: 0.24,
    FUNDAMENTAL: 0,
    SENTIMENT: 0.08,
    NEWS: 0.08,
    MACRO: 0.20,
    MOMENTUM: 0.16,
    LIQUIDITY: 0.08,
    VOLATILITY: 0.08,
    RISK: 0.08,
    SHARIA: 0,
  },
  INDEX: {
    TECHNICAL: 0.20,
    FUNDAMENTAL: 0.04,
    SENTIMENT: 0.09,
    NEWS: 0.10,
    MACRO: 0.18,
    MOMENTUM: 0.14,
    LIQUIDITY: 0.07,
    VOLATILITY: 0.09,
    RISK: 0.09,
    SHARIA: 0,
  },
  COMMODITY: {
    TECHNICAL: 0.22,
    FUNDAMENTAL: 0,
    SENTIMENT: 0.08,
    NEWS: 0.12,
    MACRO: 0.18,
    MOMENTUM: 0.15,
    LIQUIDITY: 0.07,
    VOLATILITY: 0.09,
    RISK: 0.09,
    SHARIA: 0,
  },
  FUND: {
    TECHNICAL: 0.15,
    FUNDAMENTAL: 0.25,
    SENTIMENT: 0.06,
    NEWS: 0.08,
    MACRO: 0.10,
    MOMENTUM: 0.10,
    LIQUIDITY: 0.08,
    VOLATILITY: 0.08,
    RISK: 0.10,
    SHARIA: 0,
  },
};

const HORIZON_MULTIPLIERS: Record<IntelligenceHorizon, FactorWeights> = {
  INTRADAY: {
    TECHNICAL: 1.4,
    FUNDAMENTAL: 0.25,
    SENTIMENT: 1.1,
    NEWS: 1.1,
    MACRO: 0.6,
    MOMENTUM: 1.4,
    LIQUIDITY: 1.25,
    VOLATILITY: 1.2,
    RISK: 1,
    SHARIA: 1,
  },
  SHORT_TERM: {
    TECHNICAL: 1.25,
    FUNDAMENTAL: 0.5,
    SENTIMENT: 1.1,
    NEWS: 1.15,
    MACRO: 0.8,
    MOMENTUM: 1.25,
    LIQUIDITY: 1.1,
    VOLATILITY: 1.1,
    RISK: 1,
    SHARIA: 1,
  },
  SWING: {
    TECHNICAL: 1.1,
    FUNDAMENTAL: 0.9,
    SENTIMENT: 1,
    NEWS: 1.05,
    MACRO: 1,
    MOMENTUM: 1.1,
    LIQUIDITY: 1,
    VOLATILITY: 1,
    RISK: 1,
    SHARIA: 1,
  },
  POSITION: {
    TECHNICAL: 0.9,
    FUNDAMENTAL: 1.3,
    SENTIMENT: 0.9,
    NEWS: 1,
    MACRO: 1.25,
    MOMENTUM: 0.8,
    LIQUIDITY: 0.9,
    VOLATILITY: 1,
    RISK: 1.15,
    SHARIA: 1,
  },
  LONG_TERM: {
    TECHNICAL: 0.6,
    FUNDAMENTAL: 1.8,
    SENTIMENT: 0.6,
    NEWS: 0.8,
    MACRO: 1.5,
    MOMENTUM: 0.5,
    LIQUIDITY: 0.8,
    VOLATILITY: 0.9,
    RISK: 1.3,
    SHARIA: 1,
  },
};

const BASE_REQUIRED_FACTORS: Record<IntelligenceHorizon, IntelligenceFactorKey[]> = {
  INTRADAY: ['TECHNICAL', 'MOMENTUM', 'VOLATILITY', 'RISK'],
  SHORT_TERM: ['TECHNICAL', 'MOMENTUM', 'RISK'],
  SWING: ['TECHNICAL', 'MOMENTUM', 'RISK'],
  POSITION: ['TECHNICAL', 'RISK'],
  LONG_TERM: ['RISK'],
};

export type IntelligenceMethodologyConfig = {
  weightingVersion: string;
  weights: FactorWeights;
  requiredFactors: IntelligenceFactorKey[];
  minimumAvailableFactors: number;
  minimumDirectionalFactors: number;
  minimumWeightCoverage: number;
  buyThreshold: number;
  sellThreshold: number;
  minimumDirectionalConfidence: number;
  strongConflictThreshold: number;
};

function roundWeight(value: number) {
  return Number(value.toFixed(6));
}

function normalizedWeights(assetType: IntelligenceAssetType, horizon: IntelligenceHorizon): FactorWeights {
  const raw = Object.fromEntries(
    Object.entries(BASE_WEIGHTS[assetType]).map(([factor, weight]) => [
      factor,
      weight * HORIZON_MULTIPLIERS[horizon][factor as IntelligenceFactorKey],
    ]),
  ) as FactorWeights;
  const total = Object.values(raw).reduce((sum, weight) => sum + weight, 0);
  return Object.fromEntries(
    Object.entries(raw).map(([factor, weight]) => [factor, total > 0 ? roundWeight(weight / total) : 0]),
  ) as FactorWeights;
}

export function getIntelligenceMethodologyConfig(
  assetType: IntelligenceAssetType,
  horizon: IntelligenceHorizon,
): IntelligenceMethodologyConfig {
  const requiredFactors = [...BASE_REQUIRED_FACTORS[horizon]];
  if ((assetType === 'STOCK' || assetType === 'FUND') && (horizon === 'POSITION' || horizon === 'LONG_TERM')) {
    requiredFactors.push('FUNDAMENTAL');
  }

  const thresholdAdjustment = assetType === 'CRYPTO' ? 6 : assetType === 'FOREX' || assetType === 'COMMODITY' ? 3 : 0;
  const horizonAdjustment = horizon === 'INTRADAY' ? 3 : horizon === 'LONG_TERM' ? -2 : 0;

  return {
    weightingVersion: INTELLIGENCE_WEIGHTING_VERSION,
    weights: normalizedWeights(assetType, horizon),
    requiredFactors: [...new Set(requiredFactors)],
    minimumAvailableFactors: 3,
    minimumDirectionalFactors: 2,
    minimumWeightCoverage: assetType === 'CRYPTO' ? 0.58 : 0.55,
    buyThreshold: 28 + thresholdAdjustment + horizonAdjustment,
    sellThreshold: -28 - thresholdAdjustment - horizonAdjustment,
    minimumDirectionalConfidence: assetType === 'CRYPTO' ? 60 : 55,
    strongConflictThreshold: 55,
  };
}

export function modulesRequiredForSafeAnalysis(
  requested: IntelligenceFactorKey[],
  config: IntelligenceMethodologyConfig,
): IntelligenceFactorKey[] {
  return [...new Set<IntelligenceFactorKey>([
    ...requested,
    ...config.requiredFactors,
    'LIQUIDITY',
    'VOLATILITY',
  ])];
}

import type {
  ConfidenceCalculation,
  ConfidenceQuality,
  ConflictStatus,
  DataCompleteness,
  FactorResult,
  FreshnessState,
  IntelligenceFactorKey,
} from '@/domain/intelligence/contracts';
import {
  INTELLIGENCE_CONFIDENCE_VERSION,
  type IntelligenceMethodologyConfig,
} from './config';

const DIRECTIONAL_FACTORS = new Set<IntelligenceFactorKey>([
  'TECHNICAL',
  'FUNDAMENTAL',
  'SENTIMENT',
  'NEWS',
  'MACRO',
  'MOMENTUM',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function availabilityMultiplier(factor: FactorResult) {
  if (factor.availability === 'AVAILABLE') return 1;
  if (factor.availability === 'PARTIAL') return 0.55;
  return 0;
}

function freshnessScore(state: FreshnessState) {
  if (state === 'FRESH') return 100;
  if (state === 'DELAYED') return 70;
  if (state === 'STALE') return 35;
  return 0;
}

export function isDirectionalFactor(factor: IntelligenceFactorKey) {
  return DIRECTIONAL_FACTORS.has(factor);
}

export function calculateCompositeScore(factors: FactorResult[], config: IntelligenceMethodologyConfig) {
  const active = factors.filter(factor =>
    isDirectionalFactor(factor.factor)
    && factor.normalizedScore !== null
    && factor.availability !== 'UNAVAILABLE'
    && (config.weights[factor.factor] ?? 0) > 0,
  );
  const totalWeight = active.reduce(
    (sum, factor) => sum + config.weights[factor.factor] * availabilityMultiplier(factor),
    0,
  );
  if (totalWeight <= 0) return 0;
  const score = active.reduce(
    (sum, factor) => sum + (factor.normalizedScore ?? 0) * config.weights[factor.factor] * availabilityMultiplier(factor),
    0,
  ) / totalWeight;
  return Math.round(clamp(score, -100, 100));
}

export function determineConflictStatus(factors: FactorResult[], config: IntelligenceMethodologyConfig): ConflictStatus {
  const strong = factors.filter(factor =>
    isDirectionalFactor(factor.factor)
    && factor.availability !== 'UNAVAILABLE'
    && factor.normalizedScore !== null
    && Math.abs(factor.normalizedScore) >= config.strongConflictThreshold,
  );
  const positive = strong.filter(factor => (factor.normalizedScore ?? 0) > 0);
  const negative = strong.filter(factor => (factor.normalizedScore ?? 0) < 0);
  if (positive.length === 0 || negative.length === 0) return 'NONE';
  if (positive.length + negative.length >= 3) return 'STRONG';
  return 'MODERATE';
}

export function calculateDataCompleteness(
  factors: FactorResult[],
  config: IntelligenceMethodologyConfig,
): DataCompleteness {
  const requestedWeight = factors.reduce((sum, factor) => sum + (config.weights[factor.factor] ?? 0), 0);
  const coveredWeight = factors.reduce(
    (sum, factor) => sum + (config.weights[factor.factor] ?? 0) * availabilityMultiplier(factor),
    0,
  );
  const missingRequiredFactors = config.requiredFactors.filter(required => {
    const factor = factors.find(item => item.factor === required);
    return !factor || factor.availability === 'UNAVAILABLE';
  });
  const weightedCoverage = requestedWeight > 0 ? coveredWeight / requestedWeight : 0;
  return {
    requestedFactors: factors.length,
    availableFactors: factors.filter(factor => factor.availability === 'AVAILABLE').length,
    partialFactors: factors.filter(factor => factor.availability === 'PARTIAL').length,
    unavailableFactors: factors.filter(factor => factor.availability === 'UNAVAILABLE').length,
    requiredFactors: config.requiredFactors,
    missingRequiredFactors,
    weightedCoverage: Number(weightedCoverage.toFixed(4)),
    percentage: rounded(weightedCoverage * 100),
  };
}

function weightedComponent(
  factors: FactorResult[],
  config: IntelligenceMethodologyConfig,
  value: (factor: FactorResult) => number,
) {
  const active = factors.filter(factor => factor.availability !== 'UNAVAILABLE' && config.weights[factor.factor] > 0);
  const totalWeight = active.reduce((sum, factor) => sum + config.weights[factor.factor] * availabilityMultiplier(factor), 0);
  if (totalWeight <= 0) return 0;
  return active.reduce(
    (sum, factor) => sum + value(factor) * config.weights[factor.factor] * availabilityMultiplier(factor),
    0,
  ) / totalWeight;
}

function consistencyScore(factors: FactorResult[], config: IntelligenceMethodologyConfig) {
  const directional = factors.filter(factor =>
    isDirectionalFactor(factor.factor)
    && factor.normalizedScore !== null
    && factor.availability !== 'UNAVAILABLE',
  );
  const positive = directional.reduce((sum, factor) => {
    const contribution = (factor.normalizedScore ?? 0) * config.weights[factor.factor] * availabilityMultiplier(factor);
    return sum + Math.max(0, contribution);
  }, 0);
  const negative = directional.reduce((sum, factor) => {
    const contribution = (factor.normalizedScore ?? 0) * config.weights[factor.factor] * availabilityMultiplier(factor);
    return sum + Math.max(0, -contribution);
  }, 0);
  const largest = Math.max(positive, negative);
  if (largest === 0) return 55;
  return clamp(100 - (Math.min(positive, negative) / largest) * 75, 0, 100);
}

function confidenceQuality(confidence: number, minimumEvidenceMet: boolean): ConfidenceQuality {
  if (!minimumEvidenceMet || confidence < 30) return 'INSUFFICIENT_EVIDENCE';
  if (confidence >= 75) return 'STRONG_EVIDENCE';
  if (confidence >= 55) return 'MODERATE_EVIDENCE';
  return 'LIMITED_EVIDENCE';
}

export type ConfidenceEngineResult = {
  confidence: number;
  quality: ConfidenceQuality;
  calculation: ConfidenceCalculation;
  completeness: DataCompleteness;
  conflictStatus: ConflictStatus;
  compositeScore: number;
};

export function calculateDeterministicConfidence(
  factors: FactorResult[],
  config: IntelligenceMethodologyConfig,
): ConfidenceEngineResult {
  const completeness = calculateDataCompleteness(factors, config);
  const compositeScore = calculateCompositeScore(factors, config);
  const conflictStatus = determineConflictStatus(factors, config);
  const availableDirectionalFactors = factors.filter(factor =>
    isDirectionalFactor(factor.factor)
    && factor.availability !== 'UNAVAILABLE'
    && factor.normalizedScore !== null,
  ).length;

  const components = {
    coverage: completeness.percentage,
    freshness: rounded(weightedComponent(factors, config, factor => freshnessScore(factor.freshness.state))),
    consistency: rounded(consistencyScore(factors, config)),
    operationalReliability: rounded(weightedComponent(factors, config, factor => clamp(factor.operationalReliability, 0, 1) * 100)),
    signalClarity: rounded((Math.abs(compositeScore) / Math.max(config.buyThreshold, Math.abs(config.sellThreshold), 1)) * 100),
  };

  const penalties: Array<{ code: string; points: number }> = [];
  if (completeness.missingRequiredFactors.length > 0) {
    penalties.push({ code: 'MISSING_REQUIRED_FACTORS', points: Math.min(30, completeness.missingRequiredFactors.length * 10) });
  }
  if (factors.some(factor => factor.freshness.state === 'STALE')) penalties.push({ code: 'STALE_DATA', points: 12 });
  if (conflictStatus === 'STRONG') penalties.push({ code: 'STRONG_PROVIDER_OR_FACTOR_CONFLICT', points: 18 });
  if (conflictStatus === 'MODERATE') penalties.push({ code: 'MODERATE_FACTOR_CONFLICT', points: 8 });
  if (factors.some(factor => factor.warnings.some(warning => warning.code === 'EXCESSIVE_VOLATILITY'))) {
    penalties.push({ code: 'EXCESSIVE_VOLATILITY', points: 10 });
  }
  if (factors.some(factor => factor.warnings.some(warning => warning.code === 'WEAK_LIQUIDITY'))) {
    penalties.push({ code: 'WEAK_LIQUIDITY', points: 8 });
  }
  if (components.operationalReliability < 70) penalties.push({ code: 'DEGRADED_PROVIDER_RELIABILITY', points: 8 });
  if (components.signalClarity < 25) penalties.push({ code: 'SIGNAL_NEAR_NEUTRAL', points: 8 });

  const minimumEvidenceMet = completeness.availableFactors + completeness.partialFactors >= config.minimumAvailableFactors
    && availableDirectionalFactors >= config.minimumDirectionalFactors
    && completeness.weightedCoverage >= config.minimumWeightCoverage
    && completeness.missingRequiredFactors.length === 0;

  const base = components.coverage * 0.34
    + components.freshness * 0.18
    + components.consistency * 0.20
    + components.operationalReliability * 0.14
    + components.signalClarity * 0.14;
  let confidence = rounded(base - penalties.reduce((sum, penalty) => sum + penalty.points, 0));
  const usableFactorCount = completeness.availableFactors + completeness.partialFactors;
  if (usableFactorCount <= 1) confidence = Math.min(confidence, 30);
  else if (usableFactorCount === 2) confidence = Math.min(confidence, 45);
  if (!minimumEvidenceMet) confidence = Math.min(confidence, 29);

  const calculation: ConfidenceCalculation = {
    methodologyVersion: INTELLIGENCE_CONFIDENCE_VERSION,
    weightingVersion: config.weightingVersion,
    appliedWeights: Object.fromEntries(factors.map(factor => [factor.factor, config.weights[factor.factor]])),
    components,
    penalties,
    minimumEvidenceMet,
    availableDirectionalFactors,
  };

  return {
    confidence,
    quality: confidenceQuality(confidence, minimumEvidenceMet),
    calculation,
    completeness,
    conflictStatus,
    compositeScore,
  };
}

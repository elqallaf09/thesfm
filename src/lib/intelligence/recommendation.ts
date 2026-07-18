import type {
  ConfidenceQuality,
  ConflictStatus,
  FactorResult,
  IntelligenceFactorKey,
  IntelligenceRecommendation,
  IntelligenceRisk,
  RecommendationDecision,
} from '@/domain/intelligence/contracts';
import { INTELLIGENCE_RULES_VERSION, type IntelligenceMethodologyConfig } from './config';
import { isDirectionalFactor } from './confidence';

export function classifyIntelligenceRisk(factors: FactorResult[]): IntelligenceRisk {
  const risk = factors.find(factor => factor.factor === 'RISK');
  if (!risk || risk.availability === 'UNAVAILABLE' || risk.normalizedScore === null) return 'UNAVAILABLE';
  const excessiveVolatility = factors.some(factor => factor.warnings.some(warning => warning.code === 'EXCESSIVE_VOLATILITY'));
  const weakLiquidity = factors.some(factor => factor.warnings.some(warning => warning.code === 'WEAK_LIQUIDITY'));
  if (risk.normalizedScore <= -80 || (risk.normalizedScore <= -60 && excessiveVolatility)) return 'VERY_HIGH';
  if (risk.normalizedScore <= -50 || excessiveVolatility) return 'HIGH';
  if (risk.normalizedScore <= -15 || weakLiquidity) return 'MEDIUM';
  return 'LOW';
}

function materialFactors(factors: FactorResult[], config: IntelligenceMethodologyConfig) {
  return factors
    .filter(factor => isDirectionalFactor(factor.factor) && factor.normalizedScore !== null && factor.availability !== 'UNAVAILABLE')
    .sort((left, right) => {
      const leftContribution = Math.abs((left.normalizedScore ?? 0) * config.weights[left.factor]);
      const rightContribution = Math.abs((right.normalizedScore ?? 0) * config.weights[right.factor]);
      return rightContribution - leftContribution;
    })
    .slice(0, 4)
    .map(factor => factor.factor);
}

export function determineRecommendation(input: {
  factors: FactorResult[];
  config: IntelligenceMethodologyConfig;
  confidence: number;
  confidenceQuality: ConfidenceQuality;
  conflictStatus: ConflictStatus;
  compositeScore: number;
  minimumEvidenceMet: boolean;
}): { recommendation: IntelligenceRecommendation; risk: IntelligenceRisk; decision: RecommendationDecision } {
  const risk = classifyIntelligenceRisk(input.factors);
  let recommendation: IntelligenceRecommendation = 'WAIT';
  let reasonCode = 'SCORE_WITHIN_WAIT_BAND';

  if (!input.minimumEvidenceMet || input.confidenceQuality === 'INSUFFICIENT_EVIDENCE' || risk === 'UNAVAILABLE') {
    recommendation = 'INSUFFICIENT_DATA';
    reasonCode = risk === 'UNAVAILABLE' ? 'RISK_EVIDENCE_UNAVAILABLE' : 'MINIMUM_EVIDENCE_NOT_MET';
  } else if (input.conflictStatus === 'STRONG') {
    reasonCode = 'STRONG_SIGNALS_CONFLICT';
  } else if (risk === 'VERY_HIGH') {
    reasonCode = 'VERY_HIGH_RISK_PREVENTS_DIRECTIONAL_OUTPUT';
  } else if (input.confidence < input.config.minimumDirectionalConfidence) {
    reasonCode = 'DIRECTIONAL_CONFIDENCE_BELOW_THRESHOLD';
  } else if (input.compositeScore >= input.config.buyThreshold && risk !== 'HIGH') {
    recommendation = 'BUY';
    reasonCode = 'WEIGHTED_SCORE_ABOVE_BUY_THRESHOLD';
  } else if (input.compositeScore <= input.config.sellThreshold) {
    recommendation = 'SELL';
    reasonCode = 'WEIGHTED_SCORE_BELOW_SELL_THRESHOLD';
  } else if (input.compositeScore >= input.config.buyThreshold && risk === 'HIGH') {
    reasonCode = 'HIGH_RISK_BLOCKED_BUY';
  }

  return {
    recommendation,
    risk,
    decision: {
      policyVersion: INTELLIGENCE_RULES_VERSION,
      compositeScore: input.compositeScore,
      buyThreshold: input.config.buyThreshold,
      sellThreshold: input.config.sellThreshold,
      minimumDirectionalConfidence: input.config.minimumDirectionalConfidence,
      reasonCode,
      materialFactorKeys: materialFactors(input.factors, input.config),
    },
  };
}

export function factorContribution(
  factor: FactorResult,
  weights: Partial<Record<IntelligenceFactorKey, number>>,
) {
  return (factor.normalizedScore ?? 0) * (weights[factor.factor] ?? 0);
}

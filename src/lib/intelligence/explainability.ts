import type {
  FactorResult,
  IntelligenceRecommendation,
  IntelligenceRisk,
  StructuredExplanation,
} from '@/domain/intelligence/contracts';
import { factorContribution } from './recommendation';
import type { IntelligenceMethodologyConfig } from './config';

export function buildStructuredExplanation(input: {
  factors: FactorResult[];
  config: IntelligenceMethodologyConfig;
  recommendation: IntelligenceRecommendation;
  recommendationReasonCode: string;
  risk: IntelligenceRisk;
  confidencePenalties: Array<{ code: string; points: number }>;
}): StructuredExplanation {
  const ranked = input.factors
    .filter(factor => factor.availability !== 'UNAVAILABLE' && factor.normalizedScore !== null)
    .sort((left, right) => Math.abs(factorContribution(right, input.config.weights)) - Math.abs(factorContribution(left, input.config.weights)));
  const supportingFactors = ranked
    .filter(factor => {
      const contribution = factorContribution(factor, input.config.weights);
      if (input.recommendation === 'SELL') return contribution < -2;
      if (input.recommendation === 'BUY') return contribution > 2;
      return Math.abs(contribution) <= 2;
    })
    .slice(0, 4)
    .map(factor => factor.factor);
  const opposingFactors = ranked
    .filter(factor => {
      const contribution = factorContribution(factor, input.config.weights);
      if (input.recommendation === 'SELL') return contribution > 2;
      if (input.recommendation === 'BUY') return contribution < -2;
      return Math.abs(contribution) > 2;
    })
    .slice(0, 4)
    .map(factor => factor.factor);
  const unavailable = input.factors
    .filter(factor => factor.availability === 'UNAVAILABLE')
    .map(factor => factor.failureReason ?? `${factor.factor}_UNAVAILABLE`);
  const stale = input.factors
    .filter(factor => factor.freshness.state === 'STALE')
    .map(factor => `${factor.factor}_STALE`);
  const riskCodes = input.factors
    .flatMap(factor => factor.warnings)
    .filter(warning => warning.severity !== 'INFO')
    .map(warning => warning.code);
  if (input.risk === 'HIGH' || input.risk === 'VERY_HIGH') riskCodes.push(`RISK_${input.risk}`);

  return {
    supportingFactors: [...new Set(supportingFactors)],
    opposingFactors: [...new Set(opposingFactors)],
    limitationCodes: [...new Set([...unavailable, ...stale])],
    riskCodes: [...new Set(riskCodes)],
    recommendationReasonCode: input.recommendationReasonCode,
    confidenceReasonCodes: input.confidencePenalties.length
      ? input.confidencePenalties.map(penalty => penalty.code)
      : ['NO_CONFIDENCE_PENALTIES'],
    invalidationConditions: [
      ...supportingFactors.slice(0, 2).map(factor => ({
        code: 'FACTOR_REVERSAL' as const,
        factor,
        detailKey: 'intelligence_invalidation_factor_reversal',
      })),
      {
        code: 'DATA_STALENESS' as const,
        factor: null,
        detailKey: 'intelligence_invalidation_data_stale',
      },
      {
        code: 'RISK_ESCALATION' as const,
        factor: 'RISK' as const,
        detailKey: 'intelligence_invalidation_risk_escalation',
      },
      {
        code: 'PROVIDER_DEGRADATION' as const,
        factor: null,
        detailKey: 'intelligence_invalidation_provider_degradation',
      },
    ],
  };
}

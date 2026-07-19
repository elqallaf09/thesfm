import type { AnalysisResult, FactorResult } from '@/domain/intelligence/contracts';
import type {
  IntelligenceAnalysisDrift,
  IntelligenceDriftReasonCode,
  IntelligenceFactorDelta,
} from '@/domain/intelligence/outcomes';
import { INTELLIGENCE_DRIFT_METHODOLOGY_VERSION } from './outcomePolicy';

const RISK_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3, VERY_HIGH: 4, UNAVAILABLE: 5 } as const;
const FRESHNESS_ORDER = { FRESH: 1, DELAYED: 2, STALE: 3, UNAVAILABLE: 4 } as const;

function factorByKey(factors: FactorResult[]) {
  return new Map(factors.map(factor => [factor.factor, factor]));
}

function numberDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return Number((current - previous).toFixed(6));
}

function factorDeltas(previous: AnalysisResult, current: AnalysisResult): IntelligenceFactorDelta[] {
  const before = factorByKey(previous.factors);
  const after = factorByKey(current.factors);
  return [...new Set([...before.keys(), ...after.keys()])]
    .map(factor => {
      const oldFactor = before.get(factor);
      const nextFactor = after.get(factor);
      return {
        factor,
        previousScore: oldFactor?.normalizedScore ?? null,
        currentScore: nextFactor?.normalizedScore ?? null,
        scoreDelta: numberDelta(nextFactor?.normalizedScore ?? null, oldFactor?.normalizedScore ?? null),
        previousAvailability: oldFactor?.availability ?? 'UNAVAILABLE',
        currentAvailability: nextFactor?.availability ?? 'UNAVAILABLE',
      };
    })
    .sort((left, right) => left.factor.localeCompare(right.factor));
}

function addFactorReason(codes: IntelligenceDriftReasonCode[], delta: IntelligenceFactorDelta) {
  if (delta.scoreDelta === null) return;
  if (delta.factor === 'TECHNICAL' && delta.scoreDelta <= -15) codes.push('TECHNICAL_WEAKENED');
  if (delta.factor === 'TECHNICAL' && delta.scoreDelta >= 15) codes.push('TECHNICAL_STRENGTHENED');
  if (delta.factor === 'FUNDAMENTAL' && delta.scoreDelta <= -15) codes.push('FUNDAMENTAL_WEAKENED');
  if (delta.factor === 'FUNDAMENTAL' && delta.scoreDelta >= 15) codes.push('FUNDAMENTAL_STRENGTHENED');
  if (delta.factor === 'MOMENTUM' && delta.scoreDelta <= -15) codes.push('MOMENTUM_WEAKENED');
  if (delta.factor === 'MOMENTUM' && delta.scoreDelta >= 15) codes.push('MOMENTUM_STRENGTHENED');
  if (delta.factor === 'VOLATILITY' && delta.scoreDelta >= 15) codes.push('VOLATILITY_INCREASED');
  if (delta.factor === 'VOLATILITY' && delta.scoreDelta <= -15) codes.push('VOLATILITY_DECREASED');
}

function primaryReason(codes: IntelligenceDriftReasonCode[]) {
  const priority: IntelligenceDriftReasonCode[] = [
    'METHODOLOGY_VERSION_CHANGED',
    'RECOMMENDATION_CHANGED',
    'RISK_INCREASED',
    'PROVIDER_DISAGREEMENT_INCREASED',
    'DATA_BECAME_STALE',
    'COVERAGE_DECREASED',
    'PROVIDER_CHANGED',
    'TECHNICAL_WEAKENED',
    'FUNDAMENTAL_WEAKENED',
    'MOMENTUM_WEAKENED',
    'VOLATILITY_INCREASED',
    'RISK_DECREASED',
    'TECHNICAL_STRENGTHENED',
    'FUNDAMENTAL_STRENGTHENED',
    'MOMENTUM_STRENGTHENED',
    'VOLATILITY_DECREASED',
    'COVERAGE_INCREASED',
  ];
  return priority.find(code => codes.includes(code)) ?? 'NO_MATERIAL_CHANGE';
}

export function calculateIntelligenceDrift(
  current: AnalysisResult,
  previous: AnalysisResult | null,
): IntelligenceAnalysisDrift {
  if (!previous) {
    return {
      methodologyVersion: INTELLIGENCE_DRIFT_METHODOLOGY_VERSION,
      previousAnalysisId: null,
      confidenceDelta: null,
      recommendationTransition: { from: null, to: current.recommendation },
      riskTransition: { from: null, to: current.risk },
      factorDeltas: [],
      coverageDelta: null,
      freshnessTransition: { from: null, to: current.freshness.state },
      conflictTransition: { from: null, to: current.conflictStatus },
      providerChanged: false,
      methodologyChanged: false,
      reasonCodes: ['NO_PREVIOUS_ANALYSIS'],
      primaryReasonCode: 'NO_PREVIOUS_ANALYSIS',
    };
  }

  const deltas = factorDeltas(previous, current);
  const codes: IntelligenceDriftReasonCode[] = [];
  const methodologyChanged = previous.engineVersion !== current.engineVersion
    || previous.rulesVersion !== current.rulesVersion
    || previous.weightingVersion !== current.weightingVersion;
  const providerChanged = previous.providerProvenance.selectedProvider !== current.providerProvenance.selectedProvider;
  const coverageDelta = numberDelta(current.dataCompleteness.percentage, previous.dataCompleteness.percentage);

  if (methodologyChanged) codes.push('METHODOLOGY_VERSION_CHANGED');
  if (previous.recommendation !== current.recommendation) codes.push('RECOMMENDATION_CHANGED');
  if (RISK_ORDER[current.risk] > RISK_ORDER[previous.risk]) codes.push('RISK_INCREASED');
  if (RISK_ORDER[current.risk] < RISK_ORDER[previous.risk]) codes.push('RISK_DECREASED');
  if (FRESHNESS_ORDER[current.freshness.state] > FRESHNESS_ORDER[previous.freshness.state]) codes.push('DATA_BECAME_STALE');
  if (coverageDelta !== null && coverageDelta <= -10) codes.push('COVERAGE_DECREASED');
  if (coverageDelta !== null && coverageDelta >= 10) codes.push('COVERAGE_INCREASED');
  if (previous.conflictStatus !== 'STRONG' && current.conflictStatus === 'STRONG') codes.push('PROVIDER_DISAGREEMENT_INCREASED');
  if (providerChanged) codes.push('PROVIDER_CHANGED');
  deltas.forEach(delta => addFactorReason(codes, delta));

  const reasonCodes = [...new Set(codes)];
  const primaryReasonCode = primaryReason(reasonCodes);
  if (!reasonCodes.length) reasonCodes.push('NO_MATERIAL_CHANGE');

  return {
    methodologyVersion: INTELLIGENCE_DRIFT_METHODOLOGY_VERSION,
    previousAnalysisId: previous.analysisId,
    confidenceDelta: numberDelta(current.confidence, previous.confidence),
    recommendationTransition: { from: previous.recommendation, to: current.recommendation },
    riskTransition: { from: previous.risk, to: current.risk },
    factorDeltas: deltas,
    coverageDelta,
    freshnessTransition: { from: previous.freshness.state, to: current.freshness.state },
    conflictTransition: { from: previous.conflictStatus, to: current.conflictStatus },
    providerChanged,
    methodologyChanged,
    reasonCodes,
    primaryReasonCode,
  };
}

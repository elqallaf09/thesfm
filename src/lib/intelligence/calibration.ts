import type {
  IntelligenceAnalysisOutcome,
  IntelligenceOutcomeCalibrationGroup,
  IntelligenceOutcomeCalibrationReport,
} from '@/domain/intelligence/outcomes';
import {
  INTELLIGENCE_CALIBRATION_METHODOLOGY_VERSION,
  INTELLIGENCE_CALIBRATION_MINIMUM_DIRECTIONAL_SAMPLE,
} from './outcomePolicy';

function round(value: number | null, precision = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function percentile(values: number[], value: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * value)));
  return sorted[index] ?? null;
}

function group(key: string, outcomes: IntelligenceAnalysisOutcome[]): IntelligenceOutcomeCalibrationGroup {
  const directional = outcomes.filter(outcome => outcome.evaluationStatus === 'EVALUATED')
    .filter(outcome => outcome.outcome === 'CORRECT' || outcome.outcome === 'INCORRECT' || outcome.outcome === 'NEUTRAL');
  const scored = directional.filter(outcome => outcome.outcome === 'CORRECT' || outcome.outcome === 'INCORRECT');
  const correctCount = scored.filter(outcome => outcome.outcome === 'CORRECT').length;
  const incorrectCount = scored.filter(outcome => outcome.outcome === 'INCORRECT').length;
  const neutralCount = directional.filter(outcome => outcome.outcome === 'NEUTRAL').length;
  const sampleSufficient = scored.length >= INTELLIGENCE_CALIBRATION_MINIMUM_DIRECTIONAL_SAMPLE;
  const accuracy = sampleSufficient ? round((correctCount / scored.length) * 100) : null;
  const meanConfidence = sampleSufficient
    ? round(scored.reduce((sum, outcome) => sum + outcome.originalConfidence, 0) / scored.length)
    : null;
  return {
    key,
    evaluatedCount: directional.length,
    correctCount,
    incorrectCount,
    neutralCount,
    excludedCount: outcomes.length - directional.length,
    accuracy,
    meanConfidence,
    descriptiveCalibrationGap: sampleSufficient && accuracy !== null && meanConfidence !== null
      ? round(meanConfidence - accuracy)
      : null,
    sampleSufficient,
  };
}

function grouped(outcomes: IntelligenceAnalysisOutcome[], key: (outcome: IntelligenceAnalysisOutcome) => string) {
  const result = new Map<string, IntelligenceAnalysisOutcome[]>();
  outcomes.forEach(outcome => {
    const groupKey = key(outcome);
    const current = result.get(groupKey) ?? [];
    current.push(outcome);
    result.set(groupKey, current);
  });
  return [...result.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([groupKey, rows]) => group(groupKey, rows));
}

export function buildOutcomeCalibrationReport(outcomes: IntelligenceAnalysisOutcome[]): IntelligenceOutcomeCalibrationReport {
  const mfe = outcomes.map(outcome => outcome.maximumFavorableExcursion).filter((value): value is number => value !== null);
  const mae = outcomes.map(outcome => outcome.maximumAdverseExcursion).filter((value): value is number => value !== null);
  const evaluated = outcomes.filter(outcome => outcome.evaluationStatus === 'EVALUATED');
  return {
    methodologyVersion: INTELLIGENCE_CALIBRATION_METHODOLOGY_VERSION,
    minimumDirectionalSample: INTELLIGENCE_CALIBRATION_MINIMUM_DIRECTIONAL_SAMPLE,
    evaluatedCount: evaluated.length,
    pendingCount: outcomes.filter(outcome => outcome.evaluationStatus === 'PENDING').length,
    insufficientDataCount: outcomes.filter(outcome => outcome.evaluationStatus === 'INSUFFICIENT_DATA').length,
    invalidatedCount: outcomes.filter(outcome => outcome.evaluationStatus === 'INVALIDATED').length,
    failedCount: outcomes.filter(outcome => outcome.evaluationStatus === 'FAILED').length,
    directional: group('ALL', outcomes),
    byConfidenceBucket: grouped(outcomes, outcome => outcome.confidenceBucket),
    byAssetType: grouped(outcomes, outcome => outcome.asset.assetType),
    byHorizon: grouped(outcomes, outcome => outcome.horizon),
    byRecommendation: grouped(outcomes, outcome => outcome.originalRecommendation),
    mfe: { count: mfe.length, median: round(median(mfe)), p25: round(percentile(mfe, 0.25)), p75: round(percentile(mfe, 0.75)) },
    mae: { count: mae.length, median: round(median(mae)), p25: round(percentile(mae, 0.25)), p75: round(percentile(mae, 0.75)) },
    calibrationBoundary: 'DESCRIPTIVE_ONLY_NO_LIVE_WEIGHT_CHANGE',
  };
}

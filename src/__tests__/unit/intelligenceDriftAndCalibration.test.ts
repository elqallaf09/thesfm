import { describe, expect, it } from 'vitest';
import type { AnalysisResult, FactorResult } from '@/domain/intelligence/contracts';
import type { IntelligenceAnalysisOutcome } from '@/domain/intelligence/outcomes';
import { buildOutcomeCalibrationReport } from '@/lib/intelligence/calibration';
import { calculateIntelligenceDrift } from '@/lib/intelligence/drift';

function factor(key: FactorResult['factor'], score: number, availability: FactorResult['availability'] = 'AVAILABLE'): FactorResult {
  return {
    factor: key,
    availability,
    normalizedScore: availability === 'UNAVAILABLE' ? null : score,
    directionalBias: score > 0 ? 'BULLISH' : score < 0 ? 'BEARISH' : 'NEUTRAL',
    strength: Math.abs(score),
    required: false,
    freshness: { state: 'FRESH', observedAt: '2026-07-01T00:00:00.000Z', ageSeconds: 1, thresholdSeconds: 900 },
    evidence: [],
    source: 'verified-test',
    provider: 'verified-test',
    operationalReliability: 1,
    warnings: [],
    failureReason: null,
  };
}

function analysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: '00000000-0000-4000-8000-000000000001',
    correlationId: 'test',
    status: 'COMPLETE',
    scope: 'SHARED',
    requestSource: 'SMART_MARKET_ANALYSIS',
    asset: { canonicalSymbol: 'TEST', providerSymbol: 'TEST', displaySymbol: 'TEST', name: 'Test', assetType: 'STOCK', exchange: 'NYSE', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null },
    generatedAt: '2026-07-01T00:00:00.000Z',
    dataAsOf: '2026-07-01T00:00:00.000Z',
    expiresAt: '2026-07-01T00:15:00.000Z',
    freshness: { state: 'FRESH', observedAt: '2026-07-01T00:00:00.000Z', ageSeconds: 1, thresholdSeconds: 900 },
    recommendation: 'BUY',
    confidence: 70,
    confidenceQuality: 'MODERATE_EVIDENCE',
    confidenceCalculation: { methodologyVersion: 'deterministic-confidence-v1', weightingVersion: 'asset-horizon-weights-v1', appliedWeights: {}, components: { coverage: 1, freshness: 1, consistency: 1, operationalReliability: 1, signalClarity: 1 }, penalties: [], minimumEvidenceMet: true, availableDirectionalFactors: 2 },
    risk: 'LOW',
    horizon: 'SWING',
    entryContext: { available: false, value: null, currency: 'USD', method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' },
    targets: [],
    stopLossContext: { available: false, value: null, currency: 'USD', method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' },
    factors: [factor('TECHNICAL', 45), factor('FUNDAMENTAL', 10), factor('MOMENTUM', 30), factor('VOLATILITY', 8)],
    evidence: [],
    warnings: [],
    limitations: [],
    providerProvenance: { selectedProvider: 'provider-a', attempts: [], fallbackUsed: false, dataKinds: [] },
    engineVersion: '6.1.0',
    rulesVersion: 'recommendation-policy-v1',
    weightingVersion: 'asset-horizon-weights-v1',
    dataCompleteness: { requestedFactors: 4, availableFactors: 4, partialFactors: 0, unavailableFactors: 0, requiredFactors: [], missingRequiredFactors: [], weightedCoverage: 1, percentage: 100 },
    staleData: false,
    conflictStatus: 'NONE',
    explanation: { supportingFactors: [], opposingFactors: [], limitationCodes: [], riskCodes: [], recommendationReasonCode: 'TEST', confidenceReasonCodes: [], invalidationConditions: [] },
    recommendationDecision: { policyVersion: 'recommendation-policy-v1', compositeScore: 30, buyThreshold: 28, sellThreshold: -28, minimumDirectionalConfidence: 55, reasonCode: 'TEST', materialFactorKeys: [] },
    previousAnalysis: null,
    ...overrides,
  };
}

function outcome(index: number, status: IntelligenceAnalysisOutcome['outcome']): IntelligenceAnalysisOutcome {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    analysisId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    scope: 'SHARED',
    asset: { canonicalSymbol: 'TEST', providerSymbol: 'TEST', displaySymbol: 'TEST', assetType: 'STOCK', exchange: 'NYSE', market: 'US', quoteCurrency: 'USD' },
    horizon: 'SWING',
    originalRecommendation: 'BUY',
    originalConfidence: 70,
    originalConfidenceQuality: 'MODERATE_EVIDENCE',
    originalEngineVersion: '6.1.0',
    originalRulesVersion: 'recommendation-policy-v1',
    originalWeightingVersion: 'asset-horizon-weights-v1',
    confidenceBucket: '60_79',
    evaluationStatus: 'EVALUATED',
    evaluationWindow: { methodologyVersion: 'outcome-evaluation-v1', horizon: 'SWING', referenceAt: '2026-01-01T00:00:00.000Z', referenceSource: 'DATA_AS_OF', startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-01-31T00:00:00.000Z', eligibleAt: '2026-01-31T00:00:00.000Z', entryToleranceSeconds: 1, finalToleranceSeconds: 1, interval: '1d' },
    entryReferencePrice: 100,
    entryReferenceAt: '2026-01-01T00:00:00.000Z',
    entryCurrency: 'USD',
    finalReferencePrice: 105,
    finalReferenceAt: '2026-01-31T00:00:00.000Z',
    finalCurrency: 'USD',
    maximumFavorableExcursion: 6,
    maximumAdverseExcursion: -2,
    directionalReturn: 5,
    benchmarkReturn: null,
    outcome: status,
    evaluationDataSource: 'verified-test',
    priceDataAsOf: '2026-01-31T00:00:00.000Z',
    priceDataReceivedAt: '2026-02-01T00:00:00.000Z',
    providerProvenance: { selectedProvider: 'verified-test', attempts: [], adjustedPrices: 'UNSUPPORTED' },
    warnings: [],
    methodologyVersion: 'outcome-evaluation-v1',
    methodologySnapshot: {},
    evaluatedAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('intelligence drift and calibration foundation', () => {
  it('generates deterministic structured drift reasons from snapshots', () => {
    const previous = analysis();
    const current = analysis({
      analysisId: '00000000-0000-4000-8000-000000000002',
      recommendation: 'WAIT',
      confidence: 54,
      risk: 'HIGH',
      freshness: { ...previous.freshness, state: 'STALE' },
      conflictStatus: 'STRONG',
      providerProvenance: { ...previous.providerProvenance, selectedProvider: 'provider-b' },
      factors: [factor('TECHNICAL', 20), factor('FUNDAMENTAL', 30), factor('MOMENTUM', 10), factor('VOLATILITY', 28)],
      dataCompleteness: { ...previous.dataCompleteness, percentage: 70 },
    });
    const drift = calculateIntelligenceDrift(current, previous);
    expect(drift.reasonCodes).toEqual(expect.arrayContaining([
      'RECOMMENDATION_CHANGED',
      'RISK_INCREASED',
      'DATA_BECAME_STALE',
      'COVERAGE_DECREASED',
      'PROVIDER_DISAGREEMENT_INCREASED',
      'PROVIDER_CHANGED',
      'TECHNICAL_WEAKENED',
      'FUNDAMENTAL_STRENGTHENED',
      'MOMENTUM_WEAKENED',
      'VOLATILITY_INCREASED',
    ]));
    expect(drift.primaryReasonCode).toBe('RECOMMENDATION_CHANGED');
  });

  it('withholds accuracy and descriptive calibration data below the minimum sample', () => {
    const tooSmall = buildOutcomeCalibrationReport(Array.from({ length: 29 }, (_, index) => outcome(index, 'CORRECT')));
    const sufficient = buildOutcomeCalibrationReport(Array.from({ length: 30 }, (_, index) => outcome(index, index % 3 === 0 ? 'INCORRECT' : 'CORRECT')));
    expect(tooSmall.directional.sampleSufficient).toBe(false);
    expect(tooSmall.directional.accuracy).toBeNull();
    expect(sufficient.directional.sampleSufficient).toBe(true);
    expect(sufficient.directional.accuracy).toBeCloseTo(66.67, 1);
    expect(sufficient.calibrationBoundary).toBe('DESCRIPTIVE_ONLY_NO_LIVE_WEIGHT_CHANGE');
  });
});

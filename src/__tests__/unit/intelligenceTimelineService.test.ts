import { describe, expect, it } from 'vitest';
import type { AnalysisResult, FactorResult } from '@/domain/intelligence/contracts';
import type { StoredIntelligenceAnalysis } from '@/services/intelligence/outcomeStore';
import { MemoryIntelligenceOutcomeStore } from '@/services/intelligence/outcomeStore';
import { IntelligenceTimelineService } from '@/services/intelligence/timeline';

const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';
const ASSET_QUERY = { canonicalSymbol: 'TEST', assetType: 'STOCK' as const };

function factor(
  name: FactorResult['factor'],
  score: number,
  availability: FactorResult['availability'] = 'AVAILABLE',
): FactorResult {
  return {
    factor: name,
    availability,
    normalizedScore: availability === 'UNAVAILABLE' ? null : score,
    directionalBias: score > 0 ? 'BULLISH' : score < 0 ? 'BEARISH' : 'NEUTRAL',
    strength: Math.abs(score),
    required: false,
    freshness: {
      state: 'FRESH',
      observedAt: '2025-01-01T00:00:00.000Z',
      ageSeconds: 1,
      thresholdSeconds: 900,
    },
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
    analysisId: '20000000-0000-4000-8000-000000000001',
    correlationId: 'timeline-test',
    status: 'COMPLETE',
    scope: 'SHARED',
    requestSource: 'SMART_MARKET_ANALYSIS',
    asset: {
      canonicalSymbol: 'TEST',
      providerSymbol: 'TEST',
      displaySymbol: 'TEST',
      name: 'Test asset',
      assetType: 'STOCK',
      exchange: 'NYSE',
      market: 'US',
      quoteCurrency: 'USD',
      country: 'US',
      logoUrl: null,
    },
    generatedAt: '2025-01-01T00:00:00.000Z',
    dataAsOf: '2025-01-01T00:00:00.000Z',
    expiresAt: '2025-01-01T00:15:00.000Z',
    freshness: {
      state: 'FRESH',
      observedAt: '2025-01-01T00:00:00.000Z',
      ageSeconds: 1,
      thresholdSeconds: 900,
    },
    recommendation: 'BUY',
    confidence: 70,
    confidenceQuality: 'MODERATE_EVIDENCE',
    confidenceCalculation: {
      methodologyVersion: 'deterministic-confidence-v1',
      weightingVersion: 'asset-horizon-weights-v1',
      appliedWeights: {},
      components: {
        coverage: 1,
        freshness: 1,
        consistency: 1,
        operationalReliability: 1,
        signalClarity: 1,
      },
      penalties: [],
      minimumEvidenceMet: true,
      availableDirectionalFactors: 2,
    },
    risk: 'MEDIUM',
    horizon: 'SWING',
    entryContext: {
      available: false,
      value: null,
      currency: 'USD',
      method: null,
      reasonCode: 'CALCULATION_NOT_SUPPORTED',
    },
    marketPrice: { available: true, value: 150, currency: 'USD', observedAt: '2025-01-01T00:00:00.000Z', source: 'provider-a', dataStatus: 'LIVE' },
    targets: { available: false, lower: null, upper: null, currency: 'USD', source: null, dataAsOf: null, method: null, reasonCode: 'CALCULATION_NOT_SUPPORTED' },
    stopLossContext: {
      available: false,
      value: null,
      currency: 'USD',
      method: null,
      reasonCode: 'CALCULATION_NOT_SUPPORTED',
    },
    factors: [factor('TECHNICAL', 45), factor('FUNDAMENTAL', 10)],
    evidence: [],
    warnings: [],
    limitations: [],
    providerProvenance: {
      selectedProvider: 'provider-a',
      attempts: [],
      fallbackUsed: false,
      dataKinds: [],
    },
    engineVersion: '6.1.0',
    rulesVersion: 'recommendation-policy-v1',
    weightingVersion: 'asset-horizon-weights-v1',
    dataCompleteness: {
      requestedFactors: 2,
      availableFactors: 2,
      partialFactors: 0,
      unavailableFactors: 0,
      requiredFactors: [],
      missingRequiredFactors: [],
      weightedCoverage: 1,
      percentage: 100,
    },
    staleData: false,
    conflictStatus: 'NONE',
    explanation: {
      supportingFactors: [],
      opposingFactors: [],
      limitationCodes: [],
      riskCodes: [],
      recommendationReasonCode: 'TEST',
      confidenceReasonCodes: [],
      invalidationConditions: [],
    },
    recommendationDecision: {
      policyVersion: 'recommendation-policy-v1',
      compositeScore: 35,
      buyThreshold: 28,
      sellThreshold: -28,
      minimumDirectionalConfidence: 55,
      reasonCode: 'TEST',
      materialFactorKeys: [],
    },
    previousAnalysis: null,
    persistenceStatus: 'PERSISTED',
    ...overrides,
  };
}

function stored(result: AnalysisResult, userId: string | null = null): StoredIntelligenceAnalysis {
  return { result, userId, createdAt: result.generatedAt };
}

function timelineQuery(userId: string | null, overrides: Partial<{
  from: string | null;
  to: string | null;
  cursor: string | null;
  limit: number;
}> = {}) {
  return {
    asset: ASSET_QUERY,
    horizon: 'SWING' as const,
    userId,
    from: null,
    to: null,
    cursor: null,
    limit: 10,
    ...overrides,
  };
}

describe('intelligence timeline service', () => {
  it('paginates only the authenticated owner history and keeps it isolated', async () => {
    const sharedOld = analysis({
      analysisId: '20000000-0000-4000-8000-000000000010',
      scope: 'PRIVATE',
      generatedAt: '2025-01-01T00:00:00.000Z',
    });
    const sharedNew = analysis({
      analysisId: '20000000-0000-4000-8000-000000000011',
      scope: 'PRIVATE',
      generatedAt: '2025-01-03T00:00:00.000Z',
    });
    const ownerPrivate = analysis({
      analysisId: '20000000-0000-4000-8000-000000000012',
      scope: 'PRIVATE',
      generatedAt: '2025-01-04T00:00:00.000Z',
    });
    const otherPrivate = analysis({
      analysisId: '20000000-0000-4000-8000-000000000013',
      scope: 'PRIVATE',
      generatedAt: '2025-01-05T00:00:00.000Z',
    });
    const store = new MemoryIntelligenceOutcomeStore([
      stored(sharedOld, OWNER),
      stored(sharedNew, OWNER),
      stored(ownerPrivate, OWNER),
      stored(otherPrivate, OTHER_USER),
    ]);
    const subject = new IntelligenceTimelineService(store);

    const ownerFirstPage = await subject.getTimeline(timelineQuery(OWNER, { limit: 1 }));
    expect(ownerFirstPage.items.map(item => item.analysisId)).toEqual([ownerPrivate.analysisId]);
    expect(ownerFirstPage.nextCursor).toBe(ownerPrivate.generatedAt);
    const ownerSecondPage = await subject.getTimeline(timelineQuery(OWNER, {
      limit: 1,
      cursor: ownerFirstPage.nextCursor,
    }));
    expect(ownerSecondPage.items.map(item => item.analysisId)).toEqual([sharedNew.analysisId]);

    const owner = await subject.getTimeline(timelineQuery(OWNER));
    expect(owner.items.map(item => item.analysisId)).toEqual([
      ownerPrivate.analysisId,
      sharedNew.analysisId,
      sharedOld.analysisId,
    ]);
    const otherUser = await subject.getTimeline(timelineQuery(OTHER_USER));
    expect(otherUser.items.map(item => item.analysisId)).toEqual([
      otherPrivate.analysisId,
    ]);
    expect(otherUser.items.map(item => item.analysisId)).not.toContain(ownerPrivate.analysisId);
  });

  it('returns structured deterministic drift and an explicit pending outcome state', async () => {
    const previous = analysis({
      analysisId: '20000000-0000-4000-8000-000000000020',
      scope: 'PRIVATE',
      generatedAt: '2025-01-01T00:00:00.000Z',
      factors: [factor('TECHNICAL', 50), factor('FUNDAMENTAL', 5)],
    });
    const current = analysis({
      analysisId: '20000000-0000-4000-8000-000000000021',
      scope: 'PRIVATE',
      generatedAt: '2025-01-02T00:00:00.000Z',
      recommendation: 'WAIT',
      confidence: 53,
      risk: 'HIGH',
      freshness: { ...previous.freshness, state: 'STALE' },
      conflictStatus: 'STRONG',
      factors: [factor('TECHNICAL', 10), factor('FUNDAMENTAL', 30)],
      providerProvenance: { ...previous.providerProvenance, selectedProvider: 'provider-b' },
      dataCompleteness: { ...previous.dataCompleteness, percentage: 70 },
    });
    const subject = new IntelligenceTimelineService(new MemoryIntelligenceOutcomeStore([
      stored(previous, OWNER),
      stored(current, OWNER),
    ]));

    const timeline = await subject.getTimeline(timelineQuery(OWNER));
    const latest = timeline.items[0]!;

    expect(latest.outcomeStatus).toBe('PENDING');
    expect(latest.outcome).toBeNull();
    expect(latest.drift.confidenceDelta).toBe(-17);
    expect(latest.drift.reasonCodes).toEqual(expect.arrayContaining([
      'RECOMMENDATION_CHANGED',
      'TECHNICAL_WEAKENED',
      'FUNDAMENTAL_STRENGTHENED',
      'DATA_BECAME_STALE',
      'COVERAGE_DECREASED',
      'PROVIDER_DISAGREEMENT_INCREASED',
      'RISK_INCREASED',
      'PROVIDER_CHANGED',
    ]));
  });

  it('authorizes comparisons against both parent analyses and rejects cross-user or mismatched comparisons', async () => {
    const shared = analysis({
      analysisId: '20000000-0000-4000-8000-000000000030',
      scope: 'PRIVATE',
      generatedAt: '2025-01-01T00:00:00.000Z',
    });
    const ownerPrivate = analysis({
      analysisId: '20000000-0000-4000-8000-000000000031',
      scope: 'PRIVATE',
      generatedAt: '2025-01-02T00:00:00.000Z',
      recommendation: 'SELL',
    });
    const wrongAsset = analysis({
      analysisId: '20000000-0000-4000-8000-000000000032',
      scope: 'PRIVATE',
      asset: { ...shared.asset, canonicalSymbol: 'OTHER', providerSymbol: 'OTHER', displaySymbol: 'OTHER' },
    });
    const subject = new IntelligenceTimelineService(new MemoryIntelligenceOutcomeStore([
      stored(shared, OWNER),
      stored(ownerPrivate, OWNER),
      stored(wrongAsset, OWNER),
    ]));

    const ownerComparison = await subject.compare({
      leftAnalysisId: ownerPrivate.analysisId,
      rightAnalysisId: shared.analysisId,
      userId: OWNER,
      asset: ASSET_QUERY,
      horizon: 'SWING',
    });
    expect(ownerComparison).toMatchObject({
      left: { analysisId: shared.analysisId },
      right: { analysisId: ownerPrivate.analysisId },
      drift: { primaryReasonCode: 'RECOMMENDATION_CHANGED' },
    });

    await expect(subject.compare({
      leftAnalysisId: ownerPrivate.analysisId,
      rightAnalysisId: shared.analysisId,
      userId: OTHER_USER,
      asset: ASSET_QUERY,
      horizon: 'SWING',
    })).resolves.toBeNull();
    await expect(subject.compare({
      leftAnalysisId: wrongAsset.analysisId,
      rightAnalysisId: shared.analysisId,
      userId: OWNER,
      asset: ASSET_QUERY,
      horizon: 'SWING',
    })).resolves.toBeNull();
  });
});

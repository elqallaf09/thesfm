import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import type { IntelligenceHistoricalPriceHistory } from '@/domain/intelligence/outcomes';
import { createEvaluationWindow } from '@/lib/intelligence/outcomePolicy';
import { MemoryIntelligenceHistoricalPriceProvider } from '@/providers/intelligence/historicalPriceProvider';
import { createIntelligenceOutcomeEvaluator } from '@/services/intelligence/outcomeEvaluator';
import {
  MemoryIntelligenceOutcomeStore,
  type StoredIntelligenceAnalysis,
} from '@/services/intelligence/outcomeStore';
import { MemoryIntelligenceTelemetry } from '@/services/intelligence/telemetry';

const USER_ONE = '00000000-0000-4000-8000-000000000001';

function analysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    analysisId: '10000000-0000-4000-8000-000000000001',
    correlationId: 'outcome-test',
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
    confidence: 72,
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
    targets: [],
    stopLossContext: {
      available: false,
      value: null,
      currency: 'USD',
      method: null,
      reasonCode: 'CALCULATION_NOT_SUPPORTED',
    },
    factors: [],
    evidence: [],
    warnings: [],
    limitations: [],
    providerProvenance: {
      selectedProvider: 'intelligence-provider',
      attempts: [],
      fallbackUsed: false,
      dataKinds: [],
    },
    engineVersion: '6.1.0',
    rulesVersion: 'recommendation-policy-v1',
    weightingVersion: 'asset-horizon-weights-v1',
    dataCompleteness: {
      requestedFactors: 0,
      availableFactors: 0,
      partialFactors: 0,
      unavailableFactors: 0,
      requiredFactors: [],
      missingRequiredFactors: [],
      weightedCoverage: 0,
      percentage: 0,
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
    ...overrides,
  };
}

function stored(result: AnalysisResult, userId: string | null = null): StoredIntelligenceAnalysis {
  return { result, userId, createdAt: result.generatedAt };
}

function historyFor(result: AnalysisResult, overrides: Partial<IntelligenceHistoricalPriceHistory> = {}) {
  const window = createEvaluationWindow(result);
  const start = Date.parse(window.startAt);
  const end = Date.parse(window.endAt);
  const points = [
    { at: new Date(start).toISOString(), open: 100, high: 102, low: 98, close: 100, volume: 1_000 },
    { at: new Date(start + 10 * 86_400_000).toISOString(), open: 105, high: 112, low: 97, close: 108, volume: 1_000 },
    { at: new Date(end).toISOString(), open: 109, high: 111, low: 106, close: 110, volume: 1_000 },
  ];
  return {
    provider: 'verified-history',
    providerSymbol: result.asset.providerSymbol,
    currency: result.asset.quoteCurrency,
    receivedAt: '2025-03-01T00:00:00.000Z',
    dataAsOf: points.at(-1)!.at,
    deliveryState: 'LIVE' as const,
    cacheAgeSeconds: 0,
    adjustedPrices: 'VERIFIED' as const,
    points,
    attempts: [{
      provider: 'verified-history',
      status: 'SUCCESS' as const,
      code: null,
      latencyMs: 1,
      cached: false,
      dataAsOf: points.at(-1)!.at,
    }],
    warnings: [],
    ...overrides,
  } satisfies IntelligenceHistoricalPriceHistory;
}

function evaluator(input: {
  store: MemoryIntelligenceOutcomeStore;
  history: IntelligenceHistoricalPriceHistory | null;
  now?: number;
}) {
  return createIntelligenceOutcomeEvaluator({
    store: input.store,
    providers: [new MemoryIntelligenceHistoricalPriceProvider(input.history)],
    now: () => input.now ?? Date.parse('2025-03-01T00:00:00.000Z'),
    providerTimeoutMs: 100,
  });
}

describe('intelligence outcome evaluator', () => {
  it('evaluates an eligible BUY from verified, currency-matched history and persists MFE/MAE once', async () => {
    const result = analysis();
    const store = new MemoryIntelligenceOutcomeStore([stored(result)]);
    const telemetry = new MemoryIntelligenceTelemetry();
    const subject = evaluator({ store, history: historyFor(result) });

    await expect(subject.evaluateOne(stored(result), telemetry)).resolves.toBe('EVALUATED');
    const outcome = await store.getOutcome(result.analysisId);

    expect(outcome).toMatchObject({
      evaluationStatus: 'EVALUATED',
      outcome: 'CORRECT',
      entryReferencePrice: 100,
      finalReferencePrice: 110,
      directionalReturn: 10,
      maximumFavorableExcursion: 12,
      maximumAdverseExcursion: -3,
      entryCurrency: 'USD',
      finalCurrency: 'USD',
      evaluationDataSource: 'verified-history',
    });
    expect(telemetry.events.map(event => event.name)).toEqual(expect.arrayContaining([
      'intelligence_outcome_eligible_analysis_found',
      'intelligence_outcome_provider_history_requested',
      'intelligence_outcome_evaluation_succeeded',
      'intelligence_outcome_persisted',
    ]));

    await expect(subject.evaluateOne(stored(result), telemetry)).resolves.toBe('DUPLICATE_PREVENTED');
    expect(store.allOutcomes()).toHaveLength(1);
  });

  it('evaluates SELL directionally but deliberately excludes WAIT from directional accuracy', async () => {
    const sell = analysis({
      analysisId: '10000000-0000-4000-8000-000000000002',
      recommendation: 'SELL',
    });
    const wait = analysis({
      analysisId: '10000000-0000-4000-8000-000000000003',
      recommendation: 'WAIT',
    });
    const sellHistory = historyFor(sell, {
      points: [
        { at: '2025-01-01T00:00:00.000Z', open: 100, high: 102, low: 98, close: 100, volume: 1_000 },
        { at: '2025-01-11T00:00:00.000Z', open: 95, high: 110, low: 85, close: 94, volume: 1_000 },
        { at: '2025-01-31T00:00:00.000Z', open: 91, high: 93, low: 89, close: 90, volume: 1_000 },
      ],
    });
    const sellStore = new MemoryIntelligenceOutcomeStore([stored(sell)]);
    await evaluator({ store: sellStore, history: sellHistory })
      .evaluateOne(stored(sell), new MemoryIntelligenceTelemetry());
    expect(await sellStore.getOutcome(sell.analysisId)).toMatchObject({
      evaluationStatus: 'EVALUATED',
      outcome: 'CORRECT',
      directionalReturn: 10,
      maximumFavorableExcursion: 15,
      maximumAdverseExcursion: -10,
    });

    const waitStore = new MemoryIntelligenceOutcomeStore([stored(wait)]);
    await evaluator({ store: waitStore, history: historyFor(wait) })
      .evaluateOne(stored(wait), new MemoryIntelligenceTelemetry());
    const waitOutcome = await waitStore.getOutcome(wait.analysisId);
    expect(waitOutcome).toMatchObject({
      evaluationStatus: 'EVALUATED',
      outcome: 'NOT_APPLICABLE',
      directionalReturn: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
    });
    expect(waitOutcome?.warnings).toContainEqual(expect.objectContaining({ code: 'WAIT_EXCLUDED_FROM_DIRECTIONAL_ACCURACY' }));
  });

  it('does not create an outcome before the configured window is due', async () => {
    const result = analysis();
    const store = new MemoryIntelligenceOutcomeStore([stored(result)]);
    const beforeWindowClose = Date.parse(createEvaluationWindow(result).eligibleAt) - 1;

    await expect(evaluator({ store, history: historyFor(result), now: beforeWindowClose })
      .evaluateOne(stored(result), new MemoryIntelligenceTelemetry()))
      .resolves.toBe('NOT_DUE');
    await expect(store.getOutcome(result.analysisId)).resolves.toBeNull();
  });

  it('records truthful insufficient-data outcomes for stale cached, missing, and currency-conflicting history', async () => {
    const stale = analysis({ analysisId: '10000000-0000-4000-8000-000000000004' });
    const missing = analysis({ analysisId: '10000000-0000-4000-8000-000000000005' });
    const conflictingCurrency = analysis({ analysisId: '10000000-0000-4000-8000-000000000006' });

    const staleStore = new MemoryIntelligenceOutcomeStore([stored(stale)]);
    await evaluator({
      store: staleStore,
      history: historyFor(stale, { deliveryState: 'CACHED', cacheAgeSeconds: 901 }),
    }).evaluateOne(stored(stale), new MemoryIntelligenceTelemetry());
    expect(await staleStore.getOutcome(stale.analysisId)).toMatchObject({ evaluationStatus: 'INSUFFICIENT_DATA' });
    expect((await staleStore.getOutcome(stale.analysisId))?.warnings)
      .toContainEqual(expect.objectContaining({ code: 'HISTORICAL_PRICE_CACHE_TOO_STALE' }));

    const missingWindow = createEvaluationWindow(missing);
    const missingStore = new MemoryIntelligenceOutcomeStore([stored(missing)]);
    await evaluator({
      store: missingStore,
      history: historyFor(missing, {
        points: [{
          at: missingWindow.startAt,
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 1_000,
        }],
      }),
    }).evaluateOne(stored(missing), new MemoryIntelligenceTelemetry());
    expect((await missingStore.getOutcome(missing.analysisId))?.warnings)
      .toContainEqual(expect.objectContaining({ code: 'FINAL_REFERENCE_PRICE_UNAVAILABLE' }));

    const currencyStore = new MemoryIntelligenceOutcomeStore([stored(conflictingCurrency)]);
    await evaluator({
      store: currencyStore,
      history: historyFor(conflictingCurrency, { currency: 'EUR' }),
    }).evaluateOne(stored(conflictingCurrency), new MemoryIntelligenceTelemetry());
    expect((await currencyStore.getOutcome(conflictingCurrency.analysisId))?.warnings)
      .toContainEqual(expect.objectContaining({ code: 'HISTORICAL_PRICE_CURRENCY_MISMATCH' }));
  });

  it('keeps a transient provider outage pending and succeeds safely on a later retry', async () => {
    const result = analysis({ analysisId: '10000000-0000-4000-8000-000000000007' });
    const store = new MemoryIntelligenceOutcomeStore([stored(result, USER_ONE)]);

    await expect(evaluator({ store, history: null })
      .evaluateOne(stored(result, USER_ONE), new MemoryIntelligenceTelemetry()))
      .resolves.toBe('PENDING_RETRY');
    await expect(store.getOutcome(result.analysisId)).resolves.toMatchObject({ evaluationStatus: 'PENDING' });

    await expect(evaluator({ store, history: historyFor(result) })
      .evaluateOne(stored(result, USER_ONE), new MemoryIntelligenceTelemetry()))
      .resolves.toBe('EVALUATED');
    await expect(store.getOutcome(result.analysisId)).resolves.toMatchObject({ evaluationStatus: 'EVALUATED' });
  });
});

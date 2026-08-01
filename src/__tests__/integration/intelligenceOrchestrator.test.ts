import { describe, expect, it } from 'vitest';
import type {
  AnalysisRequest,
  CanonicalAssetIdentity,
  IntelligenceProvider,
  VerifiedIntelligenceSnapshot,
} from '@/domain/intelligence/contracts';
import { IntelligenceError } from '@/services/intelligence/errors';
import { createIntelligenceOrchestrator } from '@/services/intelligence/orchestrator';
import { MemoryIntelligenceAnalysisStore } from '@/services/intelligence/store';
import { MemoryIntelligenceTelemetry } from '@/services/intelligence/telemetry';

const ASSET: CanonicalAssetIdentity = {
  canonicalSymbol: 'AAPL',
  providerSymbol: 'AAPL',
  displaySymbol: 'AAPL',
  name: 'Apple Inc.',
  assetType: 'STOCK',
  exchange: 'NASDAQ',
  market: 'US',
  quoteCurrency: 'USD',
  country: 'US',
  logoUrl: null,
};

function request(correlationId: string, forceRefresh = false): AnalysisRequest {
  return {
    userId: null,
    asset: { symbol: 'AAPL', assetType: 'STOCK' },
    horizon: 'SWING',
    locale: 'en',
    requestedModules: ['TECHNICAL', 'FUNDAMENTAL', 'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK'],
    providerPreferences: null,
    source: 'INTERNAL',
    correlationId,
    forceRefresh,
  };
}

function snapshot(provider = 'verified-provider', now = Date.parse('2026-07-19T08:00:00.000Z')): VerifiedIntelligenceSnapshot {
  const candleStart = now - 79 * 86_400_000;
  return {
    asset: ASSET,
    provider,
    receivedAt: new Date(now).toISOString(),
    dataAsOf: new Date(now - 30_000).toISOString(),
    dataStatus: 'LIVE',
    fallbackUsed: false,
    operationalReliability: 1,
    reportedRiskLevel: 'MEDIUM',
    quote: { price: 150, change: 1, changePercent: 0.67, volume: 1_500_000 },
    levels: { support: 120, resistance: 160 },
    candles: Array.from({ length: 80 }, (_, index) => ({
      at: new Date(candleStart + index * 86_400_000).toISOString(),
      open: 100 + index * 0.6,
      high: 102 + index * 0.6,
      low: 99 + index * 0.6,
      close: 101 + index * 0.6,
      volume: 1_000_000 + index * 10_000,
    })),
    fundamentals: { trailingPE: 26, trailingEps: 6.2, revenueGrowth: 0.12 },
    fundamentalsSource: provider,
    sharia: { status: 'unclassified', reason: null, source: null, reviewedAt: null },
    warnings: [],
    providerAttempts: [{
      provider,
      capability: 'ANALYSIS_SNAPSHOT',
      status: 'SUCCESS',
      code: null,
      latencyMs: 5,
      fallbackUsed: false,
      dataAsOf: new Date(now - 30_000).toISOString(),
    }],
  };
}

function successfulProvider(id = 'verified-provider', getSnapshot?: IntelligenceProvider['getSnapshot']) {
  let calls = 0;
  const provider: IntelligenceProvider = {
    id,
    supports: () => true,
    async getSnapshot(input, asset) {
      calls += 1;
      return getSnapshot ? getSnapshot(input, asset) : snapshot(id);
    },
  };
  return { provider, calls: () => calls };
}

function orchestratorFor(input: {
  providers: IntelligenceProvider[];
  store?: MemoryIntelligenceAnalysisStore;
  now?: () => number;
}) {
  let id = 0;
  return createIntelligenceOrchestrator({
    providers: input.providers,
    store: input.store ?? new MemoryIntelligenceAnalysisStore(),
    resolveAsset: async () => ASSET,
    now: input.now ?? (() => Date.parse('2026-07-19T08:00:00.000Z')),
    createId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    providerTimeoutMs: 500,
  });
}

describe('intelligence orchestrator', () => {
  it('normalizes a provider success, persists it, and emits traceable events', async () => {
    const source = successfulProvider();
    const store = new MemoryIntelligenceAnalysisStore();
    const telemetry = new MemoryIntelligenceTelemetry();
    const orchestrator = orchestratorFor({ providers: [source.provider], store });

    const result = await orchestrator.analyze(request('correlation-success'), telemetry);

    expect(result.providerProvenance.selectedProvider).toBe('verified-provider');
    expect(result.status).toBe('COMPLETE');
    expect(result.confidenceCalculation.methodologyVersion).toBe('deterministic-confidence-v1');
    expect(result.targets).toMatchObject({ available: true, method: 'RECENT_OHLC_RANGE' });
    expect(result.marketPrice).toMatchObject({ available: true, value: 150 });
    expect(result.entryContext.available).toBe(false);
    expect(store.all()).toHaveLength(1);
    expect(telemetry.events.map(event => event.name)).toEqual(expect.arrayContaining([
      'intelligence_analysis_requested',
      'intelligence_provider_called',
      'intelligence_confidence_calculated',
      'intelligence_recommendation_generated',
      'intelligence_analysis_persisted',
    ]));
  });

  it('uses a fresh cached result without another provider call', async () => {
    const source = successfulProvider();
    const orchestrator = orchestratorFor({ providers: [source.provider] });
    await orchestrator.analyze(request('correlation-first'), new MemoryIntelligenceTelemetry());

    const telemetry = new MemoryIntelligenceTelemetry();
    const cached = await orchestrator.analyze(request('correlation-second'), telemetry);

    expect(source.calls()).toBe(1);
    expect(cached.correlationId).toBe('correlation-second');
    expect(telemetry.events).toContainEqual(expect.objectContaining({ name: 'intelligence_cache_hit' }));
  });

  it('deduplicates concurrent requests for the same canonical analysis', async () => {
    let release!: (value: VerifiedIntelligenceSnapshot) => void;
    const pending = new Promise<VerifiedIntelligenceSnapshot>(resolve => { release = resolve; });
    const source = successfulProvider('slow-provider', () => pending);
    const orchestrator = orchestratorFor({ providers: [source.provider] });
    const first = orchestrator.analyze(request('correlation-one'), new MemoryIntelligenceTelemetry());
    const secondTelemetry = new MemoryIntelligenceTelemetry();
    const second = orchestrator.analyze(request('correlation-two'), secondTelemetry);

    await Promise.resolve();
    release(snapshot('slow-provider'));
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(source.calls()).toBe(1);
    expect(firstResult.analysisId).toBe(secondResult.analysisId);
    expect(secondResult.correlationId).toBe('correlation-two');
    expect(secondTelemetry.events).toContainEqual(expect.objectContaining({ name: 'intelligence_request_deduplicated' }));
  });

  it('records a failed provider and uses the next supported provider', async () => {
    const failed: IntelligenceProvider = {
      id: 'failed-provider',
      supports: () => true,
      getSnapshot: async () => { throw new IntelligenceError('PROVIDER_UNAVAILABLE', true); },
    };
    const fallback = successfulProvider('fallback-provider');
    const telemetry = new MemoryIntelligenceTelemetry();
    const result = await orchestratorFor({ providers: [failed, fallback.provider] })
      .analyze(request('correlation-fallback'), telemetry);

    expect(result.providerProvenance.selectedProvider).toBe('fallback-provider');
    expect(result.providerProvenance.fallbackUsed).toBe(true);
    expect(result.providerProvenance.attempts.map(attempt => attempt.status)).toEqual(['FAILED', 'SUCCESS']);
    expect(telemetry.events).toContainEqual(expect.objectContaining({ name: 'intelligence_provider_fallback_used' }));
  });

  it('returns an insufficient-data result when every provider fails', async () => {
    const failed: IntelligenceProvider = {
      id: 'failed-provider',
      supports: () => true,
      getSnapshot: async () => { throw new IntelligenceError('PROVIDER_UNAVAILABLE', true); },
    };
    const result = await orchestratorFor({ providers: [failed] })
      .analyze(request('correlation-total-failure'), new MemoryIntelligenceTelemetry());

    expect(result.status).toBe('INSUFFICIENT_DATA');
    expect(result.recommendation).toBe('INSUFFICIENT_DATA');
    expect(result.confidenceQuality).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.providerProvenance.selectedProvider).toBeNull();
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'ALL_PROVIDERS_UNAVAILABLE' }));
  });

  it('marks a previous result stale when a live refresh fails', async () => {
    let now = Date.parse('2026-07-19T08:00:00.000Z');
    let fail = false;
    const source = successfulProvider('mutable-provider', async () => {
      if (fail) throw new IntelligenceError('PROVIDER_UNAVAILABLE', true);
      return snapshot('mutable-provider', now);
    });
    const store = new MemoryIntelligenceAnalysisStore();
    const orchestrator = orchestratorFor({ providers: [source.provider], store, now: () => now });
    const fresh = await orchestrator.analyze(request('correlation-fresh'), new MemoryIntelligenceTelemetry());
    now = Date.parse(fresh.expiresAt) + 1_000;
    fail = true;

    const stale = await orchestrator.analyze(request('correlation-stale'), new MemoryIntelligenceTelemetry());

    expect(stale.staleData).toBe(true);
    expect(stale.freshness.state).toBe('STALE');
    expect(stale.warnings).toContainEqual(expect.objectContaining({ code: 'LIVE_REFRESH_FAILED_STALE_RESULT' }));
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });

  it('rejects an asset for which no configured provider claims support', async () => {
    const unsupported: IntelligenceProvider = {
      id: 'limited-provider',
      supports: () => false,
      getSnapshot: async () => snapshot('limited-provider'),
    };
    await expect(orchestratorFor({ providers: [unsupported] })
      .analyze(request('correlation-unsupported'), new MemoryIntelligenceTelemetry()))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_ASSET' });
  });

  it('exposes shared results intentionally while isolating private history by owner', async () => {
    const store = new MemoryIntelligenceAnalysisStore();
    const source = successfulProvider();
    const shared = await orchestratorFor({ providers: [source.provider] })
      .analyze(request('correlation-shared'), new MemoryIntelligenceTelemetry());
    const privateResult = {
      ...shared,
      analysisId: '00000000-0000-4000-8000-000000000099',
      scope: 'PRIVATE' as const,
      generatedAt: new Date(Date.parse(shared.generatedAt) + 1_000).toISOString(),
    };
    await store.save(shared, null);
    await store.save(privateResult, '00000000-0000-4000-8000-000000000001');

    const anonymousLatest = await store.getLatest({ asset: ASSET, horizon: 'SWING', userId: null });
    const ownerLatest = await store.getLatest({ asset: ASSET, horizon: 'SWING', userId: '00000000-0000-4000-8000-000000000001' });
    const otherUserLatest = await store.getLatest({ asset: ASSET, horizon: 'SWING', userId: '00000000-0000-4000-8000-000000000002' });

    expect(anonymousLatest?.scope).toBe('SHARED');
    expect(ownerLatest?.analysisId).toBe(privateResult.analysisId);
    expect(otherUserLatest?.scope).toBe('SHARED');
  });

  it('returns a private cached result only to its owner', async () => {
    const store = new MemoryIntelligenceAnalysisStore();
    const source = successfulProvider();
    const seedOrchestrator = orchestratorFor({ providers: [source.provider] });
    const shared = await seedOrchestrator.analyze(request('correlation-shared-seed'), new MemoryIntelligenceTelemetry());
    await store.save(shared, null);
    await store.save({
      ...shared,
      analysisId: '00000000-0000-4000-8000-000000000098',
      scope: 'PRIVATE',
      generatedAt: new Date(Date.parse(shared.generatedAt) + 1_000).toISOString(),
    }, '00000000-0000-4000-8000-000000000001');
    const orchestrator = orchestratorFor({ providers: [source.provider], store });

    const latest = await orchestrator.latest({
      ...request('correlation-private-cache-boundary'),
      userId: '00000000-0000-4000-8000-000000000001',
    });

    expect(latest?.scope).toBe('PRIVATE');
    expect(latest?.analysisId).toBe('00000000-0000-4000-8000-000000000098');
  });
});

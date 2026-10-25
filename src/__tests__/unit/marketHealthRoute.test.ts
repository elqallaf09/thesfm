import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketSystemState } from '@/lib/market-state/types';

const getMarketSystemState = vi.fn();

vi.mock('@/lib/market-state/aggregateMarketState', () => ({
  getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args),
}));

function state(patch: Partial<MarketSystemState> = {}): MarketSystemState {
  return {
    generatedAt: '2026-10-25T03:01:42.003Z',
    overall: 'degraded',
    providers: {
      fmp: { status: 'connected', configured: true, healthy: true, latencyMs: 40 },
    },
    capabilityMatrix: [{
      provider: 'fmp', capability: 'quotes', status: 'connected', configured: true,
      healthy: true, lastSuccessAt: '2026-10-25T03:01:40.000Z', lastErrorAt: null,
      lastErrorReason: null, rateLimitedUntil: null, nextRetryAt: null, latencyMs: 40,
    }],
    providerProfiles: [],
    configuration: [],
    featuresSucceeded: ['quotes'],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: {
      discovered: 1, metadataAvailable: 1, liveQuoteAvailable: 1,
      delayedQuoteAvailable: 0, staleRecords: 0, duplicates: 0,
      malformed: 0, failed: 0, lastSyncAt: '2026-10-25T03:01:40.000Z',
    },
    lastSynchronizedAt: '2026-10-25T03:01:40.000Z',
    delivery: { source: 'persistent_cache', cached: true, delayed: false, reason: null },
    ...patch,
  };
}

describe('/api/market/health', () => {
  beforeEach(() => {
    vi.resetModules();
    getMarketSystemState.mockReset();
  });

  it('returns a healthy passive snapshot without probing providers again', async () => {
    getMarketSystemState.mockResolvedValue(state());

    const { GET } = await import('@/app/api/market/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMarketSystemState).toHaveBeenCalledTimes(1);
    expect(getMarketSystemState).toHaveBeenCalledWith();
    expect(body).toMatchObject({ ok: true, marketDataService: 'degraded', activeProbe: false });
  });

  it('actively verifies an empty cold-start snapshot before reporting configuration failure', async () => {
    getMarketSystemState
      .mockResolvedValueOnce(state({
        overall: 'unknown', providers: {}, capabilityMatrix: [],
        featuresSucceeded: [], featuresDegraded: [], featuresFailed: ['quotes'],
        delivery: { source: 'unavailable', cached: false, delayed: true, reason: 'aggregate_refresh_in_progress' },
      }))
      .mockResolvedValueOnce(state());

    const { GET } = await import('@/app/api/market/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMarketSystemState).toHaveBeenNthCalledWith(1);
    expect(getMarketSystemState).toHaveBeenNthCalledWith(2, { forceFresh: true });
    expect(body).toMatchObject({ ok: true, marketDataService: 'degraded', activeProbe: true });
  });
});

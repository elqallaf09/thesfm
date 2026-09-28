import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketSystemState } from '@/lib/market-state/types';

const getMarketSystemState = vi.fn();

vi.mock('@/lib/market-state/aggregateMarketState', () => ({
  getMarketSystemState: (...args: unknown[]) => getMarketSystemState(...args),
}));

function marketSystemState(): MarketSystemState {
  return {
    generatedAt: '2026-09-28T06:30:00.000Z',
    overall: 'degraded',
    providers: {
      fmp: { status: 'connected', configured: true, healthy: true, latencyMs: 81 },
      yahoo: { status: 'rate_limited', configured: true, healthy: false, latencyMs: 245 },
    },
    providerProfiles: [
      {
        provider: 'fmp', role: 'primary', status: 'connected', configured: true, latencyMs: 81,
        successRatePercent: 100, lastSuccessAt: '2026-09-28T06:29:00.000Z', lastErrorAt: null, rateLimitedUntil: null,
      },
      {
        provider: 'yahoo', role: 'fallback', status: 'rate_limited', configured: true, latencyMs: 245,
        successRatePercent: 50, lastSuccessAt: null, lastErrorAt: '2026-09-28T06:28:00.000Z', rateLimitedUntil: '2026-09-28T06:35:00.000Z',
      },
    ],
    capabilityMatrix: [
      {
        provider: 'fmp', capability: 'quotes', status: 'connected', configured: true, healthy: true,
        lastSuccessAt: '2026-09-28T06:29:00.000Z', lastErrorAt: null, lastErrorReason: null,
        rateLimitedUntil: null, nextRetryAt: null, latencyMs: 81,
      },
      {
        provider: 'yahoo', capability: 'quotes', status: 'rate_limited', configured: true, healthy: false,
        lastSuccessAt: null, lastErrorAt: '2026-09-28T06:28:00.000Z', lastErrorReason: 'upstream request detail',
        rateLimitedUntil: '2026-09-28T06:35:00.000Z', nextRetryAt: '2026-09-28T06:35:00.000Z', latencyMs: 245,
      },
    ],
    configuration: [
      { provider: 'fmp', envVar: 'FMP_API_KEY', configured: true },
      { provider: 'yahoo', envVar: 'YAHOO_FINANCE_API_KEY', configured: true },
    ],
    featuresSucceeded: ['quotes'],
    featuresDegraded: [],
    featuresFailed: [],
    catalog: {
      discovered: 12, metadataAvailable: 12, liveQuoteAvailable: 10, delayedQuoteAvailable: 2,
      staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: '2026-09-28T06:29:00.000Z',
    },
    lastSynchronizedAt: '2026-09-28T06:29:00.000Z',
    delivery: { source: 'persistent_cache', cached: true, delayed: false, reason: 'aggregate_persistent_cache_hit' },
  };
}

describe('/api/market/providers/health', () => {
  beforeEach(() => {
    vi.resetModules();
    getMarketSystemState.mockReset().mockResolvedValue(marketSystemState());
  });

  it('projects canonical provider profiles while returning only the sanitized public state', async () => {
    const { GET } = await import('@/app/api/market/providers/health/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getMarketSystemState).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      ok: true,
      status: 'degraded',
      configured: 2,
      healthy: 1,
      generatedAt: '2026-09-28T06:30:00.000Z',
      providers: [
        {
          provider: 'fmp', displayName: 'FMP', configured: true, status: 'connected', latencyMs: 81,
          lastCheckedAt: '2026-09-28T06:29:00.000Z',
        },
        {
          provider: 'yahoo', displayName: 'Yahoo Finance', configured: true, status: 'rate_limited', latencyMs: 245,
          lastCheckedAt: '2026-09-28T06:28:00.000Z',
        },
      ],
    });
    expect(body.state.configuration).toBeNull();
    expect(body.state.capabilityMatrix[1].lastErrorReason).toBeNull();
    expect(body.state.delivery).toMatchObject({
      source: 'persistent_cache', cached: true, delayed: false, reason: null,
    });
  });
});

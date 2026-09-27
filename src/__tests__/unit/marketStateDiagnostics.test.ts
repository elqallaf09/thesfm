import { describe, expect, it } from 'vitest';
import { getProviderDiagnostic } from '@/lib/market-state/diagnostics';
import { sanitizeMarketSystemStateForPublic } from '@/lib/market-state/publicState';
import type { MarketSystemState } from '@/lib/market-state/types';

describe('market-state diagnostics', () => {
  it('turns every non-connected provider state into display-safe cause and next-step copy', () => {
    for (const status of ['degraded', 'rate_limited', 'disconnected', 'misconfigured', 'disabled', 'unknown', 'unsupported'] as const) {
      const diagnostic = getProviderDiagnostic(status);
      expect(diagnostic?.reasonKey).toMatch(/^market_provider_reason_/);
      expect(diagnostic?.actionKey).toMatch(/^market_provider_action_/);
    }
    expect(getProviderDiagnostic('connected')).toBeNull();
  });

  it('does not disclose internal capability or delivery reasons in a public snapshot', () => {
    const state: MarketSystemState = {
      generatedAt: '2026-09-27T00:00:00.000Z',
      overall: 'degraded',
      providers: {},
      providerProfiles: [],
      capabilityMatrix: [{
        provider: 'fmp', capability: 'quotes', status: 'degraded', configured: true, healthy: false,
        lastSuccessAt: null, lastErrorAt: null, lastErrorReason: 'upstream private detail',
        rateLimitedUntil: null, nextRetryAt: null, latencyMs: null,
      }],
      configuration: [{ provider: 'fmp', envVar: 'FMP_API_KEY', configured: true }],
      featuresSucceeded: [],
      featuresDegraded: ['quotes'],
      featuresFailed: [],
      catalog: {
        discovered: 0, metadataAvailable: 0, liveQuoteAvailable: null, delayedQuoteAvailable: null,
        staleRecords: 0, duplicates: 0, malformed: 0, failed: 0, lastSyncAt: null,
      },
      lastSynchronizedAt: null,
      delivery: { source: 'persistent_cache', cached: true, delayed: true, reason: 'internal aggregation error' },
    };

    const publicState = sanitizeMarketSystemStateForPublic(state);
    expect(publicState.configuration).toBeNull();
    expect(publicState.capabilityMatrix[0]?.lastErrorReason).toBeNull();
    expect(publicState.delivery?.reason).toBeNull();
    expect(publicState.delivery?.source).toBe('persistent_cache');
  });
});

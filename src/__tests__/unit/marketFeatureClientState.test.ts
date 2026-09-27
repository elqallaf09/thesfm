import { describe, expect, it } from 'vitest';
import { deriveMarketFeatureClientState } from '@/lib/market-state/featureClientState';
import type { MarketFeatureEnvelope } from '@/lib/market-state/types';

const envelope = (status: MarketFeatureEnvelope<string>['status']): MarketFeatureEnvelope<string> => ({
  success: status !== 'error' && status !== 'unavailable',
  feature: 'quotes',
  status,
  provider: { selected: 'fmp', attempted: [], fallbackUsed: false, reason: null, context: 'general', timestamp: '2026-09-27T00:00:00.000Z', cached: false, delayed: false },
  freshness: { asOf: '2026-09-27T00:00:00.000Z', ageSeconds: 0, isStale: status === 'stale', isDelayed: false, thresholdSeconds: 60 },
  completeness: { requested: 1, returned: 1, missing: 0, percentage: 100 },
  data: 'quote',
  warnings: [],
  errors: status === 'error' ? [{ code: 'QUOTE_FAILED', messageKey: 'quote_failed' }] : [],
});

describe('deriveMarketFeatureClientState', () => {
  it('uses a full loading state only before the first envelope arrives', () => {
    expect(deriveMarketFeatureClientState({ data: null, status: 'loading', error: null, lastFetchedAt: null }))
      .toMatchObject({ status: 'loading', isLoading: true, isRefreshing: false });
  });

  it('keeps stale data visible during a background refresh', () => {
    expect(deriveMarketFeatureClientState({ data: envelope('stale'), status: 'loading', error: null, lastFetchedAt: 1 }))
      .toMatchObject({ status: 'stale', isLoading: false, isRefreshing: true, refreshError: null });
  });

  it('keeps partial data visible and exposes a failed refresh for retry', () => {
    expect(deriveMarketFeatureClientState({ data: envelope('partial'), status: 'error', error: 'network_down', lastFetchedAt: 1 }))
      .toMatchObject({ status: 'partial', isLoading: false, isRefreshing: false, refreshError: 'network_down', isRetryable: true });
  });

  it('reports a transport failure as an error when there is no prior data', () => {
    expect(deriveMarketFeatureClientState({ data: null, status: 'error', error: 'network_down', lastFetchedAt: null }))
      .toMatchObject({ status: 'error', isLoading: false, isRetryable: true });
  });
});

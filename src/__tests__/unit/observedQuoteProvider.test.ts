import { describe, expect, it } from 'vitest';
import { observedQuoteProvider } from '@/lib/trader/observedQuoteProvider';

describe('observed provider summary', () => {
  const base = { analyticalSource: 'THE SFM Market Data Engine', upstreamSource: 'Twelve Data', lastUpdated: '2026-09-17T00:00:00Z' };
  it('attributes stale evidence to its actual source without claiming connection health', () => {
    expect(observedQuoteProvider([{ ...base, price: null, lastKnownPrice: 337, available: false }])).toEqual({
      active: 'Twelve Data', provider: 'Twelve Data', status: 'degraded', lastUpdated: '2026-09-17T00:00:00.000Z',
    });
  });
  it('does not label an attempted provider as an observed source when it returned no price', () => {
    expect(observedQuoteProvider([{ ...base, price: null }])).toMatchObject({ active: 'THE SFM Market Data Engine', status: 'degraded', lastUpdated: null });
    expect(observedQuoteProvider([{ ...base, available: true, price: 337 }])?.status).toBe('connected');
    expect(observedQuoteProvider([{ price: 10 }])).toBeNull();
  });
});

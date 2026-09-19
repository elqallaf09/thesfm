import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn() }));
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });
describe('TV canonical market snapshots', () => {
  it('passes the actual asset class for indices, commodities and currency groups', async () => {
    vi.mocked(getSfmMarketQuote).mockResolvedValue(null);
    for (const [group, assetType] of [['global', 'index'], ['commodities', 'commodity'], ['crypto', 'crypto'], ['forex', 'forex']] as const) {
      vi.mocked(getSfmMarketQuote).mockClear();
      await loadTvSnapshot(group);
      expect(vi.mocked(getSfmMarketQuote).mock.calls.every(call => call[1]?.assetType === assetType)).toBe(true);
    }
  });
  it('preserves owned-symbol order and reference evidence while isolating source failures', async () => {
    vi.mocked(getSfmMarketQuote).mockImplementation(async symbol => {
      if (symbol === 'MISSING') throw new Error('upstream unavailable');
      return { symbol, price: 100, currency: 'USD', quality: { state: 'complete' },
        provenance: { upstreamProvider: 'twelve_data', observedAt: '2026-09-18T19:59:00Z', receivedAt: '2026-09-19T08:00:00Z',
          observation: { precision: 'instant', marketOpen: false } } } as SfmMarketQuote;
    });
    const snapshot = await loadTvSnapshot('watchlist', ['AAPL', 'MISSING', 'AAPL']);
    expect(snapshot.total).toBe(2); expect(snapshot.available).toBe(1);
    expect(snapshot.quotes.map(q => q.symbol)).toEqual(['AAPL', 'MISSING']);
    expect(snapshot.quotes[0]).toMatchObject({ price: 100, status: 'stale', source: 'twelve_data', observedAt: '2026-09-18T19:59:00Z' });
    expect(snapshot.quotes[1]).toMatchObject({ price: null, observedAt: null, status: 'unavailable' });
  });
  it('bounds failed-source waits and stops starting requests at the shared deadline', async () => {
    vi.useFakeTimers();
    vi.mocked(getSfmMarketQuote).mockImplementation(() => new Promise(() => {}));
    const work = loadTvSnapshot('watchlist', Array.from({ length: 60 }, (_, i) => `TEST${i}`));
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(40_000);
    const snapshot = await work;
    expect(snapshot.total).toBe(50); expect(snapshot.available).toBe(0);
    expect(getSfmMarketQuote).toHaveBeenCalledTimes(16);
    expect(snapshot.quotes.every(q => q.price === null)).toBe(true);
  });
});

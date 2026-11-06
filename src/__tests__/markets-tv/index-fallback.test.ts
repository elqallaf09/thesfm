import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TvQuote } from '@/lib/markets-tv/types';
const { fetchHistory } = vi.hoisted(() => ({ fetchHistory: vi.fn() }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/market/fetchYahooHistory', () => ({ fetchYahooHistory: fetchHistory }));
const now = Date.parse('2026-11-06T15:00:00Z');
const original: TvQuote = { symbol: '^GDAXI', name: 'DAX', nameAr: 'داكس', currency: null, price: null,
  changePercent: null, source: null, observedAt: null, receivedAt: null, exchange: null, country: 'DE', status: 'unavailable', issue: 'access_denied' };
const external = { success: true, providerSymbol: '^GDAXI', currency: 'EUR', retrievedAt: new Date(now).toISOString(), history: [],
  quoteSnapshot: { symbol: '^GDAXI', assetType: 'INDEX', currency: 'EUR', price: 23000, previousClose: 22800,
    marketTime: new Date(now).toISOString(), name: 'DAX', exchange: 'XETRA' } };
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); fetchHistory.mockReset(); });
afterEach(() => { vi.useRealTimers(); });
it('uses verified external evidence after denial and preserves the genuine source', async () => {
  fetchHistory.mockResolvedValue(external);
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  expect(await withTvIndexFallback('^GDAXI', Promise.resolve(original))).toMatchObject({ price: 23000, source: 'Yahoo Finance', observedAt: external.retrievedAt });
  expect(fetchHistory).toHaveBeenCalledWith('^GDAXI', 'index', '1d', '5m', false, 3500);
});
it('does not request an alternative when the configured primary has a usable observation', async () => {
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  const quote = { ...original, price: 23100, issue: undefined, source: 'Financial Modeling Prep', status: 'delayed' as const, observedAt: new Date(now).toISOString() };
  expect(await withTvIndexFallback('^GDAXI', Promise.resolve(quote))).toBe(quote);
  expect(fetchHistory).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it('starts the fallback before a slow primary exhausts the TV deadline', async () => {
  fetchHistory.mockResolvedValue(external);
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  const work = withTvIndexFallback('^GDAXI', new Promise<TvQuote>(() => {}));
  await vi.advanceTimersByTimeAsync(1500);
  expect(await work).toMatchObject({ price: 23000, source: 'Yahoo Finance' });
});
it('respects Retry-After and shares simultaneous requests without rotating endpoints', async () => {
  fetchHistory.mockResolvedValue({ success: false, retryAfterMs: 300000 });
  const { loadTvExternalIndex } = await import('@/lib/server/markets-tv/indexFallback');
  await Promise.all([loadTvExternalIndex('^GDAXI'), loadTvExternalIndex('^GDAXI')]);
  await loadTvExternalIndex('^GDAXI');
  expect(fetchHistory).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(300001);
  await loadTvExternalIndex('^GDAXI');
  expect(fetchHistory).toHaveBeenCalledTimes(2);
  await loadTvExternalIndex('SPY');
  expect(fetchHistory).toHaveBeenCalledTimes(2);
});
it('retains the primary failure when both sources are unavailable', async () => {
  fetchHistory.mockResolvedValue({ success: false });
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  expect(await withTvIndexFallback('^GDAXI', Promise.resolve(original))).toBe(original);
});

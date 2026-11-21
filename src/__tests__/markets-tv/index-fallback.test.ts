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
it('recovers ^DJI from verified external evidence while FMP is rate limited', async () => {
  const dji = { ...external, providerSymbol: '^DJI', currency: 'USD',
    quoteSnapshot: { ...external.quoteSnapshot, symbol: '^DJI', currency: 'USD', price: 50198.17, previousClose: 50000, name: 'Dow Jones Industrial Average', exchange: 'DJI' } };
  fetchHistory.mockResolvedValue(dji);
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  const limited: TvQuote = { ...original, symbol: '^DJI', country: 'US', issue: 'rate_limited' };
  expect(await withTvIndexFallback('^DJI', Promise.resolve(limited))).toMatchObject({
    symbol: '^DJI', price: 50198.17, source: 'Yahoo Finance', country: 'US', observedAt: dji.quoteSnapshot.marketTime });
  expect(fetchHistory).toHaveBeenCalledWith('^DJI', 'index', '1d', '5m', false, 3500);
});
it('keeps the primary failure when external ^FTSE evidence has the wrong unit', async () => {
  fetchHistory.mockResolvedValue({ ...external, providerSymbol: '^FTSE', currency: 'GBp',
    quoteSnapshot: { ...external.quoteSnapshot, symbol: '^FTSE', currency: 'GBp' } });
  const { withTvIndexFallback } = await import('@/lib/server/markets-tv/indexFallback');
  const limited: TvQuote = { ...original, symbol: '^FTSE', country: 'GB', issue: 'rate_limited' };
  expect(await withTvIndexFallback('^FTSE', Promise.resolve(limited))).toBe(limited);
});
it('never shares a miss: the next request asks the source again', async () => {
  const stoxx = { ...external, providerSymbol: '^STOXX50E',
    quoteSnapshot: { ...external.quoteSnapshot, symbol: '^STOXX50E', price: 5941.95, previousClose: 6113.86, name: 'EURO STOXX 50 I', exchange: 'Zurich' } };
  fetchHistory.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce(stoxx);
  const { tvIndexAlternative } = await import('@/lib/server/markets-tv/indexFallback');
  expect(await tvIndexAlternative('^STOXX50E')).toBeNull();
  expect(await tvIndexAlternative('^STOXX50E')).toMatchObject({ symbol: '^STOXX50E', price: 5941.95, source: 'Yahoo Finance', country: 'EU' });
});

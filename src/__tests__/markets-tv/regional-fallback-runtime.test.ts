import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TvQuote } from '@/lib/markets-tv/types';
const { fetchHistory } = vi.hoisted(() => ({ fetchHistory: vi.fn() }));
vi.mock('@/lib/market/fetchYahooHistory', () => ({ fetchYahooHistory: fetchHistory }));
const now = Date.parse('2026-11-06T21:00:00Z');
const asset = { symbol: 'KFH.KW', name: 'KFH', region: 'BOURSA_KUWAIT', currency: 'KWD', mic: 'XKUW' };
const original: TvQuote = { symbol: 'KFH.KW', name: 'KFH', nameAr: 'بيتك', currency: 'KWD', price: null,
  changePercent: null, source: null, observedAt: null, receivedAt: null, exchange: 'BOURSA_KUWAIT', country: 'KW', status: 'unavailable', issue: 'access_denied' };
const observed = Date.parse('2026-11-05T10:14:19Z');
const external = { success: true, providerSymbol: 'KFH.KW', retrievedAt: new Date(now).toISOString(),
  quoteSnapshot: { symbol: 'KFH.KW', assetType: 'EQUITY', exchangeCode: 'KUW', currency: 'KWF', price: 755, previousClose: 752,
    marketTime: new Date(observed).toISOString(), regularSession: { start: observed - 15000000, end: observed - 1000000 } } };
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); fetchHistory.mockReset(); });
afterEach(() => vi.useRealTimers());
it('recovers the exact Kuwait listing and declared unit after the primary fails', async () => {
  fetchHistory.mockResolvedValue(external);
  const { withTvRegionalFallback } = await import('@/lib/server/markets-tv/regionalFallback');
  expect(await withTvRegionalFallback(asset, Promise.resolve(original))).toMatchObject({ symbol: 'KFH.KW', price: .755, currency: 'KWD', source: 'Yahoo Finance', status: 'closed' });
  expect(fetchHistory).toHaveBeenCalledWith('KFH.KW', 'stock', '5d', '1d', false, 3500);
});
it('keeps a usable configured primary without spending secondary-provider requests', async () => {
  const { withTvRegionalFallback } = await import('@/lib/server/markets-tv/regionalFallback');
  const primary: TvQuote = { ...original, price: .754, source: 'Twelve Data', issue: undefined, observedAt: new Date(observed).toISOString(), status: 'closed' };
  expect(await withTvRegionalFallback(asset, Promise.resolve(primary))).toBe(primary);
  expect(fetchHistory).not.toHaveBeenCalled();
});
it('shares a simultaneous listing request and preserves the primary error if metadata does not match', async () => {
  fetchHistory.mockResolvedValue({ ...external, quoteSnapshot: { ...external.quoteSnapshot, exchangeCode: 'XBAH' } });
  const { withTvRegionalFallback } = await import('@/lib/server/markets-tv/regionalFallback');
  const results = await Promise.all([withTvRegionalFallback(asset, Promise.resolve(original)), withTvRegionalFallback(asset, Promise.resolve(original))]);
  expect(results).toEqual([original, original]); expect(fetchHistory).toHaveBeenCalledTimes(1);
});
it('starts verified recovery before a slow primary exhausts the scene deadline', async () => {
  fetchHistory.mockResolvedValue(external);
  const { withTvRegionalFallback } = await import('@/lib/server/markets-tv/regionalFallback');
  const work = withTvRegionalFallback(asset, new Promise<TvQuote>(() => {}));
  await vi.advanceTimersByTimeAsync(500);
  expect(await work).toMatchObject({ price: .755, source: 'Yahoo Finance' });
});
it('bounds simultaneous secondary calls and stops queued requests until Retry-After expires', async () => {
  fetchHistory.mockResolvedValue({ success: false, unavailableReason: 'provider_http_429', retryAfterMs: 300000 });
  const { withTvRegionalFallback } = await import('@/lib/server/markets-tv/regionalFallback');
  await Promise.all(['KFH.KW', 'NBK.KW', 'ZAIN.KW', 'MABANEE.KW'].map(symbol => withTvRegionalFallback({ ...asset, symbol }, Promise.resolve({ ...original, symbol }))));
  expect(fetchHistory.mock.calls.length).toBeLessThanOrEqual(2);
  const count = fetchHistory.mock.calls.length;
  expect(await withTvRegionalFallback(asset, Promise.resolve(original))).toBe(original);
  expect(fetchHistory).toHaveBeenCalledTimes(count);
  await vi.advanceTimersByTimeAsync(300001);
  await withTvRegionalFallback(asset, Promise.resolve(original));
  expect(fetchHistory).toHaveBeenCalledTimes(count + 1);
});

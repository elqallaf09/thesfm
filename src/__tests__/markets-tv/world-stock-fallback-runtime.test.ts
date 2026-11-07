import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TV_WORLD_STOCKS } from '@/lib/markets-tv/worldStockQuote';
import type { TvQuote } from '@/lib/markets-tv/types';
const now = Date.parse('2026-11-06T22:00:00Z');
const assets = TV_WORLD_STOCKS.map(bank => ({ ...bank, name: bank.ticker }));
const missing = (symbol: string): TvQuote => ({ symbol, name: symbol, nameAr: symbol, currency: null, price: null,
  changePercent: null, source: null, observedAt: null, receivedAt: null, exchange: null, country: null, status: 'unavailable', issue: 'rate_limited' });
const body = () => ({ data: TV_WORLD_STOCKS.map(bank => ({ s: `${bank.exchange}:${bank.ticker}`,
  d: [bank.ticker, 'Test listing', bank.exchange, 'stock', bank.currency, .5, 0, (now - 86400000) / 1000, bank.isin, 'delayed_streaming_900', 'out_of_session'] })) });
const fetchMock = vi.fn();
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('recovers all six world listings with one shared request despite primary quota failure', async () => {
  fetchMock.mockImplementation(async () => Response.json(body()));
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const quotes = await Promise.all(assets.map(asset => withTvWorldStockFallback(asset, Promise.resolve(missing(asset.symbol)))));
  expect(quotes.map(q => q.price)).toEqual([.5, .5, .5, .5, .5, .5]); expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).symbols.tickers).toEqual(['EURONEXT:ASML', 'XETR:SAP', 'SIX:NESN', 'TSE:7203', 'TSE:6758', 'HKEX:700']);
  await vi.advanceTimersByTimeAsync(60_000);
  const cached = await withTvWorldStockFallback(assets[0], Promise.resolve(missing('ASML.AS')));
  expect(cached.receivedAt).toBe(new Date(now).toISOString()); expect(cached.observedAt).toBe(quotes[0].observedAt);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('does not send unsupported symbols and preserves a usable configured primary', async () => {
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const primary: TvQuote = { ...missing('ASML.AS'), price: 20, issue: undefined, source: 'Twelve Data', status: 'closed', observedAt: new Date(now).toISOString() };
  expect(await withTvWorldStockFallback(assets[0], Promise.resolve(primary))).toBe(primary);
  const unrelated = missing('SAP.US');
  expect(await withTvWorldStockFallback({ ...assets[1], symbol: 'SAP.US' }, Promise.resolve(unrelated))).toBe(unrelated);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('starts recovery after 500ms and does not wait for a hung primary', async () => {
  fetchMock.mockResolvedValue(Response.json(body()));
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const work = withTvWorldStockFallback(assets[0], new Promise(() => {}));
  await vi.advanceTimersByTimeAsync(499); expect(fetchMock).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1); expect((await work).price).toBe(.5);
});
it('prefers the configured primary when it recovers while the fallback is in flight', async () => {
  let resolveFetch!: (response: Response) => void;
  fetchMock.mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
  const primary: TvQuote = { ...missing('ASML.AS'), price: 20, issue: undefined, source: 'Twelve Data', status: 'closed', observedAt: new Date(now).toISOString() };
  let resolvePrimary!: (quote: TvQuote) => void;
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const work = withTvWorldStockFallback(assets[0], new Promise(resolve => { resolvePrimary = resolve; }));
  await vi.advanceTimersByTimeAsync(500); resolvePrimary(primary); resolveFetch(Response.json(body()));
  expect(await work).toBe(primary);
});
it.each(['120', new Date(now + 120_000).toUTCString()])('honours provider Retry-After %s across listings', async retry => {
  fetchMock.mockResolvedValue(new Response('', { status: 429, headers: { 'retry-after': retry } }));
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const failure = missing('ASML.AS');
  expect(await withTvWorldStockFallback(assets[0], Promise.resolve(failure))).toBe(failure);
  await vi.advanceTimersByTimeAsync(119_999);
  await withTvWorldStockFallback(assets[1], Promise.resolve(missing('SAP.DE')));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValue(Response.json(body())); await vi.advanceTimersByTimeAsync(1);
  expect((await withTvWorldStockFallback(assets[0], Promise.resolve(failure))).price).toBe(.5);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('isolates malformed listings and returns primary errors for the affected bank', async () => {
  const data = body(); data.data[1].d[8] = 'WRONG'; fetchMock.mockResolvedValue(Response.json(data));
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  const quotes = await Promise.all(assets.map(asset => withTvWorldStockFallback(asset, Promise.resolve(missing(asset.symbol)))));
  expect(quotes.map(q => q.price)).toEqual([.5, null, .5, .5, .5, .5]); expect(quotes[1].issue).toBe('rate_limited');
});
it.each(['throw', 'html', 'empty'])('uses a short negative cache after %s failure', async mode => {
  fetchMock.mockImplementation(async () => {
    if (mode === 'throw') throw new Error('network unavailable');
    return mode === 'html' ? new Response('<html>Error</html>') : Response.json({ data: [] });
  });
  const { withTvWorldStockFallback } = await import('@/lib/server/markets-tv/worldStockFallback');
  await withTvWorldStockFallback(assets[0], Promise.resolve(missing('ASML.AS')));
  await vi.advanceTimersByTimeAsync(29_999);
  await withTvWorldStockFallback(assets[1], Promise.resolve(missing('SAP.DE')));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1); fetchMock.mockResolvedValue(Response.json(body()));
  expect((await withTvWorldStockFallback(assets[0], Promise.resolve(missing('ASML.AS')))).price).toBe(.5);
});

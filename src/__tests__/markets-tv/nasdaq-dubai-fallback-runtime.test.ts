import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TV_NASDAQ_DUBAI_LISTINGS, TV_NASDAQ_DUBAI_COLUMNS } from '@/lib/markets-tv/nasdaqDubaiQuote';
import type { TvQuote } from '@/lib/markets-tv/types';

const nextCache = vi.hoisted(() => ({
  entry: null as { value: unknown; storedAt: number } | null,
  refresh: null as Promise<unknown> | null,
  configs: [] as Array<{ keys: string[]; revalidate: number }>,
}));
// Model Next's shared positive cache across module/process resets: stale reads
// return the old entry immediately and refresh it in the background; a failed
// refresh retains its original value and storage time.
vi.mock('next/cache', () => ({ unstable_cache: (load: () => Promise<unknown>, keys: string[], options: { revalidate: number }) => {
  nextCache.configs.push({ keys, revalidate: options.revalidate });
  return async () => {
    const previous = nextCache.entry;
    if (previous) {
      if (Date.now() - previous.storedAt > options.revalidate * 1000 && !nextCache.refresh) {
        nextCache.refresh = load().then(value => { nextCache.entry = { value, storedAt: Date.now() }; return value; })
          .catch(() => null).finally(() => { nextCache.refresh = null; });
      }
      return previous.value;
    }
    const value = await load();
    nextCache.entry = { value, storedAt: Date.now() };
    return value;
  };
} }));

const now = Date.parse('2026-11-19T15:00:00Z');
const assets = TV_NASDAQ_DUBAI_LISTINGS.map(item => ({ ...item, name: item.ticker }));
const missing = (symbol: string): TvQuote => ({ symbol, name: symbol, nameAr: symbol, currency: null, price: null,
  changePercent: null, source: null, observedAt: null, receivedAt: null, exchange: null, country: null,
  status: 'unavailable', issue: 'rate_limited' });
const body = () => ({ data: TV_NASDAQ_DUBAI_LISTINGS.map(item => ({ s: `${item.exchange}:${item.ticker}`,
  d: [item.ticker, 'Verified Dubai listing', item.exchange, item.type, item.currency, 42.5, 7.2,
    now / 1000 - 60, item.isin, 'delayed_streaming_900', 'out_of_session'] as unknown[] })) });
const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  nextCache.entry = null; nextCache.refresh = null; nextCache.configs.length = 0;
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('coalesces seven exact listings into one batch and retains honest clocks within its five-minute TTL', async () => {
  fetchMock.mockImplementation(async () => Response.json(body()));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const quotes = await Promise.all(assets.map(asset => withTvNasdaqDubaiFallback(asset, Promise.resolve(missing(asset.symbol)))));
  expect(quotes).toHaveLength(7);
  for (const quote of quotes) {
    expect(quote).toMatchObject({ price: 42.5, source: 'TradingView', observedAt: null, receivedAt: new Date(now).toISOString(),
      changePercent: null, status: 'unknown_time', delayType: null, observation: { precision: 'unknown', marketOpen: null } });
    expect(quote.issue).toBeUndefined(); expect(quote.changeBasis).toBeUndefined();
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://scanner.tradingview.com/global/scan');
  expect(options).toMatchObject({ method: 'POST', cache: 'no-store', redirect: 'error' });
  expect(JSON.parse(options.body)).toEqual({ symbols: { tickers: [
    'NASDAQDUBAI:DEPA', 'NASDAQDUBAI:DEPACLA', 'NASDAQDUBAI:ENBDREIT', 'NASDAQDUBAI:REIT',
    'NASDAQDUBAI:HIK', 'NASDAQDUBAI:NDAQ', 'NASDAQDUBAI:ABTC',
  ], query: { types: [] } }, columns: TV_NASDAQ_DUBAI_COLUMNS, range: [0, 7] });
  expect(nextCache.configs).toEqual([{ keys: ['tv-nasdaq-dubai-batch-v1'], revalidate: 240 }]);
  await vi.advanceTimersByTimeAsync(239_999);
  const retained = await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(missing(assets[0].symbol)));
  expect(retained).toEqual(quotes[0]); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('serves another process from the shared batch and refreshes before its original hard expiry', async () => {
  fetchMock.mockImplementation(async () => Response.json(body()));
  const firstProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  const first = await firstProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure));
  await vi.advanceTimersByTimeAsync(180_000);
  vi.resetModules();
  const secondProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  expect(await secondProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60_000);
  // Actual Next uses age > revalidate, so exactly 240s can still be fresh.
  expect(await secondProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await secondProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  await nextCache.refresh;
  expect(fetchMock).toHaveBeenCalledTimes(2);
  vi.resetModules();
  const thirdProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  expect(await thirdProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({
    price: 42.5, receivedAt: new Date(now + 270_000).toISOString(), observedAt: null, status: 'unknown_time',
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('does not restart the hard five-minute deadline when another process reads a shared entry', async () => {
  fetchMock.mockResolvedValueOnce(Response.json(body())).mockResolvedValueOnce(new Response('', { status: 503 }));
  const firstProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  const first = await firstProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure));
  await vi.advanceTimersByTimeAsync(200_000);
  vi.resetModules();
  const secondProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  expect(await secondProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  await vi.advanceTimersByTimeAsync(100_000);
  expect(await secondProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({ price: null, status: 'unavailable' });
  await nextCache.refresh;
  expect(nextCache.entry?.value).toMatchObject({ receivedAt: new Date(now).toISOString(), expiresAt: now + 300_000 });
});

it.each(['closed', 'stale'] as const)('prefers a dated %s primary, including a retained price with a failed refresh', async status => {
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const primary: TvQuote = { ...missing(assets[0].symbol), price: 20, source: 'Twelve Data', status,
    observedAt: new Date(now - (status === 'stale' ? 180 * 86_400_000 : 60_000)).toISOString(),
    issue: status === 'stale' ? 'rate_limited' : undefined };
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(primary))).toBe(primary);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('never sends an unsupported or contradictory listing to the secondary provider', async () => {
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing('NDAQ');
  expect(await withTvNasdaqDubaiFallback({ ...assets[5], region: 'US' }, Promise.resolve(failure))).toBe(failure);
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  { source: null }, { price: Infinity }, { observedAt: 'invalid' },
  { observedAt: new Date(now + 120_000).toISOString() },
  { observation: { precision: 'unknown' as const, marketOpen: null } },
])('does not prefer invalid primary evidence %j', async changes => {
  fetchMock.mockResolvedValue(Response.json(body()));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const primary: TvQuote = { ...missing(assets[0].symbol), price: 20, source: 'Twelve Data', status: 'closed',
    observedAt: new Date(now).toISOString(), issue: undefined, ...changes };
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(primary))).toMatchObject({ price: 42.5, observedAt: null, status: 'unknown_time' });
});

it('starts the hedge after 500ms without waiting for a hung primary', async () => {
  fetchMock.mockResolvedValue(Response.json(body()));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const work = withTvNasdaqDubaiFallback(assets[0], new Promise(() => {}));
  await vi.advanceTimersByTimeAsync(499); expect(fetchMock).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(await work).toMatchObject({ price: 42.5, observedAt: null, status: 'unknown_time' });
});

it('prefers a dated primary that completes while the fallback is in flight', async () => {
  let resolveFetch!: (value: Response) => void, resolvePrimary!: (value: TvQuote) => void;
  fetchMock.mockImplementation(() => new Promise(resolve => { resolveFetch = resolve; }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const work = withTvNasdaqDubaiFallback(assets[0], new Promise(resolve => { resolvePrimary = resolve; }));
  await vi.advanceTimersByTimeAsync(500);
  const primary: TvQuote = { ...missing(assets[0].symbol), price: 20, source: 'Twelve Data', status: 'stale',
    observedAt: new Date(now - 10 * 86_400_000).toISOString() };
  resolvePrimary(primary); resolveFetch(Response.json(body()));
  expect(await work).toBe(primary);
});

it('can recover from a rejected primary without inventing its quote time', async () => {
  fetchMock.mockResolvedValue(Response.json(body()));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.reject(new Error('primary failed'))))
    .toMatchObject({ source: 'TradingView', price: 42.5, observedAt: null, status: 'unknown_time' });
});

it.each(['cold', 'expired'])('settles a hung primary when the %s secondary fails and allows later recovery', async mode => {
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  if (mode === 'expired') {
    fetchMock.mockResolvedValueOnce(Response.json(body()));
    await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(missing(assets[0].symbol)));
    await vi.advanceTimersByTimeAsync(300_001);
  }
  fetchMock.mockImplementation(async () => new Response('', { status: 503 }));
  const failed = withTvNasdaqDubaiFallback(assets[0], new Promise(() => {}));
  await vi.advanceTimersByTimeAsync(500);
  expect(await failed).toMatchObject({ price: null, observedAt: null, status: 'unavailable', issue: 'timeout' });
  await nextCache.refresh;
  expect(Date.parse((await failed).retryAt!)).toBeGreaterThan(Date.now());
  await vi.advanceTimersByTimeAsync(30_000);
  fetchMock.mockImplementation(async () => Response.json(body()));
  const recovery = withTvNasdaqDubaiFallback(assets[0], new Promise(() => {}));
  await vi.advanceTimersByTimeAsync(500);
  await recovery; await nextCache.refresh;
  vi.resetModules();
  const anotherProcess = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  expect(await anotherProcess.withTvNasdaqDubaiFallback(assets[0], Promise.resolve(missing(assets[0].symbol))))
    .toMatchObject({ price: 42.5, observedAt: null, status: 'unknown_time' });
});

it.each([
  [429, '120'], [429, new Date(now + 120_000).toUTCString()],
  [503, '120'], [503, new Date(now + 120_000).toUTCString()],
])('honours HTTP%s Retry-After %s across this adapter batch', async (status, retry) => {
  fetchMock.mockImplementation(async () => new Response('', { status: Number(status), headers: { 'retry-after': String(retry) } }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = { ...missing(assets[0].symbol), retryAt: '2026-11-20T00:00:01.000Z' };
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({
    ...failure, retryAt: new Date(now + 120_000).toISOString(),
  });
  expect(failure.retryAt).toBe('2026-11-20T00:00:01.000Z');
  expect(nextCache.entry).toBeNull();
  await vi.advanceTimersByTimeAsync(119_999);
  await withTvNasdaqDubaiFallback(assets[1], Promise.resolve(missing(assets[1].symbol)));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockImplementation(async () => Response.json(body())); await vi.advanceTimersByTimeAsync(1);
  expect((await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).price).toBe(42.5);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('retains an earlier primary retry without changing the secondary provider cooldown', async () => {
  fetchMock.mockImplementation(async () => new Response('', { status: 429, headers: { 'retry-after': '120' } }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const primary = { ...missing(assets[0].symbol), retryAt: new Date(now + 30_000).toISOString() };
  expect((await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(primary))).retryAt).toBe(primary.retryAt);
  await vi.advanceTimersByTimeAsync(30_000);
  const dailyFailure = { ...missing(assets[0].symbol), retryAt: '2026-11-20T00:00:01.000Z' };
  expect((await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(dailyFailure))).retryAt).toBe(new Date(now + 120_000).toISOString());
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each([[429, 60_000], [503, 30_000]])('uses a bounded negative TTL for HTTP%s without a valid retry header', async (status, ttl) => {
  fetchMock.mockResolvedValue(new Response('', { status, headers: { 'retry-after': 'invalid' } }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure));
  await vi.advanceTimersByTimeAsync(ttl - 1);
  await withTvNasdaqDubaiFallback(assets[1], Promise.resolve(missing(assets[1].symbol)));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockResolvedValue(Response.json(body())); await vi.advanceTimersByTimeAsync(1);
  expect((await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).price).toBe(42.5);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([429, 503])('does not extend an expired unknown-time quote through an HTTP%s cooldown', async status => {
  fetchMock.mockResolvedValueOnce(Response.json(body()))
    .mockResolvedValueOnce(new Response('', { status, headers: { 'retry-after': '120' } }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  const first = await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure));
  expect(first.receivedAt).toBe(new Date(now).toISOString());
  await vi.advanceTimersByTimeAsync(240_001);
  // Next returns the old, still-unexpired value while the background refresh fails.
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  await nextCache.refresh;
  await vi.advanceTimersByTimeAsync(59_998);
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toEqual(first);
  await vi.advanceTimersByTimeAsync(1);
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({
    ...failure, retryAt: new Date(now + 360_001).toISOString(),
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(first).toMatchObject({ receivedAt: new Date(now).toISOString(), observedAt: null, status: 'unknown_time' });
  fetchMock.mockResolvedValue(Response.json(body())); await vi.advanceTimersByTimeAsync(60_001);
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({ price: null });
  await nextCache.refresh;
  await vi.advanceTimersByTimeAsync(30_000);
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({
    receivedAt: new Date(now + 360_001).toISOString(), observedAt: null, status: 'unknown_time', changePercent: null,
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('isolates an invalid listing without losing the other verified prices', async () => {
  const data = body(); data.data[1].d[8] = 'WRONG_ISIN'; fetchMock.mockResolvedValue(Response.json(data));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const quotes = await Promise.all(assets.map(asset => withTvNasdaqDubaiFallback(asset, Promise.resolve(missing(asset.symbol)))));
  expect(quotes.map(quote => quote.price)).toEqual([42.5, null, 42.5, 42.5, 42.5, 42.5, 42.5]);
  expect(quotes[1].issue).toBe('rate_limited'); expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each(['throw', 'html', 'empty', 'malformed'])('uses a short negative TTL after a %s response', async mode => {
  fetchMock.mockImplementation(async () => {
    if (mode === 'throw') throw new Error('network unavailable');
    return mode === 'html' ? new Response('<html>Error</html>') : Response.json(mode === 'empty' ? { data: [] } : { data: null });
  });
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  expect(await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).toMatchObject({
    ...failure, retryAt: new Date(now + 30_000).toISOString(),
  });
  expect(nextCache.entry).toBeNull();
  await vi.advanceTimersByTimeAsync(29_999);
  await withTvNasdaqDubaiFallback(assets[1], Promise.resolve(missing(assets[1].symbol)));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockImplementation(async () => Response.json(body())); await vi.advanceTimersByTimeAsync(1);
  expect((await withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure))).price).toBe(42.5);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('aborts a stalled provider read after twenty seconds and negative-caches the failure', async () => {
  let requestSignal!: AbortSignal;
  fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal;
    requestSignal.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')), { once: true });
  }));
  const { withTvNasdaqDubaiFallback } = await import('@/lib/server/markets-tv/nasdaqDubaiFallback');
  const failure = missing(assets[0].symbol);
  const work = withTvNasdaqDubaiFallback(assets[0], Promise.resolve(failure));
  await vi.advanceTimersByTimeAsync(19_999); expect(requestSignal.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(await work).toMatchObject({ ...failure, retryAt: new Date(now + 50_000).toISOString() });
  expect(requestSignal.aborted).toBe(true);
  await withTvNasdaqDubaiFallback(assets[1], Promise.resolve(missing(assets[1].symbol)));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

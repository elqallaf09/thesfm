import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoldApiProvider, isSilverSpot, normalizeGoldApiSilver } from '@/lib/market/providers/goldApi';
import { fetchTwelveDataCandles } from '@/lib/market/providers/twelveDataCandles';

const NOW = new Date('2026-09-19T07:00:00Z');
const fixture = { symbol: 'XAG', name: 'Silver', currency: 'USD', price: 66.37, updatedAt: '2026-09-19T06:59:50Z' };
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('silver spot price fallback', () => {
  it.each(['XAGUSD', 'XAG/USD', 'XAG', 'SILVER'])('resolves only the USD silver spot identity: %s', symbol => {
    expect(isSilverSpot(symbol)).toBe(true);
  });
  it.each(['SI=F', 'SIL', 'SLV', 'XAG/EUR', 'AAPL', 'XAUUSD'])('does not substitute spot for %s', symbol => {
    expect(isSilverSpot(symbol)).toBe(false);
  });
  it('rejects incompatible asset classes and currencies', () => {
    expect(isSilverSpot('SILVER', { assetType: 'stock' })).toBe(false);
    expect(isSilverSpot('XAGUSD', { currency: 'KWD' })).toBe(false);
  });
  it('preserves the source timestamp, spot venue and missing daily fields', () => {
    expect(normalizeGoldApiSilver(fixture)).toMatchObject({
      symbol: 'XAGUSD', providerSymbol: 'XAG', provider: 'gold_api', currency: 'USD', exchange: 'OTC',
      price: 66.37, lastUpdated: '2026-09-19T06:59:50.000Z', change: null, changePercent: null,
      previousClose: null, open: null, high: null, low: null, volume: null,
    });
  });
  it.each([
    { symbol: 'XAU' }, { currency: 'EUR' }, { price: true }, { price: 0 }, { price: '66.37' },
    { price: Number.NaN }, { updatedAt: null }, { updatedAt: '2026-09-19' },
    { updatedAt: '2026-09-19T07:00:00' }, { updatedAt: '2026-09-20T07:00:00Z' },
  ])('rejects untrustworthy price evidence %j', patch => {
    expect(normalizeGoldApiSilver({ ...fixture, ...patch })).toBeNull();
  });
  it('keeps an old observation dated so downstream quality can mark it stale', () => {
    expect(normalizeGoldApiSilver({ ...fixture, updatedAt: '2026-09-10T07:00:00Z' })?.lastUpdated).toBe('2026-09-10T07:00:00.000Z');
  });
  it('deduplicates concurrent calls and honors the 30-second cache even on refresh', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(fixture)));
    const provider = new GoldApiProvider();
    const [first, second] = await Promise.all([provider.getQuote('XAGUSD'), provider.getQuote('XAGUSD')]);
    expect(first?.price).toBe(66.37); expect(second).toEqual(first);
    vi.advanceTimersByTime(29_000);
    const cached = await provider.getQuote('XAGUSD', 'commodities', { forceFresh: true });
    expect(cached).toMatchObject({ cached: true, cacheAgeSeconds: 29, lastUpdated: first?.lastUpdated });
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1001);
    await provider.getQuote('XAGUSD');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await provider.getCandles()).toEqual([]);
  });
  it('releases an unsuccessful in-flight call and retries normally', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture)));
    const provider = new GoldApiProvider();
    await expect(provider.getQuote('XAGUSD')).rejects.toThrow('provider_http_503');
    expect((await provider.getQuote('XAGUSD'))?.price).toBe(66.37);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('recovers through the configured chain after Twelve Data rejects both silver candidates', async () => {
    for (const key of ['FINNHUB_API_KEY', 'EODHD_API_KEY', 'MARKETSTACK_API_KEY', 'FMP_API_KEY']) vi.stubEnv(key, '');
    vi.stubEnv('TWELVE_DATA_API_KEY', 'fixture');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      return url.hostname === 'api.gold-api.com' ? new Response(JSON.stringify(fixture))
        : new Response(JSON.stringify({ status: 'error', code: 404 }), { status: 404 });
    });
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('XAGUSD', 'commodities', { symbol: 'XAGUSD', assetType: 'commodity', excludeProviders: ['yahoo'] });
    expect(result.ok && result.provider).toBe('gold_api');
    expect(result.ok && result.data.price).toBe(66.37);
    expect(fetchMock.mock.calls).toHaveLength(3);
  });
});

describe('Twelve Data silver history recovery', () => {
  const candidates = [{ symbol: 'XAG/USD', exchange: 'COMMODITY' }, { symbol: 'XAG/USD', exchange: null }];
  const payload = { meta: { symbol: 'XAG/USD', currency: 'USD' }, values: [
    { datetime: '2026-09-18', open: '66', high: '67', low: '65', close: '66.4' },
    { datetime: '2026-09-17', open: '65', high: '66', low: '64', close: '65.7' },
  ] };
  it('selects the provider commodity exchange and requests enough UTC history for SMA200', async () => {
    const fetchJson = vi.fn().mockResolvedValue({ ok: true, status: 200, data: payload });
    const candles = await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1d', fetchJson, onFailure: vi.fn() });
    expect(candles.map(c => c.close)).toEqual([65.7, 66.4]);
    const url = new URL(fetchJson.mock.calls[0][0]);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ symbol: 'XAG/USD', exchange: 'COMMODITY', interval: '1day', outputsize: '260', timezone: 'UTC' });
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(candles[0].volume).toBeNull();
  });
  it('tries the alternate spot identity after a not-found response without requesting futures', async () => {
    const fetchJson = vi.fn().mockResolvedValueOnce({ ok: false, status: 404, data: { status: 'error' } })
      .mockResolvedValueOnce({ ok: true, status: 200, data: payload });
    const onFailure = vi.fn();
    expect(await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1day', fetchJson, onFailure })).toHaveLength(2);
    expect(onFailure).toHaveBeenCalledOnce();
    expect(fetchJson.mock.calls.map(([url]) => new URL(url).searchParams.get('symbol'))).toEqual(['XAG/USD', 'XAG/USD']);
  });
  it.each([401, 402, 403, 429, 503])('does not retry another identity on status %s', async status => {
    const fetchJson = vi.fn().mockResolvedValue({ ok: false, status, data: null });
    expect(await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1d', fetchJson, onFailure: vi.fn() })).toEqual([]);
    expect(fetchJson).toHaveBeenCalledOnce();
  });
  it('honors quota failures delivered in an HTTP 200 error envelope', async () => {
    const fetchJson = vi.fn().mockResolvedValue({ ok: true, status: 200, data: { status: 'error', code: 429 } });
    const onFailure = vi.fn();
    expect(await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1d', fetchJson, onFailure })).toEqual([]);
    expect(fetchJson).toHaveBeenCalledOnce();
    expect(onFailure.mock.calls[0][1].status).toBe(429);
  });
  it('rejects another currency or instrument instead of relabeling it as silver in USD', async () => {
    for (const meta of [{ symbol: 'SI=F', currency: 'USD' }, { symbol: 'XAG/USD', currency: 'EUR' }]) {
      const fetchJson = vi.fn().mockResolvedValue({ ok: true, status: 200, data: { ...payload, meta } });
      expect(await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1d', fetchJson, onFailure: vi.fn() })).toEqual([]);
    }
  });
  it('filters invalid dates/prices/ranges and deduplicates candles', async () => {
    const valid = payload.values[0];
    const fetchJson = vi.fn().mockResolvedValue({ ok: true, status: 200, data: { ...payload, values: [
      ...payload.values, valid, { ...valid, datetime: '2026-02-30' }, { ...valid, datetime: '2026-09-20' },
      { ...valid, datetime: '2026-09-16', close: '0' }, { ...valid, datetime: '2026-09-15', high: '2' },
      { ...valid, datetime: '2026-09-14', close: true },
    ] } });
    expect(await fetchTwelveDataCandles({ candidates, key: 'fixture', interval: '1d', fetchJson, onFailure: vi.fn() })).toHaveLength(2);
  });
});

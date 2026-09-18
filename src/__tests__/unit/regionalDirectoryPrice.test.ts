import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const primary = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/regionalDirectoryQuotes', () => ({ getRegionalDirectoryQuote: primary }));
const missing = (symbol: string) => ({ symbol, price: null, available: false, delayed: true, source: 'Twelve Data', unavailableReason: 'provider_unavailable' });
const chart = (overrides: Record<string, unknown> = {}) => Response.json({ chart: { result: [{ meta: { symbol: '1010.SR', currency: 'SAR', exchangeName: 'SAU', instrumentType: 'EQUITY', regularMarketPrice: 20, previousClose: 19, regularMarketTime: Date.now() / 1000 - 3600, ...overrides } }], error: null } });
beforeEach(() => { vi.resetModules(); primary.mockReset().mockImplementation(async symbol => missing(symbol)); });
afterEach(() => { vi.unstubAllGlobals(); });

it('recovers a verified Saudi reference quote, preserving the directory identity and source time', async () => {
  const fetch = vi.fn(async () => chart()); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryPrice } = await import('@/lib/server/regionalDirectoryPrice');
  const first = getRegionalDirectoryPrice('TD:XSAU:1010');
  expect(getRegionalDirectoryPrice('TD:XSAU:1010')).toBe(first);
  expect(await first).toMatchObject({ symbol: 'TD:XSAU:1010', price: 20, source: 'Yahoo Finance', available: true, delayed: true, asOf: expect.any(String) });
  await getRegionalDirectoryPrice('TD:XSAU:1010');
  expect(fetch).toHaveBeenCalledTimes(1); expect(primary).toHaveBeenCalledTimes(1);
});
it('uses the verified Qatar exchange/currency pair', async () => {
  const fetch = vi.fn(async () => chart({ symbol: 'ABQK.QA', currency: 'QAR', exchangeName: 'DOH' })); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryPrice } = await import('@/lib/server/regionalDirectoryPrice');
  expect(await getRegionalDirectoryPrice('TD:DSMD:ABQK')).toMatchObject({ available: true });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/ABQK.QA?'), expect.any(Object));
});
it.each([{ symbol: '1011.SR' }, { currency: 'USD' }, { exchangeName: 'NYQ' }, { instrumentType: 'ETF' }, { regularMarketTime: null }, { regularMarketTime: Date.now() / 1000 + 3600 }, { regularMarketTime: Date.now() / 1000 - 8 * 86400 }, { regularMarketPrice: true }])('rejects unverified fallback metadata %j', async overrides => {
  vi.stubGlobal('fetch', vi.fn(async () => chart(overrides)));
  const { getRegionalDirectoryPrice } = await import('@/lib/server/regionalDirectoryPrice');
  expect(await getRegionalDirectoryPrice('TD:XSAU:1010')).toMatchObject({ available: false, price: null });
});
it('does not guess Egyptian or ADX symbols, and retains usable primary quotes', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryPrice } = await import('@/lib/server/regionalDirectoryPrice');
  await getRegionalDirectoryPrice('TD:XCAI:EGS01041C010'); await getRegionalDirectoryPrice('TD:XADS:ABNIC');
  primary.mockResolvedValue({ symbol: 'TD:XSAU:1010', available: true, price: 20, source: 'Twelve Data' });
  expect(await getRegionalDirectoryPrice('TD:XSAU:1010')).toMatchObject({ source: 'Twelve Data', available: true });
  expect(fetch).not.toHaveBeenCalled();
});
it('bounds fallback requests and pauses queued traffic when its provider returns 429', async () => {
  const fetch = vi.fn(async () => new Response('', { status: 429 })); vi.stubGlobal('fetch', fetch);
  const { getRegionalDirectoryPrice } = await import('@/lib/server/regionalDirectoryPrice');
  const prices = await Promise.all(Array.from({ length: 24 }, (_, i) => getRegionalDirectoryPrice(`TD:XSAU:${1010 + i}`)));
  expect(fetch.mock.calls.length).toBeLessThanOrEqual(3);
  expect(prices.every(price => !price.available)).toBe(true);
});

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });
function configure() {
  for (const key of ['TWELVE_DATA_API_KEY', 'FINNHUB_API_KEY', 'EODHD_API_KEY', 'MARKETSTACK_API_KEY']) vi.stubEnv(key, '');
  vi.stubEnv('FMP_API_KEY', 'test-server-key');
}

describe('FMP in the production SFM market path', () => {
  it('loads stock quotes and daily history when FMP is the only configured feed and Yahoo is excluded', async () => {
    configure();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      expect(url.origin).toBe('https://financialmodelingprep.com');
      expect(url.searchParams.has('apikey')).toBe(false);
      expect((init?.headers as Record<string, string>).apikey).toBe('test-server-key');
      return Response.json(url.pathname.endsWith('/quote')
        ? [{ symbol: 'AAPL', name: 'Apple', price: 200, previousClose: 198, timestamp: Math.floor(Date.now() / 1000), volume: 1200 }]
        : [{ symbol: 'AAPL', date: '2026-09-16', close: 200, open: 198, high: 201, low: 197, volume: null },
          { symbol: 'AAPL', date: '2026-09-15', close: 198, open: 199, high: 201, low: 196, volume: 1200 }]);
    });
    const { getQuoteWithFallback, getCandlesWithFallback } = await import('@/lib/market/marketDataProviders');
    const context = { symbol: 'AAPL', assetType: 'stock', excludeProviders: ['yahoo' as const] };
    const [quote, history] = await Promise.all([
      getQuoteWithFallback('AAPL', 'us-stocks', context), getCandlesWithFallback('AAPL', 'us-stocks', '1d', context),
    ]);
    expect(quote.ok).toBe(true); expect(history.ok).toBe(true);
    if (!quote.ok || !history.ok) throw new Error('Expected FMP evidence');
    expect(quote.provider).toBe('fmp'); expect(quote.data.changePercent).toBeCloseTo(2 / 198 * 100);
    expect(quote.data.delayType).toBe('delayed'); expect(quote.data.open).toBeNull();
    expect(history.data.map(item => item.date)).toEqual(['2026-09-15', '2026-09-16']);
    expect(history.data[1].volume).toBeNull(); expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('coalesces repeated requests and refuses foreign symbols or mismatched response identities', async () => {
    configure();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([{ symbol: 'WRONG', price: 123 }]));
    const { FmpMarketDataProvider } = await import('@/lib/market/providers/fmpMarketData');
    const provider = new FmpMarketDataProvider();
    expect(await provider.getQuote('KFH.KW', 'kuwait', { currency: 'KWD' })).toBeNull();
    expect(await provider.getQuote('BTC', 'crypto', { assetType: 'crypto' })).toBeNull();
    const result = await Promise.all([provider.getQuote('AAPL'), provider.getQuote('AAPL')]);
    expect(result).toEqual([null, null]); expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a missing timestamp missing and propagates a sanitized provider failure', async () => {
    configure();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json([{ symbol: 'MSFT', price: 123, timestamp: null }]))
      .mockResolvedValueOnce(new Response('do not expose this provider message', { status: 403 }));
    const { FmpMarketDataProvider } = await import('@/lib/market/providers/fmpMarketData');
    const provider = new FmpMarketDataProvider();
    expect((await provider.getQuote('MSFT'))?.lastUpdated).toBeNull();
    await expect(provider.getCandles('MSFT', 'us-stocks', '1d')).rejects.toThrow('provider_http_403');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

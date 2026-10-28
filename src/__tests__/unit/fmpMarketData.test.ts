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
  it('requests exact index identities first and never substitutes an ETF or a dollar amount', async () => {
    configure(); vi.stubEnv('TWELVE_DATA_API_KEY', 'test-td');
    const timestamp = Math.floor(Date.now() / 1000) - 100;
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input)); expect(url.origin).toBe('https://financialmodelingprep.com');
      expect(url.searchParams.get('symbol')).toBe('^GSPC');
      return Response.json([{ symbol: 'SPY', price: 500 }, { symbol: '^GSPC', price: 6000, previousClose: 5990, timestamp, exchange: 'INDEX' }]);
    });
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    const result = await getSfmMarketQuote('^GSPC', { assetType: 'index' });
    expect(result).toMatchObject({ symbol: '^GSPC', assetType: 'index', price: 6000, currency: null,
      provenance: { upstreamProvider: 'fmp', providerSymbol: '^GSPC', observedAt: new Date(timestamp * 1000).toISOString(), delayType: 'delayed' } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('retains entitlement failure and retry time without repeated index requests', async () => {
    configure();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 402 }));
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const context = { assetType: 'index', excludeProviders: ['yahoo' as const] };
    const first = await getQuoteWithFallback('^GSPC', 'indices', context);
    const second = await getQuoteWithFallback('^GSPC', 'indices', { ...context, forceFresh: true });
    expect(first.ok).toBe(false); expect(second.ok).toBe(false);
    expect(first.attempts.find(attempt => attempt.provider === 'fmp')).toMatchObject({ code: 'NOT_ENTITLED', status: 402, retryAt: expect.any(String) });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

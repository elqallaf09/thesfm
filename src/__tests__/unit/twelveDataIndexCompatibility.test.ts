import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/server/market-provider-cooldown', () => ({ readTwelveDataCooldown: vi.fn().mockResolvedValue(null), publishTwelveDataCooldown: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  vi.resetModules();
  for (const key of ['FINNHUB_API_KEY', 'EODHD_API_KEY', 'MARKETSTACK_API_KEY', 'FMP_API_KEY']) vi.stubEnv(key, '');
  vi.stubEnv('TWELVE_DATA_API_KEY', 'test-only');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('existing non-TV Twelve Data index contracts', () => {
  it.each([['FTSE', 'XLON'], ['GDAXI', 'XETR'], ['N225', 'XJPX']])('loads native %s through its verified MIC', async (symbol, mic) => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      expect(url.pathname).toBe('/quote'); expect(url.searchParams.get('symbol')).toBe(symbol);
      expect(url.searchParams.get('mic_code')).toBe(mic);
      return Response.json({ symbol, mic_code: mic, currency: symbol === 'FTSE' ? 'GBP' : 'JPY', close: 8500,
        last_quote_at: Date.parse('2026-10-27T16:30:00Z') / 1000, is_market_open: false });
    });
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    const quote = await getSfmMarketQuote(symbol, { market: 'indices', assetType: 'index' });
    expect(quote).toMatchObject({ symbol, assetType: 'index', price: 8500, currency: null, provenance: { upstreamProvider: 'twelve_data' } });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each(['FTSE', 'CAC40', '^STOXX50E'])('preserves existing non-TV history for %s', async symbol => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      expect(url.pathname).toBe('/time_series'); expect(url.searchParams.get('symbol')).toBe(symbol);
      if (symbol === 'FTSE') expect(url.searchParams.get('mic_code')).toBe('XLON');
      else expect(url.searchParams.has('mic_code')).toBe(false);
      return Response.json({ status: 'ok', meta: { symbol, ...(symbol === 'FTSE' ? { mic_code: 'XLON' } : {}) },
        values: [{ datetime: '2026-10-27', open: '8400', high: '8600', low: '8300', close: '8500' }] });
    });
    const { getCandlesWithFallback } = await import('@/lib/market/marketDataProviders');
    const history = await getCandlesWithFallback(symbol, 'indices', '1d', { assetType: 'index', excludeProviders: ['yahoo'] });
    expect(history).toMatchObject({ ok: true, provider: 'twelve_data', data: [{ close: 8500, date: '2026-10-27' }] });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([
    { symbol: undefined }, { symbol: 'ANOTHER' }, { symbol: 'FTSE', type: 'ETF' }, { symbol: 'FTSE', type: 'Common Stock' },
  ])('rejects an absent/wrong instrument identity even on the expected MIC %#', async identity => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({
      ...identity, mic_code: 'XLON', currency: 'GBP', close: 8500, last_quote_at: Date.parse('2026-10-27T16:30:00Z') / 1000,
    }));
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    expect(await getSfmMarketQuote('FTSE', { market: 'indices', assetType: 'index' })).toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each(['^GSPC', '^DJI', '^NDX'])('does not spend TD credits on unverified US caret identity %s', async symbol => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { getQuoteWithFallback, getCandlesWithFallback } = await import('@/lib/market/marketDataProviders');
    const context = { assetType: 'index', excludeProviders: ['yahoo' as const] };
    expect((await getQuoteWithFallback(symbol, 'indices', context)).ok).toBe(false);
    expect((await getCandlesWithFallback(symbol, 'indices', '1d', context)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

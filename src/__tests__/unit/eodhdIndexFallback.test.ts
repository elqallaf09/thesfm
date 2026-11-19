import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/server/market-provider-cooldown', () => ({ readTwelveDataCooldown: vi.fn().mockResolvedValue(null), publishTwelveDataCooldown: vi.fn().mockResolvedValue(undefined) }));
vi.mock('server-only', () => ({}));

const observed = Date.parse('2026-11-19T14:45:00Z');
beforeEach(() => {
  vi.resetModules();
  // FMP and Twelve Data unavailable (quota pause), EODHD is the next lawful layer.
  for (const key of ['FINNHUB_API_KEY', 'MARKETSTACK_API_KEY', 'FMP_API_KEY', 'TWELVE_DATA_API_KEY']) vi.stubEnv(key, '');
  vi.stubEnv('EODHD_API_KEY', 'test-only');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function eodhd(body: Record<string, unknown>, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json(body, { status }));
}

describe('EODHD cash-index layer', () => {
  it.each([['^DJI', 'DJI.INDX'], ['^FTSE', 'FTSE.INDX'], ['^N225', 'N225.INDX']])('loads %s from its verified INDX code', async (symbol, code) => {
    const fetch = eodhd({ code, timestamp: observed / 1000, close: 50210.5, previousClose: 50000, change_p: 0.42 });
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    const quote = await getSfmMarketQuote(symbol, { market: 'indices', assetType: 'index' });
    expect(quote).toMatchObject({ symbol, assetType: 'index', price: 50210.5, currency: null,
      provenance: { upstreamProvider: 'eodhd', providerSymbol: code, observedAt: new Date(observed).toISOString() } });
    expect(new URL(String(fetch.mock.calls[0][0])).pathname).toBe(`/api/real-time/${code}`);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([{ code: 'DIA.US' }, { code: 'YM.COMM' }, {}])('rejects an answer for another instrument %j', async identity => {
    eodhd({ ...identity, timestamp: observed / 1000, close: 502.1 });
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    expect(await getSfmMarketQuote('^DJI', { market: 'indices', assetType: 'index' })).toBeNull();
  });

  it('never guesses a code for an index it has not verified', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    expect((await getQuoteWithFallback('^STOXX50E', 'indices', { assetType: 'index', excludeProviders: ['yahoo'] })).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports a plan without index access as a provider failure, not a price', async () => {
    eodhd({ message: 'payment required' }, 402);
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('^N225', 'indices', { assetType: 'index', excludeProviders: ['yahoo'] });
    expect(result.ok).toBe(false);
    expect(result.attempts.some(attempt => attempt.provider === 'eodhd')).toBe(true);
  });
});

describe('TV index identity allowlist', () => {
  it('accepts only the exact EODHD code for the requested index', async () => {
    const { matchesIndex } = await import('@/lib/server/markets-tv/quoteLoader');
    expect(matchesIndex('^DJI', 'DJI.INDX', 'eodhd')).toBe(true);
    expect(matchesIndex('^FTSE', 'FTSE.INDX', 'eodhd')).toBe(true);
    expect(matchesIndex('^DJI', 'DIA.US', 'eodhd')).toBe(false);
    expect(matchesIndex('^FTSE', 'DJI.INDX', 'eodhd')).toBe(false);
    expect(matchesIndex('^DJI', 'DJI.INDX', 'finnhub')).toBe(false);
    expect(matchesIndex('^DJI', 'DJI.INDX', 'marketstack')).toBe(false);
  });
});

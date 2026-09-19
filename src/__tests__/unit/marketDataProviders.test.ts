import { afterEach, describe, expect, it, vi } from 'vitest';

const yahooQuoteMock = vi.fn(async (options: { requestedSymbol: string; symbols?: string[] }) => ({
  requestedSymbol: options.requestedSymbol,
  symbolUsed: options.symbols?.[0] ?? options.requestedSymbol,
  name: options.requestedSymbol,
  price: 182.5,
  change: 1.2,
  changePercent: 0.66,
  currency: 'USD',
  marketTime: '2026-07-02T10:00:00.000Z',
  source: 'Yahoo Finance' as const,
  delayed: true as const,
  available: true,
}));

vi.mock('@/lib/market/fetchYahooQuote', () => ({
  fetchYahooNormalizedQuote: yahooQuoteMock,
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
  yahooQuoteMock.mockClear();
});

function clearProviderKeys() {
  vi.stubEnv('TWELVE_DATA_API_KEY', '');
  vi.stubEnv('FINNHUB_API_KEY', '');
  vi.stubEnv('EODHD_API_KEY', '');
  vi.stubEnv('MARKETSTACK_API_KEY', '');
  vi.stubEnv('FMP_API_KEY', '');
}

describe('market data provider fallback', () => {
  it('retains precise observation time and delay class across quote cache hits', async () => {
    clearProviderKeys(); vi.stubEnv('TWELVE_DATA_API_KEY', 'test');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      close: '102', currency: 'USD', datetime: '2026-09-18', is_market_open: true,
      last_quote_at: Date.parse('2026-09-18T14:30:00Z') / 1000,
    }), { status: 200 }));
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const context = { assetType: 'stock', excludeProviders: ['yahoo' as const] };
    const first = await getQuoteWithFallback('AAPL', 'us-stocks', context);
    const second = await getQuoteWithFallback('AAPL', 'us-stocks', context);
    for (const result of [first, second]) {
      expect(result.ok).toBe(true); if (!result.ok) throw new Error('Expected quote');
      expect(result.data.lastUpdated).toBe('2026-09-18T14:30:00.000Z');
      expect(result.data.delayType).toBe('delayed');
    }
    expect(second.ok && second.data.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('timezone')).toBe('UTC');
  });

  it('does not stamp an undated price with the request time', async () => {
    clearProviderKeys(); vi.stubEnv('TWELVE_DATA_API_KEY', 'test');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ close: '102', currency: 'USD' }), { status: 200 }));
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('AAPL', 'us-stocks', { excludeProviders: ['yahoo'] });
    expect(result.ok && result.data.lastUpdated).toBeNull();
  });
  it.each(['1d', '1day', 'D', '1h'])('requests supported Twelve Data history for %s with room for SMA 200', async interval => {
    clearProviderKeys();
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      if (!['1day', '1h'].includes(url.searchParams.get('interval') ?? '')) {
        return new Response(JSON.stringify({ status: 'error', code: 400, message: 'Invalid interval' }), { status: 400 });
      }
      return new Response(JSON.stringify({ status: 'ok', values: [
        { datetime: '2026-09-17', open: '100', high: '103', low: '99', close: '102', volume: '1500' },
        { datetime: '2026-09-16', open: '99', high: '101', low: '98', close: '100', volume: null },
      ] }), { status: 200 });
    });
    const { getCandlesWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getCandlesWithFallback('AAPL', 'us-stocks', interval, { assetType: 'stock', excludeProviders: ['yahoo'] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected provider history');
    expect(result.provider).toBe('twelve_data');
    expect(result.data.map(row => row.close)).toEqual([100, 102]);
    expect(result.data[0].volume).toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
    const requested = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requested.pathname).toBe('/time_series');
    expect(requested.searchParams.get('interval')).toBe(interval === '1h' ? '1h' : '1day');
    expect(Number(requested.searchParams.get('outputsize'))).toBeGreaterThanOrEqual(200);
  });

  it('does not replace a configured provider failure with later missing-key attempts', async () => {
    clearProviderKeys();
    vi.stubEnv('TWELVE_DATA_API_KEY', 'test');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));
    const { getQuoteWithFallback, getCandlesWithFallback } = await import('@/lib/market/marketDataProviders');
    const context = { excludeProviders: ['yahoo' as const] };
    const quote = await getQuoteWithFallback('AAPL', 'us-stocks', context);
    const history = await getCandlesWithFallback('AAPL', 'us-stocks', '1d', context);
    expect(quote.ok).toBe(false); expect(history.ok).toBe(false);
    if (quote.ok || history.ok) throw new Error('Expected failure');
    expect(quote.latestError).toBe('NETWORK_FAILURE');
    expect(history.latestError).toBe('NETWORK_FAILURE');
  });

  it('uses Twelve Data first and keeps Kuwait symbols in KWD', async () => {
    clearProviderKeys();
    vi.stubEnv('TWELVE_DATA_API_KEY', 'td_test_key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      symbol: 'KFH',
      name: 'Kuwait Finance House',
      close: '0.842',
      currency: 'USD',
      change: '0.004',
      percent_change: '0.48',
      previous_close: '0.838',
      exchange: 'KSE',
      datetime: '2026-07-02',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('KFH.KW', 'kuwait', {
      symbol: 'KFH.KW',
      assetType: 'stock',
      exchange: 'KSE',
      country: 'Kuwait',
      currency: 'KWD',
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected Twelve Data quote');
    expect(result.provider).toBe('twelve_data');
    expect(result.data.symbol).toBe('KFH.KW');
    expect(result.data.currency).toBe('KWD');
    expect(result.data.providerSymbol).toBe('KFH:KSE');
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain('api.twelvedata.com/quote');
    expect(yahooQuoteMock).not.toHaveBeenCalled();
  });

  it.each([
    ['KFH Kuwait', 'KFH.KW', 'kuwait', 'stock', 'KWD'],
    ['NBK Kuwait', 'NBK.KW', 'kuwait', 'stock', 'KWD'],
    ['ARAMCO Saudi', '2222.SR', 'saudi', 'stock', 'SAR'],
    ['Emaar Dubai', 'EMAAR.AE', 'uae', 'stock', 'AED'],
    ['GE US', 'GE', 'us-stocks', 'stock', 'USD'],
    ['AAPL US', 'AAPL', 'us-stocks', 'stock', 'USD'],
    ['EUR/USD', 'EUR/USD', 'forex', 'forex', 'USD'],
    ['BTC/USD', 'BTC/USD', 'crypto', 'crypto', 'USD'],
    ['Gold XAU/USD', 'XAU/USD', 'commodities', 'commodity', 'USD'],
  ])('normalizes %s through the primary provider chain', async (_label, symbol, market, assetType, expectedCurrency) => {
    clearProviderKeys();
    vi.stubEnv('TWELVE_DATA_API_KEY', 'td_test_key');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      symbol,
      name: symbol,
      close: '100',
      currency: 'USD',
      change: '1',
      percent_change: '1',
      previous_close: '99',
      exchange: market,
      datetime: '2026-07-02',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback(symbol, market, {
      symbol,
      assetType,
      market,
      country: market,
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(`expected quote for ${symbol}`);
    expect(result.provider).toBe('twelve_data');
    expect(result.data.currency).toBe(expectedCurrency);
    expect(result.data.price).toBeGreaterThan(0);
  });

  it('keeps Yahoo Finance as the final quote fallback only', async () => {
    clearProviderKeys();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('GE', 'us-stocks', {
      symbol: 'GE',
      assetType: 'stock',
      currency: 'USD',
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected Yahoo fallback quote');
    expect(result.provider).toBe('yahoo');
    expect(result.data.providerName).toBe('Yahoo Finance');
    expect(result.attempts.map(attempt => attempt.provider)).toEqual([
      'twelve_data',
      'finnhub',
      'eodhd',
      'marketstack',
      'fmp',
    ]);
    expect(yahooQuoteMock).toHaveBeenCalledOnce();
  });

  it('uses canonical Yahoo crypto pairs for collision-prone symbols', async () => {
    clearProviderKeys();
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');
    const result = await getQuoteWithFallback('APT/USD', 'crypto', {
      symbol: 'APT/USD',
      assetType: 'crypto',
      currency: 'USD',
      forceFresh: true,
    });

    expect(result.ok).toBe(true);
    expect(yahooQuoteMock).toHaveBeenCalledWith(expect.objectContaining({
      requestedSymbol: 'APT/USD',
      symbols: ['APT-USD'],
      canonicalSymbol: 'APT/USD',
      assetClass: 'crypto',
      expectedName: 'Aptos',
    }));
    expect((yahooQuoteMock.mock.calls[0]?.[0] as { symbols?: string[] } | undefined)?.symbols).not.toContain('APT');
  });
});

describe('canonical SFM precious metal requests', () => {
  it.each([['XAUUSD', 'XAU/USD'], ['XAU/USD', 'XAU/USD'], ['GOLD', 'XAU/USD'], ['XAU', 'XAU/USD'], ['SILVER', 'XAG/USD']])('routes %s to the spot feed for both quote and history', async (symbol, providerSymbol) => {
    clearProviderKeys(); vi.stubEnv('TWELVE_DATA_API_KEY', 'fixture');
    const calls: URL[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input)); calls.push(url);
      if (url.searchParams.get('symbol') !== providerSymbol) return new Response(JSON.stringify({ status: 'error', code: 400 }), { status: 400 });
      return new Response(JSON.stringify(url.pathname === '/time_series' ? { values: [
        { datetime: '2026-09-17', open: '3000', high: '3040', low: '2990', close: '3020' },
      ] } : { symbol: providerSymbol, close: '3020', currency: 'USD', datetime: '2026-09-17', type: 'Physical Currency' }), { status: 200 });
    });
    const { getSfmMarketQuote } = await import('@/lib/sfm-market/engine');
    const { getSfmMarketHistory } = await import('@/lib/sfm-market/history');
    const quote = await getSfmMarketQuote(symbol, { forceFresh: true });
    const history = await getSfmMarketHistory(symbol, { forceFresh: true });
    expect(quote?.price).toBe(3020); expect(quote?.provenance.providerSymbol).toBe(providerSymbol === 'XAG/USD' ? 'XAG/USD:COMMODITY' : providerSymbol);
    expect(quote?.assetType).toBe(providerSymbol === 'XAG/USD' ? 'commodity' : 'gold');
    expect(history.ok).toBe(true); expect(history.candles).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect(calls.map(url => url.searchParams.get('symbol'))).toEqual([providerSymbol, providerSymbol]);
    expect(yahooQuoteMock).not.toHaveBeenCalled();
  });
});

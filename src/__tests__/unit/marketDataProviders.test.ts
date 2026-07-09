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
}

describe('market data provider fallback', () => {
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/server/twelve-data-fetch', () => ({ twelveDataFetch: vi.fn(), TWELVE_RETRY_HEADER: 'x-sfm-provider-retry-at' }));
const { fetchHistory } = vi.hoisted(() => ({ fetchHistory: vi.fn() }));
vi.mock('@/lib/market/fetchYahooHistory', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/market/fetchYahooHistory')>(), fetchYahooHistory: fetchHistory }));
import { normalizeYahooChartHistory } from '@/lib/market/fetchYahooHistory';
import { parseTiingoFxTop, verifiedYahooFx, yahooFxSymbol } from '@/lib/markets-tv/forexExternal';
import { twelveDataFetch } from '@/lib/server/twelve-data-fetch';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';

const now = Date.parse('2026-11-19T22:10:00Z');
const asset = (symbol: string): TvAsset => ({ symbol, name: symbol, baseCurrency: symbol.split('/')[0], currency: symbol.split('/')[1], region: 'FOREX' });
function yahoo(symbol: string, meta: Record<string, unknown> = {}) {
  const payload = { chart: { result: [{ meta: { symbol, currency: 'USD', instrumentType: 'CURRENCY', exchangeName: 'CCY',
    regularMarketTime: Date.parse('2026-11-19T22:04:44Z') / 1000, regularMarketPrice: 1.0971, previousClose: 1.0978, ...meta },
  timestamp: [Date.parse('2026-11-19T22:04:44Z') / 1000], indicators: { quote: [{ close: [1.0971] }] } }] } };
  return normalizeYahooChartHistory(payload, { symbol, providerSymbol: symbol, assetType: 'forex', period: '1d', interval: '5m' });
}

beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(now); fetchHistory.mockReset(); vi.mocked(twelveDataFetch).mockReset();
  const { __resetTvForexProvidersForTests } = await import('@/lib/server/markets-tv/forexProviders');
  __resetTvForexProvidersForTests();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Yahoo forex identity', () => {
  it('maps a pair to its exact Yahoo cross', () => {
    expect(yahooFxSymbol(asset('EUR/USD'))).toBe('EURUSD=X');
    expect(yahooFxSymbol(asset('USD/KWD'))).toBe('USDKWD=X');
    expect(yahooFxSymbol({ symbol: 'EUR/EUR', name: 'x' })).toBeNull();
    expect(yahooFxSymbol({ symbol: 'EUR/USD', name: 'x', currency: 'GBP' })).toBeNull();
  });
  it('accepts a verified CURRENCY quote in the quote currency with its own clock', () => {
    expect(verifiedYahooFx(asset('EUR/USD'), yahoo('EURUSD=X'), now)).toMatchObject({
      symbol: 'EUR/USD', price: 1.0971, currency: 'USD', source: 'Yahoo Finance', observedAt: '2026-11-19T22:04:44.000Z', status: 'delayed' });
  });
  it.each([
    [{ symbol: 'EURGBP=X' }], [{ currency: 'EUR' }], [{ instrumentType: 'EQUITY' }],
    [{ regularMarketTime: now / 1000 + 3600 }], [{ regularMarketTime: now / 1000 - 8 * 86400 }],
  ] as Record<string, unknown>[][])('rejects another instrument, unit or an impossible clock %j', meta => {
    const symbol = typeof meta.symbol === 'string' ? meta.symbol : 'EURUSD=X';
    const data = yahoo(symbol, meta);
    expect(verifiedYahooFx(asset('EUR/USD'), { ...data, providerSymbol: 'EURUSD=X' } as never, now)).toBeNull();
  });
});

describe('Tiingo FX batch', () => {
  it('keeps only rows that name the requested pair and carry a zoned instant', () => {
    const quotes = parseTiingoFxTop([
      { ticker: 'eurusd', quoteTimestamp: '2026-11-19T22:09:00+00:00', midPrice: 1.0972, bidPrice: 1.0971, askPrice: 1.0973 },
      { ticker: 'gbpusd', quoteTimestamp: '2026-11-19T22:09:00', midPrice: 1.309 },
      { ticker: 'usdjpy', quoteTimestamp: '2026-11-19T22:09:00Z', midPrice: -1 },
      { ticker: 'eurgbp', quoteTimestamp: '2026-11-19T22:09:00Z', midPrice: 0.8375 },
    ], [asset('EUR/USD'), asset('GBP/USD'), asset('USD/JPY')], now);
    expect([...quotes.keys()]).toEqual(['EUR/USD']);
    expect(quotes.get('EUR/USD')).toMatchObject({ price: 1.0972, currency: 'USD', source: 'Tiingo FX', status: 'available' });
  });

  it('answers a whole page with one request and sits out the hour after a 429', async () => {
    vi.stubEnv('TIINGO_API_KEY', 'test-only');
    const fetch = vi.fn(async () => Response.json([
      { ticker: 'eurusd', quoteTimestamp: '2026-11-19T22:09:00Z', midPrice: 1.0972 },
      { ticker: 'gbpusd', quoteTimestamp: '2026-11-19T22:09:00Z', midPrice: 1.309 },
    ]));
    vi.stubGlobal('fetch', fetch);
    const { tiingoForexQuote } = await import('@/lib/server/markets-tv/forexProviders');
    const work = Promise.all([tiingoForexQuote(asset('EUR/USD')), tiingoForexQuote(asset('GBP/USD'))]);
    await vi.advanceTimersByTimeAsync(40);
    expect((await work).map(quote => quote?.price)).toEqual([1.0972, 1.309]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toContain('tickers=eurusd%2Cgbpusd');

    fetch.mockImplementation(async () => new Response('limit', { status: 429 }));
    const limited = tiingoForexQuote(asset('EUR/USD'));
    await vi.advanceTimersByTimeAsync(40);
    expect(await limited).toBeNull();
    expect(await tiingoForexQuote(asset('EUR/USD'))).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('is skipped entirely without a key', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const { tiingoForexQuote } = await import('@/lib/server/markets-tv/forexProviders');
    expect(await tiingoForexQuote(asset('EUR/USD'))).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('TV forex chain order', () => {
  it('serves Yahoo without spending Twelve Data credits', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'synthetic-key');
    fetchHistory.mockResolvedValue(yahoo('EURUSD=X'));
    const { forexTvQuote } = await import('@/lib/server/markets-tv/instruments');
    const quote = await forexTvQuote(asset('EUR/USD'));
    expect(quote).toMatchObject({ price: 1.0971, source: 'Yahoo Finance' });
    expect(quote.retryAt).toBeUndefined();
    expect(twelveDataFetch).not.toHaveBeenCalled();
  });

  it('falls through to Twelve Data when Yahoo cannot verify the pair', async () => {
    vi.stubEnv('TWELVE_DATA_API_KEY', 'synthetic-key');
    fetchHistory.mockResolvedValue({ success: false, retryAfterMs: 120_000 });
    vi.mocked(twelveDataFetch).mockResolvedValue(Response.json({ symbol: 'EUR/USD', currency: 'USD', close: '1.0970',
      percent_change: '0.1', last_quote_at: Math.floor(now / 1000) - 60, is_market_open: true }));
    const { forexTvQuote } = await import('@/lib/server/markets-tv/instruments');
    expect(await forexTvQuote(asset('EUR/USD'))).toMatchObject({ price: 1.097, source: 'Twelve Data' });
    // Yahoo sits out its Retry-After instead of being asked again at once.
    await forexTvQuote(asset('EUR/USD'));
    expect(fetchHistory).toHaveBeenCalledOnce();
  });
});

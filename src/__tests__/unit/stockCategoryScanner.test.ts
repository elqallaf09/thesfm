import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), quotes: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: vi.fn() }));
vi.mock('@/lib/trader/providers/fmpRuntime', () => ({ fmpQueuedFetch: mocks.fetch }));
vi.mock('@/lib/trader/marketQuotes', () => ({ fetchTraderQuotes: mocks.quotes }));
vi.mock('@/lib/market/growthStockScreener', () => ({ screenGrowthStocks: vi.fn() }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('FMP_API_KEY', 'fixture-only');
  mocks.quotes.mockResolvedValue([]);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('category scanner provider resilience', () => {
  it('preserves real quote volume and company names instead of replacing them with the ticker', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify([{ symbol: 'TEST', companyName: 'Test Energy', sector: 'Energy', price: 10, volume: 30 }])));
    mocks.quotes.mockResolvedValue([{ symbol: 'TEST', name: 'TEST', price: 11, available: true, volume: 500, marketCap: 12000 }]);
    const { screenStockCategory } = await import('@/lib/market/stockCategoryScanner');
    expect((await screenStockCategory('energy')).items[0]).toMatchObject({ name: 'Test Energy', volume: 500, marketCap: 12000 });
  });
  it('retains all supplied growth market fields, including explicit zero dividends', async () => {
    const { screenGrowthStocks } = await import('@/lib/market/growthStockScreener');
    vi.mocked(screenGrowthStocks).mockResolvedValue({ mode: 'fundamental_screener', source: 'fixture', updatedAt: '2026-09-19', universeCount: 1, matchedCount: 1, returnedCount: 1, availableCount: 1, periods: [], criteria: {} as never, degradedReason: null,
      items: [{ symbol: 'TEST', name: 'Test', price: 10, volume: 500, beta: 1.2, dividendYieldPercent: 0, lastAnnualDividend: 0, available: true } as never] });
    const { screenStockCategory } = await import('@/lib/market/stockCategoryScanner');
    expect((await screenStockCategory('growth')).items[0]).toMatchObject({ volume: 500, beta: 1.2, dividendYieldPercent: 0 });
  });
  it('shares a scan across simultaneous ticker and panel requests and keeps their limits', async () => {
    mocks.fetch.mockImplementation(async (url: URL) => new Response(JSON.stringify(
      Array.from({ length: 30 }, (_, index) => ({ symbol: `${url.searchParams.get('exchange')}${index}`, companyName: `Energy ${index}`, sector: 'Energy', country: 'US', price: 10, marketCap: index + 1 })),
    ), { status: 200 }));
    const { screenStockCategory } = await import('@/lib/market/stockCategoryScanner');
    const [ticker, panel] = await Promise.all([screenStockCategory('energy', { limit: 24 }), screenStockCategory('energy', { limit: 80 })]);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(mocks.quotes).toHaveBeenCalledTimes(1);
    expect(ticker.returnedCount).toBe(24); expect(panel.returnedCount).toBe(80);
    expect(ticker.matchedCount).toBe(90); expect(panel.availableCount).toBe(80);
    await screenStockCategory('banking');
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });

  it('keeps successful exchanges when one provider request fails', async () => {
    mocks.fetch.mockImplementation(async (url: URL) => url.searchParams.get('exchange') === 'NYSE'
      ? new Response('', { status: 429 })
      : new Response(JSON.stringify([{ symbol: url.searchParams.get('exchange'), sector: 'Energy', price: 25 }])));
    const { screenStockCategory } = await import('@/lib/market/stockCategoryScanner');
    const result = await screenStockCategory('energy');
    expect(result.mode).toBe('dynamic_market_screener');
    expect(result.items.map(item => item.symbol)).toEqual(['AMEX', 'NASDAQ']);
    expect(result.degradedReason).toBe('partial_exchange_coverage:NYSE');
  });

  it('shares failed universe requests and preserves the provider failure reason', async () => {
    mocks.fetch.mockResolvedValue(new Response('', { status: 429 }));
    const { screenStockCategory } = await import('@/lib/market/stockCategoryScanner');
    const first = await screenStockCategory('energy');
    await screenStockCategory('banking');
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(first.mode).toBe('fallback_watchlist');
    expect(first.degradedReason).toBe('fmp_company-screener_http_429');
    expect(first.items.every(item => item.price === null && !item.available)).toBe(true);
  });
});

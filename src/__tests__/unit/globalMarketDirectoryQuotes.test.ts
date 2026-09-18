import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: vi.fn(() => null) }));
vi.mock('@/lib/server/marketSourceHealth', () => ({ recordRegionalQuoteHealth: vi.fn() }));
vi.mock('@/lib/market/fetchStockPrices', () => ({ fetchStockPrices: vi.fn(async () => new Map()) }));
vi.mock('@/lib/market/fetchYahooQuote', () => ({ fetchYahooChartQuote: vi.fn(async (symbol: string) => ({ symbol, price: null, change: null, changePercent: null, available: false, source: 'Yahoo Finance', delayed: true })) }));
vi.mock('@/lib/server/regionalDirectoryQuotes', () => ({ getRegionalDirectoryQuote: vi.fn(async (symbol: string) => ({ symbol, price: null, change: null, changePercent: null, available: false, source: 'Twelve Data', delayed: true, unavailableReason: 'provider_access_required' })) }));
import { GET } from '@/app/api/market-directory/quotes/route';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { fetchYahooChartQuote } from '@/lib/market/fetchYahooQuote';
import { getRegionalDirectoryQuote } from '@/lib/server/regionalDirectoryQuotes';
beforeEach(() => { vi.clearAllMocks(); });
it('loads the requested result symbols regardless of selected ticker markets', async () => {
  const response = await GET(new Request('https://example.com/api/market-directory/quotes?symbols=BOUBYAN.KW,000002.SZ,AMD'));
  expect(response.status).toBe(200);
  expect(fetchYahooChartQuote).toHaveBeenCalledWith('BOUBYAN.KW');
  expect(fetchYahooChartQuote).toHaveBeenCalledWith('000002.SZ');
  expect(fetchStockPrices).toHaveBeenCalledWith([{ symbol: 'AMD' }], process.env.FINNHUB_API_KEY?.trim());
  const body = await response.json();
  expect(body.prices['BOUBYAN.KW']).toMatchObject({ available: false, price: null });
});
it('rejects unbounded fanout and invalid symbols before contacting any provider', async () => {
  const symbols = Array.from({ length: 25 }, (_, i) => `A${i}`).join(',');
  for (const value of [symbols, 'https://private.invalid', 'TD:XNAS:AAPL', 'TD:XSAU:1010?apikey=key', '']) {
    const response = await GET(new Request(`https://example.com/api/market-directory/quotes?symbols=${encodeURIComponent(value)}`));
    expect(response.status).toBe(400);
  }
  expect(fetchStockPrices).not.toHaveBeenCalled();
  expect(fetchYahooChartQuote).not.toHaveBeenCalled();
});
it('routes a qualified regional listing to its provider without trying US or Yahoo symbols', async () => {
  const response = await GET(new Request('https://example.com/api/market-directory/quotes?symbols=TD:XCAI:EGS01041C010'));
  expect(response.status).toBe(200);
  expect(getRegionalDirectoryQuote).toHaveBeenCalledWith('TD:XCAI:EGS01041C010');
  expect(fetchYahooChartQuote).not.toHaveBeenCalled();
  expect(fetchStockPrices).toHaveBeenCalledWith([], process.env.FINNHUB_API_KEY?.trim());
  expect(response.headers.get('cache-control')).toBe('public, s-maxage=30');
});

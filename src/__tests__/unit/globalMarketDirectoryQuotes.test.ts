import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: vi.fn(() => null) }));
vi.mock('@/lib/market/fetchStockPrices', () => ({ fetchStockPrices: vi.fn(async () => new Map()) }));
vi.mock('@/lib/market/fetchYahooQuote', () => ({ fetchYahooChartQuote: vi.fn(async (symbol: string) => ({ symbol, price: null, change: null, changePercent: null, available: false, source: 'Yahoo Finance', delayed: true })) }));
import { GET } from '@/app/api/market-directory/quotes/route';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { fetchYahooChartQuote } from '@/lib/market/fetchYahooQuote';
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
  for (const value of [symbols, 'https://private.invalid', '']) {
    const response = await GET(new Request(`https://example.com/api/market-directory/quotes?symbols=${encodeURIComponent(value)}`));
    expect(response.status).toBe(400);
  }
  expect(fetchStockPrices).not.toHaveBeenCalled();
  expect(fetchYahooChartQuote).not.toHaveBeenCalled();
});

import { afterEach, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('next/server', () => ({ after: vi.fn() }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: vi.fn().mockResolvedValue({
  price: null, change: null, changePercent: null, currency: null, quoteTimestamp: null,
  delayed: true, dataSource: null, status: 'unavailable', issue: 'rate_limited', retryAt: '2026-11-20T00:00:01Z',
}) }));

import { TV_NASDAQ_DUBAI_LISTINGS } from '@/lib/markets-tv/nasdaqDubaiQuote';
import { tvStripCoverage } from '@/lib/markets-tv/coverage';
import { loadTvSnapshot } from '@/lib/server/markets-tv/snapshot';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('recovers the corrected Nasdaq directory during a primary quota pause without claiming source times', async () => {
  const now = Date.parse('2026-11-19T15:00:00Z');
  vi.useFakeTimers(); vi.setSystemTime(now);
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: TV_NASDAQ_DUBAI_LISTINGS.map(listing => ({
    s: `${listing.exchange}:${listing.ticker}`,
    d: [listing.ticker, listing.ticker, listing.exchange, listing.type, listing.currency, 12.5, 1.5,
      now / 1000 - 60, listing.isin, 'delayed_streaming_900', 'out_of_session'],
  })) })));
  vi.stubGlobal('fetch', fetcher);
  const work = loadTvSnapshot('gulf', [], { market: 'NASDAQ_DUBAI', pageSize: 12 });
  await vi.advanceTimersByTimeAsync(501);
  const result = await work;
  expect(result).toMatchObject({ market: 'NASDAQ_DUBAI', directoryTotal: 7, selectionTotal: 7, total: 7, available: 7 });
  expect(result.retryAt).toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe('https://scanner.tradingview.com/global/scan');
  expect(result.quotes.map(quote => quote.symbol).sort()).toEqual(['ABTC', 'DEPA', 'DEPACLA', 'ENBDREIT', 'HIK', 'NDAQ', 'REIT']);
  for (const quote of result.quotes) {
    expect(quote).toMatchObject({ price: 12.5, source: 'TradingView', observedAt: null, receivedAt: new Date(now).toISOString(),
      status: 'unknown_time', changePercent: null, exchange: 'NASDAQ_DUBAI' });
    expect(quote.issue).toBeUndefined();
    expect(quote.currency).toBe(quote.symbol.startsWith('DEPA') ? 'AED' : 'USD');
  }
  expect(tvStripCoverage(result.quotes, now)).toMatchObject({ priced: 7, unknown: 7, recent: 0, closed: 0, reference: 0 });
});

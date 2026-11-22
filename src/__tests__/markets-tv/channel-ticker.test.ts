import { describe, expect, it } from 'vitest';
import { CATEGORY_TICKERS, GLOBAL_INDEX_TICKER, NEW_LISTINGS_TICKER, NEW_LISTINGS_MARKET_FALLBACK, channelTickerPath, channelTickerQuotes } from '@/lib/markets-tv/channelTicker';
import { tvPackagedOrigin } from '@/lib/markets-tv/cors';

describe('TV ticker scope and source evidence', () => {
  it('admits only priced compliant stock identities to the Sharia ticker', () => {
    const row = { assetType: 'stock', symbol: 'AAPL', name: 'Apple', canonicalSecurityId: 'NASDAQ:AAPL',
      price: 12, available: true, currency: 'USD', source: 'Test provider', shariahStatus: 'compliant' };
    const quotes = channelTickerQuotes(CATEGORY_TICKERS.shariaNews, { items: [
      row, row, { ...row, symbol: 'OTHER', shariahStatus: 'needs_review' },
      { ...row, symbol: 'ETF', assetType: 'etf' }, { ...row, symbol: 'MISSING', price: null },
      { ...row, symbol: 'AMBIGUOUS', canonicalSecurityId: null },
    ] });
    expect(quotes.map(q => q.symbol)).toEqual(['AAPL']);
    expect(quotes[0]).toMatchObject({ changePercent: null, observedAt: null, status: 'unknown_time' });
  });

  it('only requests quotes for symbols from the matching event feed', () => {
    const feed = { topic: 'earnings-news', items: [{ symbols: ['NVDA', 'NVDA', 'AAPL', 'not a ticker'] }] };
    expect(channelTickerPath('underDollarNews', undefined)).toBe('/api/market/special-news?topic=stocks-under-1&part=ticker');
    expect(channelTickerPath('analystNews', feed)).toBeNull();
    expect(channelTickerPath('news', feed)).toBe(GLOBAL_INDEX_TICKER);
    expect(channelTickerPath('earningsNews', feed)).toContain('symbols=NVDA%2CAAPL');
    expect(channelTickerPath('metalsNews', feed)).toBe('/api/tv/snapshot?group=commodities&pageSize=2');
    expect(channelTickerPath('cryptoNews', feed)).toContain('group=crypto');
    const metalPath = channelTickerPath('metalsNews', feed);
    const quotes = [{symbol:'COMEX:GC1!'},{symbol:'COMEX:SI1!'},{symbol:'NYMEX:CL1!'}];
    expect(channelTickerQuotes(metalPath, {group:'commodities', quotes})).toEqual(quotes.slice(0, 2));
    expect(channelTickerQuotes(metalPath, {group:'crypto', quotes})).toEqual([]);
  });

  it('keeps source-verified new listing prices distinct from the clearly scoped market fallback', () => {
    expect(channelTickerPath('newStocksNews', null)).toBe(NEW_LISTINGS_TICKER);
    expect(channelTickerQuotes(NEW_LISTINGS_TICKER, { success: true, topic: 'new-stocks',
      tickerItems: [] })).toEqual([]);
    const marketQuote = { symbol: 'AAPL', price: 192, currency: 'USD', source: 'Observed provider',
      name: 'Apple', nameAr: 'Apple', exchange: 'NASDAQ', changePercent: 1, observedAt: '2026-11-20T19:00:00Z' };
    expect(channelTickerQuotes(NEW_LISTINGS_MARKET_FALLBACK, {
      group: 'us', quotes: [marketQuote],
    })).toEqual([marketQuote]);
    expect(channelTickerQuotes(NEW_LISTINGS_MARKET_FALLBACK, {
      group: 'crypto', quotes: [marketQuote],
    })).toEqual([]);
  });

  it('keeps packaged category price access read-only', () => {
    for (const path of Object.values(CATEGORY_TICKERS)) {
      const request = (method: string) => new Request('https://www.the-sfm.com' + path, {method, headers:{origin:'null'}});
      expect(tvPackagedOrigin(request('GET'))).toBe(true);
      expect(tvPackagedOrigin(request('POST'))).toBe(false);
    }
  });
});

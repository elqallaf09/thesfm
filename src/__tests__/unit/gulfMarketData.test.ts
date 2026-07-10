import { describe, expect, it, vi } from 'vitest';
import { GULF_MARKETS, getGulfMarket } from '@/lib/gulf/gulfMarkets';
import { GULF_RSS_FEEDS } from '@/lib/gulf/rssFeeds';
import { fetchMarketMovers, getMarketMoverConfig } from '@/lib/markets/marketMovers';

describe('GCC market provider mappings', () => {
  it('separates Dubai and Abu Dhabi instead of using one generic UAE market', () => {
    const marketIds = GULF_MARKETS.map(market => market.id);

    expect(marketIds).toContain('uae-dfm');
    expect(marketIds).toContain('uae-adx');
    expect(marketIds).not.toContain('uae');
  });

  it('maps DFM and ADX to supported real index symbols', () => {
    expect(getGulfMarket('uae-dfm')).toMatchObject({
      exchangeCode: 'DFM',
      yahooSymbols: ['DFMGI.AE'],
    });

    expect(getGulfMarket('uae-adx')).toMatchObject({
      exchangeCode: 'ADX',
      yahooSymbols: ['FADGI.FGI'],
    });
  });

  it('uses the official MSX source before fallbacks for Oman index data', () => {
    const oman = getGulfMarket('oman');

    expect(oman.exchangeCode).toBe('MSX');
    expect(oman.preferredSources[0]).toMatchObject({
      provider: 'Muscat Stock Exchange',
      type: 'official',
    });
  });

  it('does not register insecure HTTP-only Gulf RSS feeds', () => {
    expect(GULF_RSS_FEEDS.every(feed => feed.url.startsWith('https://'))).toBe(true);
    expect(GULF_RSS_FEEDS.some(feed => feed.source.toLowerCase().includes('mubasher'))).toBe(false);
  });

  it('uses Yahoo-supported DFM equity symbols for Dubai movers', () => {
    const dfm = getMarketMoverConfig('uae-dfm');

    expect(dfm?.symbols.length).toBeGreaterThan(0);
    expect(dfm?.symbols.every(item => item.symbol.endsWith('.AE'))).toBe(true);
    expect(dfm?.symbols.some(item => item.symbol.endsWith('.DU'))).toBe(false);
  });

  it('returns a clean unsupported movers state without provider calls for Oman', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMarketMovers('oman');

    expect(result).toMatchObject({
      ok: false,
      code: 'MARKET_MOVERS_NOT_SUPPORTED',
      market: 'oman',
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('builds gainers and losers from signed finite changes without symbol overlap', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quoteResponse: {
          result: [
            { symbol: '2222.SR', longName: 'Saudi Aramco', currency: 'SAR', regularMarketPrice: 32, regularMarketChangePercent: 2.4, regularMarketVolume: 1000 },
            { symbol: '1120.SR', longName: 'Al Rajhi Bank', currency: 'SAR', regularMarketPrice: 82, regularMarketChangePercent: -1.2, regularMarketVolume: 900 },
            { symbol: '2010.SR', longName: 'SABIC', currency: 'SAR', regularMarketPrice: 71, regularMarketChangePercent: -3.1, regularMarketVolume: 800 },
            { symbol: '2222.SR', longName: 'Saudi Aramco duplicate', currency: 'SAR', regularMarketPrice: 31, regularMarketChangePercent: -4.8, regularMarketVolume: 700 },
            { symbol: '7010.SR', longName: 'stc', currency: 'SAR', regularMarketPrice: 44, regularMarketChangePercent: 0, regularMarketVolume: 600 },
            { symbol: '1211.SR', longName: 'Maaden', currency: 'SAR', regularMarketPrice: 48, regularMarketChangePercent: null, regularMarketVolume: 500 },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchMarketMovers('saudi', 5);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.topGainers.map(item => item.symbol)).toEqual(['2222']);
      expect(result.data.topLosers.map(item => item.symbol)).toEqual(['2010', '1120']);
      expect(result.data.topLosers.map(item => item.symbol)).not.toContain('2222');
      expect(result.data.topGainers.every(item => item.changePercent !== null && item.changePercent > 0)).toBe(true);
      expect(result.data.topLosers.every(item => item.changePercent !== null && item.changePercent < 0)).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});

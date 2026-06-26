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

  it('keeps Dubai and Abu Dhabi RSS feeds scoped to their own market cards', () => {
    expect(GULF_RSS_FEEDS).toEqual(expect.arrayContaining([
      expect.objectContaining({ market: 'uae-dfm', source: 'Mubasher Dubai Financial Market' }),
      expect.objectContaining({ market: 'uae-adx', source: 'Mubasher Abu Dhabi Securities Exchange' }),
    ]));
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
});

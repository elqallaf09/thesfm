import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
const { fetchHistory, providerQuote, sfmQuote } = vi.hoisted(() => ({ fetchHistory: vi.fn(), providerQuote: vi.fn(), sfmQuote: vi.fn() }));
vi.mock('@/lib/market/fetchYahooHistory', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/market/fetchYahooHistory')>(), fetchYahooHistory: fetchHistory }));
vi.mock('@/lib/world-stocks/providerQuote', () => ({ providerStockQuote: providerQuote }));
vi.mock('@/lib/sfm-market/engine', () => ({ getSfmMarketQuote: sfmQuote }));
vi.mock('@/lib/server/markets-tv/ownedQuoteStore', () => ({ isOwnableQuote: () => false, readOwnedTvQuote: async () => null, saveOwnedTvQuote: async () => undefined }));
import { tvConfiguredMarketAssets, tvSceneAssets } from '@/lib/server/markets-tv/sceneCatalog';
import { tvAssetsAll } from '@/lib/markets-tv/catalog';
import { isTvExternalIndex } from '@/lib/markets-tv/indexChart';
import { tvRegionalIdentity } from '@/lib/markets-tv/regionalQuote';
import { tvWorldStockIdentity } from '@/lib/markets-tv/worldStockQuote';
import { TV_COMMODITIES, tvCommodityIdentity } from '@/lib/markets-tv/commodityQuote';
import { tvSceneQuoteUnit } from '@/lib/markets-tv/scene-display';

const now = Date.parse('2026-11-20T10:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); fetchHistory.mockReset(); providerQuote.mockReset(); sfmQuote.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('wider TV coverage', () => {
  it('lists more Saudi and Qatari listings, each with its exact Yahoo identity', () => {
    const saudi = tvConfiguredMarketAssets('TADAWUL'), qatar = tvConfiguredMarketAssets('QSE');
    expect(saudi.length).toBeGreaterThanOrEqual(22);
    expect(qatar.length).toBeGreaterThanOrEqual(18);
    for (const asset of [...saudi, ...qatar]) {
      expect(tvRegionalIdentity(asset), asset.symbol).not.toBeNull();
      expect(/[؀-ۿ]/.test(asset.nameAr || ''), asset.symbol).toBe(true);
    }
    expect(new Set(saudi.map(asset => asset.symbol)).size).toBe(saudi.length);
    expect(new Set(qatar.map(asset => asset.symbol)).size).toBe(qatar.length);
  });

  it('lists every European listing with its verified TradingView identity', () => {
    const europe = tvConfiguredMarketAssets('europe');
    expect(europe.length).toBe(20);
    for (const asset of europe) expect(tvWorldStockIdentity(asset), asset.symbol).toMatchObject({ symbol: asset.symbol, currency: asset.currency });
  });

  it('adds world indices that each carry an exact external index identity and a points unit', () => {
    const indices = tvAssetsAll('global');
    expect(indices.length).toBe(23);
    for (const index of indices) {
      expect(isTvExternalIndex(index.symbol), index.symbol).toBe(true);
      expect(tvSceneQuoteUnit({ symbol: index.symbol, currency: null } as never, 'en')).toBe(tvSceneQuoteUnit({ symbol: '^GSPC', currency: null } as never, 'en'));
    }
  });

  it('adds USD-quoted continuous futures only', () => {
    expect(TV_COMMODITIES.length).toBe(11);
    for (const item of TV_COMMODITIES) expect(tvCommodityIdentity({ ...item, assetType: 'commodity' })).not.toBeNull();
  });

  it('keeps the broadcast scenes on their fixed layouts', () => {
    expect(tvSceneAssets('world').rows).toHaveLength(6);
    expect(tvSceneAssets('assets').summary).toHaveLength(4);
    expect(tvSceneAssets('overview').summary).toHaveLength(6);
  });
});

describe('verified alternative first', () => {
  it('serves a Saudi listing from Yahoo without spending Twelve Data credits', async () => {
    const observed = Date.parse('2026-11-19T12:18:00Z');
    fetchHistory.mockResolvedValue({ success: true, providerSymbol: '2280.SR', retrievedAt: new Date(now).toISOString(), currency: 'SAR', history: [],
      quoteSnapshot: { symbol: '2280.SR', assetType: 'EQUITY', exchangeCode: 'SAU', currency: 'SAR', price: 43.7, previousClose: 43.5,
        marketTime: new Date(observed).toISOString(), regularSession: { start: observed - 18_000_000, end: observed - 600_000 } } });
    const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
    const almarai = tvConfiguredMarketAssets('TADAWUL').find(asset => asset.symbol === '2280.SR')!;
    const [quote] = await resolveTvQuotes([almarai], 'gulf');
    expect(quote).toMatchObject({ symbol: '2280.SR', price: 43.7, currency: 'SAR', source: 'Yahoo Finance' });
    expect(providerQuote).not.toHaveBeenCalled();
    expect(sfmQuote).not.toHaveBeenCalled();
  });

  it('still asks Twelve Data when the alternative cannot verify the listing', async () => {
    fetchHistory.mockResolvedValue({ success: false, unavailableReason: 'provider_returned_empty' });
    providerQuote.mockResolvedValue({ price: null, issue: 'rate_limited' });
    sfmQuote.mockResolvedValue(null);
    const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
    await resolveTvQuotes([tvConfiguredMarketAssets('QSE').find(asset => asset.symbol === 'MARK.QA')!], 'gulf');
    expect(providerQuote).toHaveBeenCalled();
  });

  it('serves an added index from Yahoo first, and keeps the original six on their primary chain', async () => {
    const observed = Date.parse('2026-11-20T09:43:00Z');
    fetchHistory.mockImplementation(async (symbol: string) => ({ success: true, providerSymbol: symbol, retrievedAt: new Date(now).toISOString(),
      currency: symbol === '^FCHI' ? 'EUR' : 'USD', history: [],
      quoteSnapshot: { symbol, assetType: 'INDEX', currency: symbol === '^FCHI' ? 'EUR' : 'USD', price: 7976.24, previousClose: 7950,
        marketTime: new Date(observed).toISOString(), name: symbol, exchange: 'PAR' } }));
    sfmQuote.mockResolvedValue(null);
    const { resolveTvQuotes } = await import('@/lib/server/markets-tv/quoteLoader');
    const cac = tvAssetsAll('global').find(index => index.symbol === '^FCHI')!;
    const [quote] = await resolveTvQuotes([{ ...cac, assetType: 'index' }], 'global');
    expect(quote).toMatchObject({ symbol: '^FCHI', price: 7976.24, source: 'Yahoo Finance', name: 'CAC 40', nameAr: 'كاك 40' });
    expect(sfmQuote).not.toHaveBeenCalled();
    await resolveTvQuotes([{ symbol: '^GSPC', name: 'S&P 500', assetType: 'index' }], 'global');
    expect(sfmQuote).toHaveBeenCalled();
  });
});

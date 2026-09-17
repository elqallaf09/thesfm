import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { isSupportedWorldStockRegion, WORLD_STOCK_REGIONS } from '@/lib/world-stocks/regions';
import { marketSearchItemToWorldStock } from '@/lib/world-stocks/normalize';
import { searchWorldStocks } from '@/lib/world-stocks/search';

function item(overrides: Partial<MarketSearchItem> = {}): MarketSearchItem {
  return {
    symbol: 'ABC',
    name: 'ABC Corp',
    assetType: 'stock',
    exchange: 'US',
    country: 'US',
    currency: 'USD',
    ...overrides,
  };
}

describe('World Stocks region truth table', () => {
  it('supports only exchanges with a real bundled or dynamic-official data pipeline', () => {
    const ids = WORLD_STOCK_REGIONS.map(region => region.id).sort();
    expect(ids).toEqual(['BOURSA_KUWAIT', 'DFM', 'NASDAQ_DUBAI', 'US']);
  });

  it('rejects every exchange whose coverage is requires_sync', () => {
    for (const unsupported of ['TADAWUL', 'ADX', 'QSE', 'BAHRAIN_BOURSE', 'MUSCAT']) {
      expect(isSupportedWorldStockRegion(unsupported)).toBe(false);
    }
  });

  it('accepts every exchange with real coverage', () => {
    for (const supported of ['BOURSA_KUWAIT', 'DFM', 'NASDAQ_DUBAI', 'US']) {
      expect(isSupportedWorldStockRegion(supported)).toBe(true);
    }
  });
});

describe('marketSearchItemToWorldStock', () => {
  it('normalizes a real stock result and never fabricates sector, industry, or market cap', () => {
    const stock = marketSearchItemToWorldStock(item(), 'en');
    expect(stock).not.toBeNull();
    expect(stock?.sector).toBeNull();
    expect(stock?.industry).toBeNull();
    expect(stock?.marketCap).toBeNull();
  });

  it('marks an unfetched quote as not_fetched, never unavailable (unavailable means a fetch was actually attempted and failed)', () => {
    const stock = marketSearchItemToWorldStock(item(), 'en');
    expect(stock?.quoteStatus).toBe('not_fetched');
    expect(stock?.price).toBeNull();
  });

  it('excludes non-equity asset classes -- this is an equities/ETF explorer, not an all-asset search', () => {
    expect(marketSearchItemToWorldStock(item({ assetType: 'crypto' }), 'en')).toBeNull();
    expect(marketSearchItemToWorldStock(item({ assetType: 'forex' }), 'en')).toBeNull();
    expect(marketSearchItemToWorldStock(item({ assetType: 'commodity' }), 'en')).toBeNull();
    expect(marketSearchItemToWorldStock(item({ assetType: 'index' }), 'en')).toBeNull();
  });

  it('accepts stock and etf', () => {
    expect(marketSearchItemToWorldStock(item({ assetType: 'stock' }), 'en')?.assetType).toBe('stock');
    expect(marketSearchItemToWorldStock(item({ assetType: 'etf' }), 'en')?.assetType).toBe('etf');
  });

  it('localizes the country name only through a verified mapping, never guessed from the code', () => {
    expect(marketSearchItemToWorldStock(item({ country: 'KW' }), 'ar')?.countryName).toBe('الكويت');
    expect(marketSearchItemToWorldStock(item({ country: 'KW' }), 'fr')?.countryName).toBe('Koweït');
    // An unmapped country code is passed through verbatim, not silently dropped or invented.
    expect(marketSearchItemToWorldStock(item({ country: 'ZZ' }), 'en')?.countryName).toBe('ZZ');
  });
});

describe('searchWorldStocks (region-scoped, in-memory, no network)', () => {
  it('paginates the real Boursa Kuwait bundled catalog without overlap', async () => {
    const pageOne = await searchWorldStocks({ query: '', region: 'BOURSA_KUWAIT', assetType: null, page: 1, pageSize: 5, locale: 'en' });
    const pageTwo = await searchWorldStocks({ query: '', region: 'BOURSA_KUWAIT', assetType: null, page: 2, pageSize: 5, locale: 'en' });

    expect(pageOne.results.length).toBeGreaterThan(0);
    expect(pageOne.totalCount).toBeGreaterThan(5);
    const pageOneSymbols = new Set(pageOne.results.map(stock => stock.canonicalSymbol));
    const overlap = pageTwo.results.filter(stock => pageOneSymbols.has(stock.canonicalSymbol));
    expect(overlap).toHaveLength(0);
  });

  it('never returns a result outside the requested region', async () => {
    const { results } = await searchWorldStocks({ query: '', region: 'DFM', assetType: null, page: 1, pageSize: 25, locale: 'en' });
    expect(results.length).toBeGreaterThan(0);
    for (const stock of results) {
      expect(['DFM']).toContain(stock.region);
    }
  });
});

describe('fetchWorldStockQuotes', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/market/marketDataProviders');
    vi.resetModules();
  });

  it('deduplicates by canonical symbol before fetching', async () => {
    vi.doMock('@/lib/market/marketDataProviders', () => ({
      getQuoteWithFallback: vi.fn(async () => ({ ok: false, attempts: [], latestError: 'not_configured' })),
    }));
    const { fetchWorldStockQuotes: fetchDeduped } = await import('@/lib/world-stocks/quotes');
    const { getQuoteWithFallback } = await import('@/lib/market/marketDataProviders');

    await fetchDeduped([
      { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', exchangeCode: 'US', assetType: 'stock', currency: 'USD' },
      { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', exchangeCode: 'US', assetType: 'stock', currency: 'USD' },
    ]);

    expect(vi.mocked(getQuoteWithFallback)).toHaveBeenCalledTimes(1);
  });

  it('marks quoteStatus unavailable (never a fabricated price) when every provider fails, and flags partialFailure', async () => {
    vi.doMock('@/lib/market/marketDataProviders', () => ({
      getQuoteWithFallback: vi.fn(async () => ({ ok: false, attempts: [], latestError: 'not_configured' })),
    }));
    const { fetchWorldStockQuotes: fetchFailing } = await import('@/lib/world-stocks/quotes');

    const { quotes, partialFailure } = await fetchFailing([
      { canonicalSymbol: 'ZZZZ', providerSymbol: 'ZZZZ', exchangeCode: 'US', assetType: 'stock', currency: 'USD' },
    ]);
    expect(partialFailure).toBe(true);
    expect(quotes.ZZZZ.status).toBe('unavailable');
    expect(quotes.ZZZZ.price).toBeNull();
  });
});

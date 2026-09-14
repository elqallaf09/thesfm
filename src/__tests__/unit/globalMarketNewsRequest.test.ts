import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { EMPTY_NEWS_FILTERS, globalMarketNewsRequest } from '@/lib/market/globalMarketNewsRequest';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { GET } from '@/app/api/market-news/route';

vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: vi.fn() }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('@/lib/translation/translateNewsText', () => ({
  normalizeNewsLanguage: (lang: string) => lang,
  isNewsTranslationEnabled: () => false,
}));

describe('Global Markets news UI to API contract', () => {
  beforeEach(() => {
    vi.mocked(aggregateFinancialNews).mockReset();
    vi.mocked(aggregateFinancialNews).mockResolvedValue({
      stories: [], total: 0, page: 1, pageSize: 24, totalPages: 1,
      appliedFilters: {}, providerCoverage: [], partialFailure: false,
      liveUpdatesAvailable: true, storedFallbackUsed: false,
      lastUpdated: null, lastSuccessfulUpdate: null, cacheStatus: 'miss',
      searchDurationMs: 0, warnings: [],
    });
  });

  it('passes the selected exchange, source, company and language through the real API parser', async () => {
    const path = globalMarketNewsRequest('en', 'kuwait_boursa', {
      ...EMPTY_NEWS_FILTERS, country: 'US', exchange: 'NASDAQ', symbol: 'aapl',
      source: 'QA Source', language: 'fr', asset: 'stock',
    });
    const response = await GET(new NextRequest(`https://example.com${path}`));
    expect(response.status).toBe(200);
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({
      countries: ['US'], exchangeCodes: ['NASDAQ'], symbols: ['AAPL'],
      sourceNames: ['QA Source'], languages: ['fr'], assetTypes: ['equity'],
    }), expect.any(Object));
    expect(new URL(path, 'https://example.com').searchParams.has('marketIds')).toBe(false);
  });

  it('filters a region by its supported countries rather than an unrecognized market code', async () => {
    const path = globalMarketNewsRequest('ar', '', { ...EMPTY_NEWS_FILTERS, region: 'NORTH_AMERICA' });
    await GET(new NextRequest(`https://example.com${path}`));
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({
      countries: ['US', 'CA'], marketCodes: [],
    }), expect.any(Object));
  });

  it('keeps automatic selections and global manual coverage distinct', () => {
    const automatic = new URL(globalMarketNewsRequest('ar', 'kuwait_boursa,us_nasdaq', null), 'https://example.com');
    expect(automatic.searchParams.get('marketIds')).toBe('kuwait_boursa,us_nasdaq');
    const global = new URL(globalMarketNewsRequest('ar', 'kuwait_boursa', { ...EMPTY_NEWS_FILTERS, region: 'GLOBAL' }), 'https://example.com');
    expect(global.searchParams.has('marketIds')).toBe(false);
    expect(global.searchParams.has('countries')).toBe(false);
  });

  it('passes the forex choice to the API as currency news', async () => {
    const path = globalMarketNewsRequest('en', '', { ...EMPTY_NEWS_FILTERS, asset: 'forex' });
    await GET(new NextRequest(`https://example.com${path}`));
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({ assetTypes: ['currency'] }), expect.any(Object));
  });
});

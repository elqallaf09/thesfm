import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { aggregateFinancialNews, type FinancialNewsAggregationResult } from '@/lib/market-news/engine';
import { GET } from '@/app/api/market-news/route';

vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: vi.fn() }));
vi.mock('@/lib/translation/translateNewsText', () => ({
  isNewsTranslationEnabled: () => false,
  normalizeNewsLanguage: () => 'en',
  translateNewsItems: vi.fn(),
}));
vi.mock('@/lib/server/rateLimiter', () => ({
  rateLimitRequest: () => null, checkRateLimit: () => true, getClientIp: () => '127.0.0.1',
}));

function emptyAggregation(): FinancialNewsAggregationResult {
  return {
    stories: [], total: 0, page: 1, pageSize: 6, totalPages: 1, appliedFilters: {},
    providerCoverage: [], partialFailure: false, liveUpdatesAvailable: true, storedFallbackUsed: false,
    lastUpdated: null, lastSuccessfulUpdate: null, cacheStatus: 'miss', searchDurationMs: 0, warnings: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(aggregateFinancialNews).mockResolvedValue(emptyAggregation());
});

describe('terminal news market compatibility at the HTTP boundary', () => {
  it.each(['market', 'markets', 'marketCode', 'selectedMarket'])('normalizes the terminal US id from %s without dropping the symbol filter', async key => {
    const response = await GET(new NextRequest(`https://example.test/api/market-news?scope=asset&symbols=msft&${key}=us-stocks&limit=6`));
    expect(response.status).toBe(200);
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({
      marketCodes: ['US'], symbols: ['MSFT'], strictEntityFilter: true,
    }), expect.objectContaining({ pageSize: 6 }));
  });

  it('deduplicates an alias and canonical code and preserves other market constraints', async () => {
    await GET(new NextRequest('https://example.test/api/market-news?scope=asset&symbols=BRK.B&markets=US-STOCKS,US,KW,CN'));
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({
      marketCodes: ['US', 'KW', 'CN'], symbols: ['BRK.B'], strictEntityFilter: true,
    }), expect.any(Object));
  });

  it('does not turn an unknown requested market into an unrestricted request', async () => {
    await GET(new NextRequest('https://example.test/api/market-news?scope=asset&symbols=MSFT&market=unknown-exchange'));
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.objectContaining({
      marketCodes: ['unknown-exchange'], symbols: ['MSFT'], strictEntityFilter: true,
    }), expect.any(Object));
  });

  it('uses the default page size and does not claim untranslated stories are translated', async () => {
    const story = { id: 'story', title: 'Original title', summary: 'Original summary', originalLanguage: 'en', supportingSources: [] };
    vi.mocked(aggregateFinancialNews).mockResolvedValue({ ...emptyAggregation(), stories: [story] } as unknown as FinancialNewsAggregationResult);
    const response = await GET(new NextRequest('https://example.test/api/market-news?lang=ar'));
    const body = await response.json();
    expect(body.items[0].translated).toBe(false);
    expect(body.items[0].titleOriginal).toBe('Original title');
    expect(aggregateFinancialNews).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ pageSize: 24 }));
  });

  it('still rejects an asset request without a symbol', async () => {
    const response = await GET(new NextRequest('https://example.test/api/market-news?scope=asset&market=us-stocks'));
    expect(response.status).toBe(400);
    expect(aggregateFinancialNews).not.toHaveBeenCalled();
  });
});

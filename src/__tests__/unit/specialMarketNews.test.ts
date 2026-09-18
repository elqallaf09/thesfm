import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TOPICS } from '@/lib/market-news/specialTopics';
import { cleanTopic, matchesTopic } from '@/lib/market-news/specialMatching';
import { verifiedUnderOne } from '@/lib/market-news/specialQuotes';
import { companyHint, explicitUsSymbols, matchedUsEquity } from '@/lib/market-news/specialSymbols';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';

const mocked = vi.hoisted(() => ({ aggregate: vi.fn(), quotes: vi.fn(), translate: vi.fn() }));
vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: mocked.aggregate }));
vi.mock('@/lib/market-news/specialProviders', () => ({ createSpecialNewsProviders: () => [] }));
vi.mock('@/lib/market-news/specialQuotes', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/market-news/specialQuotes')>(),
  fetchSpecialQuotes: mocked.quotes,
}));
vi.mock('@/lib/translation/translateNewsText', () => ({
  normalizeNewsLanguage: (value: string) => value || 'ar',
  isNewsTranslationEnabled: () => true,
  translateNewsItems: mocked.translate,
}));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { GET } from '@/app/api/market/special-news/route';

function story(title: string, extra: Partial<ConsolidatedNewsStory> = {}) {
  return {
    id: 'article-1', title, summary: '', companyNames: [], sectors: [], industries: [],
    symbols: [], eventType: 'unknown', publishedAt: new Date().toISOString(),
    sourceName: 'Reuters', originalLanguage: 'en', originalUrl: 'https://www.reuters.com/markets/example',
    ...extra,
  } as ConsolidatedNewsStory;
}
function request(params: string) { return new NextRequest(`https://www.the-sfm.com/api/market/special-news?${params}`); }

beforeEach(() => { vi.clearAllMocks(); mocked.quotes.mockResolvedValue(new Map()); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('special news data and independent quotes', () => {
  it('resolves only explicit symbols or an unambiguous exact US equity company name', () => {
    expect(explicitUsSymbols('Example (NASDAQ: EXMP) receives a bid-price notice')).toEqual(['EXMP']);
    expect(explicitUsSymbols('The CEO discussed FDA and EPS updates')).toEqual([]);
    expect(companyHint('Example Global Limited Announces Receipt of Nasdaq Notification')).toBe('Example Global Limited');
    expect(companyHint('Best Penny Stocks to Buy')).toBeNull();
    const quote = { symbol: 'EXMP', longname: 'Example Global Limited', quoteType: 'EQUITY', exchange: 'NCM' };
    expect(matchedUsEquity('Example Global Limited', [quote])).toBe('EXMP');
    expect(matchedUsEquity('Another Company', [quote])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [{ ...quote, exchange: 'TOR' }])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [{ ...quote, quoteType: 'ETF' }])).toBeNull();
    expect(matchedUsEquity('Example Global Limited', [quote, { ...quote, symbol: 'EXMPB' }])).toBeNull();
  });
  it('returns relevant articles before quote or translation providers finish', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [story('Apple quarterly earnings exceed expectations', { symbols: ['AAPL'] })],
      liveUpdatesAvailable: true, lastSuccessfulUpdate: '2026-09-18T12:00:00.000Z',
    });
    const response = await GET(request('topic=earnings-news&lang=ar'));
    const payload = await response.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.tickerItems[0].symbol).toBe('AAPL');
    expect(payload.updatedAt).toBe('2026-09-18T12:00:00.000Z');
    expect(mocked.quotes).not.toHaveBeenCalled();
    expect(mocked.translate).not.toHaveBeenCalled();
  });

  it('loads a sector ticker even when news providers are unavailable', async () => {
    mocked.aggregate.mockRejectedValue(new Error('news offline'));
    const response = await GET(request('topic=healthcare-stocks&part=ticker'));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.tickerItems.map((item: { symbol: string }) => item.symbol)).toContain('LLY');
    expect(mocked.aggregate).not.toHaveBeenCalled();
  });

  it('does not label a hardcoded watchlist as current IPO or merger news', async () => {
    for (const topic of ['new-stocks', 'mergers-acquisitions-news', 'unusual-moves-news']) {
      const payload = await (await GET(request(`topic=${topic}&part=ticker`))).json();
      expect(payload.tickerItems).toEqual([]);
    }
  });

  it('uses explicit OR alternatives and accepts Arabic topic evidence', () => {
    for (const topic of Object.values(TOPICS)) expect(topic.query).toContain(' OR ');
    expect(matchesTopic('earnings-news', story('ارتفاع أرباح شركة أبل'))).toBe(true);
    expect(matchesTopic('unusual-moves-news', story('Nvidia shares surges after results'))).toBe(true);
    expect(matchesTopic('mergers-acquisitions-news', story('Retailer launches a discount offer'))).toBe(false);
    expect(matchesTopic('metals-news', story('Oil price jumps', { eventType: 'commodity_price_event' }))).toBe(false);
    expect(cleanTopic('__proto__')).toBeNull();
  });

  it('requires fresh USD equity evidence for the under-$1 classification', () => {
    const quote = {
      symbol: 'EXAMPLE', price: 0.5, currency: 'USD', assetType: 'EQUITY', available: true,
      asOf: new Date().toISOString(), change: null, changePercent: null,
      source: 'Yahoo Finance' as const, delayed: true as const,
    };
    expect(verifiedUnderOne(quote)).toBe(true);
    expect(verifiedUnderOne({ ...quote, currency: 'CAD' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, assetType: 'CRYPTOCURRENCY' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, asOf: '2020-01-01T00:00:00Z' })).toBe(false);
    expect(verifiedUnderOne({ ...quote, asOf: null })).toBe(false);
    expect(verifiedUnderOne({ ...quote, price: 1 })).toBe(false);
  });

  it('returns an under-$1 story after resolving its named company and verifying its quote', async () => {
    mocked.aggregate.mockResolvedValue({
      stories: [story('Example Global Limited Receives Nasdaq Minimum Bid Price Deficiency Notice')],
      liveUpdatesAvailable: true,
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ quotes: [
      { symbol: 'EXMP', longname: 'Example Global Limited', quoteType: 'EQUITY', exchange: 'NCM' },
    ] }), { status: 200 }));
    mocked.quotes.mockResolvedValue(new Map([['EXMP', {
      symbol: 'EXMP', available: true, currency: 'USD', assetType: 'EQUITY', price: 0.5,
      asOf: new Date().toISOString(), source: 'Yahoo Finance',
    }]]));
    const payload = await (await GET(request('topic=stocks-under-1'))).json();
    expect(mocked.quotes).toHaveBeenCalledWith(['EXMP']);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ ticker: 'EXMP', price: 0.5, priceVerified: true });
  });
});

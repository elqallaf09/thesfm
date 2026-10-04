import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ admin: vi.fn(), quotes: vi.fn(), news: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/market/fetchStockPrices', () => ({ fetchStockPrices: mocks.quotes }));
vi.mock('@/lib/market/fetchStockCategoryNews', () => ({ fetchStockCategoryNews: mocks.news }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));

import { GET as tickerGET } from '@/app/api/sharia-stocks/ticker/route';
import { GET as newsGET } from '@/app/api/sharia-stocks/news/route';
import { SHARIAH_UNIVERSE } from '@/lib/market/shariahUniverse';
import type { CatalogRow } from '@/lib/sharia-research/publicCatalog';

const now = new Date('2026-10-04T09:00:00Z');
type RouteItem = { symbol?: string; ticker?: string; shariahStatus: string; screeningSource: string | null;
  canonicalSecurityId?: string | null; price?: number | null; available?: boolean;
  publishedShariahReference?: { source: string }; sourceConflict?: { kind: string } };

function catalog(rows: CatalogRow[] = []) {
  const query = { select: () => query, eq: () => query, in: () => query,
    order: () => query, range: async () => ({ data: rows, error: null }) };
  mocks.admin.mockReturnValue({ from: () => query });
}

function article(overrides: Record<string, unknown> = {}) {
  return { id: 'test-story', title: 'Issuer news', summary: 'Test fixture', source: 'Fixture publisher',
    url: 'https://example.com/issuer-news', publishedAt: now.toISOString(), companyName: 'Apple', ticker: 'AAPL',
    sector: 'technology', sectors: ['technology'], exchangeCodes: ['NASDAQ'], marketCodes: ['US'],
    price: null, change: null, changePercent: null, priceSource: null, delayed: true,
    ...overrides };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); vi.resetAllMocks();
  catalog(); mocks.quotes.mockResolvedValue(new Map());
  mocks.news.mockResolvedValue({ success: true, items: [article()] });
});
afterEach(() => { vi.useRealTimers(); });

describe('Shariah ticker and news share the reviewed publication decision', () => {
  it('keeps all ticker cards and source provenance when market quotes fail', async () => {
    mocks.quotes.mockRejectedValue(new Error('quote provider unavailable'));
    const response = await tickerGET();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.code).toBe('SHARIAH_TICKER_DEGRADED');
    expect(payload.screeningSourceConnected).toBe(true);
    expect(payload.items).toHaveLength(SHARIAH_UNIVERSE.length);
    expect(payload.available_count).toBe(0);
    const apple = (payload.items as RouteItem[]).find(item => item.symbol === 'AAPL');
    expect(apple).toMatchObject({ shariahStatus: 'compliant', screeningSource: 'Boubyan Capital',
      canonicalSecurityId: 'NASDAQ:AAPL', available: false, price: null });
    expect(apple?.publishedShariahReference?.source).toBe('BOUBYAN');
  });

  it('preserves the same documented manual override in ticker and related news', async () => {
    catalog([{ symbol: 'AAPL', provider_symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', exchange: 'NASDAQ', country: 'US',
      shariah_status: 'non_compliant', shariah_source: 'Manual review', shariah_reason: 'Explicit documented restriction',
      shariah_manual_override: true, shariah_last_reviewed_at: '2026-09-01T00:00:00Z' }]);
    const ticker = await (await tickerGET()).json();
    const news = await (await newsGET(new Request('https://example.com/api/sharia-stocks/news'))).json();
    const tickerApple = (ticker.items as RouteItem[]).find(item => item.symbol === 'AAPL');
    const newsApple = (news.items as RouteItem[])[0];
    expect(tickerApple?.shariahStatus).toBe('non_compliant');
    expect(newsApple.shariahStatus).toBe(tickerApple?.shariahStatus);
    expect(newsApple.screeningSource).toBe('Manual review');
    expect(newsApple.sourceConflict?.kind).toBe('manual_override');
  });

  it('does not assign a designation to another issuer or a conflicting exchange', async () => {
    mocks.news.mockResolvedValue({ success: true, items: [article(),
      article({ id: 'unrelated', companyName: 'An unrelated issuer' }),
      article({ id: 'wrong-venue', exchangeCodes: ['NYSE'] }),
      article({ id: 'unknown', ticker: 'UNVERIFIED', shariaStatus: 'non_compliant' })] });
    const payload = await (await newsGET(new Request('https://example.com/api/sharia-stocks/news'))).json();
    const items = payload.items as RouteItem[];
    expect(items[0].shariahStatus).toBe('compliant');
    for (const item of items.slice(1)) {
      expect(item.shariahStatus).toBe('unclassified');
      expect(item.screeningSource).toBeNull();
      expect(item.canonicalSecurityId).toBeNull();
    }
  });

  it('separates a news-provider failure from the available Shariah reference', async () => {
    mocks.news.mockRejectedValue(new Error('news provider unavailable'));
    const response = await newsGET(new Request('https://example.com/api/sharia-stocks/news'));
    const payload = await response.json();
    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.screeningSourceConnected).toBe(true);
    expect(payload.screeningReference.sourceAvailable).toBe(true);
  });

  it('returns quarterly review due rather than perpetually current list membership', async () => {
    vi.setSystemTime(new Date('2027-01-05T09:00:00Z'));
    const payload = await (await newsGET(new Request('https://example.com/api/sharia-stocks/news'))).json();
    expect((payload.items as RouteItem[])[0].shariahStatus).toBe('needs_review');
    expect(payload.screeningReference).toMatchObject({ sourceAvailable: true, reviewDue: true });
  });
});

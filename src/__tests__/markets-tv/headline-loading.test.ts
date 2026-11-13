import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ news: vi.fn(), prices: vi.fn(), translate: vi.fn(), scan: vi.fn() }));
vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: mocks.news }));
vi.mock('@/lib/market/fetchStockPrices', () => ({ fetchStockPrices: mocks.prices }));
vi.mock('@/lib/market/stockCategoryScanner', () => ({ screenStockCategory: mocks.scan }));
vi.mock('@/lib/translation/translateNewsText', () => ({ normalizeNewsLanguage: () => 'ar', isNewsTranslationEnabled: () => true, translateNewsItems: mocks.translate }));
import { fetchStockCategoryNews } from '@/lib/market/fetchStockCategoryNews';
beforeEach(() => {
  vi.clearAllMocks(); mocks.news.mockResolvedValue({ stories: [], providerCoverage: [], liveUpdatesAvailable: true });
  mocks.scan.mockResolvedValue({ items: [], matchedCount: 0, universeCount: 0 });
  mocks.prices.mockResolvedValue(new Map()); mocks.translate.mockImplementation(async value => value);
});
describe('headline first TV requests', () => {
  it('does not wait for stock prices or bulk translation, while retaining scanner scope', async () => {
    mocks.prices.mockImplementation(() => new Promise(() => {})); mocks.translate.mockImplementation(() => new Promise(() => {}));
    const schedule = vi.fn(); const payload = await fetchStockCategoryNews('banking', 'ar', { headlinesOnly: true, schedulePersistence: schedule });
    expect(payload.category).toBe('banking'); expect(payload.prices).toEqual([]);
    expect(mocks.scan).toHaveBeenCalledWith('banking', expect.anything());
    expect(mocks.prices).not.toHaveBeenCalled(); expect(mocks.translate).not.toHaveBeenCalled();
    expect(mocks.news.mock.calls[0][1]).toMatchObject({ providerBudgetMs: 6500, schedulePersistence: schedule });
  });
  it('preserves normal website price and translation behavior', async () => {
    await fetchStockCategoryNews('energy', 'ar');
    expect(mocks.prices).toHaveBeenCalledTimes(1); expect(mocks.translate).toHaveBeenCalledTimes(1);
    expect(mocks.news.mock.calls[0][1]).not.toHaveProperty('providerBudgetMs');
  });
  it('keeps the configured Sharia universe without an unrelated price scanner', async () => {
    const payload = await fetchStockCategoryNews('sharia', 'ar', { headlinesOnly: true });
    expect(payload.scannerMode).toBe('configured_sharia_news_universe');
    expect(mocks.scan).not.toHaveBeenCalled(); expect(mocks.news.mock.calls[0][0].symbols.length).toBeGreaterThan(0);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ aggregate: vi.fn(), cache: vi.fn() }));
vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: mocks.aggregate }));
vi.mock('@/lib/server/markets-tv/newsCache', () => ({ cachedTvNews: mocks.cache }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { GET } from '@/app/api/tv/news/route';

beforeEach(() => {
  mocks.aggregate.mockReset().mockResolvedValue({ stories: [] });
  mocks.cache.mockReset().mockImplementation(async (_language, load) => ({ stories: await load(), generatedAt: '2026-11-07T00:00:00Z' }));
});
describe('TV receiver news endpoint', () => {
  it('rejects unsupported scopes before provider work', async () => {
    expect((await GET(new Request('https://example.com/api/tv/news?channel=constructor'))).status).toBe(400);
    expect(mocks.cache).not.toHaveBeenCalled(); expect(mocks.aggregate).not.toHaveBeenCalled();
  });
  it('forwards the selected scope to both cache and source filters without general fallback', async () => {
    const response = await GET(new Request('https://example.com/api/tv/news?channel=kuwait&language=ar'));
    expect(response.status).toBe(200);
    expect(mocks.cache.mock.calls[0][2]).toBe('kuwait');
    expect(mocks.aggregate.mock.calls[0][0]).toMatchObject({ countries: ['KW'], exchangeCodes: ['Boursa Kuwait'] });
    expect(mocks.aggregate).toHaveBeenCalledTimes(1);
    expect((await response.json()).stories).toEqual([]);
  });
});

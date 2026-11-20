import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ aggregate: vi.fn(), cache: vi.fn(), resolveImage: vi.fn() }));
vi.mock('@/lib/server/markets-tv/newsPhoto', () => ({ resolvePublisherArticlePhoto: mocks.resolveImage }));
vi.mock('@/lib/market-news/engine', () => ({ aggregateFinancialNews: mocks.aggregate }));
vi.mock('@/lib/server/markets-tv/newsCache', () => ({ cachedTvNews: mocks.cache }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { GET } from '@/app/api/tv/news/route';

beforeEach(() => {
  mocks.resolveImage.mockReset().mockResolvedValue(null);
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
    expect(await response.json()).toMatchObject({ channel: 'kuwait', stories: [] });
  });
  it('keeps qualified original-language technology headlines available in an Arabic interface', async () => {
    mocks.aggregate.mockResolvedValue({ stories: [{ id: 'tech', title: 'Technology company earnings', sourceName: 'QA source', originalLanguage: 'en', originalUrl: 'https://example.com/tech', publishedAt: '2026-11-07T00:00:00Z' }] });
    const response = await GET(new Request('https://example.com/api/tv/news?channel=technology&language=ar'));
    const params = mocks.aggregate.mock.calls[0][0];
    expect(params.strictEntityFilter).toBe(true);
    expect(params.languages).toBeUndefined(); expect(params.query).toBeUndefined();
    expect(await response.json()).toMatchObject({ channel: 'technology', stories: [{ title: 'Technology company earnings', source: 'QA source' }] });
  });
  it('recovers missing article photos from publisher metadata', async () => {
    mocks.resolveImage.mockResolvedValue('https://cdn.example.com/photo.jpg');
    mocks.aggregate.mockResolvedValue({ stories: [{ id: 'a', title: 'News', sourceName: 'Publisher', originalUrl: 'https://example.com/article', publishedAt: '2026-11-07T00:00:00Z' }] });
    const response = await GET(new Request('https://example.com/api/tv/news?channel=technology'));
    expect((await response.json()).stories[0].imageUrl).toBe('https://cdn.example.com/photo.jpg');
    expect(mocks.resolveImage).toHaveBeenCalledWith('https://example.com/article');
  });
  it.each(['all', 'technology', 'kuwait'])('preserves safe provider photos in the %s feed and keeps imageless articles', async channel => {
    const sourceStory = { id: 'photo', title: 'Market update', sourceName: 'QA source', originalUrl: 'https://example.com/story', publishedAt: '2026-11-07T00:00:00Z' };
    const imageUrl = 'https://images.example.com/market.jpg';
    mocks.aggregate.mockResolvedValue({ stories: [
      { ...sourceStory, imageUrl },
      { ...sourceStory, id: 'missing', imageUrl: null },
      { ...sourceStory, id: 'invalid', imageUrl: 'javascript:alert(1)' },
      { ...sourceStory, id: 'credentials', imageUrl: 'https://user:password@images.example.com/market.jpg' },
    ] });
    const response = await GET(new Request(`https://example.com/api/tv/news?channel=${channel}`));
    const data = await response.json();
    expect(data.channel).toBe(channel);
    expect(data.stories).toHaveLength(4);
    expect(data.stories[0]).toEqual({ id: 'photo', title: sourceStory.title, source: sourceStory.sourceName, publishedAt: sourceStory.publishedAt, url: sourceStory.originalUrl, imageUrl });
    for (const item of data.stories.slice(1)) expect(item).not.toHaveProperty('imageUrl');
  });
});

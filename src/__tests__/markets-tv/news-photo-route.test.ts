import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/tv/news/photo/[id]/route';

const { admin, resolve, limited } = vi.hoisted(() => ({ admin: vi.fn(), resolve: vi.fn(), limited: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: admin }));
vi.mock('@/lib/server/markets-tv/newsPhoto', () => ({ resolvePublisherArticlePhoto: resolve }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: limited }));

const id = 'story-0123456789abcdef01234567';
const article = 'https://publisher.example/news/report';
const photo = 'https://images.example/real-photo.jpg';
const read = (key: string) => GET(new Request('https://site.example/api/tv/news/photo/' + key + '?url=https://other.example'), { params: Promise.resolve({ id: key }) });
const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
const from = vi.fn(() => query);
beforeEach(() => {
  vi.clearAllMocks();
  admin.mockReturnValue({ from });
  query.maybeSingle.mockResolvedValue({ data: { articleUrl: article }, error: null });
  resolve.mockResolvedValue(photo);
  limited.mockReturnValue(null);
});

describe('TV news photo lookup', () => {
  it('looks up the published story by ID and caches its verified publisher redirect', async () => {
    const response = await read(id);
    expect(from).toHaveBeenCalledWith('market_news_story_clusters');
    expect(query.eq.mock.calls).toEqual([['id', id], ['is_published', true]]);
    expect(resolve).toHaveBeenCalledWith(article);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(photo);
    expect(response.headers.get('cache-control')).toContain('s-maxage=');
  });
  it('rejects unrelated IDs and respects the rate limit before any storage or network work', async () => {
    expect((await read('not-a-story')).status).toBe(404);
    limited.mockReturnValueOnce(new Response(null, { status: 429 }));
    expect((await read(id)).status).toBe(429);
    expect(admin).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
  });
  it('keeps missing articles and missing photos separate from temporary storage failures', async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await read(id)).status).toBe(404);
    expect(resolve).not.toHaveBeenCalled();
    resolve.mockResolvedValueOnce(null);
    expect((await read(id)).status).toBe(404);
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'temporary' } });
    const response = await read(id);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

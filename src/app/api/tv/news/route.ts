import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { resolvePublisherArticlePhoto } from '@/lib/server/markets-tv/newsPhoto';
import { tvNewsPhotoUrl } from '@/lib/markets-tv/newsPhoto';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
import { cachedTvNews } from '@/lib/server/markets-tv/newsCache';
import { tvNewsParams } from '@/lib/server/markets-tv/newsChannels';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-news', max: 20 });
  if (limit) return limit;
  const params = new URL(request.url).searchParams;
  const input = params.get('language');
  const language = input === 'en' || input === 'fr' ? input : 'ar';
  const channel = params.get('channel') || 'all';
  if (channel !== 'all' && channel !== 'technology' && channel !== 'kuwait') return tvJson({ code: 'INVALID_CHANNEL' }, 400);
  try {
    const snapshot = await cachedTvNews(language, async () => {
      const filters = tvNewsParams(language, channel);
      const result = await aggregateFinancialNews(filters, {
        pageSize: filters.limit, sort: 'latest', storeBudgetMs: 1500, providerBudgetMs: 6000, skipPersistence: true,
      });
      const missing = result.stories.filter(s => !tvNewsPhotoUrl(s.imageUrl) && safeTvUrl(s.originalUrl)).slice(0, 12);
      const recovered = new Map<string, string>();
      for (let offset = 0; offset < missing.length; offset += 6) {
        await Promise.all(missing.slice(offset, offset + 6).map(async story => {
          const photo = await resolvePublisherArticlePhoto(story.originalUrl);
          if (photo) recovered.set(story.id, photo);
        }));
      }
      return result.stories.flatMap(s => {
        const url = safeTvUrl(s.originalUrl);
        const imageUrl = tvNewsPhotoUrl(s.imageUrl) || recovered.get(s.id);
        return url ? [{ id: s.id, title: s.title, source: s.sourceName, publishedAt: s.publishedAt, url, ...(imageUrl ? { imageUrl } : {}) }] : [];
      });
    }, channel);
    return tvJson({ ...snapshot, channel });
  } catch { return tvJson({ code: 'NEWS_UNAVAILABLE' }, 503); }
}

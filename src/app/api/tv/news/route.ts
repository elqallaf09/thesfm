import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
import { cachedTvNews } from '@/lib/server/markets-tv/newsCache';
import { tvNewsParams } from '@/lib/server/markets-tv/newsChannels';
import { after } from 'next/server';
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
      const result = await aggregateFinancialNews(filters, { pageSize: filters.limit, sort: 'latest', providerBudgetMs: 6000,
        schedulePersistence: task => after(task) });
      return result.stories.flatMap(s => {
        const url = safeTvUrl(s.originalUrl);
        return url ? [{ id: s.id, title: s.title, source: s.sourceName, publishedAt: s.publishedAt, url }] : [];
      });
    }, channel);
    return tvJson({ ...snapshot, channel });
  } catch { return tvJson({ code: 'NEWS_UNAVAILABLE' }, 503); }
}

import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
import { cachedTvNews } from '@/lib/server/markets-tv/newsCache';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-news', max: 20 });
  if (limit) return limit;
  const input = new URL(request.url).searchParams.get('language');
  const language = input === 'en' || input === 'fr' ? input : 'ar';
  try {
    const snapshot = await cachedTvNews(language, async () => {
      const result = await aggregateFinancialNews({ language, languages: [language], limit: 8 }, { pageSize: 8, sort: 'latest', providerBudgetMs: 6000 });
      return result.stories.flatMap(s => {
        const url = safeTvUrl(s.originalUrl);
        return url ? [{ id: s.id, title: s.title, source: s.sourceName, publishedAt: s.publishedAt, url }] : [];
      });
    });
    return tvJson(snapshot);
  } catch { return tvJson({ code: 'NEWS_UNAVAILABLE' }, 503); }
}

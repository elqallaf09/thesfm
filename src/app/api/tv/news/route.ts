import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-news', max: 20 });
  if (limit) return limit;
  const input = new URL(request.url).searchParams.get('language');
  const language = input === 'en' || input === 'fr' ? input : 'ar';
  try {
    const result = await aggregateFinancialNews({ language, limit: 8 }, { pageSize: 8, sort: 'latest', providerBudgetMs: 6000 });
    return tvJson({ stories: result.stories.filter(s => safeTvUrl(s.originalUrl)).map(s => ({
      id: s.id, title: s.title, source: s.sourceName, publishedAt: s.publishedAt, url: safeTvUrl(s.originalUrl),
    })), generatedAt: new Date().toISOString() });
  } catch { return tvJson({ code: 'NEWS_UNAVAILABLE' }, 503); }
}

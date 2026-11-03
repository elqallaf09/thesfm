import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { safeTvUrl } from '@/lib/markets-tv/quotes';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { tvJson } from '@/lib/server/markets-tv/http';
import { unstable_cache } from 'next/cache';

// Every TV polls headlines; aggregate once per language for all of them
// instead of spending up to 6s of provider budget on each request.
const cachedNews = unstable_cache((language: 'ar' | 'en' | 'fr') => aggregateFinancialNews({ language, limit: 8 }, { pageSize: 8, sort: 'latest', providerBudgetMs: 6000 }),
  ['tv-news-v1'], { revalidate: 180 });
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const limit = rateLimitRequest(request, { prefix: 'tv-news', max: 20 });
  if (limit) return limit;
  const input = new URL(request.url).searchParams.get('language');
  const language = input === 'en' || input === 'fr' ? input : 'ar';
  try {
    const result = await cachedNews(language);
    return tvJson({ stories: result.stories.filter(s => safeTvUrl(s.originalUrl)).map(s => ({
      id: s.id, title: s.title, source: s.sourceName, publishedAt: s.publishedAt, url: safeTvUrl(s.originalUrl),
    })), generatedAt: new Date().toISOString() });
  } catch { return tvJson({ code: 'NEWS_UNAVAILABLE' }, 503); }
}

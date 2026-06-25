import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { europeMarketDataToApiMarkets, fetchEuropeDelayedMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';
import { parseEuropeRssFeeds } from '@/lib/europe/parseEuropeRssFeeds';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems } from '@/lib/translation/translateNewsText';
import { compactNewsItem, parseNewsLimit } from '@/lib/news/apiPayload';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'europe-news' });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const language = normalizeNewsLanguage(url.searchParams.get('lang'));
    const limit = parseNewsLimit(url.searchParams.get('limit'));
    const [newsResult, marketDataResult] = await Promise.allSettled([
      parseEuropeRssFeeds(),
      fetchEuropeDelayedMarketData(),
    ]);

    const failedFeeds = newsResult.status === 'fulfilled' ? newsResult.value.failedFeeds : [];
    if (failedFeeds.length > 0 && process.env.NODE_ENV !== 'production') {
      console.warn('[EuropeNews] Some RSS feeds failed', failedFeeds);
    }

    const rawItems = newsResult.status === 'fulfilled' ? newsResult.value.items.slice(0, limit) : [];
    const translatedItems = await translateNewsItems(rawItems, language);
    const items = translatedItems.map(item => ({
      ...compactNewsItem(item),
      market: item.market,
    }));
    const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : {};

    return NextResponse.json(
      {
        success: true,
        language,
        translationEnabled: isNewsTranslationEnabled(),
        source: 'RSS',
        marketDataSource: 'Yahoo Finance delayed',
        limit,
        lastUpdated: new Date().toISOString(),
        markets: europeMarketDataToApiMarkets(marketData),
        items,
        marketData,
        ...(process.env.NODE_ENV !== 'production' && failedFeeds.length > 0 ? { failedFeeds } : {}),
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[EuropeNews] Failed to load European market news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'provider_temporarily_unavailable',
        reason: 'provider_temporarily_unavailable',
      },
      { status: 503 },
    );
  }
}

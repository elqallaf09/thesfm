import { NextResponse } from 'next/server';
import { fetchDelayedGulfMarketData } from '@/lib/gulf/fetchDelayedMarketData';
import { parseGulfRssFeeds } from '@/lib/gulf/parseRssFeeds';

export const revalidate = 300;

export async function GET() {
  try {
    const [newsResult, marketDataResult] = await Promise.allSettled([
      parseGulfRssFeeds(),
      fetchDelayedGulfMarketData(),
    ]);

    const failedFeeds = newsResult.status === 'fulfilled' ? newsResult.value.failedFeeds : [];
    if (failedFeeds.length > 0 && process.env.NODE_ENV !== 'production') {
      console.warn('[GulfNews] Some RSS feeds failed', failedFeeds);
    }

    return NextResponse.json(
      {
        success: true,
        source: 'RSS',
        marketDataSource: 'Delayed free market data',
        lastUpdated: new Date().toISOString(),
        items: newsResult.status === 'fulfilled' ? newsResult.value.items : [],
        marketData: marketDataResult.status === 'fulfilled' ? marketDataResult.value : {},
        failedFeeds,
      },
      {
        headers: {
          'cache-control': 's-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[GulfNews] Failed to load Gulf market news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load Gulf market news',
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}


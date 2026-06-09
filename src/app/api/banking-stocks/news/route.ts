import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { fetchStockCategoryNews } from '@/lib/market/fetchStockCategoryNews';
import { compactNewsItem, parseNewsLimit } from '@/lib/news/apiPayload';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'banking-news' });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const limit = parseNewsLimit(url.searchParams.get('limit'));
    const payload = await fetchStockCategoryNews('banking', url.searchParams.get('lang'));
    const items = payload.items.slice(0, limit).map(item => ({
      ...compactNewsItem(item),
      companyName: item.companyName,
      ticker: item.ticker,
      sector: item.sector,
      sectors: item.sectors,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      priceSource: item.priceSource,
      delayed: item.delayed,
    }));

    return NextResponse.json({
      ...payload,
      limit,
      items,
    }, {
      headers: {
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[BankStocksNews] Failed to load news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load bank stocks news',
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    );
  }
}

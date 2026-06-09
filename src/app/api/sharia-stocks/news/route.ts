import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { fetchStockCategoryNews } from '@/lib/market/fetchStockCategoryNews';
import { compactNewsItem, parseNewsLimit } from '@/lib/news/apiPayload';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function normalizeShariahStatus(status: unknown) {
  if (status === 'possible') return 'review';
  if (status === 'needs_review') return 'review';
  if (status === 'non_compliant') return 'non_compliant';
  return 'unknown';
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'sharia-news' });
  if (limited) return limited;

  try {
    const url = new URL(request.url);
    const limit = parseNewsLimit(url.searchParams.get('limit'));
    const payload = await fetchStockCategoryNews('sharia', url.searchParams.get('lang'));
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
      shariahStatus: normalizeShariahStatus(item.shariaStatus),
      screeningSource: null,
    }));

    return NextResponse.json({
      ...payload,
      limit,
      screeningSourceConnected: false,
      items,
    }, {
      headers: {
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[ShariahStocksNews] Failed to load news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load Shariah stocks news',
        reason: error instanceof Error ? error.message : 'Unknown error',
        screeningSourceConnected: false,
      },
      { status: 503 },
    );
  }
}

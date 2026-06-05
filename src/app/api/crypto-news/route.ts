import { NextResponse } from 'next/server';
import { fetchCryptoNews } from '@/lib/market/fetchCryptoNews';
import { parseNewsLimit } from '@/lib/news/apiPayload';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseNewsLimit(url.searchParams.get('limit'));
    const payload = await fetchCryptoNews(url.searchParams.get('lang'));

    return NextResponse.json({
      ...payload,
      limit,
      items: payload.items.slice(0, limit),
    }, {
      headers: {
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[CryptoNews] Failed to load crypto news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        code: 'CRYPTO_NEWS_PROVIDER_ERROR',
        error: 'Failed to load crypto news',
      },
      { status: 503 },
    );
  }
}

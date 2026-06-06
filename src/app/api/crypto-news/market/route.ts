import { NextResponse } from 'next/server';
import { fetchCryptoMarketData } from '@/lib/market/fetchCryptoMarketData';

export const revalidate = 90;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await fetchCryptoMarketData();
    return NextResponse.json(payload, {
      headers: {
        'cache-control': 'public, s-maxage=90, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('[CryptoMarket] Failed to load crypto market data', {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        ok: false,
        code: 'CRYPTO_MARKET_PROVIDER_ERROR',
        message: 'Crypto market data is unavailable right now.',
        updatedAt: null,
        ticker: [],
        rankings: {
          highestPriced: [],
          lowestPriced: [],
          mostTraded: [],
          leastTraded: [],
        },
      },
      {
        status: 503,
        headers: {
          'cache-control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  }
}

import { NextResponse } from 'next/server';
import { fetchMarketMovers } from '@/lib/markets/marketMovers';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function parseLimit(value: string | null) {
  if (!value) return 5;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(5, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const market = String(url.searchParams.get('market') ?? '').trim().toLowerCase();
  const limit = parseLimit(url.searchParams.get('limit'));

  if (!market) {
    return NextResponse.json(
      {
        ok: false,
        code: 'UNSUPPORTED_MARKET',
        market: '',
        updated_at: null,
        source: 'Yahoo Finance',
        data: null,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  }

  const result = await fetchMarketMovers(market, limit);
  return NextResponse.json(result, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

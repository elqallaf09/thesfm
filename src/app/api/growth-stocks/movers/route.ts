import { NextResponse } from 'next/server';
import { fetchStockCategoryMovers } from '@/lib/market/fetchStockCategoryMovers';

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
  const limit = parseLimit(url.searchParams.get('limit'));
  const result = await fetchStockCategoryMovers('growth', limit);

  return NextResponse.json(result, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

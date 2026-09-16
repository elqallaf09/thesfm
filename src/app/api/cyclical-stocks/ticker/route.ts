import { NextResponse } from 'next/server';
import { screenStockCategory } from '@/lib/market/stockCategoryScanner';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 30, prefix: 'cyclical-stock-scanner' });
  if (limited) return limited;

  const url = new URL(request.url);
  const result = await screenStockCategory('cyclical', {
    limit: 180,
    forceRefresh: url.searchParams.has('refresh'),
  });
  const degraded = result.mode === 'fallback_watchlist';

  return NextResponse.json({
    ok: true,
    ...(degraded ? { code: 'CYCLICAL_SCANNER_DEGRADED' } : {}),
    source: result.source,
    updated_at: result.updatedAt,
    screening_mode: result.mode,
    universe_count: result.universeCount,
    matched_count: result.matchedCount,
    available_count: result.availableCount,
    items: result.items.map(item => ({ ...item, market: item.country ?? 'US' })),
  }, {
    headers: {
      'cache-control': degraded
        ? 'public, s-maxage=60, stale-while-revalidate=600'
        : 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}

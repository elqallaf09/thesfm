import { NextResponse } from 'next/server';
import { screenGrowthStocks } from '@/lib/market/growthStockScreener';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 900;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 30, prefix: 'growth-stocks-screener' });
  if (limited) return limited;

  const result = await screenGrowthStocks();
  const degraded = result.mode !== 'fundamental_screener';

  return NextResponse.json(
    {
      ok: true,
      ...(degraded ? { code: 'GROWTH_SCREENER_DEGRADED' } : {}),
      source: result.source,
      updated_at: result.updatedAt,
      screening_mode: result.mode,
      universe_count: result.universeCount,
      matched_count: result.matchedCount,
      returned_count: result.returnedCount,
      available_count: result.availableCount,
      screening_periods: result.periods,
      screening_criteria: result.criteria,
      degraded_reason: result.degradedReason,
      items: result.items,
    },
    {
      headers: {
        'cache-control': degraded
          ? 'public, s-maxage=60, stale-while-revalidate=600'
          : 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    },
  );
}

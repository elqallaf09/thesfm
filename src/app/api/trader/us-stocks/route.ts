import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import {
  filterTraderRecommendationsBySharia,
  parseScannerFilters,
  toTraderRecommendation,
  traderRecommendationSummary,
} from '@/lib/trader/apiFormat';
import { getScannerResults, getTraderStatus } from '@/lib/trader/scannerService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const filters = parseScannerFilters(request.nextUrl.searchParams);
  const results = await getScannerResults(filters);
  const recommendations = filterTraderRecommendationsBySharia(results.map(toTraderRecommendation), filters.shariaStatus);
  const gainers = [...recommendations].sort((a, b) => Number(b.expectedMovePct || 0) - Number(a.expectedMovePct || 0)).slice(0, 5);
  const losers = [...recommendations].sort((a, b) => Number(a.expectedMovePct || 0) - Number(b.expectedMovePct || 0)).slice(0, 5);
  const active = [...recommendations].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0)).slice(0, 8);

  return NextResponse.json({
    ok: true,
    market: 'US',
    generatedAt: getTraderStatus().scanner.lastScanCompletedAt || new Date().toISOString(),
    summary: traderRecommendationSummary(recommendations),
    recommendations,
    stocks: recommendations,
    topGainers: gainers,
    topLosers: losers,
    mostActive: active,
    filters: {
      sharia_status: filters.shariaStatus && filters.shariaStatus !== 'all' ? filters.shariaStatus : undefined,
    },
    status: getTraderStatus(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

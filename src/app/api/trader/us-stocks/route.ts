import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import {
  filterTraderRecommendationsBySharia,
  parseScannerFilters,
  toTraderRecommendation,
  traderRecommendationSummary,
} from '@/lib/trader/apiFormat';
import { normalizedQuoteKey, rankQuotesByChange } from '@/lib/market/quoteNormalization';
import { getScannerResults, getTraderStatus } from '@/lib/trader/scannerService';

export const dynamic = 'force-dynamic';

type TraderRecommendation = ReturnType<typeof toTraderRecommendation>;

function moverSymbolKey(item: TraderRecommendation & Record<string, unknown>) {
  return normalizedQuoteKey({
    canonicalSymbol: String(item.canonicalSymbol ?? ''),
    displaySymbol: String(item.displaySymbol ?? ''),
    requestedSymbol: String(item.requestedSymbol ?? ''),
    inputSymbol: item.symbol,
  });
}

function isMockOrDemoRecommendation(item: TraderRecommendation) {
  const meta = item as TraderRecommendation & Record<string, unknown>;
  const explicit = [meta.mock, meta.isMock, meta.demo, meta.isDemo, meta.synthetic, meta.placeholder, meta.fallback, meta.isFallback];
  if (explicit.some(value => value === true)) return true;

  const sourceText = [
    item.provider,
    meta.source,
    meta.dataSource,
    meta.sourceType,
  ].map(value => String(value ?? '').toLowerCase()).join(' ');

  return /\b(mock|demo|sample|placeholder|fallback)\b/.test(sourceText);
}

function rankByChangePercent(
  recommendations: TraderRecommendation[],
  direction: 'asc' | 'desc',
  limit: number,
  excludedSymbols = new Set<string>(),
) {
  return rankQuotesByChange(
    recommendations.filter(item => !isMockOrDemoRecommendation(item)),
    direction,
    limit,
    excludedSymbols,
  );
}

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
  const gainers = rankByChangePercent(recommendations, 'desc', 5);
  const losers = rankByChangePercent(recommendations, 'asc', 5, new Set(gainers.map(moverSymbolKey)));
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

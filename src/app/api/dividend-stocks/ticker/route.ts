import { NextResponse } from 'next/server';
import { fetchDividendStockMetrics } from '@/lib/market/fetchDividendStockMetrics';
import { screenStockCategory } from '@/lib/market/stockCategoryScanner';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 30, prefix: 'dividend-stock-scanner' });
  if (limited) return limited;

  const url = new URL(request.url);
  const result = await screenStockCategory('dividend', {
    limit: 180,
    forceRefresh: url.searchParams.has('refresh'),
  });
  const metricSymbols = result.items.slice(0, 100).map(item => item.symbol);
  const metrics = metricSymbols.length
    ? await fetchDividendStockMetrics(metricSymbols, process.env.FINNHUB_API_KEY).catch(() => new Map())
    : new Map();
  const degraded = result.mode === 'fallback_watchlist';

  return NextResponse.json({
    ok: true,
    ...(degraded ? { code: 'DIVIDEND_SCANNER_DEGRADED' } : {}),
    source: `${result.source} + dividend metrics`,
    updated_at: result.updatedAt,
    screening_mode: result.mode,
    universe_count: result.universeCount,
    matched_count: result.matchedCount,
    available_count: result.availableCount,
    items: result.items.map(item => {
      const metric = metrics.get(item.symbol);
      return {
        ...item,
        dividendYield: metric?.dividendYield ?? item.dividendYieldPercent,
        payoutRatio: metric?.payoutRatio ?? null,
        annualDividend: metric?.annualDividend ?? item.lastAnnualDividend,
        exDividendDate: metric?.exDividendDate ?? null,
        paymentDate: metric?.paymentDate ?? null,
        recordDate: metric?.recordDate ?? null,
        declarationDate: metric?.declarationDate ?? null,
        dividendDataLabel: metric?.dividendDataLabel ?? null,
        dividendMetricSource: metric?.available ? metric.source : null,
      };
    }),
  }, {
    headers: {
      'cache-control': degraded
        ? 'public, s-maxage=60, stale-while-revalidate=600'
        : 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { screenStockCategory } from '@/lib/market/stockCategoryScanner';
import { getStockCategoryConfig, type StockCategoryId } from '@/lib/market/stockCategoryConfigs';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

function parseCategory(value: string | null): StockCategoryId | null {
  const category = String(value ?? '').trim().toLowerCase();
  return getStockCategoryConfig(category)?.id ?? null;
}

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 350;
  return Math.max(24, Math.min(500, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 30, windowMs: 60_000, prefix: 'stock-category-scanner' });
  if (limited) return limited;

  const category = parseCategory(request.nextUrl.searchParams.get('category'));
  if (!category) {
    return NextResponse.json({
      ok: false,
      code: 'UNSUPPORTED_STOCK_CATEGORY',
      items: [],
    }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
  const forceRefresh = request.nextUrl.searchParams.has('refresh');
  const result = await screenStockCategory(category, { limit, forceRefresh });
  const degraded = result.mode === 'fallback_watchlist';

  return NextResponse.json({
    ok: true,
    category,
    status: degraded ? 'degraded' : 'success',
    code: degraded ? 'STOCK_CATEGORY_SCANNER_DEGRADED' : null,
    source: result.source,
    updated_at: result.updatedAt,
    screening_mode: result.mode,
    universe_count: result.universeCount,
    matched_count: result.matchedCount,
    returned_count: result.returnedCount,
    available_count: result.availableCount,
    quote_enriched_count: result.quoteEnrichedCount,
    screening_criteria: result.criteria,
    degraded_reason: result.degradedReason,
    items: result.items,
  }, {
    headers: {
      'Cache-Control': forceRefresh
        ? 'private, no-store'
        : degraded
          ? 'public, s-maxage=60, stale-while-revalidate=600'
          : 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}

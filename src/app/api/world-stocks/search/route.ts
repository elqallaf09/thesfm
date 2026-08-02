import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { searchWorldStocks } from '@/lib/world-stocks/search';
import { isSupportedWorldStockRegion } from '@/lib/world-stocks/regions';
import type { WorldStockSearchResponse } from '@/lib/world-stocks/types';

export const dynamic = 'force-dynamic';

const MAX_QUERY_LENGTH = 64;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 30;
const MAX_PAGE = 200;

const querySchema = z.object({
  query: z.string().trim().max(MAX_QUERY_LENGTH).optional().default(''),
  region: z.string().trim().max(32).optional().nullable(),
  assetType: z.enum(['stock', 'etf']).optional().nullable(),
  page: z.coerce.number().int().min(1).max(MAX_PAGE).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional().default(DEFAULT_PAGE_SIZE),
  lang: z.enum(['ar', 'en', 'fr']).optional().default('ar'),
});

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'world-stocks-search' });
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get('query') ?? undefined,
    region: url.searchParams.get('region'),
    assetType: url.searchParams.get('assetType'),
    page: url.searchParams.get('page') ?? undefined,
    pageSize: url.searchParams.get('pageSize') ?? undefined,
    lang: url.searchParams.get('lang') ?? undefined,
  });

  if (!parsed.success) {
    const response: WorldStockSearchResponse = {
      ok: false,
      success: false,
      code: 'invalid_query',
      message: 'Invalid search parameters.',
    };
    return NextResponse.json(response, { status: 400 });
  }

  const { query, region, assetType, page, pageSize, lang } = parsed.data;
  const normalizedRegion = region && isSupportedWorldStockRegion(region) ? region : null;
  if (region && !normalizedRegion) {
    const response: WorldStockSearchResponse = {
      ok: false,
      success: false,
      code: 'invalid_query',
      message: 'Unsupported region.',
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const { results, totalCount, source } = await searchWorldStocks({
      query,
      region: normalizedRegion,
      assetType: assetType ?? null,
      page,
      pageSize,
      locale: lang,
    });

    const response: WorldStockSearchResponse = {
      ok: true,
      success: true,
      query,
      region: normalizedRegion,
      page,
      pageSize,
      totalCount,
      hasMore: page * pageSize < totalCount,
      source,
      results,
    };
    return NextResponse.json(response, {
      headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('[WorldStocks] search failed', { message: error instanceof Error ? error.message : String(error) });
    const response: WorldStockSearchResponse = {
      ok: false,
      success: false,
      code: 'provider_temporarily_unavailable',
      message: 'World stock search is temporarily unavailable.',
    };
    return NextResponse.json(response, { status: 503 });
  }
}

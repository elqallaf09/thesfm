import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { getWorldStockDetail } from '@/lib/world-stocks/detail';
import { isSupportedWorldStockRegion } from '@/lib/world-stocks/regions';
import type { WorldStock } from '@/lib/world-stocks/types';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  symbol: z.string().trim().min(1).max(24),
  region: z.string().trim().min(1).max(32),
  lang: z.enum(['ar', 'en', 'fr']).optional().default('ar'),
});

export type WorldStockDetailResponse = {
  ok: true;
  success: true;
  stock: WorldStock;
} | {
  ok: false;
  success: false;
  code: 'invalid_request' | 'not_found' | 'provider_temporarily_unavailable';
  message: string;
};

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'world-stocks-detail' });
  if (limited) return limited;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    symbol: url.searchParams.get('symbol') ?? '',
    region: url.searchParams.get('region') ?? '',
    lang: url.searchParams.get('lang') ?? undefined,
  });

  if (!parsed.success) {
    const response: WorldStockDetailResponse = { ok: false, success: false, code: 'invalid_request', message: 'Invalid symbol or region.' };
    return NextResponse.json(response, { status: 400 });
  }

  if (!isSupportedWorldStockRegion(parsed.data.region)) {
    const response: WorldStockDetailResponse = { ok: false, success: false, code: 'invalid_request', message: 'Unsupported region.' };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const stock = await getWorldStockDetail(parsed.data.symbol, parsed.data.region, parsed.data.lang);
    if (!stock) {
      const response: WorldStockDetailResponse = { ok: false, success: false, code: 'not_found', message: 'This symbol could not be found.' };
      return NextResponse.json(response, { status: 404 });
    }

    const response: WorldStockDetailResponse = { ok: true, success: true, stock };
    return NextResponse.json(response, {
      headers: { 'cache-control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('[WorldStocks] detail lookup failed', { message: error instanceof Error ? error.message : String(error) });
    const response: WorldStockDetailResponse = { ok: false, success: false, code: 'provider_temporarily_unavailable', message: 'World stock details are temporarily unavailable.' };
    return NextResponse.json(response, { status: 503 });
  }
}

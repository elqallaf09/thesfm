import { NextRequest, NextResponse } from 'next/server';
import { analyzeSfmMarketSymbol } from '@/lib/sfm-market/engine';
import { SFM_MARKET_ENGINE_VERSION } from '@/lib/sfm-market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60',
      'X-SFM-Market-Engine': SFM_MARKET_ENGINE_VERSION,
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  const decodedSymbol = decodeURIComponent(symbol ?? '').trim().toUpperCase();
  if (!decodedSymbol) {
    return json({ ok: false, code: 'INVALID_SYMBOL', message: 'Symbol is required.' }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get('market');
  const assetType = request.nextUrl.searchParams.get('assetType');
  const forceFresh = request.nextUrl.searchParams.get('refresh') === '1'
    || request.nextUrl.searchParams.get('refresh') === 'true';

  const analysis = await analyzeSfmMarketSymbol(decodedSymbol, { market, assetType, forceFresh });
  const status = analysis.code === 'INVALID_SYMBOL' || analysis.code === 'symbol_not_found'
    ? 400
    : analysis.status === 'blocked'
      ? 503
      : 200;

  return json({ ok: status < 400, analysis }, { status });
}

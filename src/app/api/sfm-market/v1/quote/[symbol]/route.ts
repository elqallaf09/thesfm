import { NextRequest, NextResponse } from 'next/server';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { persistSfmMarketObservation } from '@/lib/sfm-market/store';
import { SFM_MARKET_ENGINE_NAME, SFM_MARKET_ENGINE_VERSION } from '@/lib/sfm-market/types';

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
    return json({
      ok: false,
      engine: SFM_MARKET_ENGINE_NAME,
      engineVersion: SFM_MARKET_ENGINE_VERSION,
      code: 'INVALID_SYMBOL',
      message: 'Symbol is required.',
    }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get('market');
  const assetType = request.nextUrl.searchParams.get('assetType');
  const forceFresh = request.nextUrl.searchParams.get('refresh') === '1'
    || request.nextUrl.searchParams.get('refresh') === 'true';

  const quote = await getSfmMarketQuote(decodedSymbol, { market, assetType, forceFresh });
  if (!quote) {
    return json({
      ok: false,
      engine: SFM_MARKET_ENGINE_NAME,
      engineVersion: SFM_MARKET_ENGINE_VERSION,
      code: 'MARKET_DATA_UNAVAILABLE',
      message: 'No trustworthy market quote is currently available.',
    }, { status: 503 });
  }

  const persistence = await persistSfmMarketObservation(quote);
  return json({
    ok: true,
    quote,
    historyStore: {
      recorded: persistence.stored,
      reason: persistence.stored ? null : persistence.reason,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSfmMarketHistory } from '@/lib/sfm-market/history';
import { SFM_MARKET_ENGINE_NAME, SFM_MARKET_ENGINE_VERSION, SFM_MARKET_SCHEMA_VERSION } from '@/lib/sfm-market/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ symbol: string }> };

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  const decoded = decodeURIComponent(symbol ?? '').trim().toUpperCase();
  if (!decoded) return json({ ok: false, success: false, code: 'SYMBOL_REQUIRED' }, { status: 400 });

  const assetType = request.nextUrl.searchParams.get('assetType')?.trim() || undefined;
  const market = request.nextUrl.searchParams.get('market')?.trim() || undefined;
  const forceFresh = ['1', 'true'].includes(request.nextUrl.searchParams.get('refresh') ?? '');
  const result = await getSfmMarketHistory(decoded, { assetType, market, forceFresh });

  if (!result.ok) {
    return json({
      ok: true,
      success: true,
      status: 'empty',
      available: false,
      symbol: result.symbol,
      providerSymbol: result.providerSymbol,
      source: SFM_MARKET_ENGINE_NAME,
      analyticalSource: SFM_MARKET_ENGINE_NAME,
      engineVersion: SFM_MARKET_ENGINE_VERSION,
      schemaVersion: SFM_MARKET_SCHEMA_VERSION,
      points: [],
      history: [],
      reason: result.reason,
      upstreamAttempts: result.attempts.length,
    });
  }

  return json({
    ok: true,
    success: true,
    status: result.candles.length ? 'available' : 'empty',
    available: result.candles.length > 0,
    symbol: result.symbol,
    providerSymbol: result.providerSymbol,
    source: SFM_MARKET_ENGINE_NAME,
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    upstreamProvider: result.provider,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    points: result.candles,
    history: result.candles,
    upstreamAttempts: result.attempts.length + 1,
  });
}

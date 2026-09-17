import { NextRequest, NextResponse } from 'next/server';
import { SFM_MARKET_ENGINE_NAME, SFM_MARKET_ENGINE_VERSION, SFM_MARKET_SCHEMA_VERSION } from '@/lib/sfm-market/types';
import { fetchSfmTraderQuotesDetailed, type SfmTraderQuote } from '@/lib/trader/sfmMarketQuotes';

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

  const forceFresh = ['1', 'true'].includes(request.nextUrl.searchParams.get('refresh') ?? '');
  const result = await fetchSfmTraderQuotesDetailed([decoded], { forceFresh });
  const item = result.quotes[0] as SfmTraderQuote | undefined;

  if (!item) {
    return json({
      ok: true,
      success: true,
      status: 'empty',
      available: false,
      symbol: decoded,
      signal: null,
      item: null,
      source: SFM_MARKET_ENGINE_NAME,
      analyticalSource: SFM_MARKET_ENGINE_NAME,
      engineVersion: SFM_MARKET_ENGINE_VERSION,
      schemaVersion: SFM_MARKET_SCHEMA_VERSION,
      reason: result.reason ?? 'sfm_signal_unavailable',
    });
  }

  const signalAvailable = Boolean(item.signalAvailable && item.dataSufficiency?.sufficient);
  const signal = {
    ...item,
    source: SFM_MARKET_ENGINE_NAME,
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    signalAvailable,
    confidence: signalAvailable ? item.confidence : null,
    aiConfidence: signalAvailable ? item.aiConfidence : null,
    targetPrice: signalAvailable ? item.targetPrice : null,
    target1: signalAvailable ? item.target1 : null,
    stopLoss: signalAvailable ? item.stopLoss : null,
    expectedMovePct: signalAvailable ? item.expectedMovePct : null,
    riskLevel: signalAvailable ? item.riskLevel : null,
    finalRecommendation: signalAvailable ? item.finalRecommendation : 'Insufficient data',
    finalRecommendationAr: signalAvailable ? item.finalRecommendationAr : 'بيانات غير كافية',
    finalRecommendationFr: signalAvailable ? item.finalRecommendationFr : 'Données insuffisantes',
  };

  return json({
    ok: true,
    success: true,
    status: item.available ? 'available' : 'empty',
    available: item.available,
    source: SFM_MARKET_ENGINE_NAME,
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    upstreamSource: item.upstreamSource,
    upstreamProvider: item.sfmProvenance.upstreamProvider,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    signal,
    item: signal,
  });
}

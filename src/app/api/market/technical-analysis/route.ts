import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';
import { hasOhlcPoint, calculatePivotPoints, trendFromAverages } from '@/lib/trading/technical';

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'EURUSD';
  const assetType = request.nextUrl.searchParams.get('assetType') || 'stock';
  const analysis = await proxyAnalyze(symbol, assetType, { displaySymbol: symbol });

  if (!analysis.success) {
    return NextResponse.json({
      success: false,
      code: analysis.code ?? 'provider_no_data',
      message: analysis.error,
      updated_at: new Date().toISOString(),
    }, { status: analysis.openbbService === 'not_configured' ? 503 : 422 });
  }

  const rawTechnicals = analysis.technicals && typeof analysis.technicals === 'object' ? analysis.technicals : {};
  const ohlcCandidate = Array.isArray((rawTechnicals as Record<string, unknown>).ohlc)
    ? ((rawTechnicals as Record<string, unknown>).ohlc as unknown[]).findLast(hasOhlcPoint)
    : undefined;

  if (!ohlcCandidate) {
    return NextResponse.json({
      success: false,
      code: 'insufficient_ohlc_data',
      symbol: analysis.symbol,
      message: 'Not enough OHLC data is available to calculate daily pivot points.',
      updated_at: analysis.fetchedAt ?? new Date().toISOString(),
      available: {
        rsi: analysis.indicators.rsi,
        sma20: analysis.indicators.sma20,
        sma50: analysis.indicators.sma50,
        support: analysis.levels.support,
        resistance: analysis.levels.resistance,
        trend: trendFromAverages(analysis.latestPrice, analysis.indicators.sma20, analysis.indicators.sma50),
      },
    }, { status: 422 });
  }

  return NextResponse.json({
    success: true,
    symbol: analysis.symbol,
    name: analysis.name,
    trend: trendFromAverages(analysis.latestPrice, analysis.indicators.sma20, analysis.indicators.sma50),
    support: [analysis.levels.support],
    resistance: [analysis.levels.resistance],
    pivotPoints: calculatePivotPoints(ohlcCandidate),
    rsi: analysis.indicators.rsi,
    movingAverages: {
      sma20: analysis.indicators.sma20,
      sma50: analysis.indicators.sma50,
    },
    summary: analysis.summary,
    source: analysis.source ?? 'openbb',
    updated_at: analysis.fetchedAt ?? new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';
import { hasOhlcPoint, calculatePivotPoints, trendFromAverages } from '@/lib/trading/technical';

export const revalidate = 300;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const REQUEST_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      const error = new Error('Technical analysis provider timed out');
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(id));
  });
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'EURUSD';
  const assetType = request.nextUrl.searchParams.get('assetType') || 'stock';
  const analysis = await withTimeout(proxyAnalyze(symbol, assetType, { displaySymbol: symbol }), REQUEST_TIMEOUT_MS).catch(error => {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
      console.warn('[technical-analysis] provider error', {
        symbol,
        assetType,
        code: error instanceof Error && error.name === 'TimeoutError' ? 'MARKET_DATA_TIMEOUT' : 'TECHNICAL_ANALYSIS_PROVIDER_ERROR',
      });
    }
    return {
      success: false,
      code: error instanceof Error && error.name === 'TimeoutError' ? 'MARKET_DATA_TIMEOUT' : 'TECHNICAL_ANALYSIS_PROVIDER_ERROR',
      error: null,
      openbbService: 'unavailable',
    } as unknown as Awaited<ReturnType<typeof proxyAnalyze>>;
  });

  if (!analysis.success) {
    return NextResponse.json({
      success: false,
      code: analysis.code ?? 'provider_no_data',
      message: analysis.error,
      updated_at: new Date().toISOString(),
    }, { status: 200, headers: cacheHeaders });
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
    }, { status: 200, headers: cacheHeaders });
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
  }, { status: 200, headers: cacheHeaders });
}

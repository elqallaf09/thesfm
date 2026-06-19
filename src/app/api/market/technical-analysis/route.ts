import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';
import { normalizeMarketSymbol, type NormalizedMarketSymbol } from '@/lib/market/normalizeSymbol';
import { validateSymbol, type MarketAssetType } from '@/lib/market/marketService';
import { hasOhlcPoint, calculatePivotPoints, trendFromAverages, type OhlcPoint } from '@/lib/trading/technical';

export const revalidate = 300;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const REQUEST_TIMEOUT_MS = 7000;
type TechnicalAnalyzeResult = Awaited<ReturnType<typeof proxyAnalyze>>;
type TechnicalSymbolCandidate = {
  symbol: string;
  assetType: MarketAssetType;
  displaySymbol: string;
};

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

function addCandidate(list: TechnicalSymbolCandidate[], candidate: TechnicalSymbolCandidate) {
  const symbol = validateSymbol(candidate.symbol);
  const displaySymbol = validateSymbol(candidate.displaySymbol) ?? symbol;
  if (!symbol || !displaySymbol) return;
  const key = `${symbol}:${candidate.assetType}`;
  if (!list.some(item => `${item.symbol}:${item.assetType}` === key)) {
    list.push({ symbol, assetType: candidate.assetType, displaySymbol });
  }
}

function technicalSymbolCandidates(normalized: NormalizedMarketSymbol, providerSymbolInput?: string | null): TechnicalSymbolCandidate[] {
  const candidates: TechnicalSymbolCandidate[] = [];
  if (providerSymbolInput) {
    const providerNormalized = normalizeMarketSymbol(providerSymbolInput, normalized.assetType);
    if (providerNormalized) {
      addCandidate(candidates, {
        symbol: providerNormalized.providerSymbol,
        assetType: providerNormalized.assetType,
        displaySymbol: normalized.displaySymbol,
      });
      providerNormalized.alternatives.forEach(symbol => {
        addCandidate(candidates, { symbol, assetType: providerNormalized.assetType, displaySymbol: normalized.displaySymbol });
      });
    } else {
      addCandidate(candidates, { symbol: providerSymbolInput, assetType: normalized.assetType, displaySymbol: normalized.displaySymbol });
    }
  }

  addCandidate(candidates, { symbol: normalized.providerSymbol, assetType: normalized.assetType, displaySymbol: normalized.displaySymbol });
  normalized.alternatives.forEach(symbol => {
    addCandidate(candidates, { symbol, assetType: normalized.assetType, displaySymbol: normalized.displaySymbol });
  });

  return candidates.slice(0, 8);
}

function normalizeOhlcPoint(value: unknown): OhlcPoint | null {
  if (hasOhlcPoint(value)) return value;
  if (!value || typeof value !== 'object') return null;

  const point = value as Record<string, unknown>;
  const candidate = {
    date: typeof point.date === 'string' ? point.date : typeof point.timestamp === 'string' ? point.timestamp : undefined,
    open: Number(point.open ?? point.o),
    high: Number(point.high ?? point.h),
    low: Number(point.low ?? point.l),
    close: Number(point.close ?? point.c),
  };

  return hasOhlcPoint(candidate) ? candidate : null;
}

function latestOhlcPoint(analysis: Extract<TechnicalAnalyzeResult, { success: true }>) {
  const rawTechnicals = analysis.technicals && typeof analysis.technicals === 'object' ? analysis.technicals : {};
  const technicalOhlc = Array.isArray((rawTechnicals as Record<string, unknown>).ohlc)
    ? [...((rawTechnicals as Record<string, unknown>).ohlc as unknown[])].reverse().map(normalizeOhlcPoint).find(Boolean)
    : null;
  if (technicalOhlc) return technicalOhlc;
  return Array.isArray(analysis.history) ? [...analysis.history].reverse().map(normalizeOhlcPoint).find(Boolean) ?? undefined : undefined;
}

function partialOhlcResponse(
  analysis: Extract<TechnicalAnalyzeResult, { success: true }>,
  normalized: NormalizedMarketSymbol,
  attemptedSymbols: TechnicalSymbolCandidate[],
  interval: string,
) {
  const updatedAt = analysis.fetchedAt ?? analysis.quote?.timestamp ?? new Date().toISOString();
  return NextResponse.json({
    ok: false,
    success: false,
    code: 'OHLC_DATA_NOT_AVAILABLE',
    symbol: normalized.displaySymbol,
    providerSymbol: analysis.providerSymbol ?? normalized.providerSymbol,
    interval,
    currentPrice: analysis.latestPrice ?? null,
    message: 'Price data is available, but daily candle OHLC data is not sufficient to calculate pivot points.',
    updated_at: updatedAt,
    attemptedSymbols: attemptedSymbols.map(item => item.symbol),
    available: {
      symbol: normalized.displaySymbol,
      providerSymbol: analysis.providerSymbol ?? normalized.providerSymbol,
      price: analysis.latestPrice,
      currentPrice: analysis.latestPrice,
      currency: analysis.currency ?? analysis.quote?.currency,
      source: analysis.source ?? 'yahoo',
      updatedAt,
      rsi: analysis.indicators.rsi,
      sma20: analysis.indicators.sma20,
      sma50: analysis.indicators.sma50,
      trend: trendFromAverages(analysis.latestPrice, analysis.indicators.sma20, analysis.indicators.sma50),
    },
  }, { status: 200, headers: cacheHeaders });
}

function providerFailureResponse(firstError: Record<string, unknown> | null, candidates: TechnicalSymbolCandidate[], normalized: NormalizedMarketSymbol) {
  return NextResponse.json({
    ok: false,
    success: false,
    code: 'PROVIDER_UNAVAILABLE',
    message: 'Market data provider is unavailable for technical analysis right now.',
    symbol: normalized.displaySymbol,
    providerSymbol: normalized.providerSymbol,
    providerCode: typeof firstError?.code === 'string' ? firstError.code : undefined,
    updated_at: new Date().toISOString(),
    attemptedSymbols: candidates.map(item => item.symbol),
  }, { status: 200, headers: cacheHeaders });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim();
  const assetType = searchParams.get('assetType')?.trim() || undefined;
  const providerSymbol = searchParams.get('providerSymbol')?.trim() || undefined;
  const interval = searchParams.get('interval')?.trim() || '1d';

  if (!symbol) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'SYMBOL_REQUIRED',
      message: 'Symbol is required.',
      items: [],
      updated_at: null,
    }, { status: 400, headers: cacheHeaders });
  }

  const normalized = normalizeMarketSymbol(symbol, assetType) ?? normalizeMarketSymbol(providerSymbol || symbol, assetType);
  if (!normalized) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'UNSUPPORTED_SYMBOL',
      message: 'Symbol is not supported.',
      symbol,
      updated_at: null,
    }, { status: 422, headers: cacheHeaders });
  }

  const candidates = technicalSymbolCandidates(normalized, providerSymbol);
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'UNSUPPORTED_SYMBOL',
      message: 'Symbol is not supported.',
      symbol,
      updated_at: null,
    }, { status: 422, headers: cacheHeaders });
  }

  let partialAnalysis: Extract<TechnicalAnalyzeResult, { success: true }> | null = null;
  let firstError: Record<string, unknown> | null = null;

  for (const candidate of candidates) {
    const analysis = await withTimeout(
      proxyAnalyze(candidate.symbol, candidate.assetType, { displaySymbol: candidate.displaySymbol }),
      REQUEST_TIMEOUT_MS,
    ).catch(error => {
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
        console.warn('[technical-analysis] provider error', {
          symbol: candidate.symbol,
          assetType: candidate.assetType,
          code: error instanceof Error && error.name === 'TimeoutError' ? 'MARKET_DATA_TIMEOUT' : 'TECHNICAL_ANALYSIS_PROVIDER_ERROR',
        });
      }
      return {
        success: false,
        code: error instanceof Error && error.name === 'TimeoutError' ? 'MARKET_DATA_TIMEOUT' : 'TECHNICAL_ANALYSIS_PROVIDER_ERROR',
        error: null,
        openbbService: 'unavailable',
      } as unknown as TechnicalAnalyzeResult;
    });

    if (!analysis.success) {
      firstError ??= analysis as Record<string, unknown>;
      continue;
    }

    const ohlcCandidate = latestOhlcPoint(analysis);
    if (!ohlcCandidate) {
      partialAnalysis ??= analysis;
      continue;
    }

    return NextResponse.json({
      ok: true,
      success: true,
      code: undefined,
      symbol: normalized.displaySymbol,
      providerSymbol: analysis.providerSymbol ?? candidate.symbol,
      name: analysis.name,
      interval,
      currentPrice: analysis.latestPrice ?? null,
      currency: analysis.currency ?? analysis.quote?.currency ?? null,
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
      source: analysis.source ?? 'yahoo',
      updated_at: analysis.fetchedAt ?? new Date().toISOString(),
      attemptedSymbols: candidates.map(item => item.symbol),
    }, { status: 200, headers: cacheHeaders });
  }

  if (partialAnalysis) return partialOhlcResponse(partialAnalysis, normalized, candidates, interval);

  return providerFailureResponse(firstError, candidates, normalized);
}

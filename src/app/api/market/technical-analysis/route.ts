import { NextRequest, NextResponse } from 'next/server';
import { proxyAnalyze } from '@/lib/market/openbbProxy';
import { normalizeAssetType, normalizeMarketSymbolInput, validateSymbol, type MarketAssetType } from '@/lib/market/marketService';
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

function compactTechnicalSymbol(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\\/]/g, '')
    .replace(/^([A-Z]{6})=X$/, '$1');
}

function addCandidate(list: TechnicalSymbolCandidate[], candidate: TechnicalSymbolCandidate) {
  const symbol = validateSymbol(candidate.symbol);
  const displaySymbol = validateSymbol(candidate.displaySymbol) ?? symbol;
  if (!symbol || !displaySymbol) return;
  const normalized = {
    symbol,
    assetType: normalizeAssetType(candidate.assetType),
    displaySymbol,
  };
  const key = `${normalized.symbol}:${normalized.assetType}`;
  if (!list.some(item => `${item.symbol}:${item.assetType}` === key)) list.push(normalized);
}

function technicalSymbolCandidates(symbolInput: string, assetTypeInput: string): TechnicalSymbolCandidate[] {
  const candidates: TechnicalSymbolCandidate[] = [];
  const compact = compactTechnicalSymbol(symbolInput);
  const isCryptoPair = compact === 'BTCUSD' || compact === 'ETHUSD';
  const isGoldPair = compact === 'XAUUSD' || compact === 'XAU' || compact === 'GOLD';
  const normalized = normalizeMarketSymbolInput(symbolInput, assetTypeInput);
  const normalizedRecord = normalized as Record<string, any>;
  const normalizedValid = normalized.valid === true;
  const inferredAssetType = normalizedValid ? normalizeAssetType(normalizedRecord.assetType) : normalizeAssetType(assetTypeInput);
  const displaySymbol = normalizedValid ? String(normalizedRecord.displaySymbol ?? normalizedRecord.symbol) : compact || symbolInput.toUpperCase();

  addCandidate(candidates, { symbol: symbolInput, assetType: inferredAssetType, displaySymbol });
  if (normalizedValid) {
    addCandidate(candidates, { symbol: normalizedRecord.providerSymbol, assetType: normalizeAssetType(normalizedRecord.assetType), displaySymbol });
    addCandidate(candidates, { symbol: normalizedRecord.symbol, assetType: normalizeAssetType(normalizedRecord.assetType), displaySymbol });
  }

  if (/^[A-Z]{6}$/.test(compact) && !isCryptoPair && !isGoldPair) {
    addCandidate(candidates, { symbol: compact, assetType: 'forex', displaySymbol: compact });
    addCandidate(candidates, { symbol: `${compact}=X`, assetType: 'forex', displaySymbol: compact });
    addCandidate(candidates, { symbol: `${compact.slice(0, 3)}/${compact.slice(3)}`, assetType: 'forex', displaySymbol: compact });
  }

  if (isGoldPair) {
    addCandidate(candidates, { symbol: 'XAUUSD', assetType: 'gold', displaySymbol: 'XAUUSD' });
    addCandidate(candidates, { symbol: 'XAU/USD', assetType: 'gold', displaySymbol: 'XAUUSD' });
    addCandidate(candidates, { symbol: 'GC=F', assetType: 'gold', displaySymbol: 'XAUUSD' });
  }

  if (isCryptoPair || compact === 'BTC' || compact === 'ETH') {
    const base = compact.startsWith('ETH') ? 'ETH' : 'BTC';
    addCandidate(candidates, { symbol: `${base}USD`, assetType: 'crypto', displaySymbol: `${base}USD` });
    addCandidate(candidates, { symbol: `${base}/USD`, assetType: 'crypto', displaySymbol: `${base}USD` });
    addCandidate(candidates, { symbol: `${base}-USD`, assetType: 'crypto', displaySymbol: `${base}USD` });
  }

  if (['QQQ', 'SPY', 'VOO', 'DIA', 'IWM'].includes(compact)) {
    addCandidate(candidates, { symbol: compact, assetType: 'etf', displaySymbol: compact });
  }

  return candidates.slice(0, 6);
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

function partialOhlcResponse(analysis: Extract<TechnicalAnalyzeResult, { success: true }>, attemptedSymbols: TechnicalSymbolCandidate[]) {
  return NextResponse.json({
    success: false,
    code: 'insufficient_ohlc_data',
    symbol: analysis.symbol,
    providerSymbol: analysis.providerSymbol,
    message: 'Price data is available, but OHLC data is not sufficient to calculate daily pivot points.',
    updated_at: analysis.fetchedAt ?? analysis.quote?.timestamp ?? new Date().toISOString(),
    attemptedSymbols: attemptedSymbols.map(item => item.symbol),
    available: {
      symbol: analysis.symbol,
      providerSymbol: analysis.providerSymbol,
      price: analysis.latestPrice,
      currentPrice: analysis.latestPrice,
      currency: analysis.currency ?? analysis.quote?.currency,
      source: analysis.source ?? 'openbb',
      updatedAt: analysis.fetchedAt ?? analysis.quote?.timestamp,
      rsi: analysis.indicators.rsi,
      sma20: analysis.indicators.sma20,
      sma50: analysis.indicators.sma50,
      trend: trendFromAverages(analysis.latestPrice, analysis.indicators.sma20, analysis.indicators.sma50),
    },
  }, { status: 200, headers: cacheHeaders });
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || 'EURUSD';
  const assetType = request.nextUrl.searchParams.get('assetType') || 'stock';
  const candidates = technicalSymbolCandidates(symbol, assetType);
  let partialAnalysis: Extract<TechnicalAnalyzeResult, { success: true }> | null = null;
  let firstError: Extract<TechnicalAnalyzeResult, { success: false }> | null = null;

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
      firstError ??= analysis;
      continue;
    }

    const ohlcCandidate = latestOhlcPoint(analysis);
    if (!ohlcCandidate) {
      partialAnalysis ??= analysis;
      continue;
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

  if (partialAnalysis) return partialOhlcResponse(partialAnalysis, candidates);

  return NextResponse.json({
    success: false,
    code: firstError?.code ?? 'provider_no_data',
    message: firstError?.error,
    updated_at: new Date().toISOString(),
    attemptedSymbols: candidates.map(item => item.symbol),
  }, { status: 200, headers: cacheHeaders });
}

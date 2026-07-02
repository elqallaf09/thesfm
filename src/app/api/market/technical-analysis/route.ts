import { NextRequest, NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { proxyAnalyze } from '@/lib/market/marketDataProvider';
import { normalizeMarketSymbol, type NormalizedMarketSymbol } from '@/lib/market/normalizeSymbol';
import { validateSymbol, type MarketAssetType } from '@/lib/market/marketService';
import { hasOhlcPoint, calculatePivotPoints, trendFromAverages, type OhlcPoint } from '@/lib/trading/technical';
import { normalizeTraderSymbolMetadata } from '@/lib/trader/marketMetadata';

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
  primaryProviderSymbol: string;
  fallbackUsed: boolean;
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
    list.push({
      symbol,
      assetType: candidate.assetType,
      displaySymbol,
      primaryProviderSymbol: candidate.primaryProviderSymbol,
      fallbackUsed: candidate.fallbackUsed || symbol !== candidate.primaryProviderSymbol,
    });
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
        primaryProviderSymbol: providerNormalized.providerSymbol,
        fallbackUsed: false,
      });
      providerNormalized.alternatives.forEach((symbol, index) => {
        addCandidate(candidates, {
          symbol,
          assetType: providerNormalized.assetType,
          displaySymbol: normalized.displaySymbol,
          primaryProviderSymbol: providerNormalized.providerSymbol,
          fallbackUsed: index > 0 || symbol !== providerNormalized.providerSymbol,
        });
      });
    } else {
      addCandidate(candidates, {
        symbol: providerSymbolInput,
        assetType: normalized.assetType,
        displaySymbol: normalized.displaySymbol,
        primaryProviderSymbol: normalized.providerSymbol,
        fallbackUsed: providerSymbolInput !== normalized.providerSymbol,
      });
    }
  }

  addCandidate(candidates, {
    symbol: normalized.providerSymbol,
    assetType: normalized.assetType,
    displaySymbol: normalized.displaySymbol,
    primaryProviderSymbol: normalized.providerSymbol,
    fallbackUsed: false,
  });
  normalized.alternatives.forEach((symbol, index) => {
    addCandidate(candidates, {
      symbol,
      assetType: normalized.assetType,
      displaySymbol: normalized.displaySymbol,
      primaryProviderSymbol: normalized.providerSymbol,
      fallbackUsed: index > 0 || symbol !== normalized.providerSymbol,
    });
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
  const providerSymbolUsed = analysis.providerSymbol ?? normalized.providerSymbol;
  const usedCandidate = attemptedSymbols.find(item => item.symbol === providerSymbolUsed) ?? attemptedSymbols[0];
  const metadata = normalizeTraderSymbolMetadata({
    symbol: normalized.displaySymbol,
    displaySymbol: normalized.displaySymbol,
    provider: analysis.source,
    providerSymbol: providerSymbolUsed,
    assetType: normalized.assetType,
    quote: analysis as Record<string, unknown>,
  });
  const available = {
    symbol: normalized.displaySymbol,
    providerSymbol: analysis.providerSymbol ?? normalized.providerSymbol,
    price: analysis.latestPrice,
    currentPrice: analysis.latestPrice,
    currency: metadata.currency ?? analysis.currency ?? analysis.quote?.currency,
    exchange: metadata.exchange,
    exchangeCode: metadata.exchangeCode,
    market: metadata.market,
    country: metadata.country,
    metadataDiagnostics: metadata.diagnostics,
    source: analysis.source ?? 'yahoo',
    updatedAt,
    rsi: analysis.indicators.rsi,
    sma20: analysis.indicators.sma20,
    sma50: analysis.indicators.sma50,
    trend: trendFromAverages(analysis.latestPrice, analysis.indicators.sma20, analysis.indicators.sma50),
  };
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'technical_analysis',
    provider: analysis.source ?? 'Yahoo Finance',
    providerStatus: 'empty',
    data: [],
    lastUpdated: updatedAt,
  });
  return NextResponse.json({
    ...diagnostic,
    success: false,
    code: 'OHLC_DATA_NOT_AVAILABLE',
    symbol: normalized.displaySymbol,
    providerSymbol: analysis.providerSymbol ?? normalized.providerSymbol,
    providerStatus: {
      provider: analysis.source ?? 'Yahoo Finance',
      providerSymbolUsed,
      fallbackUsed: Boolean(usedCandidate?.fallbackUsed),
      lastUpdated: updatedAt,
      dataQuality: 'partial',
    },
    interval,
    currentPrice: analysis.latestPrice ?? null,
    exchange: metadata.exchange,
    exchangeCode: metadata.exchangeCode,
    market: metadata.market,
    country: metadata.country,
    metadataDiagnostics: metadata.diagnostics,
    providerMessage: 'Price data is available, but daily candle OHLC data is not sufficient to calculate pivot points.',
    updated_at: updatedAt,
    attemptedSymbols: attemptedSymbols.map(item => item.symbol),
    available,
    legacyOk: false,
  }, { status: 200, headers: cacheHeaders });
}

function providerFailureResponse(firstError: Record<string, unknown> | null, candidates: TechnicalSymbolCandidate[], normalized: NormalizedMarketSymbol) {
  const candidate = candidates[0];
  const updatedAt = new Date().toISOString();
  const code = typeof firstError?.code === 'string' ? firstError.code : undefined;
  const metadata = normalizeTraderSymbolMetadata({
    symbol: normalized.displaySymbol,
    displaySymbol: normalized.displaySymbol,
    providerSymbol: candidate?.symbol ?? normalized.providerSymbol,
    assetType: normalized.assetType,
  });
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'technical_analysis',
    provider: 'Yahoo Finance',
    providerStatus: code && /rate|limit|429/i.test(code) ? 'rate_limited' : 'provider_error',
    data: [],
    lastUpdated: updatedAt,
  });
  return NextResponse.json({
    ...diagnostic,
    success: false,
    code: 'PROVIDER_UNAVAILABLE',
    symbol: normalized.displaySymbol,
    providerSymbol: normalized.providerSymbol,
    exchange: metadata.exchange,
    exchangeCode: metadata.exchangeCode,
    market: metadata.market,
    country: metadata.country,
    currency: metadata.currency,
    metadataDiagnostics: metadata.diagnostics,
    providerStatus: {
      provider: 'Yahoo Finance',
      providerSymbolUsed: candidate?.symbol ?? normalized.providerSymbol,
      fallbackUsed: Boolean(candidate?.fallbackUsed),
      lastUpdated: updatedAt,
      dataQuality: 'unavailable',
    },
    providerCode: code,
    updated_at: updatedAt,
    attemptedSymbols: candidates.map(item => item.symbol),
    legacyOk: false,
  }, { status: 200, headers: cacheHeaders });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.trim();
  const assetType = searchParams.get('assetType')?.trim() || undefined;
  const providerSymbol = searchParams.get('providerSymbol')?.trim() || undefined;
  const interval = searchParams.get('interval')?.trim() || '1d';

  if (!symbol) {
    const diagnostic = createMarketFeatureDiagnostic({
      feature: 'technical_analysis',
      provider: null,
      providerStatus: 'provider_error',
      data: [],
      message: 'Symbol is required.',
      lastUpdated: null,
    });
    return NextResponse.json({
      ...diagnostic,
      success: false,
      code: 'SYMBOL_REQUIRED',
      items: [],
      updated_at: null,
    }, { status: 400, headers: cacheHeaders });
  }

  const normalized = normalizeMarketSymbol(symbol, assetType) ?? normalizeMarketSymbol(providerSymbol || symbol, assetType);
  if (!normalized) {
    const diagnostic = createMarketFeatureDiagnostic({
      feature: 'technical_analysis',
      provider: null,
      providerStatus: 'provider_error',
      data: [],
      message: 'Symbol is not supported.',
      lastUpdated: null,
    });
    return NextResponse.json({
      ...diagnostic,
      success: false,
      code: 'UNSUPPORTED_SYMBOL',
      symbol,
      updated_at: null,
    }, { status: 422, headers: cacheHeaders });
  }

  const candidates = technicalSymbolCandidates(normalized, providerSymbol);
  if (candidates.length === 0) {
    const diagnostic = createMarketFeatureDiagnostic({
      feature: 'technical_analysis',
      provider: null,
      providerStatus: 'provider_error',
      data: [],
      message: 'Symbol is not supported.',
      lastUpdated: null,
    });
    return NextResponse.json({
      ...diagnostic,
      success: false,
      code: 'UNSUPPORTED_SYMBOL',
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
        marketDataService: 'unavailable',
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

    const updatedAt = analysis.fetchedAt ?? new Date().toISOString();
    const metadata = normalizeTraderSymbolMetadata({
      symbol: normalized.displaySymbol,
      displaySymbol: normalized.displaySymbol,
      provider: analysis.source,
      providerSymbol: analysis.providerSymbol ?? candidate.symbol,
      assetType: normalized.assetType,
      quote: analysis as Record<string, unknown>,
    });
    const responseData = {
      symbol: normalized.displaySymbol,
      providerSymbol: analysis.providerSymbol ?? candidate.symbol,
      name: analysis.name,
      interval,
      currentPrice: analysis.latestPrice ?? null,
      currency: metadata.currency ?? analysis.currency ?? analysis.quote?.currency ?? null,
      exchange: metadata.exchange,
      exchangeCode: metadata.exchangeCode,
      market: metadata.market,
      country: metadata.country,
      metadataDiagnostics: metadata.diagnostics,
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
      updated_at: updatedAt,
    };
    const diagnostic = createMarketFeatureDiagnostic({
      feature: 'technical_analysis',
      provider: analysis.source ?? 'Yahoo Finance',
      providerStatus: 'available',
      data: [responseData],
      lastUpdated: updatedAt,
    });

    return NextResponse.json({
      ...diagnostic,
      success: true,
      code: undefined,
      ...responseData,
      providerStatus: {
        provider: analysis.source ?? 'Yahoo Finance',
        providerSymbolUsed: analysis.providerSymbol ?? candidate.symbol,
        fallbackUsed: Boolean(candidate.fallbackUsed),
        lastUpdated: updatedAt,
        dataQuality: analysis.dataStatus ?? 'delayed',
      },
      attemptedSymbols: candidates.map(item => item.symbol),
      legacyOk: true,
    }, { status: 200, headers: cacheHeaders });
  }

  if (partialAnalysis) return partialOhlcResponse(partialAnalysis, normalized, candidates, interval);

  return providerFailureResponse(firstError, candidates, normalized);
}

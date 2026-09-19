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

function unavailable(symbol: string, reason: string | null) {
  return json({
    ok: true,
    success: true,
    feature: 'technical_analysis',
    status: 'empty',
    available: false,
    technicalAvailable: false,
    symbol,
    source: SFM_MARKET_ENGINE_NAME,
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    dataQuality: 'unavailable',
    missingFields: ['price_history', 'technical_indicators'],
    unavailableReason: reason ?? 'sfm_technical_evidence_unavailable',
    indicators: {
      rsi: null,
      sma20: null,
      sma50: null,
      ema20: null,
      ema50: null,
      ema200: null,
      macd: null,
      macdSignal: null,
      priceMomentum20: null,
      support: null,
      resistance: null,
      volumeRatio: null,
      atr: null,
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { symbol } = await context.params;
  const decoded = decodeURIComponent(symbol ?? '').trim().toUpperCase();
  if (!decoded) return json({ ok: false, success: false, code: 'SYMBOL_REQUIRED' }, { status: 400 });

  const assetType = request.nextUrl.searchParams.get('assetType')?.trim() || undefined;
  const forceFresh = ['1', 'true'].includes(request.nextUrl.searchParams.get('refresh') ?? '');
  const result = await fetchSfmTraderQuotesDetailed([decoded], { forceFresh });
  const quote = result.quotes[0] as SfmTraderQuote | undefined;
  if (!quote) return unavailable(decoded, result.reason);

  const research = quote.research;
  const historical = research?.technicalSummary.indicators;
  const indicators = {
    rsi: historical ? historical.rsi14 : quote.rsi ?? null,
    sma20: quote.sma20 ?? null,
    sma50: quote.sma50 ?? null,
    ema20: historical ? historical.ema20 : quote.ema20 ?? null,
    ema50: historical ? historical.ema50 : quote.ema50 ?? null,
    ema200: historical ? historical.ema200 : quote.ema200 ?? null,
    macd: historical ? historical.macd : quote.macd ?? null,
    macdSignal: historical ? historical.macdSignal : quote.macdSignal ?? null,
    priceMomentum20: historical ? historical.priceMomentum20 : quote.priceMomentum20 ?? null,
    support: historical ? historical.support : quote.support ?? null,
    resistance: historical ? historical.resistance : quote.resistance ?? null,
    volumeRatio: historical ? historical.volumeRatio : quote.volumeRatio ?? null,
    atr: historical ? historical.atr : quote.atr ?? null,
  };
  const missingFields = Object.entries(indicators)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  const sampleCount = research?.samples ?? quote.samples ?? 0;
  const technicalAvailable = Boolean((research?.available ?? quote.technicalAvailable) && sampleCount >= 20);
  const comparisonPrice = research?.referenceClose ?? quote.price;
  const trend = comparisonPrice !== null && indicators.ema20 !== null && indicators.ema50 !== null
    ? comparisonPrice > indicators.ema20 && indicators.ema20 > indicators.ema50
      ? 'bullish'
      : comparisonPrice < indicators.ema20 && indicators.ema20 < indicators.ema50
        ? 'bearish'
        : 'neutral'
    : null;

  return json({
    ok: true,
    success: true,
    feature: 'technical_analysis',
    status: technicalAvailable ? 'available' : sampleCount ? 'partial' : 'empty',
    available: technicalAvailable,
    technicalAvailable,
    symbol: quote.displaySymbol || quote.symbol,
    providerSymbol: quote.providerSymbolUsed ?? quote.providerSymbol,
    currentPrice: quote.price,
    price: quote.price,
    currency: quote.currency,
    exchange: quote.exchange,
    exchangeCode: quote.exchangeCode,
    market: quote.market,
    country: quote.country,
    trend,
    support: indicators.support === null ? [] : [indicators.support],
    resistance: indicators.resistance === null ? [] : [indicators.resistance],
    rsi: indicators.rsi,
    movingAverages: { sma20: indicators.sma20, sma50: indicators.sma50 },
    indicators,
    samples: sampleCount, research, technicalSummary: research?.technicalSummary ?? quote.technicalSummary,
    technicalAsOf: research?.asOf ?? quote.technicalAsOf, priceReference: quote.priceReference,
    lastKnownPrice: quote.lastKnownPrice, quoteAvailable: quote.available,
    dataQuality: research?.dataQualityStatus.status ?? quote.dataQuality,
    missingFields,
    source: SFM_MARKET_ENGINE_NAME,
    analyticalSource: SFM_MARKET_ENGINE_NAME,
    upstreamSource: quote.upstreamSource,
    upstreamProvider: quote.sfmProvenance.upstreamProvider,
    sfmQuality: quote.sfmQuality,
    provenance: quote.sfmProvenance,
    providerStatus: {
      provider: SFM_MARKET_ENGINE_NAME,
      upstreamProvider: quote.sfmProvenance.upstreamProvider,
      providerSymbolUsed: quote.sfmProvenance.providerSymbol,
      fallbackUsed: quote.sfmProvenance.attemptCount > 1,
      lastUpdated: quote.sfmProvenance.observedAt,
      dataQuality: research?.dataQualityStatus.status ?? quote.dataQuality,
    },
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    requestedAssetType: assetType ?? null,
  });
}

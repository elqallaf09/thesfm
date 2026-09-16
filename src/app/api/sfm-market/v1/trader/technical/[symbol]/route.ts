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
  if (!quote || !quote.available) return unavailable(decoded, quote?.unavailableReason ?? result.reason);

  const indicators = {
    rsi: quote.rsi,
    sma20: quote.sma20,
    sma50: quote.sma50,
    ema20: quote.ema20,
    ema50: quote.ema50,
    ema200: quote.ema200,
    macd: quote.macd,
    macdSignal: quote.macdSignal,
    priceMomentum20: quote.priceMomentum20,
    support: quote.support,
    resistance: quote.resistance,
    volumeRatio: quote.volumeRatio,
    atr: quote.atr,
  };
  const missingFields = Object.entries(indicators)
    .filter(([, value]) => value === null || value === undefined)
    .map(([key]) => key);
  const technicalAvailable = Boolean(quote.technicalAvailable && quote.samples >= 20);

  return json({
    ok: true,
    success: true,
    feature: 'technical_analysis',
    status: technicalAvailable ? 'available' : 'partial',
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
    trend: quote.technicalSummary?.indicators?.ema20 !== null && quote.technicalSummary?.indicators?.ema50 !== null
      ? quote.ema20 !== null && quote.ema50 !== null && quote.price !== null
        ? quote.price > quote.ema20 && quote.ema20 > quote.ema50
          ? 'bullish'
          : quote.price < quote.ema20 && quote.ema20 < quote.ema50
            ? 'bearish'
            : 'neutral'
        : null
      : null,
    support: quote.support === null ? [] : [quote.support],
    resistance: quote.resistance === null ? [] : [quote.resistance],
    rsi: quote.rsi,
    movingAverages: { sma20: quote.sma20, sma50: quote.sma50 },
    indicators,
    samples: quote.samples,
    dataQuality: quote.dataQuality,
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
      dataQuality: quote.dataQuality,
    },
    engineVersion: SFM_MARKET_ENGINE_VERSION,
    schemaVersion: SFM_MARKET_SCHEMA_VERSION,
    requestedAssetType: assetType ?? null,
  });
}

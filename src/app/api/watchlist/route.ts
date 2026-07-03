import { NextResponse } from 'next/server';
import { fetchTraderQuotesDetailed, getConnectedProvider } from '@/lib/trader/marketQuotes';

function parseSymbols(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get('symbols') || '')
    .split(',')
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 50);
}

export async function GET(request: Request) {
  const symbols = parseSymbols(request);
  const url = new URL(request.url);
  const quoteLoad = symbols.length
    ? await fetchTraderQuotesDetailed(symbols, { forceFresh: url.searchParams.has('refresh') })
    : null;
  const quotes = quoteLoad?.quotes ?? [];
  const recommendations = quotes
    .filter(quote => quote.available && quote.price !== null)
    .map(quote => ({
      symbol: quote.symbol,
      requestedSymbol: quote.requestedSymbol,
      canonicalSymbol: quote.canonicalSymbol,
      displaySymbol: quote.displaySymbol,
      providerSymbol: quote.providerSymbol,
      providerSymbolUsed: quote.providerSymbolUsed,
      provider: quote.provider,
      fallbackUsed: quote.fallbackUsed,
      name: quote.name,
      assetType: quote.assetType,
      price: quote.price,
      currentPrice: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.previousClose,
      currency: quote.currency,
      signal: quote.signal,
      signalAvailable: quote.signalAvailable,
      confidence: quote.confidence,
      aiConfidence: quote.aiConfidence,
      riskLevel: quote.riskLevel,
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
      targetPrice: quote.targetPrice,
      target1: quote.target1,
      stopLoss: quote.stopLoss,
      expectedMovePct: quote.expectedMovePct,
      finalRecommendation: quote.finalRecommendation,
      finalRecommendationAr: quote.finalRecommendationAr,
      finalScore: quote.finalScore,
      strategyCount: quote.strategyCount,
      strategyAgreement: quote.strategyAgreement,
      strategyConsensus: quote.strategyConsensus,
      technicalAvailable: quote.technicalAvailable,
      samples: quote.samples,
      technicalSummary: quote.technicalSummary,
      newsSentimentSummary: quote.newsSentimentSummary,
      dataQualityStatus: quote.dataQualityStatus,
      explanation: quote.explanation,
      explanationEn: quote.explanationEn,
      explanationAr: quote.explanationAr,
      disclaimer: quote.disclaimer,
      scoreBreakdown: quote.scoreBreakdown,
      strategies: quote.strategies,
      sparkline: quote.sparkline,
      history: quote.history,
      chartAvailable: quote.chartAvailable,
      providerStatus: quote.providerStatus,
      source: quote.source,
      delayed: quote.delayed,
      dataQuality: quote.dataQuality,
      lastUpdated: quote.lastUpdated,
      updatedAt: quote.updatedAt,
    }));
  const unavailable = quotes
    .filter(quote => !quote.available)
    .map(quote => ({
      symbol: quote.symbol,
      name: quote.name,
      reason: quote.unavailableReason ?? 'all_providers_returned_no_quote',
    }));

  return NextResponse.json({
    recommendations,
    unavailable,
    smartAlerts: [],
    dataProvider: getConnectedProvider(),
    loaded: quoteLoad?.loaded ?? [],
    failed: quoteLoad?.failed ?? [],
    skipped: quoteLoad?.skipped ?? [],
    provider: quoteLoad?.provider ?? null,
    reason: quoteLoad?.reason ?? (symbols.length ? 'all_providers_returned_no_quote' : null),
    providerLatencyMs: quoteLoad?.providerLatencyMs ?? {},
    cacheStatus: quoteLoad?.cacheStatus ?? 'not_configured',
    summary: quoteLoad?.summary ?? { loadedSymbols: 0, failedSymbols: 0, cachedSymbols: 0, skippedDueToRateLimit: 0 },
    resultCount: recommendations.length,
    message: recommendations.length
      ? null
      : 'The configured providers returned no usable quotes for this watchlist.',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

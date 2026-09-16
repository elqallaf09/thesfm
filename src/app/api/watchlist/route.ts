import { NextResponse } from 'next/server';
import { generateSfmTraderSignals } from '@/lib/sfm-market/traderSignals';

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
  const signals = symbols.length
    ? await generateSfmTraderSignals(symbols, { forceFresh: url.searchParams.has('refresh') }, 4)
    : [];

  const recommendations = signals
    .filter(signal => signal.available && signal.price !== null)
    .map(signal => ({
      symbol: signal.symbol,
      requestedSymbol: signal.symbol,
      canonicalSymbol: signal.symbol,
      displaySymbol: signal.symbol,
      providerSymbol: signal.sfmMarket.provenance?.providerSymbol ?? null,
      providerSymbolUsed: signal.sfmMarket.provenance?.providerSymbol ?? null,
      provider: 'THE SFM',
      fallbackUsed: false,
      name: signal.assetName,
      assetType: signal.assetType,
      market: signal.market,
      currency: signal.currency,
      price: signal.price,
      currentPrice: signal.currentPrice,
      change: signal.change,
      changePercent: signal.changePercent,
      previousClose: signal.previousClose,
      volume: signal.volume,
      open: signal.open,
      high: signal.high,
      low: signal.low,
      signal: signal.action,
      action: signal.action,
      actionLabelAr: signal.actionLabelAr,
      actionLabelEn: signal.actionLabelEn,
      signalAvailable: signal.action !== 'insufficient_data' && signal.confidenceComputed,
      confidence: signal.confidenceComputed ? signal.confidence : null,
      aiConfidence: signal.confidenceComputed ? signal.confidence : null,
      riskLevel: signal.riskLevel,
      targetPrice: signal.targetPrice,
      target1: signal.targetPrice,
      stopLoss: signal.stopLoss,
      technicalAvailable: signal.technicalSummary.trendDirection !== 'unknown',
      technicalSummary: signal.technicalSummary,
      scoreBreakdown: signal.scoreBreakdown,
      history: signal.history,
      sparkline: signal.sparkline,
      chartAvailable: signal.chartAvailable,
      source: 'THE SFM',
      delayed: signal.delayed,
      dataQuality: signal.dataQuality,
      lastUpdated: signal.lastUpdated,
      updatedAt: signal.lastUpdated,
      explanation: { en: signal.signalExplanationEn, ar: signal.signalExplanationAr },
      explanationEn: signal.signalExplanationEn,
      explanationAr: signal.signalExplanationAr,
      disclaimer: { en: signal.disclaimerEn, ar: signal.disclaimerAr },
      providerStatus: {
        requestedSymbol: signal.symbol,
        providerSymbolUsed: signal.sfmMarket.provenance?.providerSymbol ?? null,
        fallbackUsed: false,
        lastUpdated: signal.lastUpdated,
        dataQuality: signal.dataQuality,
        provider: 'THE SFM',
        source: 'THE SFM',
      },
      sfmMarket: signal.sfmMarket,
    }));

  const unavailable = signals
    .filter(signal => !signal.available || signal.price === null)
    .map(signal => ({
      symbol: signal.symbol,
      name: signal.assetName,
      reason: signal.warnings?.[0] || 'sfm_market_data_unavailable',
      source: 'THE SFM',
    }));

  return NextResponse.json({
    recommendations,
    unavailable,
    smartAlerts: [],
    dataProvider: {
      provider: 'THE SFM',
      engine: 'THE SFM Market Data Engine',
      configured: true,
      status: recommendations.length ? 'success' : symbols.length ? 'partial' : 'empty',
    },
    loaded: recommendations.map(item => ({ symbol: item.symbol, provider: 'THE SFM', reason: 'sfm_evidence_loaded' })),
    failed: unavailable.map(item => ({ symbol: item.symbol, provider: 'THE SFM', reason: item.reason })),
    skipped: [],
    provider: 'THE SFM',
    reason: recommendations.length ? null : symbols.length ? 'sfm_market_data_unavailable' : null,
    providerLatencyMs: {},
    cacheStatus: 'live',
    summary: {
      loadedSymbols: recommendations.length,
      failedSymbols: unavailable.length,
      cachedSymbols: recommendations.filter(item => item.sfmMarket.provenance?.cached).length,
      skippedDueToRateLimit: 0,
    },
    resultCount: recommendations.length,
    message: recommendations.length
      ? null
      : 'THE SFM Market Data Engine returned no usable quote evidence for this watchlist.',
  }, {
    headers: {
      'Cache-Control': 'no-store',
      'X-SFM-Market-Source': 'THE SFM Market Data Engine',
    },
  });
}

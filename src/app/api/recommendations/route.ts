import { NextResponse } from 'next/server';
import { fetchTraderQuotesDetailed, getConnectedProvider, resolveTraderMarketDynamic } from '@/lib/trader/marketQuotes';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.has('refresh');
  const { market, symbolMeta, catalog } = await resolveTraderMarketDynamic(url.searchParams.get('market'), {
    forceFresh: forceFresh || url.searchParams.has('discover'),
  });
  const requestedSymbols = String(url.searchParams.get('symbols') ?? '')
    .split(',')
    .map(symbol => symbol.trim())
    .filter(Boolean);
  const symbols = requestedSymbols.length ? requestedSymbols : market.symbols;

  const quoteLoad = await fetchTraderQuotesDetailed(symbols, { forceFresh, symbolMeta });
  const quotes = quoteLoad.quotes;
  const available = quotes.filter(q => q.available && q.price !== null);
  const unavailable = quotes
    .filter(q => !q.available)
    .map(q => ({ symbol: q.symbol, name: q.name, reason: q.unavailableReason ?? 'provider_returned_empty_quote' }));

  const recommendations = available.map(q => ({
    symbol: q.symbol,
    requestedSymbol: q.requestedSymbol,
    canonicalSymbol: q.canonicalSymbol,
    displaySymbol: q.displaySymbol,
    providerSymbol: q.providerSymbol,
    providerSymbolUsed: q.providerSymbolUsed,
    provider: q.provider,
    fallbackUsed: q.fallbackUsed,
    name: q.name,
    assetType: q.assetType,
    price: q.price,
    currentPrice: q.price,
    change: q.change,
    changePercent: q.changePercent,
    previousClose: q.previousClose,
    currency: q.currency,
    signal: q.signal,
    signalAvailable: q.signalAvailable,
    confidence: q.confidence,
    riskLevel: q.riskLevel,
    rsi: q.rsi,
    sma20: q.sma20,
    sma50: q.sma50,
    sparkline: q.sparkline,
    history: q.history,
    chartAvailable: q.chartAvailable,
    providerStatus: q.providerStatus,
    source: q.source,
    delayed: q.delayed,
    dataQuality: q.dataQuality,
    lastUpdated: q.lastUpdated,
    updatedAt: q.updatedAt,
  }));

  return NextResponse.json({
    market: market.id,
    recommendations,
    unavailable,
    smartAlerts: [],
    dataProvider: getConnectedProvider(),
    symbolDiscovery: {
      totalSymbolsDiscovered: catalog.diagnostics.totalSymbolsDiscovered,
      totalMarketSymbols: market.totalSymbols,
      source: market.source,
      cacheStatus: catalog.diagnostics.cacheStatus,
      providerLatencyMs: catalog.diagnostics.providerLatencyMs,
    },
    loaded: quoteLoad.loaded,
    failed: quoteLoad.failed,
    skipped: quoteLoad.skipped,
    provider: quoteLoad.provider,
    reason: quoteLoad.reason,
    providerLatencyMs: quoteLoad.providerLatencyMs,
    cacheStatus: quoteLoad.cacheStatus,
    resultCount: recommendations.length,
    message: recommendations.length
      ? null
      : 'The configured providers returned no usable quotes for this market.',
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

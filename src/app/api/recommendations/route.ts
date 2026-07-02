import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { resolveTraderMarketContext, traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { fetchTraderQuotesDetailed, getConnectedProvider, resolveTraderMarketDynamic } from '@/lib/trader/marketQuotes';

export const dynamic = 'force-dynamic';

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function priceProviderStatus(quoteLoad: Awaited<ReturnType<typeof fetchTraderQuotesDetailed>>, resultCount: number) {
  if (resultCount > 0) return 'available' as const;
  if (quoteLoad.summary.skippedDueToRateLimit > 0 || quoteLoad.failed.some(item => /rate|limit|429/i.test(item.reason))) {
    return 'rate_limited' as const;
  }
  return 'available' as const;
}

function availableQuoteProviders(capabilityMatrix: Record<string, { configured?: boolean; healthy?: boolean; supportsQuotes?: boolean; status?: string }>) {
  return Array.from(new Set(Object.entries(capabilityMatrix)
    .filter(([, capability]) => capability.supportsQuotes !== false
      && (capability.configured === true || capability.healthy === true || capability.status === 'healthy'))
    .map(([provider]) => traderProviderDisplayName(provider))
    .filter((provider): provider is string => Boolean(provider))));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.has('refresh');
  const discover = url.searchParams.has('discover');
  const marketId = url.searchParams.get('market');
  const { market, symbolMeta, catalog } = await resolveTraderMarketDynamic(url.searchParams.get('market'), {
    forceFresh,
    includeFmpDiscovery: discover && Boolean(marketId),
  });
  const requestedSymbols = String(url.searchParams.get('symbols') ?? '')
    .split(',')
    .map(symbol => symbol.trim())
    .filter(Boolean);
  const page = clampInteger(url.searchParams.get('page'), 1, 1, 10_000);
  const pageSize = clampInteger(url.searchParams.get('limit') ?? url.searchParams.get('pageSize'), requestedSymbols.length ? 120 : 24, 1, 120);
  const search = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const shariahStatus = normalizeShariahStatus(
    url.searchParams.get('shariahStatus') ?? url.searchParams.get('sharia_status') ?? url.searchParams.get('shariaStatus'),
    null,
  );
  const sourceSymbols = requestedSymbols.length ? requestedSymbols : market.symbols;
  const filteredSymbols = search
    ? sourceSymbols.filter(symbol => symbol.toUpperCase().includes(search))
    : sourceSymbols;
  const offset = requestedSymbols.length ? 0 : (page - 1) * pageSize;
  const symbols = filteredSymbols.slice(offset, offset + pageSize);
  const symbolSet = new Set(symbols.map(symbol => symbol.toUpperCase()));
  const selectedMeta = catalog.symbols.filter(symbol => symbolSet.has(symbol.symbol.toUpperCase()) || symbolSet.has(symbol.providerSymbol.toUpperCase()));

  const quoteLoad = await fetchTraderQuotesDetailed(symbols, { forceFresh, symbolMeta: selectedMeta });
  const quotes = quoteLoad.quotes;
  const available = quotes
    .filter(q => q.available && q.price !== null)
    .filter(q => !shariahStatus || q.shariahStatus === shariahStatus);
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
    exchange: q.exchange,
    exchangeCode: q.exchangeCode,
    market: q.market,
    country: q.country,
    metadataDiagnostics: q.metadataDiagnostics,
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
    shariahStatus: q.shariahStatus,
    shariahReason: q.shariahReason,
    shariahSource: q.shariahSource,
    shariahLastReviewedAt: q.shariahLastReviewedAt,
    shariahManualOverride: q.shariahManualOverride,
    shariahReviewedBy: q.shariahReviewedBy,
    shariahScreeningData: q.shariahScreeningData,
    shariahMethod: q.shariahMethod,
    shariaStatus: q.shariahStatus,
    shariaSource: q.shariahSource,
    shariaCheckedAt: q.shariahLastReviewedAt,
  }));
  const connectedProvider = getConnectedProvider();
  const primaryQuote = available[0] ?? quotes.find(q => q.provider || q.providerStatus.provider || q.source) ?? null;
  const primaryMeta = selectedMeta[0] ?? symbolMeta[0] ?? null;
  const configuredQuoteProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const usedProvider = primaryQuote
    ? primaryQuote.providerStatus.provider ?? primaryQuote.provider ?? primaryQuote.providerStatus.source ?? primaryQuote.source
    : quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider;
  const marketContext = resolveTraderMarketContext({
    marketId: market.id,
    assetType: primaryQuote?.assetType ?? primaryMeta?.assetType,
    currency: primaryQuote?.currency ?? primaryMeta?.currency ?? market.currency,
    country: primaryMeta?.country,
    exchange: primaryMeta?.exchange,
    selectedSymbol: primaryQuote?.symbol ?? symbols[0],
    selectedProvider: usedProvider,
    availableProviders: configuredQuoteProviders,
    fallbackUsed: primaryQuote?.fallbackUsed ?? primaryQuote?.providerStatus.fallbackUsed,
  });
  const providerUsage = {
    usedProvider: marketContext.selectedProvider,
    primaryProvider: traderProviderDisplayName(quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider),
    fallbackUsed: marketContext.fallbackUsed,
    availableProviders: marketContext.availableProviders,
    source: primaryQuote ? 'quote' : 'provider-status',
  };
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'prices',
    provider: quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider,
    providerStatus: priceProviderStatus(quoteLoad, recommendations.length),
    data: recommendations,
    lastUpdated: quoteLoad.generatedAt,
  });

  return NextResponse.json({
    ...diagnostic,
    market: market.id,
    marketContext,
    providerUsage,
    availableProviders: marketContext.availableProviders,
    recommendations,
    unavailable,
    smartAlerts: [],
    dataProvider: connectedProvider,
    symbolDiscovery: {
      totalSymbolsDiscovered: catalog.diagnostics.totalSymbolsDiscovered,
      totalMarketSymbols: market.totalSymbols,
      loadedPageSymbols: symbols.length,
      page,
      pageSize,
      hasMore: offset + symbols.length < filteredSymbols.length,
      selectedMarket: marketId ?? market.id,
      shariahStatus,
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
    summary: quoteLoad.summary,
    resultCount: diagnostic.count,
    message: diagnostic.message,
    legacyOk: true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

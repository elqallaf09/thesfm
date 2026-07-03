import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { filterAssetsByMarket, marketFilterDecision } from '@/lib/trader/marketFilters';
import { getSymbolsForMarketOrSector } from '@/lib/trader/marketCatalog';
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

const BAHRAIN_EMPTY_STATE = {
  ar: 'لا توجد بيانات كافية لسوق البحرين حالياً',
  en: 'Not enough data available for Bahrain Market right now',
};

function normalizeRecommendationCategory(value: string | null) {
  const category = String(value ?? 'all').trim().toLowerCase();
  if (!category || category === 'all' || category === 'all assets') return 'all';
  if (category === 'stocks' || category === 'equities') return 'stock';
  if (category === 'etfs') return 'fund';
  if (category === 'fx') return 'forex';
  if (category === 'metals') return 'commodity';
  return category;
}

function filterAssetsByCategory<T extends { assetType?: string }>(assets: T[], category: string) {
  if (category === 'all') return assets;
  return assets.filter(asset => String(asset.assetType ?? '').trim().toLowerCase() === category);
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.has('refresh');
  const discover = url.searchParams.has('discover');
  const marketId = url.searchParams.get('market');
  const selectedCategory = normalizeRecommendationCategory(
    url.searchParams.get('category') ?? url.searchParams.get('assetType') ?? url.searchParams.get('asset_type'),
  );
  const { market, catalog } = await resolveTraderMarketDynamic(url.searchParams.get('market'), {
    forceFresh,
    includeFmpDiscovery: discover && Boolean(marketId),
  });
  const selectedSector = url.searchParams.get('sector') ?? url.searchParams.get('selectedSector') ?? url.searchParams.get('selected_sector');
  const universe = await getSymbolsForMarketOrSector({
    market: marketId ?? market.id,
    sector: selectedSector,
    category: selectedCategory,
    catalog,
  });
  const requestedSymbols = String(url.searchParams.get('symbols') ?? '')
    .split(',')
    .map(normalizeSymbol)
    .filter(Boolean);
  const page = clampInteger(url.searchParams.get('page'), 1, 1, 10_000);
  const pageSize = clampInteger(url.searchParams.get('limit') ?? url.searchParams.get('pageSize'), requestedSymbols.length ? 120 : 20, 1, 120);
  const search = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const shariahStatus = normalizeShariahStatus(
    url.searchParams.get('shariahStatus') ?? url.searchParams.get('sharia_status') ?? url.searchParams.get('shariaStatus'),
    null,
  );
  const universeKeySet = new Set(universe.symbolMeta.flatMap(symbol => [
    normalizeSymbol(symbol.symbol),
    normalizeSymbol(symbol.providerSymbol),
    ...symbol.aliases.map(normalizeSymbol),
  ]));
  const requestedKeySet = new Set(requestedSymbols.filter(symbol => universeKeySet.has(symbol)));
  const sourceMeta = requestedSymbols.length
    ? universe.symbolMeta.filter(symbol => requestedKeySet.has(normalizeSymbol(symbol.symbol)) || requestedKeySet.has(normalizeSymbol(symbol.providerSymbol)))
    : universe.symbolMeta;
  const searchedMeta = search
    ? sourceMeta.filter(symbol => [
        symbol.symbol,
        symbol.providerSymbol,
        symbol.name,
        symbol.exchange,
        symbol.country,
        symbol.sector,
        symbol.industry,
      ].some(value => normalizeSymbol(value).includes(search)))
    : sourceMeta;
  const filteredMeta = shariahStatus
    ? searchedMeta.filter(symbol => symbol.shariahStatus === shariahStatus)
    : searchedMeta;
  const offset = requestedSymbols.length ? 0 : (page - 1) * pageSize;
  const selectedMeta = filteredMeta.slice(offset, offset + pageSize);
  const symbols = selectedMeta.map(symbol => symbol.symbol);
  const pageKeySet = new Set(selectedMeta.flatMap(symbol => [
    normalizeSymbol(symbol.symbol),
    normalizeSymbol(symbol.providerSymbol),
    ...symbol.aliases.map(normalizeSymbol),
  ]));
  const entryBySymbol = new Map(universe.entries.map(entry => [normalizeSymbol(entry.symbol), entry]));

  const quoteLoad = await fetchTraderQuotesDetailed(symbols, { forceFresh, symbolMeta: selectedMeta });
  const quotes = quoteLoad.quotes;
  const inPageUniverse = quotes.filter(q => [
    q.symbol,
    q.requestedSymbol,
    q.canonicalSymbol,
    q.displaySymbol,
    q.providerSymbol,
    q.providerSymbolUsed,
  ].some(value => pageKeySet.has(normalizeSymbol(value))));
  const marketFilterSelection = universe.selectedMarket ?? market.id;
  const marketFiltered = filterAssetsByMarket(inPageUniverse, marketFilterSelection);
  const excludedByMarket = inPageUniverse
    .map(q => ({ quote: q, decision: marketFilterDecision(q, marketFilterSelection) }))
    .filter(item => !item.decision.allowed);
  if (process.env.NODE_ENV === 'development' && market.id === 'bahrain' && excludedByMarket.length) {
    console.warn('[recommendations] Excluded non-Bahrain assets from Bahrain Market response.', excludedByMarket.map(({ quote, decision }) => ({
      symbol: quote.symbol,
      exchange: quote.exchange,
      market: quote.market,
      country: quote.country,
      currency: quote.currency,
      assetType: quote.assetType,
      reason: decision.reason,
    })));
  }
  const available = filterAssetsByCategory(marketFiltered, selectedCategory);
  const unavailable = available
    .filter(q => !q.available || q.price === null)
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
    aiConfidence: q.aiConfidence,
    riskLevel: q.riskLevel,
    rsi: q.rsi,
    sma20: q.sma20,
    sma50: q.sma50,
    ema20: q.ema20,
    ema50: q.ema50,
    ema200: q.ema200,
    macd: q.macd,
    macdSignal: q.macdSignal,
    priceMomentum20: q.priceMomentum20,
    support: q.support,
    resistance: q.resistance,
    volumeRatio: q.volumeRatio,
    atr: q.atr,
    targetPrice: q.targetPrice,
    target1: q.target1,
    stopLoss: q.stopLoss,
    expectedMovePct: q.expectedMovePct,
    finalRecommendation: q.finalRecommendation,
    finalRecommendationAr: q.finalRecommendationAr,
    finalScore: q.finalScore,
    strategyCount: q.strategyCount,
    strategyAgreement: q.strategyAgreement,
    strategyConsensus: q.strategyConsensus,
    technicalAvailable: q.technicalAvailable,
    samples: q.samples,
    technicalSummary: q.technicalSummary,
    newsSentimentSummary: q.newsSentimentSummary,
    dataQualityStatus: q.dataQualityStatus,
    explanation: q.explanation,
    explanationEn: q.explanationEn,
    explanationAr: q.explanationAr,
    disclaimer: q.disclaimer,
    scoreBreakdown: q.scoreBreakdown,
    strategies: q.strategies,
    sparkline: q.sparkline,
    history: q.history,
    chartAvailable: q.chartAvailable,
    providerStatus: q.providerStatus,
    source: q.source,
    delayed: q.delayed,
    available: q.available,
    unavailableReason: q.unavailableReason ?? null,
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
  const availablePriceCount = available.filter(q => q.available && q.price !== null).length;
  const unavailableCount = available.length - availablePriceCount;
  const primaryQuote = available.find(q => q.available && q.price !== null) ?? available[0] ?? marketFiltered[0] ?? null;
  const primaryMeta = selectedMeta[0] ?? universe.symbolMeta[0] ?? null;
  const configuredQuoteProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const selectedExchange = url.searchParams.get('exchange') ?? url.searchParams.get('selectedExchange') ?? market.family;
  const selectedCurrency = url.searchParams.get('currency') ?? url.searchParams.get('selectedCurrency') ?? market.currency;
  const usedProvider = primaryQuote
    ? primaryQuote.providerStatus.provider ?? primaryQuote.provider ?? primaryQuote.providerStatus.source ?? primaryQuote.source
    : quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider;
  const marketContext = resolveTraderMarketContext({
    marketId: market.id,
    assetType: primaryQuote?.assetType ?? primaryMeta?.assetType,
    currency: selectedCurrency,
    country: primaryQuote?.country,
    exchange: selectedExchange,
    selectedSymbol: primaryQuote?.symbol,
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
    providerStatus: priceProviderStatus(quoteLoad, availablePriceCount),
    data: recommendations,
    message: recommendations.length ? null : market.id === 'bahrain' ? BAHRAIN_EMPTY_STATE.ar : null,
    lastUpdated: quoteLoad.generatedAt,
  });

  return NextResponse.json({
    ...diagnostic,
    market: market.id,
    marketContext,
    selectedMarket: market.id,
    selectedSector: universe.selectedSector,
    selectedExchange,
    selectedCurrency,
    selectedCategory,
    emptyState: market.id === 'bahrain' && recommendations.length === 0 ? BAHRAIN_EMPTY_STATE : null,
    providerUsage,
    availableProviders: marketContext.availableProviders,
    recommendations,
    unavailable,
    excludedByMarket: excludedByMarket.map(({ quote, decision }) => ({
      symbol: quote.symbol,
      exchange: quote.exchange,
      market: quote.market,
      country: quote.country,
      currency: quote.currency,
      assetType: quote.assetType,
      reason: decision.reason,
    })),
    smartAlerts: [],
    dataProvider: connectedProvider,
    marketUniverse: {
      selectedMarket: universe.selectedMarket ?? market.id,
      selectedSector: universe.selectedSector,
      category: universe.category,
      total: filteredMeta.length,
      universeTotal: universe.total,
      page,
      pageSize,
      returned: recommendations.length,
      showing: offset + recommendations.length,
      hasMore: offset + selectedMeta.length < filteredMeta.length,
      symbols: selectedMeta.map(symbol => entryBySymbol.get(normalizeSymbol(symbol.symbol))).filter(Boolean),
      source: universe.source,
      availablePriceCount,
      unavailableCount,
      dataCoverage: `${availablePriceCount}/${recommendations.length}`,
      provider: quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider,
    },
    symbolDiscovery: {
      totalSymbolsDiscovered: catalog.diagnostics.totalSymbolsDiscovered,
      totalMarketSymbols: universe.total,
      totalFilteredSymbols: filteredMeta.length,
      loadedPageSymbols: symbols.length,
      page,
      pageSize,
      hasMore: offset + selectedMeta.length < filteredMeta.length,
      selectedMarket: universe.selectedMarket ?? marketId ?? market.id,
      selectedSector: universe.selectedSector,
      selectedCategory: universe.category,
      availablePriceCount,
      unavailableCount,
      shariahStatus,
      source: universe.source,
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
    resultCount: recommendations.length,
    priceResultCount: availablePriceCount,
    message: diagnostic.message,
    legacyOk: true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

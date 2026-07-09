import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import {
  assetSelectionDecision,
  filterAssetsBySelection,
  normalizeSelectedCategoryKey,
  strictMarketContextForSelection,
} from '@/lib/trader/marketFilters';
import { getFullSymbolUniverse, type TraderCatalogSymbol } from '@/lib/trader/marketCatalog';
import { TRADER_FUND_FILTERS, fundTypeLabel, normalizeFundFilter } from '@/lib/trader/fundTypes';
import { resolveTraderMarketContext, traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { fetchTraderQuotesDetailed, getConnectedProvider, resolveTraderMarketDynamic } from '@/lib/trader/marketQuotes';

export const dynamic = 'force-dynamic';

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value === '') return fallback;
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

const SELECTION_EMPTY_STATE = {
  ar: 'لا توجد أصول مطابقة لهذا السوق أو التصنيف حالياً',
  en: 'No matching assets for this market or category right now',
};

const FUND_EMPTY_STATE = {
  ar: 'لا توجد صناديق مطابقة لهذا السوق أو التصنيف حالياً',
  en: 'No matching funds for this market or category right now',
};

const FUND_PROVIDER_COVERAGE_NOTE = {
  ar: 'قد لا يدعم المزود الحالي جميع أنواع الصناديق',
  en: 'The current provider may not support all fund types',
};

function normalizeRecommendationCategory(value: string | null) {
  return normalizeSelectedCategoryKey(value);
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

type RecommendationSortKey = 'symbol' | 'name' | 'priceAvailability' | 'marketCap' | 'volume';

function normalizeSortKey(value: string | null): RecommendationSortKey {
  const normalized = String(value ?? '').trim();
  if (['symbol', 'name', 'priceAvailability', 'marketCap', 'volume'].includes(normalized)) {
    return normalized as RecommendationSortKey;
  }
  if (normalized === 'displaySymbol' || normalized === 'providerSymbol') return 'symbol';
  return 'symbol';
}

function sortDirection(value: string | null) {
  return String(value ?? '').trim().toLowerCase() === 'desc' ? 'desc' as const : 'asc' as const;
}

function symbolSortValue(symbol: TraderCatalogSymbol, key: RecommendationSortKey) {
  if (key === 'name') return normalizeSymbol(symbol.name);
  return normalizeSymbol(symbol.symbol);
}

function sortSymbolMeta(rows: TraderCatalogSymbol[], key: RecommendationSortKey, dir: 'asc' | 'desc') {
  if (key === 'priceAvailability' || key === 'marketCap' || key === 'volume') return rows;
  const multiplier = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => multiplier * (
    symbolSortValue(a, key).localeCompare(symbolSortValue(b, key))
    || normalizeSymbol(a.symbol).localeCompare(normalizeSymbol(b.symbol))
  ));
}

function nullableNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recommendationSortNumber(row: Record<string, unknown>, key: RecommendationSortKey) {
  if (key === 'priceAvailability') return row.available === true && nullableNumber(row.price) !== null ? 1 : 0;
  if (key === 'marketCap') return nullableNumber(row.marketCap);
  if (key === 'volume') return nullableNumber(row.volume);
  return null;
}

function sortRecommendations<T extends Record<string, unknown>>(rows: T[], key: RecommendationSortKey, dir: 'asc' | 'desc') {
  const multiplier = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === 'symbol') {
      return multiplier * (normalizeSymbol(a.displaySymbol ?? a.symbol).localeCompare(normalizeSymbol(b.displaySymbol ?? b.symbol)));
    }
    if (key === 'name') {
      return multiplier * (normalizeSymbol(a.name).localeCompare(normalizeSymbol(b.name)));
    }
    const av = recommendationSortNumber(a, key);
    const bv = recommendationSortNumber(b, key);
    if (av === null && bv === null) return normalizeSymbol(a.symbol).localeCompare(normalizeSymbol(b.symbol));
    if (av === null) return 1;
    if (bv === null) return -1;
    return multiplier * (av - bv);
  });
}

function availabilityFilter(value: string | null) {
  const normalized = String(value ?? 'all').trim().toLowerCase();
  if (['with-price', 'available', 'price-available'].includes(normalized)) return 'with-price';
  if (['price-unavailable', 'unavailable', 'missing-price'].includes(normalized)) return 'price-unavailable';
  if (normalized === 'failed') return 'failed';
  return 'all';
}

function filterByAvailability<T extends Record<string, unknown>>(rows: T[], value: string) {
  if (value === 'with-price') return rows.filter(row => row.available === true && nullableNumber(row.price) !== null);
  if (value === 'price-unavailable') return rows.filter(row => row.available !== true || nullableNumber(row.price) === null);
  if (value === 'failed') return rows.filter(row => row.unavailableReason || row.available !== true);
  return rows;
}

function uniqueSorted(values: Array<unknown>) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

function universeFilterOptions(rows: TraderCatalogSymbol[]) {
  return {
    exchanges: uniqueSorted(rows.flatMap(row => [row.exchange, row.exchangeCode]).filter(Boolean)),
    currencies: uniqueSorted(rows.map(row => row.currency)),
    sectors: uniqueSorted(rows.map(row => row.sector)),
    industries: uniqueSorted(rows.map(row => row.industry)),
    assetTypes: uniqueSorted(rows.map(row => row.assetType)),
    fundTypes: uniqueSorted(rows.map(row => row.fundType)),
    fundFilters: TRADER_FUND_FILTERS,
    markets: uniqueSorted(rows.flatMap(row => row.marketIds)),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceFresh = url.searchParams.has('refresh');
  const discover = url.searchParams.has('discover');
  const marketId = url.searchParams.get('market');
  const selectedCategory = normalizeRecommendationCategory(
    url.searchParams.get('category') ?? url.searchParams.get('assetType') ?? url.searchParams.get('asset_type'),
  );
  const selectedExchangeFilter = url.searchParams.get('exchange') ?? url.searchParams.get('selectedExchange');
  const selectedCurrencyFilter = url.searchParams.get('currency') ?? url.searchParams.get('selectedCurrency');
  const selectedSectorName = url.searchParams.get('sectorName') ?? url.searchParams.get('sectorFilter');
  const selectedIndustry = url.searchParams.get('industry');
  const selectedAssetType = url.searchParams.get('assetType') ?? url.searchParams.get('asset_type');
  const selectedFundType = normalizeFundFilter(
    url.searchParams.get('fundType')
      ?? url.searchParams.get('fund_type')
      ?? url.searchParams.get('fundCategory')
      ?? url.searchParams.get('fund_category'),
  );
  const selectedAvailability = availabilityFilter(url.searchParams.get('availability') ?? url.searchParams.get('dataAvailability'));
  const sortKey = normalizeSortKey(url.searchParams.get('sort') ?? url.searchParams.get('sortKey'));
  const sortDir = sortDirection(url.searchParams.get('dir') ?? url.searchParams.get('sortDir'));
  const { market, catalog } = await resolveTraderMarketDynamic(url.searchParams.get('market'), {
    forceFresh,
    includeFmpDiscovery: discover && Boolean(marketId),
  });
  const selectedSector = url.searchParams.get('sector') ?? url.searchParams.get('selectedSector') ?? url.searchParams.get('selected_sector');
  const universe = await getFullSymbolUniverse({
    market: marketId ?? market.id,
    sector: selectedSector,
    category: selectedCategory,
    exchange: selectedExchangeFilter,
    currency: selectedCurrencyFilter,
    sectorName: selectedSectorName,
    industry: selectedIndustry,
    assetType: selectedAssetType,
    fundType: selectedFundType,
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
        symbol.fundType,
        symbol.fundName,
        symbol.issuer,
      ].some(value => normalizeSymbol(value).includes(search)))
    : sourceMeta;
  const filteredMeta = shariahStatus
    ? searchedMeta.filter(symbol => symbol.shariahStatus === shariahStatus)
    : searchedMeta;
  const sortedMeta = sortSymbolMeta(filteredMeta, sortKey, sortDir);
  const offset = requestedSymbols.length ? 0 : (page - 1) * pageSize;
  const selectedMeta = sortedMeta.slice(offset, offset + pageSize);
  const symbols = selectedMeta.map(symbol => symbol.symbol);
  const pageKeySet = new Set(selectedMeta.flatMap(symbol => [
    normalizeSymbol(symbol.symbol),
    normalizeSymbol(symbol.providerSymbol),
    ...symbol.aliases.map(normalizeSymbol),
  ]));
  const entryBySymbol = new Map(universe.entries.map(entry => [normalizeSymbol(entry.symbol), entry]));
  const metaBySymbol = new Map<string, TraderCatalogSymbol>();
  for (const symbol of universe.symbolMeta) {
    [
      symbol.symbol,
      symbol.displaySymbol,
      symbol.providerSymbol,
      ...symbol.aliases,
    ].forEach(value => {
      const key = normalizeSymbol(value);
      if (key) metaBySymbol.set(key, symbol);
    });
  }
  const metaForQuote = (quote: Record<string, unknown>) => [
    quote.symbol,
    quote.requestedSymbol,
    quote.canonicalSymbol,
    quote.displaySymbol,
    quote.providerSymbol,
    quote.providerSymbolUsed,
  ].map(normalizeSymbol).map(key => metaBySymbol.get(key)).find(Boolean);

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
  const available = filterAssetsBySelection(inPageUniverse, marketFilterSelection, selectedCategory);
  const excludedBySelection = inPageUniverse
    .map(q => ({ quote: q, decision: assetSelectionDecision(q, marketFilterSelection, selectedCategory) }))
    .filter(item => !item.decision.allowed);
  if (process.env.NODE_ENV === 'development' && excludedBySelection.length) {
    const strictMarketContext = strictMarketContextForSelection(marketFilterSelection);
    const excluded = excludedBySelection.map(({ quote, decision }) => {
      const quoteRecord = quote as typeof quote & Record<string, unknown>;
      return {
        symbol: quote.symbol,
        exchange: quote.exchange,
        market: quote.market,
        country: quote.country,
        currency: quote.currency,
        assetType: quote.assetType,
        sector: quoteRecord.sector,
        industry: quoteRecord.industry,
        category: selectedCategory,
        reason: decision.reason,
      };
    });
    if (strictMarketContext) {
      console.warn(`[recommendations] Excluded assets outside ${strictMarketContext.country} / ${strictMarketContext.currency} selection.`, excluded);
    } else if (selectedCategory === 'technology') {
      console.warn('[recommendations] Excluded non-technology assets from technology selection.', excluded);
    }
  }
  const connectedProvider = getConnectedProvider();
  const placeholderProvider = quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider;

  const mappedRecommendations = available.map(q => {
    const quoteRecord = q as typeof q & Record<string, unknown>;
    const meta = metaForQuote(quoteRecord);
    const label = meta?.fundType ? fundTypeLabel(meta.fundType) : null;
    const tradeable = q.available === true
      && nullableNumber(q.price) !== null
      && nullableNumber(q.targetPrice ?? q.target1) !== null
      && nullableNumber(q.stopLoss) !== null
      && q.signalAvailable !== false
      && q.technicalAvailable !== false
      && q.dataQuality !== 'unavailable';
    return ({
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
    fundType: meta?.fundType ?? quoteRecord.fundType,
    fundTypeLabelAr: meta?.fundTypeLabelAr ?? label?.ar,
    fundTypeLabelEn: meta?.fundTypeLabelEn ?? label?.en,
    fundStructure: meta?.fundStructure ?? quoteRecord.fundStructure,
    fundName: meta?.fundName ?? quoteRecord.fundName ?? q.name,
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
    sector: quoteRecord.sector ?? entryBySymbol.get(normalizeSymbol(q.symbol))?.sector,
    industry: quoteRecord.industry ?? entryBySymbol.get(normalizeSymbol(q.symbol))?.industry,
    companyName: q.name,
    issuer: meta?.issuer ?? quoteRecord.issuer,
    expenseRatio: nullableNumber(quoteRecord.expenseRatio ?? meta?.expenseRatio),
    distributionYield: nullableNumber(quoteRecord.distributionYield ?? quoteRecord.yield ?? meta?.distributionYield),
    nav: nullableNumber(quoteRecord.nav ?? meta?.nav),
    aum: nullableNumber(quoteRecord.aum ?? meta?.aum),
    marketCap: nullableNumber(quoteRecord.marketCap),
    volume: nullableNumber(quoteRecord.volume),
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
    tradeable,
    canFollowTrade: tradeable,
    unavailableReason: q.unavailableReason ?? null,
    dataAvailability: meta?.dataAvailability ?? quoteRecord.dataAvailability,
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
    });
  });
  const mappedRecommendationKeys = new Set(mappedRecommendations.flatMap(row => [
    normalizeSymbol(row.symbol),
    normalizeSymbol(row.providerSymbol),
    normalizeSymbol(row.providerSymbolUsed),
    normalizeSymbol(row.displaySymbol),
    normalizeSymbol(row.canonicalSymbol),
    normalizeSymbol(row.requestedSymbol),
  ]).filter(Boolean));
  const unavailableMetadataRows = selectedMeta
    .filter(symbol => ![
      symbol.symbol,
      symbol.providerSymbol,
      ...symbol.aliases,
    ].some(value => mappedRecommendationKeys.has(normalizeSymbol(value))))
    .map(symbol => ({
      symbol: symbol.symbol,
      requestedSymbol: symbol.symbol,
      canonicalSymbol: symbol.symbol,
      displaySymbol: symbol.displaySymbol,
      providerSymbol: symbol.providerSymbol,
      providerSymbolUsed: symbol.providerSymbol,
      provider: placeholderProvider,
      fallbackUsed: false,
      name: symbol.name,
      assetType: symbol.assetType,
      fundType: symbol.fundType,
      fundTypeLabelAr: symbol.fundTypeLabelAr,
      fundTypeLabelEn: symbol.fundTypeLabelEn,
      fundStructure: symbol.fundStructure,
      fundName: symbol.fundName,
      price: null,
      currentPrice: null,
      change: null,
      changePercent: null,
      previousClose: null,
      currency: symbol.currency,
      exchange: symbol.exchange,
      exchangeCode: symbol.exchangeCode,
      market: symbol.market,
      country: symbol.country,
      sector: symbol.sector,
      industry: symbol.industry,
      companyName: symbol.name,
      issuer: symbol.issuer,
      expenseRatio: symbol.expenseRatio,
      distributionYield: symbol.distributionYield,
      nav: symbol.nav,
      aum: symbol.aum,
      marketCap: null,
      volume: null,
      metadataDiagnostics: symbol.metadataDiagnostics,
      signal: null,
      signalAvailable: false,
      targetPrice: null,
      target1: null,
      stopLoss: null,
      confidence: null,
      aiConfidence: null,
      riskLevel: null,
      technicalAvailable: false,
      chartAvailable: false,
      providerStatus: {
        provider: placeholderProvider,
        status: 'empty',
        configured: connectedProvider.configured,
        fallbackUsed: false,
      },
      source: symbol.source,
      delayed: false,
      available: false,
      tradeable: false,
      canFollowTrade: false,
      unavailableReason: 'all_providers_returned_no_quote',
      dataAvailability: symbol.dataAvailability,
      dataQuality: 'unavailable',
      lastUpdated: quoteLoad.generatedAt,
      updatedAt: quoteLoad.generatedAt,
      shariahStatus: symbol.shariahStatus,
      shariahReason: symbol.shariahReason,
      shariahSource: symbol.shariahSource,
      shariahLastReviewedAt: symbol.shariahLastReviewedAt,
      shariahManualOverride: symbol.shariahManualOverride,
      shariahReviewedBy: symbol.shariahReviewedBy,
      shariahScreeningData: symbol.shariahScreeningData,
      shariahMethod: symbol.shariahMethod,
      shariaStatus: symbol.shariahStatus,
      shariaSource: symbol.shariahSource,
      shariaCheckedAt: symbol.shariahLastReviewedAt,
    }));
  const pageRecommendations = [...mappedRecommendations, ...unavailableMetadataRows];
  const recommendations = sortRecommendations(
    filterByAvailability(pageRecommendations, selectedAvailability),
    sortKey,
    sortDir,
  );
  const availablePriceCount = pageRecommendations.filter(row => row.available === true && nullableNumber(row.price) !== null).length;
  const unavailableCount = pageRecommendations.length - availablePriceCount;
  const unavailable = pageRecommendations
    .filter(row => row.available !== true || nullableNumber(row.price) === null)
    .map(row => ({ symbol: row.symbol, name: row.name, reason: row.unavailableReason ?? 'provider_returned_empty_quote' }));
  const primaryQuote = available.find(q => q.available && q.price !== null) ?? available[0] ?? null;
  const primaryMeta = selectedMeta[0] ?? universe.symbolMeta[0] ?? null;
  const configuredQuoteProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const fundUniverseSelected = market.id === 'etfs' || selectedCategory === 'fund' || selectedFundType !== 'all';
  const emptyStateCopy = fundUniverseSelected ? FUND_EMPTY_STATE : SELECTION_EMPTY_STATE;
  const strictMarketContext = strictMarketContextForSelection(marketFilterSelection);
  const selectedExchange = strictMarketContext?.exchange
    ?? url.searchParams.get('exchange')
    ?? url.searchParams.get('selectedExchange')
    ?? market.family;
  const selectedCurrency = strictMarketContext?.currency
    ?? url.searchParams.get('currency')
    ?? url.searchParams.get('selectedCurrency')
    ?? market.currency;
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
    message: recommendations.length ? null : emptyStateCopy.ar,
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
    selectedFundType,
    emptyState: recommendations.length === 0 ? emptyStateCopy : null,
    providerFundCoverageNote: fundUniverseSelected ? FUND_PROVIDER_COVERAGE_NOTE : null,
    providerUsage,
    availableProviders: marketContext.availableProviders,
    recommendations,
    unavailable,
    excludedByMarket: excludedBySelection.map(({ quote, decision }) => {
      const quoteRecord = quote as typeof quote & Record<string, unknown>;
      return {
        symbol: quote.symbol,
        exchange: quote.exchange,
        market: quote.market,
        country: quote.country,
        currency: quote.currency,
        assetType: quote.assetType,
        sector: quoteRecord.sector,
        industry: quoteRecord.industry,
        category: selectedCategory,
        reason: decision.reason,
      };
    }),
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
      fundCoverageNote: fundUniverseSelected ? FUND_PROVIDER_COVERAGE_NOTE : null,
      dataCoverage: `${availablePriceCount}/${recommendations.length}`,
      provider: quoteLoad.provider ?? connectedProvider.active ?? connectedProvider.provider,
      filterOptions: universeFilterOptions(filteredMeta),
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
      selectedFundType,
      availablePriceCount,
      unavailableCount,
      unavailablePriceCount: unavailableCount,
      failedCount: quoteLoad.failed.length,
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
    coverage: {
      totalDiscovered: catalog.diagnostics.totalSymbolsDiscovered,
      totalMarketSymbols: universe.total,
      totalFilteredSymbols: filteredMeta.length,
      loaded: selectedMeta.length,
      availableWithPrice: availablePriceCount,
      unavailablePrice: unavailableCount,
      failed: quoteLoad.failed.length,
      lastUpdated: quoteLoad.generatedAt,
      fundCoverageNote: fundUniverseSelected ? FUND_PROVIDER_COVERAGE_NOTE : null,
    },
    filterOptions: universeFilterOptions(filteredMeta),
    resultCount: recommendations.length,
    priceResultCount: availablePriceCount,
    message: diagnostic.message,
    legacyOk: true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { resolveTraderMarketContext, traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { getConnectedProvider } from '@/lib/trader/marketQuotes';
import { getSymbolsForMarketOrSector, getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

export const dynamic = 'force-dynamic';

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function availableQuoteProviders(capabilityMatrix: Record<string, { configured?: boolean; healthy?: boolean; supportsQuotes?: boolean; status?: string }>) {
  return Array.from(new Set(Object.entries(capabilityMatrix)
    .filter(([, capability]) => capability.supportsQuotes !== false
      && (capability.configured === true || capability.healthy === true || capability.status === 'healthy'))
    .map(([provider]) => traderProviderDisplayName(provider))
    .filter((provider): provider is string => Boolean(provider))));
}

function normalizeMarketCategory(value: string | null) {
  const category = String(value ?? 'all').trim().toLowerCase();
  if (!category || category === 'all' || category === 'all assets') return 'all';
  if (category === 'stocks' || category === 'equity' || category === 'equities') return 'stock';
  if (category === 'etf' || category === 'etfs' || category === 'funds') return 'fund';
  if (category === 'fx') return 'forex';
  if (category === 'metals') return 'commodity';
  return category;
}

function normalizeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedMarket = url.searchParams.get('market');
  const selectedSector = url.searchParams.get('sector') ?? url.searchParams.get('selectedSector') ?? url.searchParams.get('selected_sector');
  const selectedCategory = normalizeMarketCategory(
    url.searchParams.get('category') ?? url.searchParams.get('assetType') ?? url.searchParams.get('asset_type'),
  );
  const search = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const shariahStatus = normalizeShariahStatus(
    url.searchParams.get('shariahStatus') ?? url.searchParams.get('sharia_status') ?? url.searchParams.get('shariaStatus'),
    null,
  );
  const page = clampInteger(url.searchParams.get('page'), 1, 1, 10_000);
  const pageSize = clampInteger(url.searchParams.get('limit') ?? url.searchParams.get('pageSize'), selectedMarket || selectedSector || search ? 20 : 120, 1, 250);
  const catalog = await getTraderMarketCatalog({
    forceFresh: url.searchParams.has('refresh'),
    includeFmpDiscovery: url.searchParams.has('discover') && Boolean(selectedMarket),
    marketId: selectedMarket,
  });

  const universe = selectedMarket || selectedSector
    ? await getSymbolsForMarketOrSector({
        market: selectedMarket,
        sector: selectedSector,
        category: selectedCategory,
        catalog,
      })
    : null;
  const baseRows = universe?.symbolMeta ?? catalog.symbols;
  const searchedRows = search
    ? baseRows.filter(symbol => [
        symbol.symbol,
        symbol.providerSymbol,
        symbol.name,
        symbol.exchange,
        symbol.country,
        symbol.sector,
        symbol.industry,
      ].some(value => normalizeSymbol(value).includes(search)))
    : baseRows;
  const categoryRows = !universe && selectedCategory !== 'all'
    ? searchedRows.filter(symbol => symbol.assetType === selectedCategory)
    : searchedRows;
  const marketRows = shariahStatus
    ? categoryRows.filter(symbol => symbol.shariahStatus === shariahStatus)
    : categoryRows;

  const offset = (page - 1) * pageSize;
  const pagedRows = marketRows.slice(offset, offset + pageSize);
  const configuredQuoteProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const universeEntryBySymbol = new Map((universe?.entries ?? []).map(entry => [normalizeSymbol(entry.symbol), entry]));
  const groups = catalog.markets.map(market => ({
    ...market,
    marketContext: resolveTraderMarketContext({
      marketId: market.id,
      currency: market.currency,
      availableProviders: configuredQuoteProviders,
    }),
  }));

  const markets = pagedRows.map(symbol => {
    const universeEntry = universeEntryBySymbol.get(normalizeSymbol(symbol.symbol));
    const selectedRowMarket = universeEntry?.selectedMarket ?? selectedMarket ?? symbol.marketIds.find(id => id !== 'gcc') ?? symbol.marketIds[0];
    const market = catalog.markets.find(item => item.id === selectedRowMarket)
      ?? catalog.markets.find(item => symbol.marketIds.includes(item.id))
      ?? catalog.markets[0]!;
    const marketContext = resolveTraderMarketContext({
      marketId: market.id,
      assetType: symbol.assetType,
      currency: symbol.currency || market.currency,
      country: symbol.country,
      exchange: symbol.exchange,
      selectedSymbol: symbol.symbol,
      availableProviders: configuredQuoteProviders,
    });
    return {
      market: market.id,
      selectedMarket: universeEntry?.selectedMarket ?? market.id,
      selectedSector: universeEntry?.selectedSector ?? selectedSector ?? null,
      marketName: market.en,
      name: symbol.name || market.en,
      label: market.ar,
      symbol: symbol.symbol,
      providerSymbol: symbol.providerSymbol,
      providerSymbols: symbol.providerSymbols,
      assetType: symbol.assetType,
      sector: symbol.sector,
      industry: symbol.industry,
      exchange: symbol.exchange,
      exchangeCode: symbol.exchangeCode,
      catalogMarket: symbol.market,
      country: symbol.country,
      currency: symbol.currency || market.currency,
      source: symbol.source === 'fmp' ? 'FMP' : symbol.source,
      marketContext,
      metadataDiagnostics: symbol.metadataDiagnostics,
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
    };
  });
  const selectedUniverseMarket = universe?.selectedMarket ?? selectedMarket;
  const selectedUniverseSector = universe?.selectedSector ?? selectedSector;
  const selectedGroup = selectedUniverseMarket || selectedUniverseSector
    ? groups.find(market => market.id === selectedUniverseMarket || market.id === selectedUniverseSector)
    : groups[0];
  const marketContext = selectedGroup?.marketContext ?? resolveTraderMarketContext({
    marketId: selectedUniverseMarket ?? selectedUniverseSector ?? undefined,
    availableProviders: configuredQuoteProviders,
  });
  const provider = catalog.diagnostics.provider || getConnectedProvider().active || 'Market catalog';
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'symbols',
    provider: typeof provider === 'string' ? provider : 'Market catalog',
    providerStatus: 'available',
    data: markets,
    lastUpdated: catalog.diagnostics.generatedAt,
  });

  return NextResponse.json({
    ...diagnostic,
    markets,
    groups,
    marketContext,
    availableProviders: configuredQuoteProviders,
    dataProvider: getConnectedProvider(),
    capabilityMatrix: catalog.capabilityMatrix,
    diagnostics: catalog.diagnostics,
    marketUniverse: universe ? {
      selectedMarket: universe.selectedMarket,
      selectedSector: universe.selectedSector,
      category: universe.category,
      total: marketRows.length,
      universeTotal: universe.total,
      page,
      pageSize,
      returned: pagedRows.length,
      showing: offset + pagedRows.length,
      hasMore: offset + pagedRows.length < marketRows.length,
      symbols: pagedRows.map(symbol => universeEntryBySymbol.get(normalizeSymbol(symbol.symbol))).filter(Boolean),
      source: universe.source,
      provider,
      dataCoverage: `${pagedRows.length}/${marketRows.length}`,
    } : null,
    pagination: {
      page,
      pageSize,
      total: marketRows.length,
      hasMore: offset + pagedRows.length < marketRows.length,
      selectedMarket: selectedUniverseMarket,
      selectedSector: selectedUniverseSector,
      selectedCategory,
      search,
      shariahStatus,
    },
    loaded: pagedRows.map(symbol => ({
      symbol: symbol.symbol,
      provider: symbol.source,
      reason: 'symbol_discovered',
    })),
    failed: catalog.diagnostics.failedSymbols,
    skipped: catalog.diagnostics.unsupportedSymbols,
    provider: catalog.diagnostics.provider,
    reason: catalog.diagnostics.reason,
    resultCount: diagnostic.count,
    legacyOk: true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

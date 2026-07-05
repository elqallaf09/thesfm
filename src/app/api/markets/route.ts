import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { resolveTraderMarketContext, traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { getConnectedProvider } from '@/lib/trader/marketQuotes';
import { getSymbolsForMarketOrSector, getTraderMarketCatalog, type TraderCatalogSymbol } from '@/lib/trader/marketCatalog';

export const dynamic = 'force-dynamic';

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value === '') return fallback;
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

function normalizeDisplaySymbol(value: unknown) {
  const symbol = normalizeSymbol(value);
  const prefixed = symbol.match(/^(KW|SR|SA|AE|DU|AD|QA|BH|OM)[.: -]([A-Z0-9]{1,16})$/);
  if (prefixed) {
    const suffix = prefixed[1] === 'SA' ? 'SR' : prefixed[1];
    return `${prefixed[2]}.${suffix}`;
  }
  const suffixed = symbol.match(/^([A-Z0-9]{1,16})[.: -](KW|SR|SA|AE|DU|AD|QA|BH|OM)$/);
  if (suffixed) {
    const suffix = suffixed[2] === 'SA' ? 'SR' : suffixed[2];
    return `${suffixed[1]}.${suffix}`;
  }
  return symbol;
}

function publicSourceLabel(source: unknown) {
  const normalized = String(source ?? '').trim().toLowerCase();
  if (normalized === 'seed' || normalized === 'bundled') return 'Catalog';
  if (normalized === 'fmp') return 'FMP';
  if (normalized === 'supabase') return 'Supabase';
  return normalized || 'Catalog';
}

function marketSymbolWarnings(symbol: TraderCatalogSymbol) {
  const displaySymbol = normalizeDisplaySymbol(symbol.symbol);
  const providerSymbol = normalizeSymbol(symbol.providerSymbol);
  const warnings: string[] = [];
  if (!displaySymbol) warnings.push('missing_display_symbol');
  if (!providerSymbol) warnings.push('missing_provider_symbol');
  if (!symbol.name || normalizeSymbol(symbol.name) === displaySymbol || normalizeSymbol(symbol.name) === providerSymbol) warnings.push('missing_name');
  if (!symbol.currency) warnings.push('missing_currency');
  if (!symbol.marketIds.length) warnings.push('missing_market');
  return warnings;
}

function isCompleteMarketSymbol(symbol: TraderCatalogSymbol) {
  return marketSymbolWarnings(symbol).length === 0;
}

function dedupeMarketSymbols(rows: TraderCatalogSymbol[]) {
  const sourceRank: Record<string, number> = { supabase: 5, bundled: 4, fmp: 3, seed: 2 };
  const byDisplaySymbol = new Map<string, TraderCatalogSymbol>();
  let duplicateRows = 0;

  for (const row of rows) {
    const key = normalizeDisplaySymbol(row.symbol) || normalizeSymbol(row.providerSymbol);
    if (!key) continue;
    const existing = byDisplaySymbol.get(key);
    if (!existing) {
      byDisplaySymbol.set(key, row);
      continue;
    }

    duplicateRows += 1;
    const existingScore = (isCompleteMarketSymbol(existing) ? 10 : 0) + (sourceRank[existing.source] ?? 1);
    const nextScore = (isCompleteMarketSymbol(row) ? 10 : 0) + (sourceRank[row.source] ?? 1);
    if (nextScore > existingScore) byDisplaySymbol.set(key, row);
  }

  return {
    rows: Array.from(byDisplaySymbol.values()),
    duplicateRows,
  };
}

type MarketSortKey = 'displaySymbol' | 'name' | 'market' | 'currency' | 'source' | 'assetType' | 'exchange' | 'country' | 'providerSymbol';

function normalizeSortKey(value: string | null): MarketSortKey {
  const key = String(value ?? '').trim();
  if (['symbol', 'displaySymbol', 'name', 'market', 'currency', 'source', 'assetType', 'exchange', 'country', 'providerSymbol'].includes(key)) {
    return key === 'symbol' ? 'displaySymbol' : key as MarketSortKey;
  }
  return 'displaySymbol';
}

function sortValue(symbol: TraderCatalogSymbol, key: MarketSortKey) {
  if (key === 'displaySymbol') return normalizeDisplaySymbol(symbol.symbol);
  if (key === 'providerSymbol') return normalizeSymbol(symbol.providerSymbol);
  if (key === 'market') return symbol.marketIds[0] ?? '';
  if (key === 'source') return publicSourceLabel(symbol.source);
  if (key === 'name') return normalizeSymbol(symbol.name);
  if (key === 'currency') return normalizeSymbol(symbol.currency);
  if (key === 'assetType') return normalizeSymbol(symbol.assetType);
  if (key === 'exchange') return normalizeSymbol(symbol.exchange);
  if (key === 'country') return normalizeSymbol(symbol.country);
  return normalizeDisplaySymbol(symbol.symbol);
}

function sortMarketSymbols(rows: TraderCatalogSymbol[], key: MarketSortKey, direction: 'asc' | 'desc') {
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    return multiplier * (av.localeCompare(bv) || normalizeDisplaySymbol(a.symbol).localeCompare(normalizeDisplaySymbol(b.symbol)));
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedMarket = url.searchParams.get('market');
  const selectedSector = url.searchParams.get('sector') ?? url.searchParams.get('selectedSector') ?? url.searchParams.get('selected_sector');
  const selectedCategory = normalizeMarketCategory(
    url.searchParams.get('category') ?? url.searchParams.get('assetType') ?? url.searchParams.get('asset_type'),
  );
  const searchInput = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const search = normalizeDisplaySymbol(searchInput);
  const shariahStatus = normalizeShariahStatus(
    url.searchParams.get('shariahStatus') ?? url.searchParams.get('sharia_status') ?? url.searchParams.get('shariaStatus'),
    null,
  );
  const sourceFilter = String(url.searchParams.get('source') ?? 'all').trim().toLowerCase();
  const currencyFilter = normalizeSymbol(url.searchParams.get('currency') ?? 'all');
  const qualityFilter = String(url.searchParams.get('quality') ?? 'complete').trim().toLowerCase();
  const sortKey = normalizeSortKey(url.searchParams.get('sort') ?? url.searchParams.get('sortKey'));
  const sortDir = String(url.searchParams.get('dir') ?? url.searchParams.get('sortDir')).trim().toLowerCase() === 'desc' ? 'desc' : 'asc';
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
        normalizeDisplaySymbol(symbol.symbol),
        symbol.providerSymbol,
        symbol.name,
        symbol.exchange,
        symbol.country,
        symbol.sector,
        symbol.industry,
      ].some(value => normalizeSymbol(value).includes(search) || normalizeSymbol(value).includes(searchInput)))
    : baseRows;
  const categoryRows = !universe && selectedCategory !== 'all'
    ? searchedRows.filter(symbol => symbol.assetType === selectedCategory)
    : searchedRows;
  const marketRows = shariahStatus
    ? categoryRows.filter(symbol => symbol.shariahStatus === shariahStatus)
    : categoryRows;
  const deduped = dedupeMarketSymbols(marketRows);
  const sourceRows = sourceFilter && sourceFilter !== 'all'
    ? deduped.rows.filter(symbol => symbol.source === sourceFilter || publicSourceLabel(symbol.source).toLowerCase() === sourceFilter)
    : deduped.rows;
  const currencyRows = currencyFilter && currencyFilter !== 'ALL'
    ? sourceRows.filter(symbol => normalizeSymbol(symbol.currency) === currencyFilter)
    : sourceRows;
  const completeRows = currencyRows.filter(isCompleteMarketSymbol);
  const incompleteRows = currencyRows.filter(symbol => !isCompleteMarketSymbol(symbol));
  const qualityRows = qualityFilter === 'all'
    ? currencyRows
    : qualityFilter === 'incomplete'
      ? incompleteRows
      : completeRows;
  const sortedRows = sortMarketSymbols(qualityRows, sortKey, sortDir);

  const offset = (page - 1) * pageSize;
  const pagedRows = sortedRows.slice(offset, offset + pageSize);
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
    const displaySymbol = normalizeDisplaySymbol(symbol.symbol);
    const providerSymbol = normalizeSymbol(symbol.providerSymbol);
    const qualityWarnings = marketSymbolWarnings(symbol);
    const displayName = qualityWarnings.includes('missing_name') ? null : symbol.name;
    return {
      market: market.id,
      selectedMarket: universeEntry?.selectedMarket ?? market.id,
      selectedSector: universeEntry?.selectedSector ?? selectedSector ?? null,
      marketName: market.en,
      name: displayName ?? symbol.name ?? market.en,
      displayName,
      label: market.ar,
      symbol: displaySymbol,
      displaySymbol,
      providerSymbol,
      providerSymbols: symbol.providerSymbols,
      assetType: symbol.assetType,
      sector: symbol.sector,
      industry: symbol.industry,
      exchange: symbol.exchange,
      exchangeCode: symbol.exchangeCode,
      catalogMarket: symbol.market,
      country: symbol.country,
      currency: symbol.currency || market.currency,
      source: publicSourceLabel(symbol.source),
      sourceType: symbol.source,
      isComplete: qualityWarnings.length === 0,
      qualityWarnings,
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
      total: sortedRows.length,
      universeTotal: universe.total,
      page,
      pageSize,
      returned: pagedRows.length,
      showing: offset + pagedRows.length,
      hasMore: offset + pagedRows.length < sortedRows.length,
      symbols: pagedRows.map(symbol => universeEntryBySymbol.get(normalizeSymbol(symbol.symbol))).filter(Boolean),
      source: universe.source,
      provider,
      dataCoverage: `${pagedRows.length}/${sortedRows.length}`,
    } : null,
    pagination: {
      page,
      pageSize,
      total: sortedRows.length,
      hasMore: offset + pagedRows.length < sortedRows.length,
      selectedMarket: selectedUniverseMarket,
      selectedSector: selectedUniverseSector,
      selectedCategory,
      search,
      shariahStatus,
      source: sourceFilter || 'all',
      currency: currencyFilter || 'all',
      quality: qualityFilter === 'all' || qualityFilter === 'incomplete' ? qualityFilter : 'complete',
      sort: sortKey,
      dir: sortDir,
    },
    providerMarketsDiagnostics: {
      totalRows: deduped.rows.length,
      visibleRows: sortedRows.length,
      completeRows: completeRows.length,
      incompleteRows: incompleteRows.length,
      duplicateRows: deduped.duplicateRows,
      hiddenIncompleteRows: qualityFilter === 'all' || qualityFilter === 'incomplete' ? 0 : incompleteRows.length,
      defaultPageSize: 25,
      sources: catalog.diagnostics.sources,
    },
    loaded: pagedRows.map(symbol => ({
      symbol: normalizeDisplaySymbol(symbol.symbol),
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

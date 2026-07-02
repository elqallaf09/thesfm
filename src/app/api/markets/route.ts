import { NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { normalizeShariahStatus } from '@/lib/market/shariah-screening';
import { resolveTraderMarketContext, traderProviderDisplayName } from '@/lib/trader/marketMetadata';
import { getConnectedProvider } from '@/lib/trader/marketQuotes';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedMarket = url.searchParams.get('market');
  const search = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const shariahStatus = normalizeShariahStatus(
    url.searchParams.get('shariahStatus') ?? url.searchParams.get('sharia_status') ?? url.searchParams.get('shariaStatus'),
    null,
  );
  const page = clampInteger(url.searchParams.get('page'), 1, 1, 10_000);
  const pageSize = clampInteger(url.searchParams.get('limit') ?? url.searchParams.get('pageSize'), selectedMarket || search ? 100 : 120, 1, 250);
  const catalog = await getTraderMarketCatalog({
    forceFresh: url.searchParams.has('refresh'),
    includeFmpDiscovery: url.searchParams.has('discover') && Boolean(selectedMarket),
    marketId: selectedMarket,
  });

  const baseRows = selectedMarket
    ? catalog.symbols.filter(symbol => symbol.marketIds.includes(selectedMarket))
    : search
      ? catalog.symbols.filter(symbol => symbol.symbol.includes(search) || symbol.name.toUpperCase().includes(search))
      : catalog.markets.flatMap(market => {
          const seedSymbols = new Set(market.symbols.slice(0, 6));
          return catalog.symbols.filter(symbol => symbol.marketIds.includes(market.id) && seedSymbols.has(symbol.symbol));
        });
  const marketRows = shariahStatus
    ? baseRows.filter(symbol => symbol.shariahStatus === shariahStatus)
    : baseRows;

  const offset = (page - 1) * pageSize;
  const pagedRows = marketRows.slice(offset, offset + pageSize);
  const configuredQuoteProviders = availableQuoteProviders(catalog.capabilityMatrix);
  const groups = catalog.markets.map(market => ({
    ...market,
    marketContext: resolveTraderMarketContext({
      marketId: market.id,
      currency: market.currency,
      availableProviders: configuredQuoteProviders,
    }),
  }));

  const markets = pagedRows.map(symbol => {
    const market = catalog.markets.find(item => symbol.marketIds.includes(item.id)) ?? catalog.markets[0]!;
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
      marketName: market.en,
      name: symbol.name || market.en,
      label: market.ar,
      symbol: symbol.symbol,
      providerSymbol: symbol.providerSymbol,
      providerSymbols: symbol.providerSymbols,
      assetType: symbol.assetType,
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
  const selectedGroup = selectedMarket
    ? groups.find(market => market.id === selectedMarket)
    : groups[0];
  const marketContext = selectedGroup?.marketContext ?? resolveTraderMarketContext({
    marketId: selectedMarket ?? undefined,
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
    pagination: {
      page,
      pageSize,
      total: marketRows.length,
      hasMore: offset + pagedRows.length < marketRows.length,
      selectedMarket,
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

import { NextResponse } from 'next/server';
import { getConnectedProvider } from '@/lib/trader/marketQuotes';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

export const dynamic = 'force-dynamic';

function clampInteger(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selectedMarket = url.searchParams.get('market');
  const search = String(url.searchParams.get('q') ?? url.searchParams.get('search') ?? '').trim().toUpperCase();
  const page = clampInteger(url.searchParams.get('page'), 1, 1, 10_000);
  const pageSize = clampInteger(url.searchParams.get('limit') ?? url.searchParams.get('pageSize'), selectedMarket || search ? 100 : 120, 1, 250);
  const catalog = await getTraderMarketCatalog({
    forceFresh: url.searchParams.has('refresh'),
    includeFmpDiscovery: url.searchParams.has('discover') && Boolean(selectedMarket),
    marketId: selectedMarket,
  });

  const marketRows = selectedMarket
    ? catalog.symbols.filter(symbol => symbol.marketIds.includes(selectedMarket))
    : search
      ? catalog.symbols.filter(symbol => symbol.symbol.includes(search) || symbol.name.toUpperCase().includes(search))
      : catalog.markets.flatMap(market => {
          const seedSymbols = new Set(market.symbols.slice(0, 6));
          return catalog.symbols.filter(symbol => symbol.marketIds.includes(market.id) && seedSymbols.has(symbol.symbol));
        });

  const offset = (page - 1) * pageSize;
  const pagedRows = marketRows.slice(offset, offset + pageSize);

  const markets = pagedRows.map(symbol => {
    const market = catalog.markets.find(item => symbol.marketIds.includes(item.id)) ?? catalog.markets[0]!;
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
      country: symbol.country,
      currency: symbol.currency || market.currency,
      source: symbol.source === 'fmp' ? 'FMP' : symbol.source,
    };
  });

  return NextResponse.json({
    ok: true,
    markets,
    groups: catalog.markets,
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
    resultCount: markets.length,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

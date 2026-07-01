import { NextResponse } from 'next/server';
import { getConnectedProvider } from '@/lib/trader/marketQuotes';
import { getTraderMarketCatalog } from '@/lib/trader/marketCatalog';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const catalog = await getTraderMarketCatalog({
    forceFresh: url.searchParams.has('refresh') || url.searchParams.has('discover'),
  });

  const markets = catalog.markets.flatMap(market =>
    catalog.symbols
      .filter(symbol => symbol.marketIds.includes(market.id))
      .map(symbol => ({
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
      })),
  );

  return NextResponse.json({
    ok: true,
    markets,
    groups: catalog.markets,
    dataProvider: getConnectedProvider(),
    capabilityMatrix: catalog.capabilityMatrix,
    diagnostics: catalog.diagnostics,
    loaded: catalog.symbols.map(symbol => ({
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

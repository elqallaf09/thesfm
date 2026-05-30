import { GULF_MARKETS, type GulfMarket, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';

export type GulfMarketData = {
  market: GulfMarketId;
  code: GulfMarket['code'];
  name: string;
  indexName: string;
  requestedSymbol: string | null;
  symbolUsed: string | null;
  value: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  marketTime: string | null;
  source: string;
  status: 'available' | 'unavailable';
  available: boolean;
  delayed: true;
  updatedAt: string;
  unavailableReason?: string;
};

function unavailable(market: GulfMarket, unavailableReason = 'provider_symbol_not_configured'): GulfMarketData {
  return {
    market: market.id,
    code: market.code,
    name: market.nameAr,
    indexName: market.indexName,
    requestedSymbol: market.yahooSymbols[0] ?? null,
    symbolUsed: null,
    value: null,
    change: null,
    changePercent: null,
    currency: null,
    marketTime: null,
    source: 'Data provider',
    status: 'unavailable',
    available: false,
    delayed: true,
    updatedAt: new Date().toISOString(),
    unavailableReason,
  };
}

async function fetchYahooMarketData(market: GulfMarket): Promise<GulfMarketData> {
  if (market.yahooSymbols.length === 0) return unavailable(market);

  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: market.yahooSymbols[0],
    symbols: market.yahooSymbols,
    name: market.indexName,
    debugContext: {
      marketCode: market.code,
      market: market.id,
      symbolsTried: market.yahooSymbols,
    },
  });

  if (!quote.available) {
    return unavailable(market, quote.unavailableReason ?? 'provider_returned_empty_quote');
  }

  return {
    market: market.id,
    code: market.code,
    name: market.nameAr,
    indexName: market.indexName,
    requestedSymbol: quote.requestedSymbol,
    symbolUsed: quote.symbolUsed,
    value: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency,
    marketTime: quote.marketTime,
    source: quote.source,
    status: 'available',
    available: true,
    delayed: true,
    updatedAt: quote.marketTime ?? new Date().toISOString(),
  };
}

export async function fetchDelayedGulfMarketData() {
  const settled = await Promise.allSettled(GULF_MARKETS.map(market => fetchYahooMarketData(market)));
  return settled.reduce<Record<GulfMarketId, GulfMarketData>>((acc, result, index) => {
    const market = GULF_MARKETS[index];
    acc[market.id] = result.status === 'fulfilled'
      ? result.value
      : unavailable(market, result.reason instanceof Error ? result.reason.message : 'market_data_fetch_failed');
    return acc;
  }, {} as Record<GulfMarketId, GulfMarketData>);
}

export function gulfMarketDataToApiMarkets(marketData: Record<GulfMarketId, GulfMarketData>) {
  return GULF_MARKETS.map(market => {
    const data = marketData[market.id] ?? unavailable(market);
    return {
      code: market.code,
      name: data.name,
      indexName: data.indexName,
      requestedSymbol: data.requestedSymbol,
      symbolUsed: data.symbolUsed,
      value: data.value,
      change: data.change,
      changePercent: data.changePercent,
      currency: data.currency,
      marketTime: data.marketTime,
      source: data.source,
      delayed: data.delayed,
      available: data.available,
      unavailableReason: data.unavailableReason,
    };
  });
}

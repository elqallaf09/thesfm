import { EUROPE_MARKETS, type EuropeMarket, type EuropeMarketId } from '@/lib/europe/europeMarkets';
import { fetchYahooNormalizedQuote } from '@/lib/market/fetchYahooQuote';

export type EuropeMarketData = {
  market: EuropeMarketId;
  code: EuropeMarket['code'];
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

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
    console.info(message, meta);
  }
}

function unavailable(market: EuropeMarket, unavailableReason = 'provider_returned_empty_quote'): EuropeMarketData {
  return {
    market: market.id,
    code: market.code,
    indexName: market.indexName,
    requestedSymbol: market.yahooSymbols[0] ?? null,
    symbolUsed: null,
    value: null,
    change: null,
    changePercent: null,
    currency: null,
    marketTime: null,
    source: 'Yahoo Finance',
    status: 'unavailable',
    available: false,
    delayed: true,
    updatedAt: new Date().toISOString(),
    unavailableReason,
  };
}

async function fetchYahooMarketData(market: EuropeMarket): Promise<EuropeMarketData> {
  const quote = await fetchYahooNormalizedQuote({
    requestedSymbol: market.yahooSymbols[0] ?? market.indexName,
    symbols: market.yahooSymbols,
    name: market.indexName,
    debugContext: {
      marketCode: market.code,
      market: market.id,
      symbolsTried: market.yahooSymbols,
    },
  });

  devLog('[EuropeNews] Yahoo index attempt result', {
    marketCode: market.code,
    symbolsTried: market.yahooSymbols,
    parsedValue: quote.price,
    parsedChangePercent: quote.changePercent,
    symbolUsed: quote.symbolUsed,
    unavailableReason: quote.available ? null : quote.unavailableReason ?? 'provider_returned_empty_quote',
  });

  if (!quote.available) return unavailable(market, quote.unavailableReason ?? 'provider_returned_empty_quote');

  return {
    market: market.id,
    code: market.code,
    indexName: market.indexName,
    requestedSymbol: quote.requestedSymbol,
    symbolUsed: quote.symbolUsed,
    value: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    currency: quote.currency,
    marketTime: quote.marketTime,
    source: 'Yahoo Finance',
    status: 'available',
    available: true,
    delayed: true,
    updatedAt: quote.marketTime ?? new Date().toISOString(),
  };
}

export async function fetchEuropeDelayedMarketData() {
  const settled = await Promise.allSettled(EUROPE_MARKETS.map(market => fetchYahooMarketData(market)));
  return settled.reduce<Record<EuropeMarketId, EuropeMarketData>>((acc, result, index) => {
    const market = EUROPE_MARKETS[index];
    acc[market.id] = result.status === 'fulfilled'
      ? result.value
      : unavailable(market, result.reason instanceof Error ? result.reason.message : 'market_data_fetch_failed');
    return acc;
  }, {} as Record<EuropeMarketId, EuropeMarketData>);
}

export function europeMarketDataToApiMarkets(marketData: Partial<Record<EuropeMarketId, EuropeMarketData>>) {
  return EUROPE_MARKETS.map(market => {
    const data = marketData[market.id] ?? unavailable(market);
    return {
      code: data.code,
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

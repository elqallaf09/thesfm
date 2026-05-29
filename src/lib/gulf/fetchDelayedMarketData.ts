import { GULF_MARKETS, type GulfMarket, type GulfMarketId } from '@/lib/gulf/gulfMarkets';

export type GulfMarketData = {
  market: GulfMarketId;
  indexName: string;
  value: number | null;
  changePercent: number | null;
  source: string;
  status: 'available' | 'unavailable';
  delayed: true;
  updatedAt: string;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketTime?: number;
      };
    }>;
  };
};

function unavailable(market: GulfMarket, source = 'Free delayed data source unavailable'): GulfMarketData {
  return {
    market: market.id,
    indexName: market.indexName,
    value: null,
    changePercent: null,
    source,
    status: 'unavailable',
    delayed: true,
    updatedAt: new Date().toISOString(),
  };
}

async function fetchYahooMarketData(market: GulfMarket): Promise<GulfMarketData> {
  if (!market.yahooSymbol) return unavailable(market);

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(market.yahooSymbol)}?range=2d&interval=1d`,
      {
        next: { revalidate: 300 },
        headers: { accept: 'application/json' },
      },
    );
    if (!response.ok) return unavailable(market, `Yahoo Finance delayed (${response.status})`);

    const json = await response.json() as YahooChartResponse;
    const meta = json.chart?.result?.[0]?.meta;
    const value = Number(meta?.regularMarketPrice ?? 0);
    const previous = Number(meta?.chartPreviousClose ?? meta?.previousClose ?? 0);
    if (!Number.isFinite(value) || value <= 0) return unavailable(market, 'Yahoo Finance delayed');

    const changePercent = previous > 0 ? ((value - previous) / previous) * 100 : null;
    return {
      market: market.id,
      indexName: market.indexName,
      value,
      changePercent: changePercent === null || Number.isFinite(changePercent) ? changePercent : null,
      source: 'Yahoo Finance delayed',
      status: 'available',
      delayed: true,
      updatedAt: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString(),
    };
  } catch {
    return unavailable(market, 'Yahoo Finance delayed');
  }
}

export async function fetchDelayedGulfMarketData() {
  const settled = await Promise.allSettled(GULF_MARKETS.map(market => fetchYahooMarketData(market)));
  return settled.reduce<Record<GulfMarketId, GulfMarketData>>((acc, result, index) => {
    const market = GULF_MARKETS[index];
    acc[market.id] = result.status === 'fulfilled' ? result.value : unavailable(market);
    return acc;
  }, {} as Record<GulfMarketId, GulfMarketData>);
}


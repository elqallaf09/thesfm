import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';

export const revalidate = 300;
export const dynamic = 'force-dynamic';


const GROWTH_TICKER_SYMBOLS = [
  'NVDA',
  'MSFT',
  'GOOGL',
  'AMZN',
  'META',
  'TSLA',
  'AMD',
  'PLTR',
  'DDOG',
  'NOW',
  'RBLX',
] as const;

const GROWTH_TICKER_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA',
  MSFT: 'Microsoft',
  AAPL: 'Apple',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet',
  META: 'Meta Platforms',
  TSLA: 'Tesla',
  AVGO: 'Broadcom',
  AMD: 'Advanced Micro Devices',
  PLTR: 'Palantir',
  SNOW: 'Snowflake',
  NOW: 'ServiceNow',
  CRM: 'Salesforce',
  SHOP: 'Shopify',
  UBER: 'Uber',
  MELI: 'MercadoLibre',
  DDOG: 'Datadog',
  NET: 'Cloudflare',
  CRWD: 'CrowdStrike',
  RBLX: 'Roblox',
  ABNB: 'Airbnb',
};

export async function GET() {
  const config = getStockCategoryConfig('growth');
  const stocksBySymbol = new Map((config?.watchlist ?? []).map(stock => [stock.symbol, stock]));
  const watchlist = GROWTH_TICKER_SYMBOLS.map(symbol => ({
    symbol,
    name: stocksBySymbol.get(symbol)?.name ?? GROWTH_TICKER_NAMES[symbol] ?? symbol,
  }));

  const buildItems = (prices?: Awaited<ReturnType<typeof fetchStockPrices>>) =>
    watchlist.map(stock => toResilientTickerItem(stock, prices?.get(stock.symbol)));

  try {
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    const items = buildItems(prices);

    return NextResponse.json(
      {
        ok: true,
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        available_count: items.filter(item => item.available).length,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[GrowthStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: true,
        code: 'GROWTH_TICKER_DEGRADED',
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        available_count: 0,
        items: buildItems(),
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    );
  }
}

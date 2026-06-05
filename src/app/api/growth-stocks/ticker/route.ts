import { NextResponse } from 'next/server';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

const GROWTH_TICKER_SYMBOLS = [
  'NVDA',
  'MSFT',
  'AAPL',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'AVGO',
  'AMD',
  'PLTR',
  'SNOW',
  'NOW',
  'CRM',
  'SHOP',
  'UBER',
  'MELI',
  'DDOG',
  'NET',
  'CRWD',
  'RBLX',
  'ABNB',
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

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'GROWTH_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const stocksBySymbol = new Map(config.watchlist.map(stock => [stock.symbol, stock]));
    const watchlist = GROWTH_TICKER_SYMBOLS.map(symbol => ({
      symbol,
      name: stocksBySymbol.get(symbol)?.name ?? GROWTH_TICKER_NAMES[symbol] ?? symbol,
    }));
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    const items = watchlist
      .map(stock => {
        const price = prices.get(stock.symbol);
        if (!isUsableMarketPrice(price)) return null;
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: price.price,
          currency: 'USD',
          change: price.change,
          changePercent: price.changePercent,
          source: price.source,
          delayed: price.delayed,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: 'GROWTH_TICKER_UNAVAILABLE',
          updated_at: null,
          source: 'Finnhub/Yahoo Finance fallback',
          items: [],
        },
        {
          headers: {
            'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        source: 'Finnhub/Yahoo Finance fallback',
        updated_at: new Date().toISOString(),
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
        ok: false,
        code: 'GROWTH_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        items: [],
      },
      { status: 503 },
    );
  }
}

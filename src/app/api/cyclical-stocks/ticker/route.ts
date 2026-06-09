import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const CYCLICAL_TICKER_SYMBOLS = [
  'TSLA',
  'GM',
  'F',
  'RACE',
  'NKE',
  'SBUX',
  'HD',
  'LOW',
  'MCD',
  'MAR',
  'HLT',
  'DAL',
  'UAL',
  'AAL',
  'BA',
  'CAT',
  'DE',
  'DHI',
  'LEN',
  'WYNN',
  'LVS',
  'RCL',
  'CCL',
  'NCLH',
] as const;

const CYCLICAL_TICKER_NAMES: Record<string, string> = {
  TSLA: 'Tesla',
  GM: 'General Motors',
  F: 'Ford Motor',
  RACE: 'Ferrari',
  NKE: 'Nike',
  SBUX: 'Starbucks',
  HD: 'Home Depot',
  LOW: "Lowe's",
  MCD: "McDonald's",
  MAR: 'Marriott International',
  HLT: 'Hilton Worldwide',
  DAL: 'Delta Air Lines',
  UAL: 'United Airlines',
  AAL: 'American Airlines',
  BA: 'Boeing',
  CAT: 'Caterpillar',
  DE: 'Deere',
  DHI: 'D.R. Horton',
  LEN: 'Lennar',
  WYNN: 'Wynn Resorts',
  LVS: 'Las Vegas Sands',
  RCL: 'Royal Caribbean',
  CCL: 'Carnival',
  NCLH: 'Norwegian Cruise Line',
};

const CYCLICAL_SECTORS: Record<string, string> = {
  TSLA: 'autos',
  GM: 'autos',
  F: 'autos',
  RACE: 'luxury_goods',
  NKE: 'luxury_goods',
  SBUX: 'restaurants',
  HD: 'construction_real_estate',
  LOW: 'construction_real_estate',
  MCD: 'restaurants',
  MAR: 'hotels_entertainment',
  HLT: 'hotels_entertainment',
  DAL: 'airlines_travel',
  UAL: 'airlines_travel',
  AAL: 'airlines_travel',
  BA: 'industrials',
  CAT: 'industrials',
  DE: 'industrials',
  DHI: 'construction_real_estate',
  LEN: 'construction_real_estate',
  WYNN: 'hotels_entertainment',
  LVS: 'hotels_entertainment',
  RCL: 'airlines_travel',
  CCL: 'airlines_travel',
  NCLH: 'airlines_travel',
};

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

export async function GET() {
  const config = getStockCategoryConfig('cyclical');

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'CYCLICAL_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const stocksBySymbol = new Map(config.watchlist.map(stock => [stock.symbol, stock]));
    const watchlist = CYCLICAL_TICKER_SYMBOLS.map(symbol => ({
      symbol,
      name: stocksBySymbol.get(symbol)?.name ?? CYCLICAL_TICKER_NAMES[symbol] ?? symbol,
      sector: stocksBySymbol.get(symbol)?.filter ?? CYCLICAL_SECTORS[symbol] ?? 'cyclical',
    }));
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    const items = watchlist
      .map(stock => {
        const price = prices.get(stock.symbol);
        if (!isUsableMarketPrice(price)) return null;
        return {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
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
          code: 'CYCLICAL_TICKER_UNAVAILABLE',
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
    console.error('[CyclicalStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'CYCLICAL_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        items: [],
      },
      { status: 503 },
    );
  }
}

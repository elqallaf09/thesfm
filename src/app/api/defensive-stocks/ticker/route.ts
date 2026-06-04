import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const TICKER_SYMBOLS = [
  'PG',
  'KO',
  'PEP',
  'WMT',
  'COST',
  'JNJ',
  'MRK',
  'PFE',
  'ABBV',
  'UNH',
  'NEE',
  'DUK',
  'SO',
  'VZ',
  'T',
  'XLP',
  'XLV',
  'XLU',
];

export async function GET() {
  const config = getStockCategoryConfig('defensive');

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'DEFENSIVE_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const watchlist = TICKER_SYMBOLS
      .map(symbol => config.watchlist.find(stock => stock.symbol === symbol))
      .filter((stock): stock is NonNullable<typeof stock> => Boolean(stock));
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    const items = watchlist
      .map(stock => {
        const price = prices.get(stock.symbol);
        if (!price?.available || price.price === null) return null;
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
          code: 'DEFENSIVE_TICKER_UNAVAILABLE',
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
    console.error('[DefensiveStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'DEFENSIVE_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        items: [],
      },
      { status: 503 },
    );
  }
}

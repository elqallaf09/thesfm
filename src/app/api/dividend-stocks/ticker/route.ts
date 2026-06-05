import { NextResponse } from 'next/server';
import { fetchDividendStockMetrics } from '@/lib/market/fetchDividendStockMetrics';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const DIVIDEND_TICKER_SYMBOLS = [
  'JNJ',
  'PG',
  'KO',
  'PEP',
  'XOM',
  'CVX',
  'SO',
  'DUK',
  'NEE',
  'VZ',
  'T',
  'O',
  'IBM',
  'MCD',
  'PM',
  'MO',
  'PFE',
  'ABBV',
  'KMB',
  'GIS',
] as const;

const DIVIDEND_TICKER_NAMES: Record<string, string> = {
  JNJ: 'Johnson & Johnson',
  PG: 'Procter & Gamble',
  KO: 'Coca-Cola',
  PEP: 'PepsiCo',
  XOM: 'Exxon Mobil',
  CVX: 'Chevron',
  SO: 'Southern Company',
  DUK: 'Duke Energy',
  NEE: 'NextEra Energy',
  VZ: 'Verizon',
  T: 'AT&T',
  O: 'Realty Income',
  IBM: 'IBM',
  MCD: "McDonald's",
  PM: 'Philip Morris International',
  MO: 'Altria',
  PFE: 'Pfizer',
  ABBV: 'AbbVie',
  KMB: 'Kimberly-Clark',
  GIS: 'General Mills',
};

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

export async function GET() {
  const config = getStockCategoryConfig('dividend');

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'DIVIDEND_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const stocksBySymbol = new Map(config.watchlist.map(stock => [stock.symbol, stock]));
    const watchlist = DIVIDEND_TICKER_SYMBOLS.map(symbol => ({
      symbol,
      name: stocksBySymbol.get(symbol)?.name ?? DIVIDEND_TICKER_NAMES[symbol] ?? symbol,
    }));
    const [prices, metrics] = await Promise.all([
      fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY),
      fetchDividendStockMetrics(watchlist.map(stock => stock.symbol)),
    ]);

    const items = watchlist
      .map(stock => {
        const price = prices.get(stock.symbol);
        if (!isUsableMarketPrice(price)) return null;
        const metric = metrics.get(stock.symbol);
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: price.price,
          currency: 'USD',
          change: price.change,
          changePercent: price.changePercent,
          dividendYield: metric?.dividendYield ?? null,
          payoutRatio: metric?.payoutRatio ?? null,
          annualDividend: metric?.annualDividend ?? null,
          exDividendDate: metric?.exDividendDate ?? null,
          paymentDate: metric?.paymentDate ?? null,
          dividendMetricSource: metric?.available ? metric.source : null,
          source: price.source,
          delayed: price.delayed,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (items.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: 'DIVIDEND_TICKER_UNAVAILABLE',
          updated_at: null,
          source: 'Finnhub/Yahoo Finance quote fallback + Finnhub/Yahoo Finance dividend metrics',
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
        source: 'Finnhub/Yahoo Finance quote fallback + Finnhub/Yahoo Finance dividend metrics',
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
    console.error('[DividendStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'DIVIDEND_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance quote fallback + Finnhub/Yahoo Finance dividend metrics',
        items: [],
      },
      { status: 503 },
    );
  }
}

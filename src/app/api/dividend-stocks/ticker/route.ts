import { NextResponse } from 'next/server';
import { fetchDividendStockMetrics } from '@/lib/market/fetchDividendStockMetrics';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import { toResilientTickerItem } from '@/lib/market/tickerItems';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const DIVIDEND_TICKER_SYMBOLS = [
  'JNJ',
  'IBM',
  'PG',
  'XOM',
  'KO',
  'PFE',
  'PEP',
  'CVX',
  'ABBV',
  'VZ',
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

const DIVIDEND_SOURCE = 'Finnhub/Yahoo Finance quote fallback + Finnhub/Yahoo Finance dividend metrics';

type DividendMetrics = Awaited<ReturnType<typeof fetchDividendStockMetrics>>;

export async function GET() {
  const config = getStockCategoryConfig('dividend');
  const stocksBySymbol = new Map((config?.watchlist ?? []).map(stock => [stock.symbol, stock]));
  const watchlist = DIVIDEND_TICKER_SYMBOLS.map(symbol => ({
    symbol,
    name: stocksBySymbol.get(symbol)?.name ?? DIVIDEND_TICKER_NAMES[symbol] ?? symbol,
  }));

  const buildItems = (
    prices?: Awaited<ReturnType<typeof fetchStockPrices>>,
    metrics?: DividendMetrics,
  ) =>
    watchlist.map(stock => {
      const metric = metrics?.get(stock.symbol);
      return {
        ...toResilientTickerItem(stock, prices?.get(stock.symbol), { fallbackSource: DIVIDEND_SOURCE }),
        dividendYield: metric?.dividendYield ?? null,
        payoutRatio: metric?.payoutRatio ?? null,
        annualDividend: metric?.annualDividend ?? null,
        exDividendDate: metric?.exDividendDate ?? null,
        paymentDate: metric?.paymentDate ?? null,
        dividendMetricSource: metric?.available ? metric.source : null,
      };
    });

  try {
    const [prices, metrics] = await Promise.all([
      fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY),
      fetchDividendStockMetrics(watchlist.map(stock => stock.symbol)),
    ]);
    // Always return every configured symbol; missing quotes are flagged unavailable.
    const items = buildItems(prices, metrics);

    return NextResponse.json(
      {
        ok: true,
        source: DIVIDEND_SOURCE,
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
    console.error('[DividendStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: true,
        code: 'DIVIDEND_TICKER_DEGRADED',
        source: DIVIDEND_SOURCE,
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

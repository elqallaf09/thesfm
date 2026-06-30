import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const DEFENSIVE_TICKER_SYMBOLS = [
  'PG',
  'KO',
  'PEP',
  'WMT',
  'COST',
  'JNJ',
  'CL',
  'KMB',
  'GIS',
  'HSY',
] as const;

const DEFENSIVE_TICKER_NAMES: Record<string, string> = {
  PG: 'Procter & Gamble',
  KO: 'Coca-Cola',
  PEP: 'PepsiCo',
  WMT: 'Walmart',
  COST: 'Costco Wholesale',
  CL: 'Colgate-Palmolive',
  KMB: 'Kimberly-Clark',
  GIS: 'General Mills',
  HSY: 'Hershey',
  MCD: "McDonald's",
  KR: 'Kroger',
  JNJ: 'Johnson & Johnson',
  ABBV: 'AbbVie',
  UNH: 'UnitedHealth Group',
  MRK: 'Merck',
  PFE: 'Pfizer',
  T: 'AT&T',
  VZ: 'Verizon',
  NEE: 'NextEra Energy',
  DUK: 'Duke Energy',
  SO: 'Southern Company',
};

export async function GET() {
  const config = getStockCategoryConfig('defensive');
  const stocksBySymbol = new Map((config?.watchlist ?? []).map(stock => [stock.symbol, stock]));
  const watchlist = DEFENSIVE_TICKER_SYMBOLS.map(symbol => ({
    symbol,
    name: stocksBySymbol.get(symbol)?.name ?? DEFENSIVE_TICKER_NAMES[symbol] ?? symbol,
  }));

  try {
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    // Always return every configured symbol. Missing quotes are flagged
    // `available: false` so the strip shows a "غير متاح" card instead of vanishing.
    const items = watchlist.map(stock => toResilientTickerItem(stock, prices.get(stock.symbol)));
    const availableCount = items.filter(item => item.available).length;

    return NextResponse.json(
      {
        ok: true,
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        available_count: availableCount,
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
    // Even on a hard provider failure, return the symbol list as unavailable
    // cards so the strip stays visible rather than collapsing to a blank area.
    const items = watchlist.map(stock => toResilientTickerItem(stock, undefined));
    return NextResponse.json(
      {
        ok: true,
        code: 'DEFENSIVE_TICKER_DEGRADED',
        source: TICKER_FALLBACK_SOURCE,
        updated_at: new Date().toISOString(),
        available_count: 0,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    );
  }
}

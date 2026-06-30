import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const BANK_TICKER_SYMBOLS = [
  'JPM',
  'BAC',
  'WFC',
  'C',
  'GS',
  'MS',
  'USB',
  'PNC',
  'TFC',
  'SCHW',
  'BLK',
  'AXP',
  'V',
  'MA',
  'PYPL',
  'ICE',
  'CME',
  'SPGI',
  'MCO',
  'BK',
] as const;

const BANK_TICKER_NAMES: Record<string, string> = {
  JPM: 'JPMorgan Chase',
  BAC: 'Bank of America',
  WFC: 'Wells Fargo',
  C: 'Citigroup',
  GS: 'Goldman Sachs',
  MS: 'Morgan Stanley',
  USB: 'U.S. Bancorp',
  PNC: 'PNC Financial Services',
  TFC: 'Truist Financial',
  SCHW: 'Charles Schwab',
  BLK: 'BlackRock',
  AXP: 'American Express',
  V: 'Visa',
  MA: 'Mastercard',
  PYPL: 'PayPal',
  ICE: 'Intercontinental Exchange',
  CME: 'CME Group',
  SPGI: 'S&P Global',
  MCO: "Moody's",
  BK: 'BNY Mellon',
};

const BANK_SECTORS: Record<string, string> = {
  JPM: 'large_banks',
  BAC: 'large_banks',
  WFC: 'large_banks',
  C: 'large_banks',
  GS: 'investment_banks',
  MS: 'investment_banks',
  USB: 'regional_banks',
  PNC: 'regional_banks',
  TFC: 'regional_banks',
  SCHW: 'asset_management',
  BLK: 'asset_management',
  BK: 'asset_management',
  AXP: 'payments',
  V: 'payments',
  MA: 'payments',
  PYPL: 'payments',
  ICE: 'exchanges_services',
  CME: 'exchanges_services',
  SPGI: 'exchanges_services',
  MCO: 'exchanges_services',
};

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'banking-ticker' });
  if (limited) return limited;

  const config = getStockCategoryConfig('banking');
  const stocksBySymbol = new Map((config?.watchlist ?? []).map(stock => [stock.symbol, stock]));
  const watchlist = BANK_TICKER_SYMBOLS.map(symbol => ({
    symbol,
    name: stocksBySymbol.get(symbol)?.name ?? BANK_TICKER_NAMES[symbol] ?? symbol,
    sector: BANK_SECTORS[symbol] ?? stocksBySymbol.get(symbol)?.filter ?? 'banking',
  }));

  const buildItems = (prices?: Awaited<ReturnType<typeof fetchStockPrices>>) =>
    watchlist.map(stock => ({
      ...toResilientTickerItem(stock, prices?.get(stock.symbol)),
      sector: stock.sector,
    }));

  try {
    const prices = await fetchStockPrices(watchlist, process.env.FINNHUB_API_KEY);
    // Always return every configured symbol; missing quotes are flagged unavailable.
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
    console.error('[BankStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: true,
        code: 'BANK_TICKER_DEGRADED',
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

import { NextResponse } from 'next/server';
import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

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

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'banking-ticker' });
  if (limited) return limited;

  const config = getStockCategoryConfig('banking');

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'BANK_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const stocksBySymbol = new Map(config.watchlist.map(stock => [stock.symbol, stock]));
    const watchlist = BANK_TICKER_SYMBOLS.map(symbol => ({
      symbol,
      name: stocksBySymbol.get(symbol)?.name ?? BANK_TICKER_NAMES[symbol] ?? symbol,
      sector: BANK_SECTORS[symbol] ?? stocksBySymbol.get(symbol)?.filter ?? 'banking',
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
          code: 'BANK_TICKER_UNAVAILABLE',
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
    console.error('[BankStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'BANK_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        items: [],
      },
      { status: 503 },
    );
  }
}

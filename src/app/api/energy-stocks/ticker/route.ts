import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextResponse } from 'next/server';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const ENERGY_TICKER_SYMBOLS = [
  'XOM',
  'CVX',
  'SHEL',
  'BP',
  'TTE',
  'COP',
  'EOG',
  'OXY',
  'SLB',
  'HAL',
  'BKR',
  'LNG',
  'ENB',
  'TRP',
  'KMI',
  'FSLR',
  'ENPH',
  'NEE',
  'BEP',
  'PLUG',
] as const;

const ENERGY_TICKER_NAMES: Record<string, string> = {
  XOM: 'Exxon Mobil',
  CVX: 'Chevron',
  SHEL: 'Shell',
  BP: 'BP',
  TTE: 'TotalEnergies',
  COP: 'ConocoPhillips',
  EOG: 'EOG Resources',
  OXY: 'Occidental Petroleum',
  SLB: 'SLB',
  HAL: 'Halliburton',
  BKR: 'Baker Hughes',
  LNG: 'Cheniere Energy',
  ENB: 'Enbridge',
  TRP: 'TC Energy',
  KMI: 'Kinder Morgan',
  FSLR: 'First Solar',
  ENPH: 'Enphase Energy',
  NEE: 'NextEra Energy',
  BEP: 'Brookfield Renewable Partners',
  PLUG: 'Plug Power',
};

const ENERGY_SECTORS: Record<string, string> = {
  XOM: 'integrated_oil_gas',
  CVX: 'integrated_oil_gas',
  SHEL: 'integrated_oil_gas',
  BP: 'integrated_oil_gas',
  TTE: 'integrated_oil_gas',
  COP: 'exploration_production',
  EOG: 'exploration_production',
  OXY: 'exploration_production',
  SLB: 'oil_services',
  HAL: 'oil_services',
  BKR: 'oil_services',
  LNG: 'pipelines',
  ENB: 'pipelines',
  TRP: 'pipelines',
  KMI: 'pipelines',
  FSLR: 'renewables',
  ENPH: 'renewables',
  NEE: 'renewables',
  BEP: 'renewables',
  PLUG: 'renewables',
};

function isUsableMarketPrice(price: TechStockPrice | undefined): price is TechStockPrice & { price: number } {
  return Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0 && price.source);
}

export async function GET() {
  const config = getStockCategoryConfig('energy');

  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        code: 'ENERGY_TICKER_UNAVAILABLE',
        updated_at: null,
        source: null,
        items: [],
      },
      { status: 503 },
    );
  }

  try {
    const stocksBySymbol = new Map(config.watchlist.map(stock => [stock.symbol, stock]));
    const watchlist = ENERGY_TICKER_SYMBOLS.map(symbol => ({
      symbol,
      name: stocksBySymbol.get(symbol)?.name ?? ENERGY_TICKER_NAMES[symbol] ?? symbol,
      sector: ENERGY_SECTORS[symbol] ?? stocksBySymbol.get(symbol)?.filter ?? 'energy',
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
          code: 'ENERGY_TICKER_UNAVAILABLE',
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
    console.error('[EnergyStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        code: 'ENERGY_TICKER_UNAVAILABLE',
        updated_at: null,
        source: 'Finnhub/Yahoo Finance fallback',
        items: [],
      },
      { status: 503 },
    );
  }
}

import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import { TICKER_FALLBACK_SOURCE, toResilientTickerItem } from '@/lib/market/tickerItems';

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

export async function GET() {
  const config = getStockCategoryConfig('energy');
  const stocksBySymbol = new Map((config?.watchlist ?? []).map(stock => [stock.symbol, stock]));
  const watchlist = ENERGY_TICKER_SYMBOLS.map(symbol => ({
    symbol,
    name: stocksBySymbol.get(symbol)?.name ?? ENERGY_TICKER_NAMES[symbol] ?? symbol,
    sector: ENERGY_SECTORS[symbol] ?? stocksBySymbol.get(symbol)?.filter ?? 'energy',
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
    console.error('[EnergyStocksTicker] Failed to load ticker', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: true,
        code: 'ENERGY_TICKER_DEGRADED',
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

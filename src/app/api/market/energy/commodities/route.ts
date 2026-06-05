import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const ENERGY_MARKET_SYMBOLS = [
  {
    symbol: 'BZ=F',
    displayName: 'Brent Crude',
    nameAr: 'خام برنت',
    unit: 'USD/barrel',
    category: 'brent',
  },
  {
    symbol: 'CL=F',
    displayName: 'WTI Crude',
    nameAr: 'خام غرب تكساس WTI',
    unit: 'USD/barrel',
    category: 'wti',
  },
  {
    symbol: 'NG=F',
    displayName: 'Natural Gas',
    nameAr: 'الغاز الطبيعي',
    unit: 'USD/MMBtu',
    category: 'natural_gas',
  },
  {
    symbol: 'RB=F',
    displayName: 'RBOB Gasoline',
    nameAr: 'البنزين RBOB',
    unit: 'USD/gallon',
    category: 'gasoline',
  },
  {
    symbol: 'HO=F',
    displayName: 'Heating Oil',
    nameAr: 'زيت التدفئة / الديزل',
    unit: 'USD/gallon',
    category: 'heating_oil',
  },
  {
    symbol: 'XLE',
    displayName: 'Energy Select Sector SPDR Fund',
    nameAr: 'مؤشر قطاع الطاقة XLE',
    unit: 'USD',
    category: 'energy_etf',
  },
  {
    symbol: 'ICLN',
    displayName: 'iShares Global Clean Energy ETF',
    nameAr: 'الطاقة النظيفة ICLN',
    unit: 'USD',
    category: 'renewables_etf',
  },
  {
    symbol: 'TAN',
    displayName: 'Invesco Solar ETF',
    nameAr: 'صندوق الطاقة الشمسية TAN',
    unit: 'USD',
    category: 'solar_etf',
  },
] as const;

export async function GET() {
  try {
    const prices = await fetchStockPrices(
      ENERGY_MARKET_SYMBOLS.map(item => ({ symbol: item.symbol })),
      process.env.FINNHUB_API_KEY,
    );
    const updatedAt = new Date().toISOString();
    const items = ENERGY_MARKET_SYMBOLS.map(item => {
      const price = prices.get(item.symbol);
      const available = Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0);
      return {
        symbol: item.symbol,
        displayName: item.displayName,
        nameAr: item.nameAr,
        category: item.category,
        unit: item.unit,
        currency: 'USD',
        price: available ? price?.price ?? null : null,
        change: available ? price?.change ?? null : null,
        changePercent: available ? price?.changePercent ?? null : null,
        lastUpdated: updatedAt,
        source: available ? price?.source ?? null : null,
        delayed: true,
        available,
        unavailableReason: available ? null : price?.unavailableReason ?? 'provider_returned_empty_quote',
      };
    });

    return NextResponse.json(
      {
        ok: true,
        source: 'Finnhub/Yahoo Finance fallback',
        updated_at: updatedAt,
        items,
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (error) {
    console.error('[EnergyCommodities] Failed to load energy market snapshot', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        source: 'Finnhub/Yahoo Finance fallback',
        updated_at: null,
        items: [],
        error: 'Failed to load energy market data',
      },
      { status: 503 },
    );
  }
}

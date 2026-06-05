import { NextResponse } from 'next/server';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';

export const revalidate = 900;
export const dynamic = 'force-dynamic';

const MARKET_SYMBOLS = [
  {
    symbol: 'XLF',
    displayName: 'Financial Select Sector SPDR Fund',
    nameAr: 'مؤشر القطاع المالي XLF',
    unit: 'USD',
    category: 'financial_sector',
  },
  {
    symbol: '^VIX',
    displayName: 'CBOE Volatility Index',
    nameAr: 'مؤشر التقلبات VIX',
    unit: 'Index',
    category: 'volatility',
  },
  {
    symbol: 'DX-Y.NYB',
    displayName: 'U.S. Dollar Index',
    nameAr: 'مؤشر الدولار DXY',
    unit: 'Index',
    category: 'dollar',
  },
] as const;

const FRED_SERIES = [
  {
    seriesId: 'DGS10',
    symbol: 'US10Y',
    displayName: '10-Year Treasury Yield',
    nameAr: 'عائد سندات الخزانة الأمريكية 10 سنوات',
    unit: '%',
    category: 'treasury_10y',
  },
  {
    seriesId: 'DGS2',
    symbol: 'US2Y',
    displayName: '2-Year Treasury Yield',
    nameAr: 'عائد سندات الخزانة الأمريكية سنتين',
    unit: '%',
    category: 'treasury_2y',
  },
  {
    seriesId: 'FEDFUNDS',
    symbol: 'FEDFUNDS',
    displayName: 'Effective Federal Funds Rate',
    nameAr: 'سعر الفائدة الفيدرالية الفعلي',
    unit: '%',
    category: 'fed_funds',
  },
] as const;

type FredValue = {
  value: number;
  date: string;
};

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchFredValue(seriesId: string): Promise<FredValue | null> {
  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`, {
    next: { revalidate: 3600 },
    headers: {
      accept: 'text/csv',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) return null;
  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/).slice(1).reverse();
  for (const row of rows) {
    const [date, rawValue] = row.split(',');
    const value = finiteNumber(rawValue);
    if (date && value !== null) {
      return { value, date: new Date(`${date}T00:00:00Z`).toISOString() };
    }
  }
  return null;
}

function unavailableItem(base: {
  symbol: string;
  displayName: string;
  nameAr: string;
  unit: string;
  category: string;
}, reason = 'provider_returned_empty_value') {
  return {
    ...base,
    value: null,
    change: null,
    changePercent: null,
    lastUpdated: new Date().toISOString(),
    source: null,
    delayed: true,
    available: false,
    unavailableReason: reason,
  };
}

export async function GET() {
  const updatedAt = new Date().toISOString();

  try {
    const [marketResult, ...fredResults] = await Promise.allSettled([
      fetchStockPrices(MARKET_SYMBOLS.map(item => ({ symbol: item.symbol })), process.env.FINNHUB_API_KEY),
      ...FRED_SERIES.map(item => fetchFredValue(item.seriesId)),
    ]);
    const marketPrices = marketResult.status === 'fulfilled'
      ? marketResult.value
      : new Map();

    const marketItems = MARKET_SYMBOLS.map(item => {
      const price = marketPrices.get(item.symbol);
      const available = Boolean(price?.available && price.price !== null && Number.isFinite(price.price) && price.price > 0);
      return {
        symbol: item.symbol,
        displayName: item.displayName,
        nameAr: item.nameAr,
        category: item.category,
        unit: item.unit,
        value: available ? price?.price ?? null : null,
        change: available ? price?.change ?? null : null,
        changePercent: available ? price?.changePercent ?? null : null,
        lastUpdated: updatedAt,
        source: available ? price?.source ?? null : null,
        delayed: true,
        available,
        unavailableReason: available ? null : price?.unavailableReason ?? 'provider_returned_empty_quote',
      };
    });

    const fredItems = FRED_SERIES.map((item, index) => {
      const result = fredResults[index];
      const value = result?.status === 'fulfilled' ? result.value : null;
      if (!value) {
        return unavailableItem({
          symbol: item.symbol,
          displayName: item.displayName,
          nameAr: item.nameAr,
          unit: item.unit,
          category: item.category,
        }, 'fred_series_unavailable');
      }
      return {
        symbol: item.symbol,
        displayName: item.displayName,
        nameAr: item.nameAr,
        category: item.category,
        unit: item.unit,
        value: value.value,
        change: null,
        changePercent: null,
        lastUpdated: value.date,
        source: 'FRED',
        delayed: true,
        available: true,
        unavailableReason: null,
      };
    });

    const tenYear = fredItems.find(item => item.symbol === 'US10Y');
    const twoYear = fredItems.find(item => item.symbol === 'US2Y');
    const spreadAvailable = tenYear?.available && twoYear?.available
      && typeof tenYear.value === 'number'
      && typeof twoYear.value === 'number';
    const spreadItem = spreadAvailable
      ? {
        symbol: '10Y2Y',
        displayName: '10Y - 2Y Treasury Spread',
        nameAr: 'منحنى العائد 10Y - 2Y',
        category: 'yield_curve',
        unit: '%',
        value: Number((tenYear.value - twoYear.value).toFixed(3)),
        change: null,
        changePercent: null,
        lastUpdated: tenYear.lastUpdated > twoYear.lastUpdated ? tenYear.lastUpdated : twoYear.lastUpdated,
        source: 'FRED',
        delayed: true,
        available: true,
        unavailableReason: null,
      }
      : unavailableItem(
        {
          symbol: '10Y2Y',
          displayName: '10Y - 2Y Treasury Spread',
          nameAr: 'منحنى العائد 10Y - 2Y',
          unit: '%',
          category: 'yield_curve',
        },
        'spread_inputs_unavailable',
      );

    return NextResponse.json(
      {
        ok: true,
        source: 'Yahoo Finance + FRED',
        updated_at: updatedAt,
        items: [...marketItems, ...fredItems, spreadItem],
      },
      {
        headers: {
          'cache-control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
      },
    );
  } catch (error) {
    console.error('[BankingSnapshot] Failed to load banking snapshot', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        source: 'Yahoo Finance + FRED',
        updated_at: null,
        items: [],
        error: 'Failed to load banking market snapshot',
      },
      { status: 503 },
    );
  }
}

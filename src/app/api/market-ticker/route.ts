import { NextRequest, NextResponse } from 'next/server';

type TickerCategory = 'global' | 'gulf' | 'asia' | 'europe' | 'crypto' | 'metals';

interface MarketTickerItem {
  nameAr: string;
  nameEn: string;
  value: string;
  change: string;
  positive: boolean;
}

interface YahooSymbol {
  symbol: string;
  nameAr: string;
  nameEn: string;
}

const YAHOO_SYMBOLS: Record<Exclude<TickerCategory, 'crypto' | 'metals'>, YahooSymbol[]> = {
  global: [
    { symbol: '^DJI', nameAr: 'داو جونز', nameEn: 'Dow Jones' },
    { symbol: '^IXIC', nameAr: 'ناسداك', nameEn: 'Nasdaq' },
    { symbol: '^GSPC', nameAr: 'إس آند بي 500', nameEn: 'S&P 500' },
    { symbol: '^RUT', nameAr: 'راسل 2000', nameEn: 'Russell 2000' },
  ],
  gulf: [
    { symbol: '^BKP', nameAr: 'بورصة الكويت', nameEn: 'Boursa Kuwait' },
    { symbol: '^TASI.SR', nameAr: 'تداول السعودية', nameEn: 'Saudi Tadawul' },
    { symbol: 'DFM.AE', nameAr: 'سوق دبي المالي', nameEn: 'Dubai Financial Market' },
    { symbol: 'QNBK.QA', nameAr: 'بورصة قطر', nameEn: 'Qatar Exchange' },
  ],
  asia: [
    { symbol: '^N225', nameAr: 'نيكي 225', nameEn: 'Nikkei 225' },
    { symbol: '^HSI', nameAr: 'هانغ سنغ', nameEn: 'Hang Seng' },
    { symbol: '000001.SS', nameAr: 'شنغهاي المركب', nameEn: 'Shanghai Composite' },
    { symbol: '^BSESN', nameAr: 'سينسكس الهند', nameEn: 'BSE Sensex' },
  ],
  europe: [
    { symbol: '^FTSE', nameAr: 'فوتسي 100', nameEn: 'FTSE 100' },
    { symbol: '^GDAXI', nameAr: 'داكس ألمانيا', nameEn: 'DAX' },
    { symbol: '^FCHI', nameAr: 'كاك 40', nameEn: 'CAC 40' },
    { symbol: '^STOXX50E', nameAr: 'يورو ستوكس 50', nameEn: 'Euro Stoxx 50' },
  ],
};

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatChange(change: number) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

async function fetchYahooItem(item: YahooSymbol): Promise<MarketTickerItem | null> {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?range=1d&interval=5m`, {
    next: { revalidate: 60 },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice ?? meta?.previousClose;
  const previousClose = meta?.previousClose;

  if (typeof price !== 'number' || typeof previousClose !== 'number' || previousClose === 0) return null;

  const changePercent = ((price - previousClose) / previousClose) * 100;
  return {
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    value: numberFormatter.format(price),
    change: formatChange(changePercent),
    positive: changePercent >= 0,
  };
}

async function fetchYahooCategory(category: Exclude<TickerCategory, 'crypto' | 'metals'>) {
  const results = await Promise.allSettled(YAHOO_SYMBOLS[category].map(fetchYahooItem));
  return results
    .map(result => (result.status === 'fulfilled' ? result.value : null))
    .filter((item): item is MarketTickerItem => Boolean(item));
}

async function fetchCrypto() {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd&include_24hr_change=true', {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const coins = [
    { id: 'bitcoin', nameAr: 'بيتكوين', nameEn: 'Bitcoin' },
    { id: 'ethereum', nameAr: 'إيثريوم', nameEn: 'Ethereum' },
    { id: 'binancecoin', nameAr: 'بي إن بي', nameEn: 'BNB' },
    { id: 'solana', nameAr: 'سولانا', nameEn: 'Solana' },
  ];

  return coins.flatMap(coin => {
    const price = data?.[coin.id]?.usd;
    const change = data?.[coin.id]?.usd_24h_change;
    if (typeof price !== 'number' || typeof change !== 'number') return [];

    return {
      nameAr: coin.nameAr,
      nameEn: coin.nameEn,
      value: currencyFormatter.format(price),
      change: formatChange(change),
      positive: change >= 0,
    };
  });
}

async function fetchMetals() {
  const response = await fetch('https://api.metals.live/v1/spot/gold,silver', {
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return [];

  const data = await response.json();
  const gold = Array.isArray(data) ? data.find(item => typeof item.gold === 'number')?.gold : null;
  const silver = Array.isArray(data) ? data.find(item => typeof item.silver === 'number')?.silver : null;
  const items: MarketTickerItem[] = [];

  if (typeof gold === 'number') {
    items.push({ nameAr: 'ذهب فوري', nameEn: 'Spot Gold', value: currencyFormatter.format(gold), change: 'Live', positive: true });
  }
  if (typeof silver === 'number') {
    items.push({ nameAr: 'فضة فورية', nameEn: 'Spot Silver', value: currencyFormatter.format(silver), change: 'Live', positive: true });
  }

  return items;
}

async function fetchMarketItems(category: TickerCategory) {
  if (category === 'crypto') return fetchCrypto();
  if (category === 'metals') return fetchMetals();
  return fetchYahooCategory(category);
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') as TickerCategory | null;

  if (!category || !['global', 'gulf', 'asia', 'europe', 'crypto', 'metals'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  try {
    const items = await fetchMarketItems(category);
    return NextResponse.json(
      {
        live: items.length > 0,
        updatedAt: new Date().toISOString(),
        items,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        live: false,
        updatedAt: new Date().toISOString(),
        items: [],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  }
}

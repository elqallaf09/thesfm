import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { TECH_STOCKS, type TechStockConfig, type TechStockSector } from '@/lib/market/techStocks';

export type TechNewsItem = {
  id: string;
  headline: string;
  summary: string;
  companyName: string;
  ticker: string;
  sector: TechStockSector;
  source: string;
  publishedAt: string;
  url: string;
  price: number | null;
  changePercent: number | null;
};

export type TechNewsPayload = {
  success: true;
  source: 'Finnhub';
  lastUpdated: string;
  items: TechNewsItem[];
};

type FinnhubNews = {
  id?: number;
  datetime?: number;
  headline?: string;
  source?: string;
  summary?: string;
  url?: string;
};

function dateString(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function fetchFinnhubJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 1800 },
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Finnhub returned ${response.status}`);
  return response.json() as Promise<T>;
}

function mapNewsItem(stock: TechStockConfig, item: FinnhubNews, price: TechStockPrice | undefined): TechNewsItem | null {
  const headline = String(item.headline ?? '').trim();
  const url = String(item.url ?? '').trim();
  if (!headline || !url) return null;
  const publishedAt = item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString();
  return {
    id: `${stock.symbol}-${item.id ?? publishedAt}-${url}`,
    headline,
    summary: String(item.summary ?? '').trim(),
    companyName: stock.name,
    ticker: stock.symbol,
    sector: stock.sector,
    source: String(item.source ?? 'Finnhub').trim() || 'Finnhub',
    publishedAt,
    url,
    price: price?.price ?? null,
    changePercent: price?.changePercent ?? null,
  };
}

export async function fetchTechNews() {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured');
  }

  const prices = await fetchStockPrices(TECH_STOCKS, apiKey);
  const from = dateString(14);
  const to = dateString(0);
  const settled = await Promise.allSettled(
    TECH_STOCKS.map(async stock => {
      const params = new URLSearchParams({
        symbol: stock.symbol,
        from,
        to,
        token: apiKey,
      });
      const news = await fetchFinnhubJson<FinnhubNews[]>(`https://finnhub.io/api/v1/company-news?${params.toString()}`);
      return news
        .slice(0, 5)
        .map(item => mapNewsItem(stock, item, prices.get(stock.symbol)))
        .filter((item): item is TechNewsItem => Boolean(item));
    }),
  );

  const items = settled
    .flatMap(result => result.status === 'fulfilled' ? result.value : [])
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 80);

  return {
    success: true,
    source: 'Finnhub',
    lastUpdated: new Date().toISOString(),
    items,
  } satisfies TechNewsPayload;
}

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
  datetime: number | null;
  publishedAt: string;
  url: string;
  image: string | null;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  priceSource: 'Finnhub';
  delayed: true;
};

export type TechNewsPayload = {
  success: true;
  source: 'Finnhub';
  lastUpdated: string;
  items: TechNewsItem[];
  message?: string;
};

type FinnhubNews = {
  id?: number;
  datetime?: number;
  headline?: string;
  source?: string;
  summary?: string;
  url?: string;
  image?: string;
};

function dateString(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function fetchFinnhubJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Finnhub returned ${response.status}`);
  return response.json() as Promise<T>;
}

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(message, meta);
  }
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
    datetime: typeof item.datetime === 'number' ? item.datetime : null,
    publishedAt,
    url,
    image: String(item.image ?? '').trim() || null,
    price: price?.price ?? null,
    changePercent: price?.changePercent ?? null,
    change: price?.change ?? null,
    priceSource: 'Finnhub',
    delayed: true,
  };
}

async function fetchCompanyNewsForRange(stock: TechStockConfig, apiKey: string, daysBack: number) {
  const from = dateString(daysBack);
  const to = dateString(0);
  const params = new URLSearchParams({
    symbol: stock.symbol,
    from,
    to,
    token: apiKey,
  });

  devLog('[TechNews] Fetching company news', { symbol: stock.symbol, from, to });
  const news = await fetchFinnhubJson<FinnhubNews[]>(`https://finnhub.io/api/v1/company-news?${params.toString()}`);
  devLog('[TechNews] Company news returned', { symbol: stock.symbol, count: news.length, from, to });
  return news;
}

async function fetchCompanyNewsWithFallback(stock: TechStockConfig, apiKey: string) {
  try {
    const sevenDayNews = await fetchCompanyNewsForRange(stock, apiKey, 7);
    if (sevenDayNews.length > 0) return sevenDayNews;
    return fetchCompanyNewsForRange(stock, apiKey, 30);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[TechNews] Finnhub company-news failed', {
        symbol: stock.symbol,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

function dedupeAndSort(items: TechNewsItem[]) {
  const seenUrls = new Set<string>();
  const seenHeadlines = new Set<string>();

  return items
    .filter(item => {
      const urlKey = item.url.trim().toLowerCase();
      const headlineKey = item.headline.trim().toLowerCase();
      if (!urlKey || !headlineKey || seenUrls.has(urlKey) || seenHeadlines.has(headlineKey)) return false;
      seenUrls.add(urlKey);
      seenHeadlines.add(headlineKey);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 60);
}

export async function fetchTechNews() {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY is not configured');
  }

  const prices = await fetchStockPrices(TECH_STOCKS, apiKey);
  const settled = await Promise.allSettled(
    TECH_STOCKS.map(async stock => {
      const news = await fetchCompanyNewsWithFallback(stock, apiKey);
      return news
        .slice(0, 8)
        .map(item => mapNewsItem(stock, item, prices.get(stock.symbol)))
        .filter((item): item is TechNewsItem => Boolean(item));
    }),
  );

  const items = dedupeAndSort(settled.flatMap(result => result.status === 'fulfilled' ? result.value : []));

  return {
    success: true,
    source: 'Finnhub',
    lastUpdated: new Date().toISOString(),
    items,
    ...(items.length === 0
      ? { message: 'No recent tech news found from Finnhub for the configured symbols.' }
      : {}),
  } satisfies TechNewsPayload;
}

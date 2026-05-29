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
  dateRangeUsed?: '7d' | '30d' | '90d';
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

type NewsRange = {
  label: '7d' | '30d' | '90d';
  daysBack: number;
};

const NEWS_RANGES: NewsRange[] = [
  { label: '7d', daysBack: 7 },
  { label: '30d', daysBack: 30 },
  { label: '90d', daysBack: 90 },
];

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
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`Finnhub returned ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }

  return body as T;
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

function hasUsableArticle(item: FinnhubNews) {
  return Boolean(String(item.headline ?? '').trim() && String(item.url ?? '').trim());
}

async function fetchCompanyNewsForRange(stock: TechStockConfig, apiKey: string, range: NewsRange) {
  const from = dateString(range.daysBack);
  const to = dateString(0);
  const params = new URLSearchParams({
    symbol: stock.symbol,
    from,
    to,
    token: apiKey,
  });

  devLog('[TechNews] Fetching company news', { symbol: stock.symbol, range: range.label, from, to });
  const news = await fetchFinnhubJson<unknown>(`https://finnhub.io/api/v1/company-news?${params.toString()}`);
  if (!Array.isArray(news)) {
    throw new Error(`Finnhub company-news returned non-array response for ${stock.symbol}: ${JSON.stringify(news)}`);
  }
  devLog('[TechNews] Company news returned', {
    symbol: stock.symbol,
    range: range.label,
    count: news.length,
    usableCount: news.filter((item): item is FinnhubNews => hasUsableArticle(item as FinnhubNews)).length,
    from,
    to,
  });
  return news;
}

async function fetchAllCompanyNewsForRange(apiKey: string, range: NewsRange) {
  const settled = await Promise.allSettled(
    TECH_STOCKS.map(async stock => ({
      stock,
      news: await fetchCompanyNewsForRange(stock, apiKey, range),
    })),
  );

  const rows = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value];

    if (process.env.NODE_ENV !== 'production') {
      console.error('[TechNews] Finnhub company-news failed', {
        symbol: TECH_STOCKS[index]?.symbol,
        range: range.label,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
    return [];
  });

  return {
    range,
    rows,
    usableCount: rows.reduce((total, row) => total + row.news.filter(item => hasUsableArticle(item as FinnhubNews)).length, 0),
  };
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

  let selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[0]);
  if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[1]);
  if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[2]);

  const prices = selected.usableCount > 0
    ? await fetchStockPrices(TECH_STOCKS, apiKey)
    : new Map<string, TechStockPrice>();
  const items = dedupeAndSort(
    selected.rows.flatMap(({ stock, news }) => news
      .map(item => mapNewsItem(stock, item as FinnhubNews, prices.get(stock.symbol)))
      .filter((item): item is TechNewsItem => Boolean(item))),
  );

  return {
    success: true,
    source: 'Finnhub',
    lastUpdated: new Date().toISOString(),
    dateRangeUsed: items.length > 0 ? selected.range.label : undefined,
    items,
    ...(items.length === 0
      ? { message: 'No recent technology stock news found from Finnhub for the configured symbols.' }
      : {}),
  } satisfies TechNewsPayload;
}

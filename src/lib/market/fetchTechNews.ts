import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { TECH_STOCKS, type TechStockConfig, type TechStockSector } from '@/lib/market/techStocks';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems, type AppNewsLanguage } from '@/lib/translation/translateNewsText';

export type TechNewsItem = {
  id: string;
  headline: string;
  summary: string;
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  title: string;
  translatedTo?: string;
  isTranslated?: boolean;
  translationSource?: string;
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
  source: 'Finnhub' | 'Finnhub + RSS fallback';
  lastUpdated: string;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  dateRangeUsed?: '7d' | '30d' | '90d';
  prices: TechStockPrice[];
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

const RSS_FALLBACK_FEEDS = [
  {
    source: 'Yahoo Finance',
    url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA,AMD,INTC,AVGO,CRM,ORCL,NFLX,ADBE,QCOM,TSM,SHOP,UBER,PLTR&region=US&lang=en-US',
  },
  {
    source: 'Google News',
    url: 'https://news.google.com/rss/search?q=(Apple%20OR%20Microsoft%20OR%20Nvidia%20OR%20Alphabet%20OR%20Amazon%20OR%20Meta%20OR%20Tesla%20OR%20AMD%20OR%20Intel%20OR%20Broadcom)%20(stock%20OR%20shares%20OR%20earnings%20OR%20market)&hl=en-US&gl=US&ceid=US:en',
  },
  {
    source: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
  },
];

const TECH_KEYWORDS: Array<{ stock: TechStockConfig; keywords: string[] }> = TECH_STOCKS.map(stock => ({
  stock,
  keywords: [
    stock.name,
    stock.symbol,
    ...(stock.aliases ?? []),
    ...(stock.symbol === 'AAPL' ? ['Apple', 'iPhone', 'iPad', 'Mac'] : []),
    ...(stock.symbol === 'MSFT' ? ['Microsoft', 'Azure', 'OpenAI', 'Windows'] : []),
    ...(stock.symbol === 'NVDA' ? ['Nvidia', 'NVIDIA', 'GPU', 'AI chips'] : []),
    ...(stock.symbol === 'GOOGL' ? ['Google', 'Alphabet', 'YouTube', 'Gemini'] : []),
    ...(stock.symbol === 'AMZN' ? ['Amazon', 'AWS'] : []),
    ...(stock.symbol === 'META' ? ['Meta', 'Facebook', 'Instagram', 'WhatsApp'] : []),
    ...(stock.symbol === 'TSLA' ? ['Tesla', 'EV', 'Elon Musk'] : []),
    ...(stock.symbol === 'AVGO' ? ['Broadcom'] : []),
    ...(stock.symbol === 'PLTR' ? ['Palantir'] : []),
  ],
}));

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

function decodeEntity(entity: string) {
  const named: Record<string, string> = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ' };
  if (entity in named) return named[entity];
  if (entity.startsWith('#x')) {
    const code = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  if (entity.startsWith('#')) {
    const code = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : `&${entity};`;
  }
  return `&${entity};`;
}

function cleanText(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-zA-Z0-9#]+);/g, (_, entity: string) => decodeEntity(entity))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tagName: string) {
  const escaped = tagName.replace(':', '\\:');
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return cleanText(match?.[1] ?? '');
}

function extractLink(block: string) {
  const link = extractTag(block, 'link');
  if (link) return link;
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return cleanText(atomLink?.[1] ?? '');
}

function safeDate(value: string, fallback = new Date().toISOString()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function excerpt(value: string, fallback: string) {
  const text = cleanText(value || fallback);
  return text.length <= 190 ? text : `${text.slice(0, 187).trim()}...`;
}

function matchStock(headline: string, summary: string) {
  const text = `${headline} ${summary}`.toLowerCase();
  return TECH_KEYWORDS.find(({ keywords }) => keywords.some(keyword => text.includes(keyword.toLowerCase())))?.stock ?? null;
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
    titleOriginal: headline,
    summaryOriginal: String(item.summary ?? '').trim(),
    languageOriginal: 'en',
    title: headline,
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

async function fetchRssFeed(feed: { source: string; url: string }) {
  const response = await fetch(feed.url, {
    next: { revalidate: 300 },
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function parseRssTechItems(feed: { source: string; url: string }, xml: string, prices: Map<string, TechStockPrice>) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map(block => {
    const headline = extractTag(block, 'title');
    const url = extractLink(block);
    if (!headline || !url) return null;
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded');
    const summary = excerpt(description, headline);
    const stock = matchStock(headline, summary);
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const publishedAt = safeDate(published);
    const price = stock ? prices.get(stock.symbol) : undefined;
    return {
      id: `rss-${feed.source}-${url || headline}`.toLowerCase().replace(/\s+/g, '-'),
      headline,
      summary,
      titleOriginal: headline,
      summaryOriginal: summary,
      languageOriginal: 'unknown',
      title: headline,
      companyName: stock?.name ?? 'Technology Market',
      ticker: stock?.symbol ?? 'TECH',
      sector: stock?.sector ?? 'ai',
      source: feed.source,
      datetime: Math.floor(new Date(publishedAt).getTime() / 1000),
      publishedAt,
      url,
      image: null,
      price: price?.price ?? null,
      changePercent: price?.changePercent ?? null,
      change: price?.change ?? null,
      priceSource: 'Finnhub',
      delayed: true,
    } satisfies TechNewsItem;
  }).filter((item): item is TechNewsItem => Boolean(item));
}

async function fetchRssFallbackNews(prices: Map<string, TechStockPrice>) {
  const settled = await Promise.allSettled(
    RSS_FALLBACK_FEEDS.map(async feed => ({
      feed,
      items: parseRssTechItems(feed, await fetchRssFeed(feed), prices),
    })),
  );
  const items = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      devLog('[TechNews] RSS fallback returned', { source: result.value.feed.source, count: result.value.items.length });
      return result.value.items;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[TechNews] RSS fallback failed', {
        source: RSS_FALLBACK_FEEDS[index]?.source,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
    return [];
  });
  devLog('[TechNews] RSS fallback total', { count: items.length });
  return items;
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

export async function fetchTechNews(languageInput?: string | null) {
  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  let selected: Awaited<ReturnType<typeof fetchAllCompanyNewsForRange>> | null = null;
  const prices = apiKey ? await fetchStockPrices(TECH_STOCKS, apiKey) : new Map<string, TechStockPrice>();
  if (apiKey) {
    selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[0]);
    if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[1]);
    if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(apiKey, NEWS_RANGES[2]);
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[TechNews] FINNHUB_API_KEY is not configured; using RSS fallback without prices.');
  }

  const finnhubItems = selected
    ? selected.rows.flatMap(({ stock, news }) => news
      .map(item => mapNewsItem(stock, item as FinnhubNews, prices.get(stock.symbol)))
      .filter((item): item is TechNewsItem => Boolean(item)))
    : [];
  const rssItems = finnhubItems.length === 0 ? await fetchRssFallbackNews(prices) : [];
  const items = await translateNewsItems(dedupeAndSort(finnhubItems.length > 0 ? finnhubItems : rssItems), language);
  const priceList = TECH_STOCKS.map(stock => prices.get(stock.symbol) ?? {
    symbol: stock.symbol,
    price: null,
    changePercent: null,
    change: null,
    source: 'Finnhub' as const,
    delayed: true as const,
  });
  devLog('[TechNews] Final payload counts', { items: items.length, prices: priceList.length });

  return {
    success: true,
    source: 'Finnhub + RSS fallback',
    lastUpdated: new Date().toISOString(),
    language,
    translationEnabled: isNewsTranslationEnabled(),
    dateRangeUsed: selected && finnhubItems.length > 0 ? selected.range.label : undefined,
    prices: priceList,
    items,
    ...(items.length === 0
      ? { message: 'No recent technology news found from the configured real data sources.' }
      : {}),
  } satisfies TechNewsPayload;
}

import { DEFENSIVE_STOCKS, type DefensiveStockConfig, type DefensiveStockSector } from '@/lib/market/defensiveStocks';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems, type AppNewsLanguage } from '@/lib/translation/translateNewsText';

export type DefensiveStockNewsItem = {
  id: string;
  headline: string;
  title: string;
  summary: string;
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  translatedTo?: AppNewsLanguage;
  isTranslated?: boolean;
  translationSource?: string;
  companyName: string;
  ticker: string;
  sector: DefensiveStockSector;
  sectors: DefensiveStockSector[];
  source: string;
  datetime: number | null;
  publishedAt: string;
  url: string;
  image: string | null;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  priceSource: TechStockPrice['source'] | null;
  delayed: true;
};

export type DefensiveStocksNewsPayload = {
  success: true;
  source: 'Finnhub + RSS fallback';
  priceSource: 'Finnhub/Yahoo Finance fallback';
  lastUpdated: string;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  prices: TechStockPrice[];
  items: DefensiveStockNewsItem[];
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

const STOCK_BY_SYMBOL = new Map(DEFENSIVE_STOCKS.map(stock => [stock.symbol, stock]));

const RSS_FALLBACK_FEEDS = [
  {
    source: 'Yahoo Finance',
    url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${DEFENSIVE_STOCKS.map(stock => stock.symbol).join(',')}&region=US&lang=en-US`,
  },
  {
    source: 'Google News',
    url: 'https://news.google.com/rss/search?q=(defensive%20stocks%20OR%20consumer%20staples%20stocks%20OR%20healthcare%20stocks%20OR%20utility%20stocks%20OR%20telecom%20stocks%20OR%20dividend%20stocks)%20(stock%20OR%20shares%20OR%20earnings%20OR%20market)&hl=en-US&gl=US&ceid=US:en',
  },
];

const RSS_STOCK_KEYWORDS: Array<{ symbol: string; keywords: string[] }> = [
  { symbol: 'PG', keywords: ['Procter', 'P&G', 'PG'] },
  { symbol: 'KO', keywords: ['Coca-Cola', 'Coca Cola', 'KO'] },
  { symbol: 'PEP', keywords: ['PepsiCo', 'PEP'] },
  { symbol: 'WMT', keywords: ['Walmart', 'WMT'] },
  { symbol: 'COST', keywords: ['Costco', 'COST'] },
  { symbol: 'CL', keywords: ['Colgate', 'CL'] },
  { symbol: 'KMB', keywords: ['Kimberly-Clark', 'Kimberly Clark', 'KMB'] },
  { symbol: 'GIS', keywords: ['General Mills', 'GIS'] },
  { symbol: 'MDLZ', keywords: ['Mondelez', 'MDLZ'] },
  { symbol: 'HSY', keywords: ['Hershey', 'HSY'] },
  { symbol: 'JNJ', keywords: ['Johnson & Johnson', 'Johnson and Johnson', 'JNJ'] },
  { symbol: 'PFE', keywords: ['Pfizer', 'PFE'] },
  { symbol: 'MRK', keywords: ['Merck', 'MRK'] },
  { symbol: 'ABBV', keywords: ['AbbVie', 'ABBV'] },
  { symbol: 'LLY', keywords: ['Eli Lilly', 'Lilly', 'LLY'] },
  { symbol: 'UNH', keywords: ['UnitedHealth', 'UNH'] },
  { symbol: 'BMY', keywords: ['Bristol Myers', 'Bristol-Myers', 'BMY'] },
  { symbol: 'NEE', keywords: ['NextEra', 'NEE'] },
  { symbol: 'DUK', keywords: ['Duke Energy', 'DUK'] },
  { symbol: 'SO', keywords: ['Southern Company'] },
  { symbol: 'AEP', keywords: ['American Electric Power', 'AEP'] },
  { symbol: 'EXC', keywords: ['Exelon', 'EXC'] },
  { symbol: 'VZ', keywords: ['Verizon', 'VZ'] },
  { symbol: 'T', keywords: ['AT&T', 'AT and T'] },
  { symbol: 'XLP', keywords: ['XLP', 'Consumer Staples Select Sector'] },
  { symbol: 'XLV', keywords: ['XLV', 'Health Care Select Sector'] },
  { symbol: 'XLU', keywords: ['XLU', 'Utilities Select Sector'] },
  { symbol: 'VDC', keywords: ['VDC', 'Vanguard Consumer Staples'] },
  { symbol: 'VHT', keywords: ['VHT', 'Vanguard Health Care'] },
];

const CATEGORY_KEYWORDS: Array<{ sector: DefensiveStockSector; keywords: string[] }> = [
  { sector: 'consumer_staples', keywords: ['consumer staples', 'staples', 'household products', 'defensive stocks'] },
  { sector: 'healthcare', keywords: ['healthcare', 'health care', 'medical', 'hospital', 'insurance'] },
  { sector: 'utilities', keywords: ['utilities', 'utility', 'electricity', 'power', 'regulated utility'] },
  { sector: 'telecom', keywords: ['telecom', 'telecommunications', 'wireless', 'broadband'] },
  { sector: 'food_beverage', keywords: ['food', 'beverage', 'drinks', 'snacks', 'grocery'] },
  { sector: 'essential_retail', keywords: ['retail', 'warehouse club', 'essential retail', 'supermarket'] },
  { sector: 'pharmaceuticals', keywords: ['pharmaceutical', 'pharma', 'drug', 'medicine', 'vaccine'] },
  { sector: 'insurance_stable', keywords: ['insurance', 'managed care', 'health insurer'] },
];

const NEWS_RANGES = [
  { daysBack: 7, label: '7d' },
  { daysBack: 30, label: '30d' },
  { daysBack: 90, label: '90d' },
] as const;

function dateString(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function hasUsableFinnhubKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
}

function devLog(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') console.info(message, meta);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasKeyword(text: string, keyword: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword.toLowerCase())}([^a-z0-9]|$)`, 'i').test(text);
}

function uniqueSectors(values: DefensiveStockSector[]) {
  return Array.from(new Set(values));
}

function stockSectors(stock: DefensiveStockConfig) {
  return uniqueSectors([stock.sector, ...(stock.sectors ?? [])]);
}

function matchStock(headline: string, summary: string) {
  const text = `${headline} ${summary}`.toLowerCase();
  const match = RSS_STOCK_KEYWORDS.find(({ keywords }) => keywords.some(keyword => hasKeyword(text, keyword)));
  return match ? STOCK_BY_SYMBOL.get(match.symbol) ?? null : null;
}

function detectNewsSectors(headline: string, summary: string, stock?: DefensiveStockConfig | null) {
  const text = `${headline} ${summary}`;
  const keywordSectors = CATEGORY_KEYWORDS
    .filter(({ keywords }) => keywords.some(keyword => hasKeyword(text, keyword)))
    .map(item => item.sector);
  return uniqueSectors([...(stock ? stockSectors(stock) : []), ...keywordSectors]);
}

async function fetchFinnhubJson<T>(url: string) {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Finnhub returned ${response.status}`);
  return body as T;
}

function mapNewsItem(stock: DefensiveStockConfig, item: FinnhubNews, price: TechStockPrice | undefined): DefensiveStockNewsItem | null {
  const headline = String(item.headline ?? '').trim();
  const url = String(item.url ?? '').trim();
  if (!headline || !url) return null;
  const rawSummary = String(item.summary ?? '').trim();
  const publishedAt = item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString();
  const sectors = detectNewsSectors(headline, rawSummary, stock);
  return {
    id: `${stock.symbol}-${item.id ?? publishedAt}-${url}`,
    headline,
    title: headline,
    summary: rawSummary,
    titleOriginal: headline,
    summaryOriginal: rawSummary,
    languageOriginal: 'en',
    companyName: stock.name,
    ticker: stock.symbol,
    sector: stock.sector,
    sectors,
    source: String(item.source ?? 'Finnhub').trim() || 'Finnhub',
    datetime: typeof item.datetime === 'number' ? item.datetime : null,
    publishedAt,
    url,
    image: String(item.image ?? '').trim() || null,
    price: price?.price ?? null,
    changePercent: price?.changePercent ?? null,
    change: price?.change ?? null,
    priceSource: price?.available ? price.source : null,
    delayed: true,
  };
}

function hasUsableArticle(item: FinnhubNews) {
  return Boolean(String(item.headline ?? '').trim() && String(item.url ?? '').trim());
}

async function fetchCompanyNewsForRange(stock: DefensiveStockConfig, apiKey: string, daysBack: number) {
  const params = new URLSearchParams({
    symbol: stock.symbol,
    from: dateString(daysBack),
    to: dateString(0),
    token: apiKey,
  });
  const news = await fetchFinnhubJson<unknown>(`https://finnhub.io/api/v1/company-news?${params.toString()}`);
  if (!Array.isArray(news)) throw new Error(`Finnhub company-news returned non-array response for ${stock.symbol}`);
  return news;
}

async function fetchAllCompanyNews(apiKey: string, daysBack: number) {
  const settled = await Promise.allSettled(
    DEFENSIVE_STOCKS.map(async stock => ({
      stock,
      news: await fetchCompanyNewsForRange(stock, apiKey, daysBack),
    })),
  );
  const rows = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value];
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DefensiveStocksNews] Finnhub company-news failed', {
        symbol: DEFENSIVE_STOCKS[index]?.symbol,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
    return [];
  });
  return {
    rows,
    usableCount: rows.reduce((sum, row) => sum + row.news.filter(item => hasUsableArticle(item as FinnhubNews)).length, 0),
  };
}

async function fetchRssFeed(feed: { source: string; url: string }) {
  const response = await fetch(feed.url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function parseRssItems(feed: { source: string; url: string }, xml: string, prices: Map<string, TechStockPrice>) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map(block => {
    const headline = extractTag(block, 'title');
    const url = extractLink(block);
    if (!headline || !url) return null;
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded');
    const summary = excerpt(description, headline);
    const stock = matchStock(headline, summary);
    const sectors = detectNewsSectors(headline, summary, stock);
    if (!stock && sectors.length === 0) return null;
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const publishedAt = safeDate(published);
    const price = stock ? prices.get(stock.symbol) : undefined;
    const row: DefensiveStockNewsItem = {
      id: `rss-${feed.source}-${url || headline}`.toLowerCase().replace(/\s+/g, '-'),
      headline,
      title: headline,
      summary,
      titleOriginal: headline,
      summaryOriginal: summary,
      languageOriginal: 'unknown',
      companyName: stock?.name ?? 'Defensive Stocks',
      ticker: stock?.symbol ?? 'DEF',
      sector: stock?.sector ?? sectors[0] ?? 'consumer_staples',
      sectors,
      source: feed.source,
      datetime: Math.floor(new Date(publishedAt).getTime() / 1000),
      publishedAt,
      url,
      image: null,
      price: price?.price ?? null,
      changePercent: price?.changePercent ?? null,
      change: price?.change ?? null,
      priceSource: price?.available ? price.source : null,
      delayed: true,
    };
    return row;
  }).filter((item): item is DefensiveStockNewsItem => Boolean(item));
}

async function fetchRssFallbackNews(prices: Map<string, TechStockPrice>) {
  const settled = await Promise.allSettled(
    RSS_FALLBACK_FEEDS.map(async feed => ({
      feed,
      items: parseRssItems(feed, await fetchRssFeed(feed), prices),
    })),
  );
  const items = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      devLog('[DefensiveStocksNews] RSS fallback returned', { source: result.value.feed.source, count: result.value.items.length });
      return result.value.items;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[DefensiveStocksNews] RSS fallback failed', {
        source: RSS_FALLBACK_FEEDS[index]?.source,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
    return [];
  });
  return items;
}

function dedupeAndSort(items: DefensiveStockNewsItem[]) {
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

export async function fetchDefensiveStocksNews(languageInput?: string | null) {
  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const prices = await fetchStockPrices(DEFENSIVE_STOCKS, apiKey);
  let selected: Awaited<ReturnType<typeof fetchAllCompanyNews>> | null = null;

  if (hasUsableFinnhubKey(apiKey)) {
    const usableApiKey = apiKey ?? '';
    for (const range of NEWS_RANGES) {
      selected = await fetchAllCompanyNews(usableApiKey, range.daysBack);
      if (selected.usableCount > 0) break;
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[DefensiveStocksNews] FINNHUB_API_KEY is not configured; using RSS fallback for news and Yahoo Finance fallback for prices.');
  }

  const finnhubItems = selected
    ? selected.rows.flatMap(({ stock, news }) => news
      .map(item => mapNewsItem(stock, item as FinnhubNews, prices.get(stock.symbol)))
      .filter((item): item is DefensiveStockNewsItem => Boolean(item)))
    : [];
  const rssItems = finnhubItems.length === 0 ? await fetchRssFallbackNews(prices) : [];
  const items = await translateNewsItems(dedupeAndSort(finnhubItems.length > 0 ? finnhubItems : rssItems), language) as DefensiveStockNewsItem[];
  const priceList = DEFENSIVE_STOCKS.map(stock => prices.get(stock.symbol) ?? {
    symbol: stock.symbol,
    price: null,
    changePercent: null,
    change: null,
    source: 'Finnhub' as const,
    delayed: true as const,
    available: false,
    unavailableReason: 'price_not_fetched',
  });

  return {
    success: true,
    source: 'Finnhub + RSS fallback',
    priceSource: 'Finnhub/Yahoo Finance fallback',
    lastUpdated: new Date().toISOString(),
    language,
    translationEnabled: isNewsTranslationEnabled(),
    prices: priceList,
    items,
    ...(items.length === 0 ? { message: 'No recent defensive stocks news found from configured real data sources.' } : {}),
  } satisfies DefensiveStocksNewsPayload;
}

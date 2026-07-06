import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import {
  getStockCategoryConfig,
  type StockCategoryConfig,
  type StockCategoryFilterKey,
  type StockCategoryId,
  type StockCategoryStock,
} from '@/lib/market/stockCategoryConfigs';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems, type AppNewsLanguage } from '@/lib/translation/translateNewsText';

export type StockCategoryNewsItem = {
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
  sector: StockCategoryFilterKey;
  sectors: StockCategoryFilterKey[];
  source: string;
  provider: 'Finnhub' | 'market_rss' | 'Google News';
  datetime: number | null;
  publishedAt: string;
  url: string;
  image: string | null;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  priceSource: TechStockPrice['source'] | null;
  delayed: true;
  shariaStatus?: 'needs_review' | 'unclassified' | 'non_compliant';
};

export type StockCategoryNewsPayload = {
  success: true;
  category: StockCategoryId;
  source: string;
  priceSource: string;
  lastUpdated: string;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  prices: TechStockPrice[];
  items: StockCategoryNewsItem[];
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

const NEWS_RANGES = [7, 30, 90] as const;

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

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stockFilters(stock: StockCategoryStock) {
  return uniqueValues([stock.filter, ...(stock.filters ?? [])]);
}

function makeStockMap(config: StockCategoryConfig) {
  return new Map(config.watchlist.map(stock => [stock.symbol, stock]));
}

function matchStock(config: StockCategoryConfig, headline: string, summary: string) {
  const text = `${headline} ${summary}`.toLowerCase();
  return config.watchlist.find(stock => {
    const keywords = [stock.symbol, stock.name, ...(stock.aliases ?? [])];
    return keywords.some(keyword => hasKeyword(text, keyword));
  }) ?? null;
}

function detectNewsFilters(config: StockCategoryConfig, headline: string, summary: string, stock?: StockCategoryStock | null) {
  const text = `${headline} ${summary}`;
  const keywordFilters = config.filters
    .filter(filter => filter.key !== 'all' && filter.keywords.some(keyword => hasKeyword(text, keyword)))
    .map(filter => filter.key);
  return uniqueValues([...(stock ? stockFilters(stock) : []), ...keywordFilters]);
}

function encodedGoogleNewsUrl(query: string) {
  const encoded = encodeURIComponent(`(${query}) (stock OR shares OR earnings OR market)`);
  return `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
}

function rssFeedsFor(config: StockCategoryConfig) {
  return [
    {
      source: 'market_rss',
      url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${config.watchlist.map(stock => stock.symbol).join(',')}&region=US&lang=en-US`,
    },
    {
      source: 'Google News',
      url: encodedGoogleNewsUrl(config.rssQuery),
    },
  ];
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

function mapNewsItem(
  config: StockCategoryConfig,
  stock: StockCategoryStock,
  item: FinnhubNews,
  price: TechStockPrice | undefined,
): StockCategoryNewsItem | null {
  const headline = String(item.headline ?? '').trim();
  const url = String(item.url ?? '').trim();
  if (!headline || !url) return null;
  const rawSummary = String(item.summary ?? '').trim();
  const publishedAt = item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString();
  const sectors = detectNewsFilters(config, headline, rawSummary, stock);
  return {
    id: `${config.id}-${stock.symbol}-${item.id ?? publishedAt}-${url}`,
    headline,
    title: headline,
    summary: rawSummary,
    titleOriginal: headline,
    summaryOriginal: rawSummary,
    languageOriginal: 'en',
    companyName: stock.name,
    ticker: stock.symbol,
    sector: stock.filter,
    sectors,
    source: String(item.source ?? 'Finnhub').trim() || 'Finnhub',
    provider: 'Finnhub',
    datetime: typeof item.datetime === 'number' ? item.datetime : null,
    publishedAt,
    url,
    image: String(item.image ?? '').trim() || null,
    price: price?.price ?? null,
    changePercent: price?.changePercent ?? null,
    change: price?.change ?? null,
    priceSource: price?.available ? price.source : null,
    delayed: true,
    ...(config.shariaCaution ? { shariaStatus: 'unclassified' as const } : {}),
  };
}

function hasUsableArticle(item: FinnhubNews) {
  return Boolean(String(item.headline ?? '').trim() && String(item.url ?? '').trim());
}

async function fetchCompanyNewsForRange(stock: StockCategoryStock, apiKey: string, daysBack: number) {
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

async function fetchAllCompanyNews(config: StockCategoryConfig, apiKey: string, daysBack: number) {
  const settled = await Promise.allSettled(
    config.watchlist.map(async stock => ({
      stock,
      news: await fetchCompanyNewsForRange(stock, apiKey, daysBack),
    })),
  );
  const rows = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [result.value];
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StockCategoryNews] Finnhub company-news failed', {
        category: config.id,
        symbol: config.watchlist[index]?.symbol,
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

function parseRssItems(config: StockCategoryConfig, feed: { source: string; url: string }, xml: string, prices: Map<string, TechStockPrice>) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const stockMap = makeStockMap(config);
  return blocks.map(block => {
    const headline = extractTag(block, 'title');
    const url = extractLink(block);
    if (!headline || !url) return null;
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded');
    const summary = excerpt(description, headline);
    const stock = matchStock(config, headline, summary);
    const sectors = detectNewsFilters(config, headline, summary, stock);
    if (!stock && sectors.length === 0) return null;
    const fallbackFilter = config.shariaCaution ? 'unclassified' : sectors[0] ?? config.filters.find(filter => filter.key !== 'all')?.key ?? 'general';
    const matchedStock = stock ?? stockMap.get('') ?? null;
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const publishedAt = safeDate(published);
    const price = matchedStock ? prices.get(matchedStock.symbol) : undefined;
    // Use 'market_rss' or 'Google News' — never expose underlying RSS provider names
    const provider: StockCategoryNewsItem['provider'] =
      feed.source === 'Google News' ? 'Google News' : 'market_rss';
    const row: StockCategoryNewsItem = {
      id: `rss-${config.id}-${feed.source}-${url || headline}`.toLowerCase().replace(/\s+/g, '-'),
      headline,
      title: headline,
      summary,
      titleOriginal: headline,
      summaryOriginal: summary,
      languageOriginal: 'unknown',
      companyName: matchedStock?.name ?? `${config.id} stocks`,
      ticker: matchedStock?.symbol ?? config.id.toUpperCase(),
      sector: matchedStock?.filter ?? fallbackFilter,
      sectors,
      source: feed.source === 'Google News' ? 'Google News' : 'News',
      provider,
      datetime: Math.floor(new Date(publishedAt).getTime() / 1000),
      publishedAt,
      url,
      image: null,
      price: price?.price ?? null,
      changePercent: price?.changePercent ?? null,
      change: price?.change ?? null,
      priceSource: price?.available ? price.source : null,
      delayed: true,
      ...(config.shariaCaution ? { shariaStatus: 'unclassified' as const } : {}),
    };
    return row;
  }).filter((item): item is StockCategoryNewsItem => Boolean(item));
}

async function fetchRssFallbackNews(config: StockCategoryConfig, prices: Map<string, TechStockPrice>) {
  const feeds = rssFeedsFor(config);
  const settled = await Promise.allSettled(
    feeds.map(async feed => ({
      feed,
      items: parseRssItems(config, feed, await fetchRssFeed(feed), prices),
    })),
  );
  return settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      devLog('[StockCategoryNews] RSS fallback returned', { category: config.id, source: result.value.feed.source, count: result.value.items.length });
      return result.value.items;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[StockCategoryNews] RSS fallback failed', {
        category: config.id,
        source: feeds[index]?.source,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
    return [];
  });
}

function dedupeAndSort(items: StockCategoryNewsItem[]) {
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

export async function fetchStockCategoryNews(categoryInput: string | null | undefined, languageInput?: string | null) {
  const config = getStockCategoryConfig(categoryInput);
  if (!config) throw new Error('Unsupported stock category');

  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const prices = await fetchStockPrices(config.watchlist, apiKey);
  let selected: Awaited<ReturnType<typeof fetchAllCompanyNews>> | null = null;

  if (hasUsableFinnhubKey(apiKey)) {
    const usableApiKey = apiKey ?? '';
    for (const daysBack of NEWS_RANGES) {
      selected = await fetchAllCompanyNews(config, usableApiKey, daysBack);
      if (selected.usableCount > 0) break;
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[StockCategoryNews] FINNHUB_API_KEY is not configured; using RSS fallback.', {
      category: config.id,
    });
  }

  const finnhubItems = selected
    ? selected.rows.flatMap(({ stock, news }) => news
      .map(item => mapNewsItem(config, stock, item as FinnhubNews, prices.get(stock.symbol)))
      .filter((item): item is StockCategoryNewsItem => Boolean(item)))
    : [];
  const rssItems = finnhubItems.length === 0 ? await fetchRssFallbackNews(config, prices) : [];
  const items = await translateNewsItems(dedupeAndSort(finnhubItems.length > 0 ? finnhubItems : rssItems), language) as StockCategoryNewsItem[];
  const priceList = config.watchlist.map(stock => prices.get(stock.symbol) ?? {
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
    category: config.id,
    source: 'market_news',
    priceSource: 'market_data',
    lastUpdated: new Date().toISOString(),
    language,
    translationEnabled: isNewsTranslationEnabled(),
    prices: priceList,
    items,
    ...(items.length === 0 ? { message: config.noNewsMessage } : {}),
  } satisfies StockCategoryNewsPayload;
}

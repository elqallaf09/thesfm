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
  translatedTo?: AppNewsLanguage;
  isTranslated?: boolean;
  translationSource?: string;
  companyName: string;
  ticker: string;
  sector: TechStockSector;
  sectors: TechStockSector[];
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

export type TechNewsPayload = {
  success: true;
  source: 'Finnhub' | 'Finnhub + RSS fallback';
  priceSource: 'Finnhub/Yahoo Finance fallback';
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
    url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${TECH_STOCKS.map(stock => stock.symbol).join(',')}&region=US&lang=en-US`,
  },
  {
    source: 'Google News',
    url: 'https://news.google.com/rss/search?q=(technology%20stocks%20OR%20AI%20stocks%20OR%20semiconductor%20stocks%20OR%20cloud%20computing%20stocks%20OR%20cybersecurity%20stocks%20OR%20e-commerce%20stocks%20OR%20electric%20vehicle%20stocks)%20(stock%20OR%20shares%20OR%20earnings%20OR%20market)&hl=en-US&gl=US&ceid=US:en',
  },
  {
    source: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
  },
];

const STOCK_BY_SYMBOL = new Map(TECH_STOCKS.map(stock => [stock.symbol, stock]));

const RSS_STOCK_KEYWORDS: Array<{ symbol: string; keywords: string[] }> = [
  { symbol: 'AMD', keywords: ['AMD', 'Advanced Micro Devices'] },
  { symbol: 'NVDA', keywords: ['Nvidia', 'NVIDIA', 'NVDA'] },
  { symbol: 'AAPL', keywords: ['Apple', 'AAPL', 'iPhone', 'iPad', 'Mac'] },
  { symbol: 'MSFT', keywords: ['Microsoft', 'MSFT', 'Azure'] },
  { symbol: 'META', keywords: ['Meta', 'Facebook', 'Instagram', 'WhatsApp'] },
  { symbol: 'AMZN', keywords: ['Amazon', 'AMZN', 'AWS'] },
  { symbol: 'TSLA', keywords: ['Tesla', 'TSLA'] },
  { symbol: 'INTC', keywords: ['Intel', 'INTC'] },
  { symbol: 'AVGO', keywords: ['Broadcom', 'AVGO'] },
  { symbol: 'PLTR', keywords: ['Palantir', 'PLTR'] },
  { symbol: 'GOOGL', keywords: ['Alphabet', 'Google', 'YouTube', 'GOOGL', 'GOOG'] },
  { symbol: 'CRM', keywords: ['Salesforce', 'CRM'] },
  { symbol: 'ORCL', keywords: ['Oracle', 'ORCL'] },
  { symbol: 'NFLX', keywords: ['Netflix', 'NFLX'] },
  { symbol: 'ADBE', keywords: ['Adobe', 'ADBE'] },
  { symbol: 'QCOM', keywords: ['Qualcomm', 'QCOM'] },
  { symbol: 'TSM', keywords: ['Taiwan Semiconductor', 'TSMC', 'TSM'] },
  { symbol: 'SHOP', keywords: ['Shopify', 'SHOP'] },
  { symbol: 'UBER', keywords: ['Uber', 'UBER'] },
  { symbol: 'MU', keywords: ['Micron', 'MU'] },
  { symbol: 'ASML', keywords: ['ASML'] },
  { symbol: 'ARM', keywords: ['Arm Holdings', 'ARM'] },
  { symbol: 'NOW', keywords: ['ServiceNow', 'NOW'] },
  { symbol: 'SNOW', keywords: ['Snowflake', 'SNOW'] },
  { symbol: 'INTU', keywords: ['Intuit', 'INTU'] },
  { symbol: 'TEAM', keywords: ['Atlassian', 'TEAM'] },
  { symbol: 'DELL', keywords: ['Dell', 'DELL'] },
  { symbol: 'HPQ', keywords: ['HP', 'HPQ', 'Hewlett Packard'] },
  { symbol: 'LOGI', keywords: ['Logitech', 'LOGI'] },
  { symbol: 'IBM', keywords: ['IBM'] },
  { symbol: 'NET', keywords: ['Cloudflare', 'NET'] },
  { symbol: 'CRWD', keywords: ['CrowdStrike', 'CRWD'] },
  { symbol: 'PANW', keywords: ['Palo Alto', 'PANW'] },
  { symbol: 'FTNT', keywords: ['Fortinet', 'FTNT'] },
  { symbol: 'ZS', keywords: ['Zscaler', 'ZS'] },
  { symbol: 'OKTA', keywords: ['Okta', 'OKTA'] },
  { symbol: 'S', keywords: ['SentinelOne'] },
  { symbol: 'MELI', keywords: ['MercadoLibre', 'Mercado Libre', 'MELI'] },
  { symbol: 'EBAY', keywords: ['eBay', 'EBAY'] },
  { symbol: 'RIVN', keywords: ['Rivian', 'RIVN'] },
  { symbol: 'LCID', keywords: ['Lucid', 'LCID'] },
  { symbol: 'SNAP', keywords: ['Snap', 'Snapchat', 'SNAP'] },
  { symbol: 'PINS', keywords: ['Pinterest', 'PINS'] },
  { symbol: 'TTD', keywords: ['The Trade Desk', 'TTD'] },
  { symbol: 'RBLX', keywords: ['Roblox', 'RBLX'] },
  { symbol: 'EA', keywords: ['Electronic Arts', 'EA'] },
  { symbol: 'TTWO', keywords: ['Take-Two', 'Take Two', 'TTWO'] },
  { symbol: 'SONY', keywords: ['Sony', 'SONY'] },
  { symbol: 'SMCI', keywords: ['Super Micro', 'Supermicro', 'SMCI'] },
  { symbol: 'VRT', keywords: ['Vertiv', 'VRT'] },
  { symbol: 'ANET', keywords: ['Arista', 'ANET'] },
];

const CATEGORY_KEYWORDS: Array<{ sector: TechStockSector; keywords: string[] }> = [
  { sector: 'ai', keywords: ['AI', 'artificial intelligence', 'generative AI', 'machine learning', 'OpenAI', 'data center AI'] },
  { sector: 'semiconductors', keywords: ['chip', 'chips', 'semiconductor', 'GPU', 'CPU', 'wafer', 'foundry', 'TSMC', 'Nvidia', 'AMD', 'Intel', 'Qualcomm', 'Broadcom', 'ASML'] },
  { sector: 'software', keywords: ['software', 'SaaS', 'enterprise software', 'CRM', 'cloud software', 'Adobe', 'Salesforce', 'Oracle', 'ServiceNow'] },
  { sector: 'hardware', keywords: ['iPhone', 'Mac', 'PC', 'laptop', 'hardware', 'Apple', 'Dell', 'HP'] },
  { sector: 'cloud', keywords: ['AWS', 'Azure', 'Google Cloud', 'cloud computing', 'cloud infrastructure'] },
  { sector: 'cybersecurity', keywords: ['cybersecurity', 'cyber security', 'security breach', 'ransomware', 'CrowdStrike', 'Palo Alto', 'Fortinet', 'Okta', 'Zscaler'] },
  { sector: 'ecommerce', keywords: ['e-commerce', 'ecommerce', 'online retail', 'marketplace', 'Amazon', 'Shopify'] },
  { sector: 'ev', keywords: ['electric vehicle', 'EV', 'Tesla', 'Rivian', 'Lucid', 'autonomous driving'] },
  { sector: 'social_ads', keywords: ['social media', 'advertising', 'digital ads', 'Meta', 'Instagram', 'Facebook', 'YouTube', 'Google Ads', 'Snap', 'Pinterest'] },
  { sector: 'gaming', keywords: ['gaming', 'streaming', 'Netflix', 'Roblox', 'Electronic Arts', 'EA', 'Take-Two', 'Take Two'] },
  { sector: 'infrastructure', keywords: ['data center', 'data centre', 'server', 'networking', 'AI infrastructure', 'Super Micro', 'Supermicro', 'Vertiv', 'Arista', 'Dell'] },
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
    signal: AbortSignal.timeout(8000),
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

function hasUsableFinnhubKey(apiKey?: string) {
  const key = apiKey?.trim();
  return Boolean(key && key !== 'your_key_here');
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

function matchStock(headline: string, summary: string) {
  const text = `${headline} ${summary}`.toLowerCase();
  const match = RSS_STOCK_KEYWORDS.find(({ keywords }) => keywords.some(keyword => hasKeyword(text, keyword)));
  return match ? STOCK_BY_SYMBOL.get(match.symbol) ?? null : null;
}

function uniqueSectors(values: TechStockSector[]) {
  return Array.from(new Set(values));
}

function stockSectors(stock: TechStockConfig) {
  return uniqueSectors([stock.sector, ...(stock.sectors ?? [])]);
}

function detectNewsSectors(headline: string, summary: string, stock?: TechStockConfig | null) {
  const text = `${headline} ${summary}`;
  const keywordSectors = CATEGORY_KEYWORDS
    .filter(({ keywords }) => keywords.some(keyword => hasKeyword(text, keyword)))
    .map(item => item.sector);
  return uniqueSectors([...(stock ? stockSectors(stock) : []), ...keywordSectors]);
}

function mapNewsItem(stock: TechStockConfig, item: FinnhubNews, price: TechStockPrice | undefined): TechNewsItem | null {
  const headline = String(item.headline ?? '').trim();
  const url = String(item.url ?? '').trim();
  if (!headline || !url) return null;
  const publishedAt = item.datetime ? new Date(item.datetime * 1000).toISOString() : new Date().toISOString();
  const sectors = detectNewsSectors(headline, String(item.summary ?? '').trim(), stock);
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

function parseRssTechItems(feed: { source: string; url: string }, xml: string, prices: Map<string, TechStockPrice>) {
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
    const row: TechNewsItem = {
      id: `rss-${feed.source}-${url || headline}`.toLowerCase().replace(/\s+/g, '-'),
      headline,
      summary,
      titleOriginal: headline,
      summaryOriginal: summary,
      languageOriginal: 'unknown',
      title: headline,
      companyName: stock?.name ?? 'Technology Market',
      ticker: stock?.symbol ?? 'TECH',
      sector: stock?.sector ?? sectors[0] ?? 'ai',
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
  const prices = await fetchStockPrices(TECH_STOCKS, apiKey);
  if (hasUsableFinnhubKey(apiKey)) {
    const usableApiKey = apiKey ?? '';
    selected = await fetchAllCompanyNewsForRange(usableApiKey, NEWS_RANGES[0]!);
    if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(usableApiKey, NEWS_RANGES[1]!);
    if (selected.usableCount === 0) selected = await fetchAllCompanyNewsForRange(usableApiKey, NEWS_RANGES[2]!);
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn('[TechNews] FINNHUB_API_KEY is not configured; using RSS fallback for news and Yahoo Finance fallback for prices.');
  }

  const finnhubItems = selected
    ? selected.rows.flatMap(({ stock, news }) => news
      .map(item => mapNewsItem(stock, item as FinnhubNews, prices.get(stock.symbol)))
      .filter((item): item is TechNewsItem => Boolean(item)))
    : [];
  const rssItems = finnhubItems.length === 0 ? await fetchRssFallbackNews(prices) : [];
  const items = await translateNewsItems(dedupeAndSort(finnhubItems.length > 0 ? finnhubItems : rssItems), language) as TechNewsItem[];
  const priceList = TECH_STOCKS.map(stock => prices.get(stock.symbol) ?? {
    symbol: stock.symbol,
    price: null,
    changePercent: null,
    change: null,
    source: 'Finnhub' as const,
    delayed: true as const,
    available: false,
    unavailableReason: 'price_not_fetched',
  });
  devLog('[TechNews] Final payload counts', { items: items.length, prices: priceList.length });

  return {
    success: true,
    source: 'Finnhub + RSS fallback',
    priceSource: 'Finnhub/Yahoo Finance fallback',
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

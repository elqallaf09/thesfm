import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems, type AppNewsLanguage } from '@/lib/translation/translateNewsText';

export type CryptoNewsCategory = 'bitcoin' | 'ethereum' | 'altcoins' | 'etfs' | 'regulation' | 'exchanges' | 'blockchain';
export type CryptoNewsSymbol = 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB' | 'DOGE';

export type CryptoNewsItem = {
  id: string;
  headline: string;
  title: string;
  summary: string;
  titleOriginal: string;
  summaryOriginal: string;
  languageOriginal: string;
  source: string;
  publishedAt: string;
  url: string;
  categories: CryptoNewsCategory[];
  symbols: CryptoNewsSymbol[];
  isTranslated?: boolean;
  translatedTo?: AppNewsLanguage;
  translationSource?: string;
};

export type CryptoNewsPayload = {
  success: true;
  source: 'RSS feeds';
  lastUpdated: string;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  items: CryptoNewsItem[];
  message?: string;
};

type RssFeed = {
  source: string;
  url: string;
};

const RSS_FEEDS: RssFeed[] = [
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'The Block', url: 'https://www.theblock.co/rss.xml' },
  {
    source: 'Google News Crypto',
    url: 'https://news.google.com/rss/search?q=(bitcoin%20OR%20ethereum%20OR%20crypto%20OR%20cryptocurrency%20OR%20blockchain%20OR%20bitcoin%20ETF)%20(source%3Areuters.com%20OR%20source%3Acnbc.com%20OR%20source%3Ayahoo.com%20OR%20source%3Ainvesting.com%20OR%20source%3Acoindesk.com%20OR%20source%3Acointelegraph.com)&hl=en-US&gl=US&ceid=US:en',
  },
];

const CATEGORY_KEYWORDS: Record<CryptoNewsCategory, string[]> = {
  bitcoin: ['bitcoin', 'btc', 'satoshi'],
  ethereum: ['ethereum', 'ether', 'eth', 'vitalik'],
  altcoins: ['altcoin', 'altcoins', 'solana', 'sol', 'xrp', 'ripple', 'bnb', 'binance coin', 'dogecoin', 'doge'],
  etfs: ['etf', 'exchange-traded fund', 'spot bitcoin fund', 'spot ether fund', 'bitcoin fund', 'ethereum fund'],
  regulation: ['regulation', 'regulator', 'sec', 'cftc', 'lawsuit', 'legislation', 'congress', 'compliance', 'MiCA', 'ban', 'license', 'licensed'],
  exchanges: ['exchange', 'exchanges', 'coinbase', 'binance', 'kraken', 'okx', 'bybit', 'gemini', 'bitstamp', 'ftx'],
  blockchain: ['blockchain', 'network', 'layer 2', 'layer-2', 'defi', 'smart contract', 'tokenization', 'stablecoin', 'on-chain', 'web3'],
};

const SYMBOL_KEYWORDS: Array<{ symbol: CryptoNewsSymbol; keywords: string[] }> = [
  { symbol: 'BTC', keywords: ['bitcoin', 'btc'] },
  { symbol: 'ETH', keywords: ['ethereum', 'ether', 'eth'] },
  { symbol: 'SOL', keywords: ['solana', 'sol'] },
  { symbol: 'XRP', keywords: ['xrp', 'ripple'] },
  { symbol: 'BNB', keywords: ['bnb', 'binance coin'] },
  { symbol: 'DOGE', keywords: ['dogecoin', 'doge'] },
];

function devWarn(message: string, meta: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, meta);
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

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function excerpt(value: string, fallback: string) {
  const text = cleanText(value || fallback);
  return text.length <= 210 ? text : `${text.slice(0, 207).trim()}...`;
}

function normalizedText(...values: string[]) {
  return values.join(' ').toLowerCase();
}

function hasKeyword(text: string, keyword: string) {
  const lowerKeyword = keyword.toLowerCase();
  if (/^[a-z0-9]+$/i.test(lowerKeyword)) {
    return new RegExp(`(^|[^a-z0-9])${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(lowerKeyword);
}

function detectCategories(title: string, summary: string): CryptoNewsCategory[] {
  const text = normalizedText(title, summary);
  const categories = (Object.entries(CATEGORY_KEYWORDS) as Array<[CryptoNewsCategory, string[]]>)
    .filter(([, keywords]) => keywords.some(keyword => hasKeyword(text, keyword)))
    .map(([category]) => category);
  return Array.from(new Set(categories.length > 0 ? categories : ['blockchain']));
}

function detectSymbols(title: string, summary: string): CryptoNewsSymbol[] {
  const text = normalizedText(title, summary);
  return SYMBOL_KEYWORDS
    .filter(({ keywords }) => keywords.some(keyword => hasKeyword(text, keyword)))
    .map(item => item.symbol);
}

async function fetchRssFeed(feed: RssFeed) {
  const response = await fetch(feed.url, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(9000),
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      'user-agent': 'THE-SFM/1.0 (+https://www.the-sfm.com)',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function parseRssItems(feed: RssFeed, xml: string) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map(block => {
    const title = extractTag(block, 'title');
    const url = extractLink(block);
    if (!title || !url) return null;
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded');
    const summary = excerpt(description, title);
    const categories = detectCategories(title, summary);
    const symbols = detectSymbols(title, summary);
    const published = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const publishedAt = safeDate(published);

    return {
      id: `crypto-${feed.source}-${url || title}`.toLowerCase().replace(/\s+/g, '-'),
      headline: title,
      title,
      summary,
      titleOriginal: title,
      summaryOriginal: summary,
      languageOriginal: 'unknown',
      source: feed.source,
      publishedAt,
      url,
      categories,
      symbols,
    } satisfies CryptoNewsItem;
  }).filter((item): item is CryptoNewsItem => Boolean(item));
}

function dedupeAndSort(items: CryptoNewsItem[]) {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const seenComposite = new Set<string>();

  return items
    .filter(item => {
      const urlKey = item.url.trim().toLowerCase().replace(/[?#].*$/, '');
      const titleKey = item.titleOriginal.trim().toLowerCase().replace(/\s+/g, ' ');
      const compositeKey = `${titleKey}|${item.source.trim().toLowerCase()}|${item.publishedAt.slice(0, 10)}`;
      if (!urlKey || !titleKey || seenUrls.has(urlKey) || seenTitles.has(titleKey) || seenComposite.has(compositeKey)) return false;
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      seenComposite.add(compositeKey);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 80);
}

export async function fetchCryptoNews(languageInput?: string | null) {
  const language = normalizeNewsLanguage(languageInput);
  const settled = await Promise.allSettled(
    RSS_FEEDS.map(async feed => ({
      feed,
      items: parseRssItems(feed, await fetchRssFeed(feed)),
    })),
  );

  const items = settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') return result.value.items;
    devWarn('[CryptoNews] RSS source failed', {
      source: RSS_FEEDS[index]?.source,
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });

  const dedupedItems = dedupeAndSort(items);
  const translatedItems = await translateNewsItems(dedupedItems, language) as CryptoNewsItem[];

  return {
    success: true,
    source: 'RSS feeds',
    lastUpdated: new Date().toISOString(),
    language,
    translationEnabled: isNewsTranslationEnabled(),
    items: translatedItems,
    ...(translatedItems.length === 0
      ? { message: 'No recent crypto news found from the configured real data sources.' }
      : {}),
  } satisfies CryptoNewsPayload;
}

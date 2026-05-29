import type { EuropeMarketId } from '@/lib/europe/europeMarkets';

export type EuropeRssFeed = {
  market: EuropeMarketId;
  source: string;
  url: string;
};

function yahoo(symbol: string) {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
}

function googleNews(query: string, region: string, language = 'en') {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}-${region}&gl=${region}&ceid=${region}:${language}`;
}

// Free public RSS endpoints verified to return XML without API keys. Feeds are
// parsed server-side, cached, and skipped gracefully if a publisher blocks or fails.
export const EUROPE_RSS_FEEDS: EuropeRssFeed[] = [
  { market: 'uk', source: 'Yahoo Finance RSS', url: yahoo('^FTSE') },
  { market: 'uk', source: 'Google News RSS', url: googleNews('FTSE 100 UK market London stocks', 'GB') },
  { market: 'germany', source: 'Yahoo Finance RSS', url: yahoo('^GDAXI') },
  { market: 'germany', source: 'Google News RSS', url: googleNews('DAX German market stocks Frankfurt', 'DE') },
  { market: 'france', source: 'Yahoo Finance RSS', url: yahoo('^FCHI') },
  { market: 'france', source: 'Google News RSS', url: googleNews('CAC 40 French market stocks Paris', 'FR') },
  { market: 'italy', source: 'Yahoo Finance RSS', url: yahoo('^FTMIB') },
  { market: 'italy', source: 'Google News RSS', url: googleNews('FTSE MIB Italian market stocks Milan', 'IT') },
  { market: 'spain', source: 'Yahoo Finance RSS', url: yahoo('^IBEX') },
  { market: 'spain', source: 'Google News RSS', url: googleNews('IBEX 35 Spanish market stocks Madrid', 'ES') },
  { market: 'netherlands', source: 'Yahoo Finance RSS', url: yahoo('^AEX') },
  { market: 'netherlands', source: 'Google News RSS', url: googleNews('AEX Netherlands market stocks Amsterdam', 'NL') },
  { market: 'switzerland', source: 'Yahoo Finance RSS', url: yahoo('^SSMI') },
  { market: 'switzerland', source: 'Google News RSS', url: googleNews('SMI Swiss market stocks Zurich', 'CH') },
  { market: 'europe', source: 'Yahoo Finance RSS', url: yahoo('^STOXX50E') },
  { market: 'europe', source: 'Google News RSS', url: googleNews('Euro Stoxx 50 European market stocks', 'GB') },
];

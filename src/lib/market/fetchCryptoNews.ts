import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
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
  updatedAt?: string | null;
  url: string;
  categories: CryptoNewsCategory[];
  symbols: CryptoNewsSymbol[];
  isTranslated?: boolean;
  translatedTo?: AppNewsLanguage;
  translationSource?: string;
  verificationStatus: ConsolidatedNewsStory['verificationStatus'];
  independentSourceCount: number;
  supportingSources: ConsolidatedNewsStory['supportingSources'];
  isOfficial: boolean;
  sourceReliability: number;
  eventType: ConsolidatedNewsStory['eventType'];
  importanceScore: number;
  sentiment: ConsolidatedNewsStory['sentiment'];
  expectedImpact: ConsolidatedNewsStory['expectedImpact'];
  impactDirection: ConsolidatedNewsStory['impactDirection'];
  impactHorizon: ConsolidatedNewsStory['impactHorizon'];
  impactReason: string | null;
  conflictSummary: string | null;
  whyItMatters: string | null;
};

export type CryptoNewsPayload = {
  success: true;
  source: 'Multi-source market news';
  lastUpdated: string;
  lastSuccessfulUpdate: string | null;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  items: CryptoNewsItem[];
  providerCoverage: unknown[];
  partialFailure: boolean;
  liveUpdatesAvailable: boolean;
  storedFallbackUsed: boolean;
  message?: string;
};

const SYMBOLS = new Set<CryptoNewsSymbol>(['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE']);

function categoriesFor(story: ConsolidatedNewsStory): CryptoNewsCategory[] {
  const text = `${story.title} ${story.summary ?? ''}`.toLowerCase();
  const categories: CryptoNewsCategory[] = [];
  if (/\b(bitcoin|btc)\b/i.test(text)) categories.push('bitcoin');
  if (/\b(ethereum|ether|eth)\b/i.test(text)) categories.push('ethereum');
  if (/\b(altcoin|solana|xrp|ripple|bnb|dogecoin|doge)\b/i.test(text)) categories.push('altcoins');
  if (/\betf\b|exchange-traded fund/i.test(text)) categories.push('etfs');
  if (story.eventType === 'regulatory_action' || /regulat|legislation|compliance|sec\b|cftc\b|mica\b/i.test(text)) categories.push('regulation');
  if (story.eventType === 'exchange_announcement' || /\b(exchange|coinbase|binance|kraken|okx|bybit)\b/i.test(text)) categories.push('exchanges');
  if (/blockchain|network|layer.?2|defi|smart contract|tokeni[sz]|stablecoin|on-chain|web3/i.test(text)) categories.push('blockchain');
  const selected: CryptoNewsCategory[] = categories.length > 0 ? categories : ['blockchain'];
  return [...new Set(selected)];
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function fetchCryptoNews(languageInput?: string | null) {
  const language = normalizeNewsLanguage(languageInput);
  const aggregated = await aggregateFinancialNews({
    query: 'bitcoin ethereum cryptocurrency blockchain regulation exchange ETF markets',
    symbols: [...SYMBOLS],
    marketCodes: ['crypto'],
    assetTypes: ['crypto'],
    from: dateDaysAgo(30),
    to: new Date().toISOString().slice(0, 10),
    language,
    limit: 180,
  }, { page: 1, pageSize: 60, sort: 'importance' });

  const baseItems: CryptoNewsItem[] = aggregated.stories.map(story => ({
    id: story.id,
    headline: story.title,
    title: story.title,
    summary: story.summary ?? '',
    titleOriginal: story.title,
    summaryOriginal: story.summary ?? '',
    languageOriginal: story.originalLanguage,
    source: story.sourceName,
    publishedAt: story.publishedAt,
    updatedAt: story.latestUpdatedAt,
    url: story.originalUrl,
    categories: categoriesFor(story),
    symbols: story.symbols.filter((symbol): symbol is CryptoNewsSymbol => SYMBOLS.has(symbol as CryptoNewsSymbol)),
    verificationStatus: story.verificationStatus,
    independentSourceCount: story.independentSourceCount,
    supportingSources: story.supportingSources,
    isOfficial: story.isOfficial,
    sourceReliability: story.sourceReliability,
    eventType: story.eventType,
    importanceScore: story.importanceScore,
    sentiment: story.sentiment,
    expectedImpact: story.expectedImpact,
    impactDirection: story.impactDirection,
    impactHorizon: story.impactHorizon,
    impactReason: story.impactReason,
    conflictSummary: story.conflictSummary,
    whyItMatters: story.whyItMatters,
  }));
  const items = await translateNewsItems(baseItems, language) as CryptoNewsItem[];

  return {
    success: true,
    source: 'Multi-source market news',
    lastUpdated: aggregated.lastUpdated ?? aggregated.lastSuccessfulUpdate ?? new Date(0).toISOString(),
    lastSuccessfulUpdate: aggregated.lastSuccessfulUpdate,
    language,
    translationEnabled: isNewsTranslationEnabled(),
    items,
    providerCoverage: aggregated.providerCoverage,
    partialFailure: aggregated.partialFailure,
    liveUpdatesAvailable: aggregated.liveUpdatesAvailable,
    storedFallbackUsed: aggregated.storedFallbackUsed,
    ...(items.length === 0 ? { message: 'No recent crypto news was found in the configured sources.' } : {}),
  } satisfies CryptoNewsPayload;
}

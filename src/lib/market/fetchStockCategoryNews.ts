import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import {
  getStockCategoryConfig,
  type StockCategoryFilterKey,
  type StockCategoryId,
} from '@/lib/market/stockCategoryConfigs';
import {
  isNewsTranslationEnabled,
  normalizeNewsLanguage,
  translateNewsItems,
  type AppNewsLanguage,
} from '@/lib/translation/translateNewsText';

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
  provider: string;
  datetime: number | null;
  publishedAt: string;
  updatedAt?: string | null;
  url: string;
  image: string | null;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  priceSource: TechStockPrice['source'] | null;
  delayed: true;
  isOfficial: boolean;
  sourceReliability: number;
  verificationStatus: ConsolidatedNewsStory['verificationStatus'];
  independentSourceCount: number;
  corroboratingSourceCount: number;
  supportingSources: ConsolidatedNewsStory['supportingSources'];
  eventType: ConsolidatedNewsStory['eventType'];
  importanceScore: number;
  relevanceScore: number;
  confidenceScore: number;
  entityConfidenceScore: number;
  sentiment: ConsolidatedNewsStory['sentiment'];
  expectedImpact: ConsolidatedNewsStory['expectedImpact'];
  impactDirection: ConsolidatedNewsStory['impactDirection'];
  impactHorizon: ConsolidatedNewsStory['impactHorizon'];
  impactReason: string | null;
  conflictSummary: string | null;
  whyItMatters: string | null;
  marketCodes: string[];
  exchangeCodes: string[];
  shariaStatus?: 'needs_review' | 'unclassified' | 'non_compliant';
};

export type StockCategoryNewsPayload = {
  success: true;
  category: StockCategoryId;
  source: string;
  priceSource: string;
  lastUpdated: string;
  lastSuccessfulUpdate: string | null;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  prices: TechStockPrice[];
  items: StockCategoryNewsItem[];
  providerCoverage: unknown[];
  partialFailure: boolean;
  liveUpdatesAvailable: boolean;
  storedFallbackUsed: boolean;
  message?: string;
};

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export async function fetchStockCategoryNews(categoryInput: string | null | undefined, languageInput?: string | null) {
  const config = getStockCategoryConfig(categoryInput);
  if (!config) throw new Error('Unsupported stock category');

  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const [newsResult, priceResult] = await Promise.allSettled([
    aggregateFinancialNews({
      query: config.rssQuery,
      symbols: config.watchlist.map(stock => stock.symbol),
      companyNames: config.watchlist.flatMap(stock => [stock.name, ...(stock.aliases ?? [])]),
      marketCodes: ['US'],
      countries: ['US'],
      sectors: config.filters.filter(filter => filter.key !== 'all').map(filter => filter.key),
      assetTypes: ['equity', 'etf'],
      from: dateDaysAgo(45),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 160,
    }, { page: 1, pageSize: 60, sort: 'importance' }),
    fetchStockPrices(config.watchlist, apiKey),
  ]);

  const aggregated = newsResult.status === 'fulfilled'
    ? newsResult.value
    : {
      stories: [] as ConsolidatedNewsStory[],
      providerCoverage: [],
      partialFailure: false,
      liveUpdatesAvailable: false,
      storedFallbackUsed: false,
      lastUpdated: null,
      lastSuccessfulUpdate: null,
    };
  const prices = priceResult.status === 'fulfilled' ? priceResult.value : new Map<string, TechStockPrice>();
  const stockBySymbol = new Map(config.watchlist.map(stock => [stock.symbol.toUpperCase(), stock]));

  const normalizedItems: StockCategoryNewsItem[] = aggregated.stories.map(story => {
    const stock = story.symbols.map(symbol => stockBySymbol.get(symbol.toUpperCase())).find(Boolean) ?? null;
    const storySectors = unique(story.sectors.filter(sector => config.filters.some(filter => filter.key === sector)));
    const fallbackSector = config.filters.find(filter => filter.key !== 'all')?.key ?? 'general';
    const sectors = unique([...(stock?.filters ?? []), stock?.filter ?? '', ...storySectors]);
    const sector = stock?.filter ?? sectors[0] ?? fallbackSector;
    const price = stock ? prices.get(stock.symbol) : undefined;
    const publishedTimestamp = new Date(story.publishedAt).getTime();

    return {
      id: story.id,
      headline: story.title,
      title: story.title,
      summary: story.summary ?? '',
      titleOriginal: story.title,
      summaryOriginal: story.summary ?? '',
      languageOriginal: story.originalLanguage,
      companyName: stock?.name ?? story.companyNames[0] ?? `${config.id} stocks`,
      ticker: stock?.symbol ?? story.symbols[0] ?? config.id.toUpperCase(),
      sector,
      sectors,
      source: story.sourceName,
      provider: story.sourceName,
      datetime: Number.isFinite(publishedTimestamp) ? Math.floor(publishedTimestamp / 1000) : null,
      publishedAt: story.publishedAt,
      updatedAt: story.latestUpdatedAt,
      url: story.originalUrl,
      image: null,
      price: price?.price ?? null,
      changePercent: price?.changePercent ?? null,
      change: price?.change ?? null,
      priceSource: price?.available ? price.source : null,
      delayed: true,
      isOfficial: story.isOfficial,
      sourceReliability: story.sourceReliability,
      verificationStatus: story.verificationStatus,
      independentSourceCount: story.independentSourceCount,
      corroboratingSourceCount: story.corroboratingSourceCount,
      supportingSources: story.supportingSources,
      eventType: story.eventType,
      importanceScore: story.importanceScore,
      relevanceScore: story.relevanceScore,
      confidenceScore: story.confidenceScore,
      entityConfidenceScore: story.entityConfidenceScore,
      sentiment: story.sentiment,
      expectedImpact: story.expectedImpact,
      impactDirection: story.impactDirection,
      impactHorizon: story.impactHorizon,
      impactReason: story.impactReason,
      conflictSummary: story.conflictSummary,
      whyItMatters: story.whyItMatters,
      marketCodes: story.marketCodes,
      exchangeCodes: story.exchangeCodes,
      ...(config.shariaCaution ? { shariaStatus: 'unclassified' as const } : {}),
    };
  });

  const items = await translateNewsItems(normalizedItems, language) as StockCategoryNewsItem[];
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
  const lastUpdated = aggregated.lastUpdated ?? aggregated.lastSuccessfulUpdate ?? new Date(0).toISOString();

  return {
    success: true,
    category: config.id,
    source: 'multi-source market news',
    priceSource: 'market data',
    lastUpdated,
    lastSuccessfulUpdate: aggregated.lastSuccessfulUpdate,
    language,
    translationEnabled: isNewsTranslationEnabled(),
    prices: priceList,
    items,
    providerCoverage: aggregated.providerCoverage,
    partialFailure: aggregated.partialFailure,
    liveUpdatesAvailable: aggregated.liveUpdatesAvailable,
    storedFallbackUsed: aggregated.storedFallbackUsed,
    ...(items.length === 0 ? { message: config.noNewsMessage } : {}),
  } satisfies StockCategoryNewsPayload;
}

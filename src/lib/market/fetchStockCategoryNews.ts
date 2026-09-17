import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { screenStockCategory } from '@/lib/market/stockCategoryScanner';
import {
  getStockCategoryConfig,
  type StockCategoryFilterKey,
  type StockCategoryId,
  type StockCategoryStock,
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
  scannerMode?: string;
  scannerUniverseCount?: number;
  scannerMatchedCount?: number;
  message?: string;
};

const NEWS_SYMBOL_LIMIT = 120;
const PRICE_SYMBOL_LIMIT = 80;

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function scannerStockFilter(config: NonNullable<ReturnType<typeof getStockCategoryConfig>>, sector: string | null, industry: string | null) {
  const haystack = normalize(`${sector ?? ''} ${industry ?? ''}`);
  const match = config.filters.find(filter => filter.key !== 'all' && filter.keywords.some(keyword => haystack.includes(normalize(keyword))));
  return match?.key ?? config.filters.find(filter => filter.key !== 'all')?.key ?? 'general';
}

async function categoryUniverse(config: NonNullable<ReturnType<typeof getStockCategoryConfig>>) {
  // Sharia news keeps its conservative configured universe here. The full
  // Sharia scanner is exposed separately and retains explicit screening status.
  if (config.id === 'sharia') {
    return {
      stocks: config.watchlist,
      mode: 'configured_sharia_news_universe',
      universeCount: config.watchlist.length,
      matchedCount: config.watchlist.length,
    };
  }

  const scan = await screenStockCategory(config.id, { limit: NEWS_SYMBOL_LIMIT }).catch(() => null);
  if (!scan || scan.items.length === 0) {
    return {
      stocks: config.watchlist,
      mode: 'fallback_watchlist',
      universeCount: config.watchlist.length,
      matchedCount: config.watchlist.length,
    };
  }

  const stocks: StockCategoryStock[] = scan.items.map(item => {
    const filter = scannerStockFilter(config, item.sector, item.industry);
    return {
      symbol: item.symbol,
      name: item.name,
      filter,
      filters: [filter],
      aliases: [],
    };
  });
  return {
    stocks,
    mode: scan.mode,
    universeCount: scan.universeCount,
    matchedCount: scan.matchedCount,
  };
}

export async function fetchStockCategoryNews(categoryInput: string | null | undefined, languageInput?: string | null) {
  const config = getStockCategoryConfig(categoryInput);
  if (!config) throw new Error('Unsupported stock category');

  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const universe = await categoryUniverse(config);
  const newsStocks = universe.stocks.slice(0, NEWS_SYMBOL_LIMIT);
  const priceStocks = newsStocks.slice(0, PRICE_SYMBOL_LIMIT);

  const [newsResult, priceResult] = await Promise.allSettled([
    aggregateFinancialNews({
      query: config.rssQuery,
      symbols: newsStocks.map(stock => stock.symbol),
      companyNames: newsStocks.flatMap(stock => [stock.name, ...(stock.aliases ?? [])]),
      marketCodes: ['US'],
      countries: ['US'],
      sectors: config.filters.filter(filter => filter.key !== 'all').map(filter => filter.key),
      assetTypes: ['equity', 'etf'],
      from: dateDaysAgo(45),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 240,
    }, { page: 1, pageSize: 80, sort: 'importance' }),
    fetchStockPrices(priceStocks, apiKey),
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
  const stockBySymbol = new Map(newsStocks.map(stock => [stock.symbol.toUpperCase(), stock]));

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
  const priceList = priceStocks.map(stock => prices.get(stock.symbol) ?? {
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
    source: 'multi-source market news + dynamic category scanner',
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
    scannerMode: universe.mode,
    scannerUniverseCount: universe.universeCount,
    scannerMatchedCount: universe.matchedCount,
    ...(items.length === 0 ? { message: config.noNewsMessage } : {}),
  } satisfies StockCategoryNewsPayload;
}

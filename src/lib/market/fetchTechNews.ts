import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { TECH_STOCKS, type TechStockSector } from '@/lib/market/techStocks';
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
  updatedAt?: string | null;
  url: string;
  image: string | null;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  priceSource: TechStockPrice['source'] | null;
  delayed: true;
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
  whyItMatters: string | null;
  conflictSummary: string | null;
};

export type TechNewsPayload = {
  success: true;
  source: 'Multi-source market news';
  priceSource: 'Finnhub/Yahoo Finance fallback';
  lastUpdated: string;
  lastSuccessfulUpdate: string | null;
  language: AppNewsLanguage;
  translationEnabled: boolean;
  dateRangeUsed?: '30d';
  prices: TechStockPrice[];
  items: TechNewsItem[];
  providerCoverage: unknown[];
  partialFailure: boolean;
  liveUpdatesAvailable: boolean;
  storedFallbackUsed: boolean;
  message?: string;
};

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

export async function fetchTechNews(languageInput?: string | null) {
  const language = normalizeNewsLanguage(languageInput);
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  const [newsResult, priceResult] = await Promise.allSettled([
    aggregateFinancialNews({
      query: 'technology stocks artificial intelligence semiconductors software cloud cybersecurity ecommerce electric vehicles',
      symbols: TECH_STOCKS.map(stock => stock.symbol),
      companyNames: TECH_STOCKS.flatMap(stock => [stock.name, ...(stock.aliases ?? [])]),
      marketCodes: ['US'],
      countries: ['US'],
      sectors: ['ai', 'semiconductors', 'software', 'hardware', 'cloud', 'cybersecurity', 'ecommerce', 'ev', 'social_ads', 'gaming', 'infrastructure'],
      assetTypes: ['equity'],
      from: dateDaysAgo(30),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 180,
    }, { page: 1, pageSize: 60, sort: 'importance' }),
    fetchStockPrices(TECH_STOCKS, apiKey),
  ]);
  const aggregated = newsResult.status === 'fulfilled' ? newsResult.value : null;
  const prices = priceResult.status === 'fulfilled' ? priceResult.value : new Map<string, TechStockPrice>();
  const stockBySymbol = new Map(TECH_STOCKS.map(stock => [stock.symbol.toUpperCase(), stock]));

  const baseItems: TechNewsItem[] = (aggregated?.stories ?? []).map(story => {
    const stock = story.symbols.map(symbol => stockBySymbol.get(symbol.toUpperCase())).find(Boolean) ?? null;
    const price = stock ? prices.get(stock.symbol) : undefined;
    const published = new Date(story.publishedAt).getTime();
    const allowedSectors = new Set(TECH_STOCKS.flatMap(item => [item.sector, ...(item.sectors ?? [])]));
    const sectors = [...new Set([...(stock?.sectors ?? []), stock?.sector, ...story.sectors.filter((sector): sector is TechStockSector => allowedSectors.has(sector as TechStockSector))].filter(Boolean))] as TechStockSector[];
    return {
      id: story.id,
      headline: story.title,
      title: story.title,
      summary: story.summary ?? '',
      titleOriginal: story.title,
      summaryOriginal: story.summary ?? '',
      languageOriginal: story.originalLanguage,
      companyName: stock?.name ?? story.companyNames[0] ?? 'Technology market',
      ticker: stock?.symbol ?? story.symbols[0] ?? 'TECH',
      sector: stock?.sector ?? sectors[0] ?? 'software',
      sectors,
      source: story.sourceName,
      datetime: Number.isFinite(published) ? Math.floor(published / 1000) : null,
      publishedAt: story.publishedAt,
      updatedAt: story.latestUpdatedAt,
      url: story.originalUrl,
      image: null,
      price: price?.price ?? null,
      changePercent: price?.changePercent ?? null,
      change: price?.change ?? null,
      priceSource: price?.available ? price.source : null,
      delayed: true,
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
      whyItMatters: story.whyItMatters,
      conflictSummary: story.conflictSummary,
    };
  });
  const items = await translateNewsItems(baseItems, language) as TechNewsItem[];
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

  return {
    success: true,
    source: 'Multi-source market news',
    priceSource: 'Finnhub/Yahoo Finance fallback',
    lastUpdated: aggregated?.lastUpdated ?? aggregated?.lastSuccessfulUpdate ?? new Date(0).toISOString(),
    lastSuccessfulUpdate: aggregated?.lastSuccessfulUpdate ?? null,
    language,
    translationEnabled: isNewsTranslationEnabled(),
    dateRangeUsed: '30d',
    prices: priceList,
    items,
    providerCoverage: aggregated?.providerCoverage ?? [],
    partialFailure: aggregated?.partialFailure ?? false,
    liveUpdatesAvailable: aggregated?.liveUpdatesAvailable ?? false,
    storedFallbackUsed: aggregated?.storedFallbackUsed ?? false,
    ...(items.length === 0 ? { message: 'No recent technology market news was found in the configured sources.' } : {}),
  } satisfies TechNewsPayload;
}

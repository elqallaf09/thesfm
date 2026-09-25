import { after, NextRequest, NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchSpecialQuotes, verifiedUnderOne, type SpecialQuote } from '@/lib/market-news/specialQuotes';
import { createSpecialNewsProviders } from '@/lib/market-news/specialProviders';
import { cleanTopic, matchesTopic } from '@/lib/market-news/specialMatching';
import { resolveUnderOneSymbols } from '@/lib/market-news/specialSymbols';
import {
  isNewsTranslationEnabled,
  normalizeNewsLanguage,
  translateNewsItems,
} from '@/lib/translation/translateNewsText';
import { TOPICS, type TopicId, type StaticTickerConfig, type MetalTickerConfig } from '@/lib/market-news/specialTopics';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const FED_TICKER: StaticTickerConfig[] = [
  { symbol: 'SPY', name: 'S&P 500 ETF', assetType: 'etf', currency: 'USD' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', assetType: 'etf', currency: 'USD' },
  { symbol: 'IWM', name: 'Russell 2000 ETF', assetType: 'etf', currency: 'USD' },
  { symbol: 'TLT', name: '20+ Year Treasury ETF', assetType: 'etf', currency: 'USD' },
  { symbol: 'UUP', name: 'US Dollar ETF', assetType: 'etf', currency: 'USD' },
  { symbol: 'GLD', name: 'Gold ETF', assetType: 'etf', currency: 'USD' },
];

const METAL_TICKER: MetalTickerConfig[] = [
  { id: 'gold', symbol: 'GC=F', name: 'Gold', assetType: 'unknown', currency: 'USD', meta: 'USD/oz' },
  { id: 'silver', symbol: 'SI=F', name: 'Silver', assetType: 'unknown', currency: 'USD', meta: 'USD/oz' },
  { id: 'copper', symbol: 'HG=F', name: 'Copper', assetType: 'unknown', currency: 'USD', meta: 'USD/lb' },
  { id: 'platinum', symbol: 'PL=F', name: 'Platinum', assetType: 'unknown', currency: 'USD', meta: 'USD/oz' },
  { id: 'palladium', symbol: 'PA=F', name: 'Palladium', assetType: 'unknown', currency: 'USD', meta: 'USD/oz' },
];

function uniqueStorySymbols(stories: ConsolidatedNewsStory[], limit: number) {
  const symbols: string[] = [];
  const seen = new Set<string>();
  for (const story of stories) {
    for (const rawSymbol of story.symbols) {
      const symbol = rawSymbol.trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9._-]{0,14}$/.test(symbol) || seen.has(symbol)) continue;
      seen.add(symbol);
      symbols.push(symbol);
      if (symbols.length >= limit) return symbols;
    }
  }
  return symbols;
}

function firstUsablePrice(story: ConsolidatedNewsStory, prices: Map<string, SpecialQuote>, underOneOnly = false) {
  for (const rawSymbol of story.symbols) {
    const symbol = rawSymbol.toUpperCase();
    const price = prices.get(symbol);
    if (!price?.available || typeof price.price !== 'number' || price.price <= 0) continue;
    if (underOneOnly && !verifiedUnderOne(price)) continue;
    return price;
  }
  return null;
}

function companyNameForSymbol(stories: ConsolidatedNewsStory[], symbol: string) {
  for (const story of stories) {
    const index = story.symbols.findIndex(candidate => candidate.toUpperCase() === symbol);
    if (index >= 0) return story.companyNames[index] ?? story.companyNames[0] ?? symbol;
  }
  return symbol;
}

function stockTickerFromStories(topic: TopicId, stories: ConsolidatedNewsStory[], prices: Map<string, SpecialQuote>) {
  // Mentioned companies may be investors, peers or underwriters. The news
  // payload has no verified listing date, so it cannot power a new-stock ticker.
  if (topic === 'new-stocks') return [];
  const symbols = uniqueStorySymbols(stories, 18);
  let items = symbols.map(symbol => {
    const quote = prices.get(symbol);
    return {
      symbol,
      name: quote?.name ?? companyNameForSymbol(stories, symbol),
      assetType: 'stock' as const,
      currency: 'USD' as const,
      price: quote?.available ? quote.price : null,
      changePercent: quote?.available ? quote.changePercent : null,
      source: quote?.source ?? 'market data',
      available: Boolean(quote?.available),
      asOf: quote?.asOf ?? null,
    };
  });

  if (topic === 'stocks-under-1') items = items.filter(item => verifiedUnderOne(prices.get(item.symbol)));
  if (topic === 'unusual-moves-news') {
    items = items.sort((left, right) => Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0));
  }
  return items.slice(0, 12);
}

async function fetchStaticStockTicker(config: StaticTickerConfig[]) {
  const prices = await fetchSpecialQuotes(config.map(item => item.symbol));
  return config.map(item => {
    const quote = prices.get(item.symbol);
    return {
      ...item,
      price: quote?.available ? quote.price : null,
      changePercent: quote?.available ? quote.changePercent : null,
      source: quote?.source ?? 'market data',
      available: Boolean(quote?.available),
      asOf: quote?.asOf ?? null,
    };
  });
}

async function fetchMetalTicker() {
  const settled = await Promise.allSettled(METAL_TICKER.map(async metal => {
    const quote = (await fetchSpecialQuotes([metal.symbol])).get(metal.symbol)!;
    return {
      ...metal,
      price: quote.available ? quote.price : null,
      changePercent: quote.available ? quote.changePercent : null,
      source: quote.source,
      available: quote.available,
    };
  }));

  return settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const metal = METAL_TICKER[index];
    return {
      ...metal,
      price: null,
      changePercent: null,
      source: 'Yahoo Finance' as const,
      available: false,
    };
  });
}

function rawUiItem(story: ConsolidatedNewsStory, price: SpecialQuote | null) {
  const primarySymbol = price?.symbol ?? story.symbols[0] ?? null;
  return {
    id: story.id,
    title: story.title,
    headline: story.title,
    summary: story.summary ?? '',
    titleOriginal: story.title,
    summaryOriginal: story.summary ?? '',
    languageOriginal: story.originalLanguage,
    source: story.sourceName,
    sourceName: story.sourceName,
    sourceType: story.sourceType,
    sourceReliability: story.sourceReliability,
    isOfficial: story.isOfficial,
    publishedAt: story.publishedAt,
    updatedAt: story.latestUpdatedAt,
    url: story.originalUrl,
    symbols: story.symbols,
    companyNames: story.companyNames,
    sectors: story.sectors,
    industries: story.industries,
    marketCodes: story.marketCodes,
    exchangeCodes: story.exchangeCodes,
    eventType: story.eventType,
    verificationStatus: story.verificationStatus,
    independentSourceCount: story.independentSourceCount,
    corroboratingSourceCount: story.corroboratingSourceCount,
    supportingSources: story.supportingSources,
    importanceScore: story.importanceScore,
    relevanceScore: story.relevanceScore,
    confidenceScore: story.confidenceScore,
    sentiment: story.sentiment,
    expectedImpact: story.expectedImpact,
    impactDirection: story.impactDirection,
    impactHorizon: story.impactHorizon,
    impactReason: story.impactReason,
    whyItMatters: story.whyItMatters,
    ticker: primarySymbol,
    price: price?.price ?? null,
    change: price?.change ?? null,
    changePercent: price?.changePercent ?? null,
    priceSource: price?.source ?? null,
    priceDelayed: price?.delayed ?? null,
    priceVerified: Boolean(price?.available),
  };
}

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

const HEALTHCARE_TICKER: StaticTickerConfig[] = [
  { symbol: 'LLY', name: 'Eli Lilly', assetType: 'stock', currency: 'USD' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', assetType: 'stock', currency: 'USD' },
  { symbol: 'ABBV', name: 'AbbVie', assetType: 'stock', currency: 'USD' },
  { symbol: 'MRK', name: 'Merck', assetType: 'stock', currency: 'USD' },
  { symbol: 'PFE', name: 'Pfizer', assetType: 'stock', currency: 'USD' },
  { symbol: 'AMGN', name: 'Amgen', assetType: 'stock', currency: 'USD' },
];

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 90, windowMs: 60_000, prefix: 'special-market-news' });
  if (limited) return limited;
  const topic = cleanTopic(request.nextUrl.searchParams.get('topic'));
  if (!topic) return NextResponse.json({ success: false, code: 'UNSUPPORTED_SPECIAL_NEWS_TOPIC', items: [] }, { status: 400 });
  const config = TOPICS[topic];
  const language = normalizeNewsLanguage(request.nextUrl.searchParams.get('lang'));
  const refresh = request.nextUrl.searchParams.has('refresh');
  const part = request.nextUrl.searchParams.get('part') ?? 'news';
  if (!['news', 'ticker', 'translation'].includes(part)) return NextResponse.json({ success: false }, { status: 400 });
  const headers = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };

  try {
    // Prices have their own request budget and never hold up the news feed.
    if (part === 'ticker') {
      if (topic === 'new-stocks') {
        return NextResponse.json({ success: true, topic, tickerItems: [] }, { headers });
      }
      const symbols = (request.nextUrl.searchParams.get('symbols') ?? '').split(',')
        .filter(symbol => /^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)).slice(0, 12);
      const prices = await fetchSpecialQuotes(symbols);
      const fixed = topic === 'federal-reserve'
        ? FED_TICKER
        : topic === 'healthcare-stocks'
          ? HEALTHCARE_TICKER
          : [];
      const tickerItems = topic === 'metals-news' ? await fetchMetalTicker()
        : symbols.length === 0 ? await fetchStaticStockTicker(fixed)
        : [...prices.values()].filter(quote => topic !== 'stocks-under-1' || verifiedUnderOne(quote)).map(quote => ({
          ...quote, name: quote.name ?? quote.symbol, currency: quote.currency ?? 'USD', assetType: 'stock',
        }));
      if (topic === 'unusual-moves-news') tickerItems.sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));
      return NextResponse.json({ success: true, topic, tickerItems }, { headers });
    }

    const result = await aggregateFinancialNews({
      ...config.params,
      query: config.query,
      from: dateDaysAgo(config.days),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 60,
      // Refresh the aggregation, while honoring each upstream feed's cache.
      // Clicking refresh must not bypass every provider cache simultaneously.
    }, {
      page: 1, pageSize: 60, sort: 'latest', forceExternal: refresh,
      providers: createSpecialNewsProviders(topic), providerBudgetMs: 6_500,
      schedulePersistence: task => after(task),
    });

    let stories = result.stories.filter(story => matchesTopic(topic, story));
    if (topic === 'new-stocks') stories.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    let prices = new Map<string, SpecialQuote>();
    if (topic === 'stocks-under-1') {
      stories = await resolveUnderOneSymbols(stories);
      prices = await fetchSpecialQuotes(uniqueStorySymbols(stories, 18));
      stories = stories.filter(story => story.symbols.some(symbol => verifiedUnderOne(prices.get(symbol.toUpperCase()))));
    }
    const rawItems = stories.map(story => rawUiItem(story, firstUsablePrice(story, prices, topic === 'stocks-under-1')));
    if (part === 'translation') {
      // Translate only the visible window, after original articles have painted.
      const items = await translateNewsItems(rawItems.slice(0, 16), language);
      return NextResponse.json({ success: true, topic, items }, { headers });
    }
    const unavailable = !result.liveUpdatesAvailable && rawItems.length === 0;
    const tickerItems = stockTickerFromStories(topic, stories, prices);
    return NextResponse.json({
      ok: !unavailable, success: !unavailable, topic,
      code: unavailable ? 'SPECIAL_NEWS_LIVE_UNAVAILABLE'
        : result.partialFailure ? 'SPECIAL_NEWS_PARTIAL_COVERAGE'
          : rawItems.length === 0 ? 'SPECIAL_NEWS_NO_RESULTS' : null,
      source: 'multi-source', items: rawItems, tickerItems,
      // Refresh time and article publication time are different facts.
      updatedAt: result.lastSuccessfulUpdate,
      lastSuccessfulUpdate: result.lastSuccessfulUpdate,
      partialFailure: result.partialFailure,
      liveUpdatesAvailable: result.liveUpdatesAvailable,
      storedFallbackUsed: result.storedFallbackUsed,
      translationEnabled: isNewsTranslationEnabled(),
      providerCoverage: result.providerCoverage,
      priceRule: topic === 'stocks-under-1'
        ? { currency: 'USD', operator: '<', threshold: 1, requiresVerifiedQuote: true } : null,
    }, { headers: unavailable ? { 'Cache-Control': 'no-store' } : headers });
  } catch (error) {
    console.error('[SpecialMarketNews] Failed to load topic', {
      topic, message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: false, topic, code: 'SPECIAL_NEWS_PROVIDER_UNAVAILABLE', items: [], tickerItems: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

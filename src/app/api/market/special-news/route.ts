import { NextRequest, NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory, NewsFetchParams } from '@/lib/market-news/types';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import { fetchYahooChartQuote } from '@/lib/market/fetchYahooQuote';
import {
  isNewsTranslationEnabled,
  normalizeNewsLanguage,
  translateNewsItems,
} from '@/lib/translation/translateNewsText';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type TopicId =
  | 'federal-reserve'
  | 'healthcare-stocks'
  | 'new-stocks'
  | 'stocks-under-1'
  | 'metals-news'
  | 'earnings-news'
  | 'analyst-ratings-news'
  | 'mergers-acquisitions-news'
  | 'unusual-moves-news';

type TopicConfig = {
  query: string;
  days: number;
  sort: 'latest' | 'importance' | 'official' | 'relevance';
  params: Partial<NewsFetchParams>;
};

type StaticTickerConfig = {
  symbol: string;
  name: string;
  assetType: 'stock' | 'etf' | 'unknown';
  currency: 'USD';
  meta?: string;
};

type MetalTickerConfig = StaticTickerConfig & {
  id: 'gold' | 'silver' | 'copper' | 'platinum' | 'palladium';
};

const TOPICS: Record<TopicId, TopicConfig> = {
  'federal-reserve': {
    query: 'Federal Reserve FOMC Jerome Powell monetary policy interest rates inflation employment US economy',
    days: 45,
    sort: 'official',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      currencies: ['USD'],
      eventTypes: ['interest_rate_decision', 'inflation_report', 'employment_report', 'macroeconomic_release', 'regulatory_action'],
    },
  },
  'healthcare-stocks': {
    query: 'healthcare stocks biotechnology pharmaceutical medical device FDA drug approval clinical trial hospital diagnostics',
    days: 45,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity', 'etf'],
    },
  },
  'new-stocks': {
    query: 'IPO initial public offering newly listed stock market debut direct listing Nasdaq NYSE new listing',
    days: 90,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity'],
    },
  },
  'stocks-under-1': {
    query: 'penny stock penny stocks microcap sub-dollar stock under $1 low priced stock',
    days: 30,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity'],
    },
  },
  'metals-news': {
    query: 'gold silver copper platinum palladium precious metals industrial metals metal prices mining demand supply commodities',
    days: 45,
    sort: 'importance',
    params: {
      assetTypes: ['commodity', 'derivative'],
      eventTypes: ['commodity_price_event', 'macroeconomic_release', 'geopolitical_event', 'other_material_event'],
      commodities: ['gold', 'silver', 'copper', 'platinum', 'palladium'],
    },
  },
  'earnings-news': {
    query: 'earnings quarterly results revenue EPS guidance profit margin company results earnings beat earnings miss',
    days: 45,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity', 'etf'],
      eventTypes: ['earnings_results', 'earnings_guidance'],
    },
  },
  'analyst-ratings-news': {
    query: 'analyst upgrade downgrade rating price target initiated coverage overweight underweight buy sell hold',
    days: 45,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity', 'etf'],
      eventTypes: ['analyst_rating_change'],
    },
  },
  'mergers-acquisitions-news': {
    query: 'merger acquisition takeover buyout deal offer acquired acquisition target strategic combination',
    days: 60,
    sort: 'importance',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity'],
      eventTypes: ['merger_acquisition', 'acquisition_offer'],
    },
  },
  'unusual-moves-news': {
    query: 'stock surges plunges jumps falls rallies tumbles unusual volume heavy volume trading halt gap volatility unusual market move',
    days: 14,
    sort: 'latest',
    params: {
      marketCodes: ['US'],
      countries: ['US'],
      assetTypes: ['equity', 'etf'],
    },
  },
};

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

const FED_PATTERN = /\b(federal reserve|fomc|fed chair|jerome powell|powell)\b/i;
const HEALTHCARE_PATTERN = /\b(healthcare|health care|biotech|biotechnology|pharma|pharmaceutical|medical device|fda|clinical trial|drug approval|diagnostic|hospital)\b/i;
const NEW_LISTING_PATTERN = /\b(ipo|initial public offering|newly listed|new listing|market debut|trading debut|direct listing|public debut|begins trading)\b/i;
const METALS_PATTERN = /\b(gold|silver|copper|platinum|palladium|precious metal|industrial metal|bullion|xau|xag|comex|metal price)\b/i;
const EARNINGS_PATTERN = /\b(earnings|quarterly results|revenue|eps|guidance|profit|margin|beat estimates|missed estimates)\b/i;
const ANALYST_PATTERN = /\b(analyst|upgrade|downgrade|price target|rating|initiated coverage|overweight|underweight)\b/i;
const MA_PATTERN = /\b(merger|acquisition|takeover|buyout|acquire|acquired|deal|offer|strategic combination)\b/i;
const UNUSUAL_PATTERN = /\b(surge|plunge|soar|tumble|spike|slump|jump|fall|rally|selloff|unusual volume|heavy volume|trading halt|volatile|volatility|gap up|gap down)\b/i;

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function cleanTopic(value: string | null): TopicId | null {
  const topic = String(value ?? '').trim().toLowerCase();
  return topic in TOPICS ? topic as TopicId : null;
}

function storyText(story: ConsolidatedNewsStory) {
  return `${story.title} ${story.summary ?? ''} ${story.companyNames.join(' ')} ${story.sectors.join(' ')} ${story.industries.join(' ')}`;
}

function matchesTopic(topic: TopicId, story: ConsolidatedNewsStory) {
  const text = storyText(story);
  if (topic === 'federal-reserve') return FED_PATTERN.test(text);
  if (topic === 'healthcare-stocks') {
    const hasCompany = story.symbols.length > 0 || story.companyNames.length > 0;
    return hasCompany && HEALTHCARE_PATTERN.test(text);
  }
  if (topic === 'new-stocks') return story.eventType === 'ipo_listing' || NEW_LISTING_PATTERN.test(text);
  if (topic === 'metals-news') return story.eventType === 'commodity_price_event' || METALS_PATTERN.test(text);
  if (topic === 'earnings-news') return ['earnings_results', 'earnings_guidance'].includes(story.eventType) || EARNINGS_PATTERN.test(text);
  if (topic === 'analyst-ratings-news') return story.eventType === 'analyst_rating_change' || ANALYST_PATTERN.test(text);
  if (topic === 'mergers-acquisitions-news') return ['merger_acquisition', 'acquisition_offer'].includes(story.eventType) || MA_PATTERN.test(text);
  if (topic === 'unusual-moves-news') return UNUSUAL_PATTERN.test(text);
  return true;
}

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

function verifiedUnderOne(price: TechStockPrice | undefined) {
  return Boolean(price?.available && typeof price.price === 'number' && price.price > 0 && price.price < 1);
}

function firstUsablePrice(story: ConsolidatedNewsStory, prices: Map<string, TechStockPrice>, underOneOnly = false) {
  for (const rawSymbol of story.symbols) {
    const symbol = rawSymbol.toUpperCase();
    const price = prices.get(symbol);
    if (!price?.available || typeof price.price !== 'number' || price.price <= 0) continue;
    if (underOneOnly && price.price >= 1) continue;
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

function stockTickerFromStories(topic: TopicId, stories: ConsolidatedNewsStory[], prices: Map<string, TechStockPrice>) {
  const symbols = uniqueStorySymbols(stories, 18);
  let items = symbols.map(symbol => {
    const quote = prices.get(symbol);
    return {
      symbol,
      name: companyNameForSymbol(stories, symbol),
      assetType: 'stock' as const,
      currency: 'USD' as const,
      price: quote?.available ? quote.price : null,
      changePercent: quote?.available ? quote.changePercent : null,
      source: quote?.source ?? 'market data',
      available: Boolean(quote?.available),
    };
  });

  if (topic === 'stocks-under-1') items = items.filter(item => item.available && typeof item.price === 'number' && item.price > 0 && item.price < 1);
  if (topic === 'unusual-moves-news') {
    items = items.sort((left, right) => Math.abs(right.changePercent ?? 0) - Math.abs(left.changePercent ?? 0));
  }
  return items.slice(0, 12);
}

async function fetchStaticStockTicker(config: StaticTickerConfig[]) {
  const prices = await fetchStockPrices(config.map(item => ({ symbol: item.symbol })), process.env.FINNHUB_API_KEY?.trim());
  return config.map(item => {
    const quote = prices.get(item.symbol);
    return {
      ...item,
      price: quote?.available ? quote.price : null,
      changePercent: quote?.available ? quote.changePercent : null,
      source: quote?.source ?? 'market data',
      available: Boolean(quote?.available),
    };
  });
}

async function fetchMetalTicker() {
  const settled = await Promise.allSettled(METAL_TICKER.map(async metal => {
    const quote = await fetchYahooChartQuote(metal.symbol);
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

function rawUiItem(story: ConsolidatedNewsStory, price: TechStockPrice | null) {
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

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 45, windowMs: 60_000, prefix: 'special-market-news' });
  if (limited) return limited;

  const topic = cleanTopic(request.nextUrl.searchParams.get('topic'));
  if (!topic) {
    return NextResponse.json({ ok: false, success: false, code: 'UNSUPPORTED_SPECIAL_NEWS_TOPIC', items: [] }, { status: 400 });
  }

  const config = TOPICS[topic];
  const language = normalizeNewsLanguage(request.nextUrl.searchParams.get('lang'));
  const refresh = request.nextUrl.searchParams.has('refresh');

  try {
    const [result, fixedTicker] = await Promise.all([
      aggregateFinancialNews({
        ...config.params,
        query: config.query,
        from: dateDaysAgo(config.days),
        to: new Date().toISOString().slice(0, 10),
        language,
        limit: 180,
        forceRefresh: refresh,
      }, {
        page: 1,
        pageSize: 60,
        sort: config.sort,
        forceExternal: refresh,
      }),
      topic === 'metals-news'
        ? fetchMetalTicker()
        : topic === 'federal-reserve'
          ? fetchStaticStockTicker(FED_TICKER)
          : Promise.resolve([]),
    ]);

    let stories = result.stories.filter(story => matchesTopic(topic, story));
    let prices = new Map<string, TechStockPrice>();

    if (topic !== 'federal-reserve' && topic !== 'metals-news') {
      const symbolLimit = topic === 'stocks-under-1' ? 36 : 30;
      const symbols = uniqueStorySymbols(stories, symbolLimit);
      if (symbols.length > 0) {
        prices = await fetchStockPrices(symbols.map(symbol => ({ symbol })), process.env.FINNHUB_API_KEY?.trim());
      }
    }

    if (topic === 'stocks-under-1') {
      stories = stories.filter(story => story.symbols.some(symbol => verifiedUnderOne(prices.get(symbol.toUpperCase()))));
    }

    const tickerItems = fixedTicker.length > 0 ? fixedTicker : stockTickerFromStories(topic, stories, prices);
    const rawItems = stories.map(story => rawUiItem(story, firstUsablePrice(story, prices, topic === 'stocks-under-1')));
    const items = await translateNewsItems(rawItems, language);
    const unavailable = !result.liveUpdatesAvailable && !result.storedFallbackUsed && items.length === 0;

    return NextResponse.json({
      ok: !unavailable,
      success: !unavailable,
      topic,
      code: unavailable
        ? 'SPECIAL_NEWS_LIVE_UNAVAILABLE'
        : result.partialFailure
          ? 'SPECIAL_NEWS_PARTIAL_COVERAGE'
          : items.length === 0
            ? 'SPECIAL_NEWS_NO_RESULTS'
            : null,
      source: 'multi-source',
      items,
      tickerItems,
      updatedAt: result.lastUpdated,
      lastSuccessfulUpdate: result.lastSuccessfulUpdate,
      partialFailure: result.partialFailure,
      liveUpdatesAvailable: result.liveUpdatesAvailable,
      storedFallbackUsed: result.storedFallbackUsed,
      translationEnabled: isNewsTranslationEnabled(),
      providerCoverage: result.providerCoverage,
      priceRule: topic === 'stocks-under-1'
        ? { currency: 'USD', operator: '<', threshold: 1, requiresVerifiedQuote: true }
        : null,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
    });
  } catch (error) {
    console.error('[SpecialMarketNews] Failed to load topic', {
      topic,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      ok: false,
      success: false,
      topic,
      code: 'SPECIAL_NEWS_PROVIDER_UNAVAILABLE',
      items: [],
      tickerItems: [],
    }, { status: 503 });
  }
}

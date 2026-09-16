import { NextRequest, NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory, NewsFetchParams } from '@/lib/market-news/types';
import { fetchStockPrices, type TechStockPrice } from '@/lib/market/fetchStockPrices';
import {
  isNewsTranslationEnabled,
  normalizeNewsLanguage,
  translateNewsItems,
} from '@/lib/translation/translateNewsText';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type TopicId = 'federal-reserve' | 'healthcare-stocks' | 'new-stocks' | 'stocks-under-1';

type TopicConfig = {
  query: string;
  days: number;
  sort: 'latest' | 'importance' | 'official' | 'relevance';
  params: Partial<NewsFetchParams>;
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
};

const FED_PATTERN = /\b(federal reserve|fomc|fed chair|jerome powell|powell)\b/i;
const HEALTHCARE_PATTERN = /\b(healthcare|health care|biotech|biotechnology|pharma|pharmaceutical|medical device|fda|clinical trial|drug approval|diagnostic|hospital)\b/i;
const NEW_LISTING_PATTERN = /\b(ipo|initial public offering|newly listed|new listing|market debut|trading debut|direct listing|public debut|begins trading)\b/i;

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
  if (topic === 'federal-reserve') return FED_PATTERN.test(storyText(story));
  if (topic === 'healthcare-stocks') {
    const hasCompany = story.symbols.length > 0 || story.companyNames.length > 0;
    return hasCompany && HEALTHCARE_PATTERN.test(storyText(story));
  }
  if (topic === 'new-stocks') {
    return story.eventType === 'ipo_listing' || NEW_LISTING_PATTERN.test(storyText(story));
  }
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
    const result = await aggregateFinancialNews({
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
    });

    let stories = result.stories.filter(story => matchesTopic(topic, story));
    let prices = new Map<string, TechStockPrice>();

    if (topic !== 'federal-reserve') {
      const symbolLimit = topic === 'stocks-under-1' ? 36 : 24;
      const symbols = uniqueStorySymbols(stories, symbolLimit);
      if (symbols.length > 0) {
        prices = await fetchStockPrices(
          symbols.map(symbol => ({ symbol })),
          process.env.FINNHUB_API_KEY?.trim(),
        );
      }
    }

    if (topic === 'stocks-under-1') {
      stories = stories.filter(story => story.symbols.some(symbol => verifiedUnderOne(prices.get(symbol.toUpperCase()))));
    }

    const rawItems = stories.map(story => rawUiItem(
      story,
      firstUsablePrice(story, prices, topic === 'stocks-under-1'),
    ));
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
    }, { status: 503 });
  }
}

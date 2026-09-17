import { NextRequest, NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchYahooChartQuote } from '@/lib/market/fetchYahooQuote';
import {
  isNewsTranslationEnabled,
  normalizeNewsLanguage,
  translateNewsItems,
} from '@/lib/translation/translateNewsText';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

const ASIA_MARKETS = [
  { symbol: '^N225', name: 'Nikkei 225', currency: 'JPY', market: 'Japan' },
  { symbol: '^HSI', name: 'Hang Seng', currency: 'HKD', market: 'Hong Kong' },
  { symbol: '000001.SS', name: 'Shanghai Composite', currency: 'CNY', market: 'China' },
  { symbol: '399001.SZ', name: 'Shenzhen Component', currency: 'CNY', market: 'China' },
  { symbol: '^KS11', name: 'KOSPI', currency: 'KRW', market: 'South Korea' },
  { symbol: '^TWII', name: 'Taiwan Weighted', currency: 'TWD', market: 'Taiwan' },
  { symbol: '^NSEI', name: 'Nifty 50', currency: 'INR', market: 'India' },
  { symbol: '^STI', name: 'Straits Times', currency: 'SGD', market: 'Singapore' },
] as const;

const ASIA_COUNTRY_TOKENS = new Set([
  'JP', 'JAPAN', 'CN', 'CHINA', 'HK', 'HONG KONG', 'KR', 'SOUTH KOREA', 'KOREA',
  'TW', 'TAIWAN', 'IN', 'INDIA', 'SG', 'SINGAPORE',
]);

const ASIA_EXCHANGE_PATTERN = /\b(TSE|JPX|SSE|SZSE|HKEX|HKG|KRX|KOSPI|TWSE|TPEX|NSE|BSE|SGX)\b/i;
const ASIA_TEXT_PATTERN = /\b(asia|asian|asia-pacific|apac|japan|japanese|tokyo|nikkei|china|chinese|shanghai|shenzhen|hong kong|hang seng|south korea|korean|seoul|kospi|taiwan|taiwanese|india|indian|nifty|sensex|singapore|straits times)\b/i;

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function storyText(story: ConsolidatedNewsStory) {
  return [
    story.title,
    story.summary ?? '',
    ...story.companyNames,
    ...story.marketCodes,
    ...story.exchangeCodes,
    ...story.countries,
    ...story.sectors,
    ...story.industries,
  ].join(' ');
}

function matchesAsiaMarket(story: ConsolidatedNewsStory) {
  if (story.countries.some(country => ASIA_COUNTRY_TOKENS.has(String(country).trim().toUpperCase()))) return true;
  if (story.exchangeCodes.some(exchange => ASIA_EXCHANGE_PATTERN.test(exchange))) return true;
  if (story.marketCodes.some(market => ASIA_TEXT_PATTERN.test(market))) return true;
  return ASIA_TEXT_PATTERN.test(storyText(story));
}

function rawUiItem(story: ConsolidatedNewsStory) {
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
    countries: story.countries,
    marketCodes: story.marketCodes,
    exchangeCodes: story.exchangeCodes,
    sectors: story.sectors,
    industries: story.industries,
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
  };
}

async function fetchAsiaTicker() {
  const settled = await Promise.allSettled(ASIA_MARKETS.map(async market => {
    const quote = await fetchYahooChartQuote(market.symbol);
    return {
      symbol: market.symbol,
      name: market.name,
      assetType: 'unknown' as const,
      currency: market.currency,
      price: quote.available ? quote.price : null,
      changePercent: quote.available ? quote.changePercent : null,
      source: quote.source,
      available: quote.available,
      meta: market.market,
    };
  }));

  return settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const market = ASIA_MARKETS[index];
    return {
      symbol: market.symbol,
      name: market.name,
      assetType: 'unknown' as const,
      currency: market.currency,
      price: null,
      changePercent: null,
      source: 'Yahoo Finance' as const,
      available: false,
      meta: market.market,
    };
  });
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 45, windowMs: 60_000, prefix: 'asia-market-news' });
  if (limited) return limited;

  const language = normalizeNewsLanguage(request.nextUrl.searchParams.get('lang'));
  const refresh = request.nextUrl.searchParams.has('refresh');

  try {
    const [result, tickerItems] = await Promise.all([
      aggregateFinancialNews({
        query: 'Asian stock markets Japan Nikkei China Shanghai Shenzhen Hong Kong Hang Seng South Korea KOSPI Taiwan India Nifty Sensex Singapore equities earnings central bank economy',
        assetTypes: ['equity', 'etf', 'index'],
        from: dateDaysAgo(45),
        to: new Date().toISOString().slice(0, 10),
        language,
        limit: 220,
        forceRefresh: refresh,
      }, {
        page: 1,
        pageSize: 60,
        sort: 'importance',
        forceExternal: refresh,
      }),
      fetchAsiaTicker(),
    ]);

    const stories = result.stories.filter(matchesAsiaMarket);
    const items = await translateNewsItems(stories.map(rawUiItem), language);
    const unavailable = !result.liveUpdatesAvailable && !result.storedFallbackUsed && items.length === 0;

    return NextResponse.json({
      ok: !unavailable,
      success: !unavailable,
      code: unavailable
        ? 'ASIA_MARKET_NEWS_LIVE_UNAVAILABLE'
        : result.partialFailure
          ? 'ASIA_MARKET_NEWS_PARTIAL_COVERAGE'
          : items.length === 0
            ? 'ASIA_MARKET_NEWS_NO_RESULTS'
            : null,
      source: 'multi-source',
      items,
      tickerItems,
      updatedAt: result.lastUpdated,
      lastSuccessfulUpdate: result.lastSuccessfulUpdate,
      providerCoverage: result.providerCoverage,
      partialFailure: result.partialFailure,
      liveUpdatesAvailable: result.liveUpdatesAvailable,
      storedFallbackUsed: result.storedFallbackUsed,
      translationEnabled: isNewsTranslationEnabled(),
      coverage: {
        markets: ['Japan', 'China', 'Hong Kong', 'South Korea', 'Taiwan', 'India', 'Singapore'],
        tickerSymbols: ASIA_MARKETS.map(item => item.symbol),
      },
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
    });
  } catch (error) {
    console.error('[AsiaMarketNews] Failed to load Asia market news', {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({
      ok: false,
      success: false,
      code: 'ASIA_MARKET_NEWS_PROVIDER_UNAVAILABLE',
      items: [],
      tickerItems: [],
    }, { status: 503 });
  }
}

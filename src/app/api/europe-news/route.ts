import { NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { europeMarketDataToApiMarkets, fetchEuropeDelayedMarketData } from '@/lib/europe/fetchEuropeDelayedMarketData';
import { EUROPE_MARKETS, type EuropeMarketId } from '@/lib/europe/europeMarkets';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems } from '@/lib/translation/translateNewsText';
import { parseNewsLimit } from '@/lib/news/apiPayload';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
function storyMarket(story: ConsolidatedNewsStory): EuropeMarketId {
  const values = [...story.marketCodes, ...story.exchangeCodes, ...story.countries].map(value => value.toLowerCase());
  return EUROPE_MARKETS.find(market => values.some(value => [market.id, market.code, market.indexName].map(item => item.toLowerCase()).includes(value)))?.id ?? 'europe';
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'europe-news' });
  if (limited) return limited;

  const url = new URL(request.url);
  const language = normalizeNewsLanguage(url.searchParams.get('lang'));
  const limit = parseNewsLimit(url.searchParams.get('limit'));
  const [newsResult, marketDataResult] = await Promise.allSettled([
    aggregateFinancialNews({
      query: 'European stock markets listed companies economy central bank',
      symbols: EUROPE_MARKETS.flatMap(market => market.yahooSymbols),
      marketCodes: ['europe', ...EUROPE_MARKETS.map(market => market.id)],
      countries: EUROPE_MARKETS.map(market => market.code),
      from: dateDaysAgo(30),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 180,
    }, { page: 1, pageSize: limit, sort: 'importance' }),
    fetchEuropeDelayedMarketData(),
  ]);
  const aggregated = newsResult.status === 'fulfilled' ? newsResult.value : null;
  const rawItems = (aggregated?.stories ?? []).map(story => ({
    id: story.id,
    market: storyMarket(story),
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
    isOfficial: story.isOfficial,
    sourceReliability: story.sourceReliability,
    verificationStatus: story.verificationStatus,
    independentSourceCount: story.independentSourceCount,
    corroboratingSourceCount: story.corroboratingSourceCount,
    supportingSources: story.supportingSources,
    symbols: story.symbols,
    exchangeCodes: story.exchangeCodes,
    sectors: story.sectors,
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
  const items = await translateNewsItems(rawItems, language);
  const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : {};

  return NextResponse.json({
    success: Boolean(aggregated?.liveUpdatesAvailable || aggregated?.storedFallbackUsed || items.length > 0),
    code: aggregated?.partialFailure ? 'MARKET_NEWS_PARTIAL_COVERAGE' : !aggregated?.liveUpdatesAvailable && items.length === 0 ? 'MARKET_NEWS_LIVE_UNAVAILABLE' : null,
    language,
    translationEnabled: isNewsTranslationEnabled(),
    source: 'Multi-source market news',
    marketDataSource: 'Yahoo Finance delayed',
    limit,
    lastUpdated: aggregated?.lastUpdated ?? null,
    lastSuccessfulUpdate: aggregated?.lastSuccessfulUpdate ?? null,
    markets: europeMarketDataToApiMarkets(marketData),
    items,
    marketData,
    providerCoverage: aggregated?.providerCoverage ?? [],
    partialFailure: aggregated?.partialFailure ?? false,
    liveUpdatesAvailable: aggregated?.liveUpdatesAvailable ?? false,
    storedFallbackUsed: aggregated?.storedFallbackUsed ?? false,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}

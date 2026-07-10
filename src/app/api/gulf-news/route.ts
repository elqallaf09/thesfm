import { NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { fetchDelayedGulfMarketData, gulfMarketDataToApiMarkets } from '@/lib/gulf/fetchGulfIndexData';
import { GULF_MARKETS, type GulfMarketId } from '@/lib/gulf/gulfMarkets';
import { isNewsTranslationEnabled, normalizeNewsLanguage, translateNewsItems } from '@/lib/translation/translateNewsText';
import { parseNewsLimit } from '@/lib/news/apiPayload';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}
function storyMarket(story: ConsolidatedNewsStory): GulfMarketId | null {
  const values = [...story.marketCodes, ...story.exchangeCodes, ...story.countries].map(value => value.toLowerCase());
  const mapped = GULF_MARKETS.find(market => values.some(value => [market.id, market.code, market.countryCode, market.exchangeCode].map(item => item.toLowerCase()).includes(value)))?.id;
  if (mapped) return mapped;

  // Only use explicit, unambiguous market references. Generic GCC/UAE
  // coverage must not be silently assigned to Saudi Arabia, DFM, or ADX.
  const text = `${story.title} ${story.summary ?? ''}`.toLocaleLowerCase();
  const aliases: Record<GulfMarketId, string[]> = {
    kuwait: ['boursa kuwait', 'kuwait stock exchange', 'بورصة الكويت', 'سوق الكويت'],
    saudi: ['saudi exchange', 'tadawul', 'تداول السعودية', 'السوق السعودية', 'السوق السعودي'],
    oman: ['muscat stock exchange', 'msx', 'بورصة مسقط'],
    bahrain: ['bahrain bourse', 'بورصة البحرين'],
    'uae-dfm': ['dubai financial market', 'dfm', 'سوق دبي المالي'],
    'uae-adx': ['abu dhabi securities exchange', 'adx', 'سوق أبوظبي للأوراق المالية'],
    qatar: ['qatar stock exchange', 'qse', 'بورصة قطر'],
  };
  const matches = GULF_MARKETS.filter(market => aliases[market.id].some(alias => text.includes(alias))).map(market => market.id);
  return matches.length === 1 ? matches[0] : null;
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'gulf-news' });
  if (limited) return limited;

  const url = new URL(request.url);
  const language = normalizeNewsLanguage(url.searchParams.get('lang'));
  const limit = parseNewsLimit(url.searchParams.get('limit'));
  const [newsResult, marketDataResult] = await Promise.allSettled([
    aggregateFinancialNews({
      query: 'stocks OR market OR earnings OR disclosures OR shares OR economy OR أسهم OR السوق OR أرباح OR إفصاح OR الاقتصاد OR شركات OR بورصة',
      symbols: GULF_MARKETS.flatMap(market => market.yahooSymbols),
      marketCodes: ['gulf', ...GULF_MARKETS.map(market => market.id)],
      exchangeCodes: GULF_MARKETS.map(market => market.exchangeCode),
      countries: GULF_MARKETS.map(market => market.countryCode),
      from: dateDaysAgo(30),
      to: new Date().toISOString().slice(0, 10),
      language,
      limit: 180,
    }, { page: 1, pageSize: limit, sort: 'importance' }),
    fetchDelayedGulfMarketData(),
  ]);
  const aggregated = newsResult.status === 'fulfilled' ? newsResult.value : null;
  let unmappedStoryCount = 0;
  const rawItems = (aggregated?.stories ?? []).flatMap(story => {
    const market = storyMarket(story);
    if (!market) {
      unmappedStoryCount += 1;
      return [];
    }
    return [{
    id: story.id,
    market,
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
    }];
  });
  const items = await translateNewsItems(rawItems, language);
  const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : {};

  return NextResponse.json({
    success: Boolean(aggregated?.liveUpdatesAvailable || aggregated?.storedFallbackUsed || items.length > 0),
    code: aggregated?.partialFailure ? 'MARKET_NEWS_PARTIAL_COVERAGE' : !aggregated?.liveUpdatesAvailable && items.length === 0 ? 'MARKET_NEWS_LIVE_UNAVAILABLE' : null,
    language,
    translationEnabled: isNewsTranslationEnabled(),
    source: 'Multi-source market news',
    marketDataSource: 'Yahoo Finance and official market sources',
    limit,
    lastUpdated: aggregated?.lastUpdated ?? null,
    lastSuccessfulUpdate: aggregated?.lastSuccessfulUpdate ?? null,
    markets: marketDataResult.status === 'fulfilled' ? gulfMarketDataToApiMarkets(marketDataResult.value) : [],
    items,
    marketData,
    providerCoverage: aggregated?.providerCoverage ?? [],
    partialFailure: aggregated?.partialFailure ?? false,
    liveUpdatesAvailable: aggregated?.liveUpdatesAvailable ?? false,
    storedFallbackUsed: aggregated?.storedFallbackUsed ?? false,
    unmappedStoryCount,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}

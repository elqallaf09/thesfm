import { NextResponse } from 'next/server';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const revalidate = 300;
export const dynamic = 'force-dynamic';

type CentralBankCode = 'Fed' | 'ECB' | 'BoE' | 'BoJ' | 'SNB' | 'BoC' | 'RBA';
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD';

const BANK_PATTERNS: Array<{ bank: CentralBankCode; currency: CurrencyCode; patterns: RegExp[] }> = [
  { bank: 'Fed', currency: 'USD', patterns: [/\bfed\b/i, /federal reserve/i, /fomc/i, /jerome powell/i] },
  { bank: 'ECB', currency: 'EUR', patterns: [/\becb\b/i, /european central bank/i] },
  { bank: 'BoE', currency: 'GBP', patterns: [/\bboe\b/i, /bank of england/i] },
  { bank: 'BoJ', currency: 'JPY', patterns: [/\bboj\b/i, /bank of japan/i] },
  { bank: 'SNB', currency: 'CHF', patterns: [/\bsnb\b/i, /swiss national bank/i] },
  { bank: 'BoC', currency: 'CAD', patterns: [/\bboc\b/i, /bank of canada/i] },
  { bank: 'RBA', currency: 'AUD', patterns: [/\brba\b/i, /reserve bank of australia/i] },
];

function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

function bankFor(story: ConsolidatedNewsStory) {
  const text = `${story.title} ${story.summary ?? ''}`;
  return BANK_PATTERNS.find(candidate => candidate.patterns.some(pattern => pattern.test(text))) ?? null;
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 45, prefix: 'central-bank-news' });
  if (limited) return limited;

  const requestUrl = new URL(request.url);
  const refresh = requestUrl.searchParams.has('refresh');
  const result = await aggregateFinancialNews({
    query: 'central bank monetary policy interest rates inflation employment Federal Reserve ECB Bank of England Bank of Japan',
    marketCodes: ['global', 'US', 'europe'],
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'],
    eventTypes: ['interest_rate_decision', 'inflation_report', 'employment_report', 'macroeconomic_release', 'regulatory_action'],
    from: dateDaysAgo(30),
    to: new Date().toISOString().slice(0, 10),
    language: 'en',
    limit: 120,
    forceRefresh: refresh,
  }, { page: 1, pageSize: 24, sort: 'official', forceExternal: refresh });

  const items = result.stories.map(story => {
    const related = bankFor(story);
    return {
      id: story.id,
      headline: story.title,
      title: story.title,
      summary: story.summary,
      source: story.sourceName,
      sourceName: story.sourceName,
      sourceType: story.sourceType,
      sourceReliability: story.sourceReliability,
      isOfficial: story.isOfficial,
      published_at: story.publishedAt,
      publishedAt: story.publishedAt,
      updatedAt: story.latestUpdatedAt,
      url: story.originalUrl,
      related_bank: related?.bank ?? null,
      related_currency: related?.currency ?? story.currencies[0] ?? null,
      eventType: story.eventType,
      verificationStatus: story.verificationStatus,
      independentSourceCount: story.independentSourceCount,
      corroboratingSourceCount: story.corroboratingSourceCount,
      supportingSources: story.supportingSources,
      importanceScore: story.importanceScore,
      sentiment: story.sentiment,
      expectedImpact: story.expectedImpact,
      impactDirection: story.impactDirection,
      impactHorizon: story.impactHorizon,
      impactReason: story.impactReason,
      conflictSummary: story.conflictSummary,
      whyItMatters: story.whyItMatters,
    };
  });
  const unavailable = !result.liveUpdatesAvailable && !result.storedFallbackUsed && items.length === 0;

  return NextResponse.json({
    ok: !unavailable,
    success: !unavailable,
    code: unavailable ? 'CENTRAL_BANK_NEWS_LIVE_UNAVAILABLE' : result.partialFailure ? 'CENTRAL_BANK_NEWS_PARTIAL_COVERAGE' : items.length === 0 ? 'NO_CENTRAL_BANK_NEWS' : null,
    source: 'Multi-source market news',
    items,
    updated_at: result.lastUpdated,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    providerCoverage: result.providerCoverage,
    partialFailure: result.partialFailure,
    liveUpdatesAvailable: result.liveUpdatesAvailable,
    storedFallbackUsed: result.storedFallbackUsed,
    cacheStatus: result.cacheStatus,
  }, {
    status: 200,
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}

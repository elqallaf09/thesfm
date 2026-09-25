import 'server-only';

import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { createRssNewsProvider } from '@/lib/market-news/providers/rss';
import { createFinancialNewsProviders } from '@/lib/market-news/registry';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import type { ConsolidatedNewsStory, FinancialNewsProvider } from '@/lib/market-news/types';

export type GoldResearchKind = 'all' | 'news' | 'calendar';

export type GoldResearchSearchInput = {
  query: string;
  days?: number;
  kind?: GoldResearchKind;
  officialOnly?: boolean;
  limit?: number;
};

export type GoldResearchNewsResult = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  sourceType: string;
  url: string | null;
  publishedAt: string;
  eventType: string;
  verificationStatus: string;
  expectedImpact: string;
  sentiment: string;
  importanceScore: number;
  confidenceScore: number;
  whyItMatters: string | null;
  isOfficial: boolean;
};

export type GoldResearchCalendarResult = {
  id: string;
  title: string;
  dateTimeUtc: string;
  country: string | null;
  currency: string | null;
  impact: string;
  actual: string | number | null;
  forecast: string | number | null;
  previous: string | number | null;
  source: string | null;
  provider: string;
  stale: boolean;
};

export type GoldResearchSearchResult = {
  query: string;
  generatedAt: string;
  news: GoldResearchNewsResult[];
  calendar: GoldResearchCalendarResult[];
  providerCoverage: Array<{
    providerId: string;
    providerName: string;
    status: string;
    articleCount: number;
    sourceType: string;
  }>;
  partial: boolean;
  live: boolean;
  warnings: string[];
};

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

function normalizedQuery(value: string) {
  return value.normalize('NFKC').replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
}

function googleSearchProvider(query: string, days: number, id: string, site?: string) {
  const url = new URL('https://news.google.com/rss/search');
  const scoped = site ? `site:${site} (${query})` : `(${query})`;
  url.search = new URLSearchParams({
    q: `${scoped} when:${days}d`,
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
  }).toString();
  return createRssNewsProvider({
    id,
    name: site ? `Indexed source search — ${site}` : 'Gold Research Web News Search',
    url: url.toString(),
    sourceType: 'public_rss',
    priority: site ? 2 : 3,
    reliabilityScore: site ? 0.74 : 0.66,
    officialSource: false,
    sourceNetworkId: site ? `news.google.com:${site}` : 'news.google.com',
    supportedMarkets: ['GLOBAL', 'US'],
    marketCodes: ['GLOBAL', 'US'],
    originalLanguage: 'en',
    revalidateSeconds: 180,
    timeoutMs: 6_000,
  });
}

function providersForSearch(query: string, days: number, officialOnly: boolean) {
  const params = { query, marketCodes: ['US', 'GLOBAL'] };
  const base = createFinancialNewsProviders(params).filter(provider =>
    provider.officialSource
    || provider.id === 'finnhub'
    || provider.id === 'newsapi'
    || provider.id === 'rss-google-global-markets'
    || provider.id.startsWith('custom-rss-'));

  if (officialOnly) return base.filter(provider => provider.officialSource).slice(0, 8);

  const dynamic: FinancialNewsProvider[] = [
    googleSearchProvider(query, days, 'rss-gold-research-query'),
    // Search White House material through a public index. It is intentionally
    // not marked official; the result retains the original publisher/source.
    googleSearchProvider(query, days, 'rss-gold-research-white-house', 'whitehouse.gov'),
  ];

  return [...base, ...dynamic].filter((provider, index, list) =>
    list.findIndex(candidate => candidate.id === provider.id) === index).slice(0, 10);
}

function storyToResult(story: ConsolidatedNewsStory): GoldResearchNewsResult {
  return {
    id: story.id,
    title: story.title,
    summary: story.summary ?? null,
    source: story.sourceName,
    sourceType: story.sourceType,
    url: story.originalUrl || null,
    publishedAt: story.publishedAt,
    eventType: story.eventType,
    verificationStatus: story.verificationStatus,
    expectedImpact: story.expectedImpact,
    sentiment: story.sentiment,
    importanceScore: story.importanceScore,
    confidenceScore: story.confidenceScore,
    whyItMatters: story.whyItMatters ?? null,
    isOfficial: story.isOfficial,
  };
}

function matchesCalendarQuery(title: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length >= 2);
  if (!terms.length) return true;
  const text = title.toLowerCase();
  return terms.some(term => text.includes(term));
}

export async function searchGoldResearch(input: GoldResearchSearchInput): Promise<GoldResearchSearchResult> {
  const query = normalizedQuery(input.query);
  if (query.length < 2) throw new Error('QUERY_TOO_SHORT');

  const days = Math.min(30, Math.max(1, Math.trunc(input.days ?? 7)));
  const limit = Math.min(40, Math.max(5, Math.trunc(input.limit ?? 20)));
  const kind: GoldResearchKind = ['all', 'news', 'calendar'].includes(input.kind ?? 'all')
    ? (input.kind ?? 'all') as GoldResearchKind
    : 'all';
  const officialOnly = Boolean(input.officialOnly);
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);
  const to = new Date(now.getTime() + Math.min(days, 14) * 86_400_000);

  const [newsResult, calendarResult] = await Promise.all([
    kind === 'calendar'
      ? Promise.resolve(null)
      : aggregateFinancialNews({
          query,
          from: dateOnly(from),
          to: dateOnly(now),
          marketCodes: ['GLOBAL', 'US'],
          limit: Math.min(80, limit * 3),
          officialOnly: officialOnly || undefined,
        }, {
          page: 1,
          pageSize: limit,
          sort: 'importance',
          providers: providersForSearch(query, days, officialOnly),
          providerBudgetMs: 7_000,
        }).catch(() => null),
    kind === 'news'
      ? Promise.resolve(null)
      : getEconomicCalendar({ from: dateOnly(now), to: dateOnly(to) }).catch(() => null),
  ]);

  const news = (newsResult?.stories ?? []).slice(0, limit).map(storyToResult);
  const calendar = (calendarResult?.data ?? [])
    .filter(event => matchesCalendarQuery(`${event.title} ${event.country ?? ''} ${event.currency ?? ''}`, query))
    .slice(0, limit)
    .map(event => ({
      id: event.id,
      title: event.title,
      dateTimeUtc: event.dateTimeUtc,
      country: event.country,
      currency: event.currency,
      impact: event.impact,
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous,
      source: event.source,
      provider: event.provider,
      stale: Boolean(event.stale),
    }));

  return {
    query,
    generatedAt: new Date().toISOString(),
    news,
    calendar,
    providerCoverage: (newsResult?.providerCoverage ?? []).map(provider => ({
      providerId: provider.providerId,
      providerName: provider.providerName,
      status: provider.status,
      articleCount: provider.articleCount,
      sourceType: provider.sourceType,
    })),
    partial: Boolean(newsResult?.partialFailure || calendarResult?.partial),
    live: Boolean(newsResult?.liveUpdatesAvailable || calendarResult?.status === 'success'),
    warnings: [
      ...(newsResult?.warnings ?? []),
      ...(calendarResult?.stale ? ['Economic calendar is using stale fallback data.'] : []),
    ].slice(0, 8),
  };
}

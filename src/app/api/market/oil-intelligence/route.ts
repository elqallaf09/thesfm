import { NextResponse } from 'next/server';
import { fetchEiaCommercialCrudeStocks } from '@/lib/market/eiaCrudeStocks';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { buildOilEvidenceSnapshot } from '@/lib/market/oilIntelligence';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function compactQuote(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const quote = value as {
    symbol?: string;
    price?: number | null;
    change?: number | null;
    changePercent?: number | null;
    source?: string | null;
    available?: boolean;
    unavailableReason?: string | null;
  };
  const price = typeof quote.price === 'number' && Number.isFinite(quote.price) && quote.price > 0 ? quote.price : null;
  return {
    symbol: String(quote.symbol ?? ''),
    price,
    change: typeof quote.change === 'number' && Number.isFinite(quote.change) ? quote.change : null,
    changePercent: typeof quote.changePercent === 'number' && Number.isFinite(quote.changePercent) ? quote.changePercent : null,
    source: quote.available && price ? quote.source ?? null : null,
    available: Boolean(quote.available && price),
    unavailableReason: quote.available && price ? null : quote.unavailableReason ?? 'quote_unavailable',
  };
}

export async function GET(request: Request) {
  const limited = rateLimitRequest(request, { max: 45, prefix: 'oil-intelligence' });
  if (limited) return limited;

  const now = new Date();
  const from = isoDate(addUtcDays(now, -14));
  const calendarFrom = isoDate(addUtcDays(now, -2));
  const to = isoDate(now);
  const calendarTo = isoDate(addUtcDays(now, 14));

  const [quoteResult, inventoryResult, newsResult, calendarResult] = await Promise.allSettled([
    fetchStockPrices([{ symbol: 'BZ=F' }, { symbol: 'CL=F' }], process.env.FINNHUB_API_KEY),
    fetchEiaCommercialCrudeStocks(),
    aggregateFinancialNews({
      query: 'oil OR crude OR OPEC OR Hormuz OR Bab el-Mandeb OR tanker OR shipping OR petroleum',
      marketCodes: ['GLOBAL', 'GULF', 'US'],
      from,
      to,
      limit: 80,
    }, {
      page: 1,
      pageSize: 48,
      sort: 'importance',
      mode: 'search',
      skipPersistence: true,
      providerBudgetMs: 4_500,
    }),
    getEconomicCalendar({
      from: calendarFrom,
      to: calendarTo,
    }),
  ]);

  const quotes = quoteResult.status === 'fulfilled' ? quoteResult.value : new Map();
  const inventory = inventoryResult.status === 'fulfilled' ? inventoryResult.value : null;
  const news = newsResult.status === 'fulfilled' ? newsResult.value.stories : [];
  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value.data : [];

  const evidence = buildOilEvidenceSnapshot({
    news: news.map(story => ({
      id: story.id,
      title: story.title,
      summary: story.summary,
      sourceName: story.sourceName,
      originalUrl: story.originalUrl,
      publishedAt: story.publishedAt,
      isOfficial: story.isOfficial,
      verificationStatus: story.verificationStatus,
      importanceScore: story.importanceScore,
      confidenceScore: story.confidenceScore,
      eventType: story.eventType,
      conflictSummary: story.conflictSummary,
    })),
    calendar: calendar.map(event => ({
      id: event.id,
      title: event.title,
      source: event.source,
      sourceUrl: event.sourceUrl,
      dateTimeUtc: event.dateTimeUtc,
      impact: event.impact,
      actual: event.actual,
      forecast: event.forecast,
      previous: event.previous,
      unit: event.unit,
      stale: event.stale,
    })),
    inventory,
    now,
  });

  const quoteValues = {
    brent: compactQuote(quotes.get('BZ=F')),
    wti: compactQuote(quotes.get('CL=F')),
  };
  const liveQuoteCount = Object.values(quoteValues).filter(quote => quote?.available).length;
  const evidenceSourceCount = new Set(evidence.items.map(item => item.source).filter(Boolean)).size;

  return NextResponse.json({
    ok: true,
    generatedAt: evidence.generatedAt,
    quotes: quoteValues,
    inventory,
    evidence: {
      categories: evidence.categories,
      items: evidence.items,
    },
    coverage: {
      liveQuotes: liveQuoteCount,
      evidenceSources: evidenceSourceCount,
      newsStories: news.length,
      calendarEvents: calendar.length,
      eiaInventory: Boolean(inventory),
      newsPartialFailure: newsResult.status === 'fulfilled' ? newsResult.value.partialFailure : true,
      calendarPartial: calendarResult.status === 'fulfilled' ? Boolean(calendarResult.value.partial) : true,
    },
    methodology: {
      numericScenarioAssumptionsRemainUserControlled: true,
      headlineEvidenceNeverAutoConvertsToDisruptionPercentages: true,
      referenceQuotesMayBeUsedAsStartingPrices: true,
    },
  }, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}

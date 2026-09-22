import { NextResponse } from 'next/server';
import { fetchEiaChokepoints } from '@/lib/market/eiaChokepoints';
import { fetchEiaCommercialCrudeStocks } from '@/lib/market/eiaCrudeStocks';
import { fetchStockPrices } from '@/lib/market/fetchStockPrices';
import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { buildOilEvidenceSnapshot, type OilEvidenceItem } from '@/lib/market/oilIntelligence';
import { fetchLatestOpecPolicy } from '@/lib/market/opecPolicy';
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

  const [quoteResult, inventoryResult, chokepointResult, opecResult, newsResult, calendarResult] = await Promise.allSettled([
    fetchStockPrices([{ symbol: 'BZ=F' }, { symbol: 'CL=F' }], process.env.FINNHUB_API_KEY),
    fetchEiaCommercialCrudeStocks(),
    fetchEiaChokepoints(),
    fetchLatestOpecPolicy(),
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
  const chokepoints = chokepointResult.status === 'fulfilled' ? chokepointResult.value : null;
  const opecPolicy = opecResult.status === 'fulfilled' ? opecResult.value : null;
  const news = newsResult.status === 'fulfilled' ? newsResult.value.stories : [];
  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value.data : [];

  const externalEvidence: OilEvidenceItem[] = [];
  if (chokepoints) {
    const publishedAt = (chokepoints.releaseDate ?? chokepoints.fetchedAt.slice(0, 10)) + 'T00:00:00.000Z';
    externalEvidence.push({
      id: 'chokepoint:eia:hormuz:' + chokepoints.hormuz.period,
      kind: 'chokepoint',
      categories: ['hormuz', 'shipping'],
      title: 'EIA estimated Hormuz oil flow: ' + chokepoints.hormuz.millionBarrelsPerDay.toFixed(1) + ' mb/d (' + chokepoints.hormuz.period + ')',
      detail: chokepoints.caveat,
      source: chokepoints.source,
      url: chokepoints.sourceUrl,
      publishedAt,
      urgency: 'low',
      direction: 'unknown',
      verificationStatus: 'official',
      confidenceScore: null,
      stale: false,
    });
    externalEvidence.push({
      id: 'chokepoint:eia:bab-el-mandeb:' + chokepoints.babElMandeb.period,
      kind: 'chokepoint',
      categories: ['bab_el_mandeb', 'shipping'],
      title: 'EIA estimated Bab el-Mandeb oil flow: ' + chokepoints.babElMandeb.millionBarrelsPerDay.toFixed(1) + ' mb/d (' + chokepoints.babElMandeb.period + ')',
      detail: chokepoints.babElMandeb.previousMillionBarrelsPerDay === null
        ? null
        : 'Previous ' + chokepoints.babElMandeb.previousPeriod + ': ' + chokepoints.babElMandeb.previousMillionBarrelsPerDay.toFixed(1) + ' mb/d.',
      source: chokepoints.source,
      url: chokepoints.sourceUrl,
      publishedAt,
      urgency: 'low',
      direction: 'unknown',
      verificationStatus: 'official',
      confidenceScore: null,
      stale: false,
    });
  }
  if (opecPolicy) {
    externalEvidence.push({
      id: 'policy:opec:' + opecPolicy.publishedDate,
      kind: 'policy',
      categories: ['production'],
      title: opecPolicy.title,
      detail: opecPolicy.summary,
      source: opecPolicy.source,
      url: opecPolicy.sourceUrl,
      publishedAt: opecPolicy.publishedDate + 'T00:00:00.000Z',
      urgency: opecPolicy.decision === 'unknown' ? 'low' : 'medium',
      direction: 'unknown',
      verificationStatus: 'official',
      confidenceScore: null,
      stale: false,
    });
  }

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
    externalEvidence,
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
    chokepoints,
    opecPolicy,
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
      eiaChokepoints: Boolean(chokepoints),
      opecPolicy: Boolean(opecPolicy),
      newsPartialFailure: newsResult.status === 'fulfilled' ? newsResult.value.partialFailure : true,
      calendarPartial: calendarResult.status === 'fulfilled' ? Boolean(calendarResult.value.partial) : true,
    },
    methodology: {
      numericScenarioAssumptionsRemainUserControlled: true,
      headlineEvidenceNeverAutoConvertsToDisruptionPercentages: true,
      referenceQuotesMayBeUsedAsStartingPrices: true,
      chokepointPercentagesCanBeAppliedOnlyAsUserChosenSensitivityAssumptions: true,
      officialPolicyEvidenceDoesNotImplyAPriceDirection: true,
    },
  }, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=900',
    },
  });
}

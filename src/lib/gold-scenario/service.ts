import 'server-only';

import { aggregateFinancialNews } from '@/lib/market-news/engine';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import { getMacroIndicator } from '@/lib/providers/economic-data';
import type { MacroIndicator, MacroIndicatorId } from '@/lib/providers/economic-data';
import { fetchTraderQuotesDetailed, type TraderQuote } from '@/lib/trader/marketQuotes';
import { buildGoldScenarioSnapshot } from './core';
import { createGoldScenarioNewsProviders } from './providers';
import type {
  GoldDriverDirection,
  GoldScenarioEvent,
  GoldScenarioMarketInput,
  GoldScenarioSnapshot,
  GoldWhatIfInput,
} from './types';

const QUOTE_SYMBOLS = ['XAUUSD', 'DXY', 'WTI', 'BRENT', 'SPX500', 'BTCUSD'] as const;
const EVENT_QUERY = [
  'gold', 'bullion', '"Federal Reserve"', '"White House"', 'Treasury',
  'dollar', 'inflation', 'interest rates', 'oil', 'OPEC',
  'tariff', 'sanction', 'war', 'conflict', 'ceasefire', 'central bank',
].join(' OR ');

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function numberValue(value: number | string | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/[%,$\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function macroDelta(indicator: MacroIndicator | null) {
  if (!indicator) return null;
  const value = numberValue(indicator.value);
  const previous = numberValue(indicator.previous);
  const forecast = numberValue(indicator.forecast);
  if (value === null) return null;
  if (previous !== null) return value - previous;
  if (forecast !== null) return value - forecast;
  return null;
}

function macroInput(indicator: MacroIndicator | null) {
  return {
    value: indicator?.value ?? null,
    delta: macroDelta(indicator),
    source: indicator?.source ?? null,
    asOf: indicator?.date ?? null,
    available: Boolean(indicator && numberValue(indicator.value) !== null),
  };
}

function quoteFor(quotes: TraderQuote[], symbol: string) {
  const normalized = symbol.toUpperCase();
  return quotes.find(quote => [
    quote.symbol,
    quote.requestedSymbol,
    quote.displaySymbol,
    quote.canonicalSymbol,
  ].some(value => String(value || '').toUpperCase() === normalized)) ?? null;
}

function quoteInput(quote: TraderQuote | null) {
  return {
    value: quote?.available ? quote.price : null,
    changePercent: quote?.available ? quote.changePercent : null,
    source: quote?.available ? quote.source : null,
    asOf: quote?.available ? quote.lastUpdated ?? quote.updatedAt : null,
    available: Boolean(quote?.available && typeof quote.price === 'number'),
  };
}

function impactMagnitude(story: ConsolidatedNewsStory) {
  const base = story.expectedImpact === 'high' ? 0.10
    : story.expectedImpact === 'medium' ? 0.065
      : story.expectedImpact === 'low' ? 0.035
        : 0.025;
  const verification = story.verificationStatus === 'official' || story.verificationStatus === 'confirmed'
    ? 1
    : story.verificationStatus === 'single_source'
      ? 0.68
      : story.verificationStatus === 'conflicting'
        ? 0.35
        : 0.25;
  const reliability = Math.max(0.35, Math.min(1, Number(story.sourceReliability) || 0.5));
  return Math.min(0.14, base * verification * (0.65 + reliability * 0.35));
}

function eventDirection(story: ConsolidatedNewsStory): { direction: GoldDriverDirection; sign: number; reason: string; reasonAr: string } {
  const text = `${story.title} ${story.summary ?? ''} ${story.impactReason ?? ''}`.toLowerCase();

  if (/ceasefire|peace deal|de-escalat|peace talks|هدنة|وقف إطلاق النار|تهدئة/.test(text)) {
    return { direction: 'bearish', sign: -1, reason: 'De-escalation can reduce part of gold\'s safe-haven premium.', reasonAr: 'التهدئة قد تقلل جزءاً من علاوة الملاذ الآمن في الذهب.' };
  }
  if (/war|attack|strike|invasion|conflict|sanction|tariff|blockade|هجوم|حرب|عقوبات|رسوم جمركية|تصعيد/.test(text)) {
    return { direction: 'bullish', sign: 1, reason: 'Escalation, sanctions or trade shocks can increase uncertainty and safe-haven demand.', reasonAr: 'التصعيد أو العقوبات أو صدمات التجارة قد ترفع عدم اليقين وطلب الملاذ الآمن.' };
  }
  if (/rate cut|cuts rates|dovish|easing|خفض الفائدة|تيسير/.test(text)) {
    return { direction: 'bullish', sign: 1, reason: 'Easier rate expectations can reduce gold\'s opportunity cost.', reasonAr: 'توقعات تيسير الفائدة قد تقلل تكلفة الفرصة للذهب.' };
  }
  if (/rate hike|raises rates|hawkish|tightening|رفع الفائدة|تشديد/.test(text)) {
    return { direction: 'bearish', sign: -1, reason: 'Tighter rate expectations can raise gold\'s opportunity cost.', reasonAr: 'توقعات تشديد الفائدة قد ترفع تكلفة الفرصة للذهب.' };
  }
  if (/dollar (rises|surges|strengthens|rallies)|stronger dollar|قوة الدولار|ارتفاع الدولار/.test(text)) {
    return { direction: 'bearish', sign: -1, reason: 'A stronger dollar is generally a headwind for dollar-priced gold.', reasonAr: 'قوة الدولار تشكل عادةً ضغطاً على الذهب المسعّر بالدولار.' };
  }
  if (/dollar (falls|drops|weakens)|weaker dollar|ضعف الدولار|هبوط الدولار/.test(text)) {
    return { direction: 'bullish', sign: 1, reason: 'A weaker dollar can support dollar-priced gold.', reasonAr: 'ضعف الدولار قد يدعم الذهب المسعّر بالدولار.' };
  }
  if (/inflation (accelerat|rises|hotter|above)|hot inflation|ارتفاع التضخم|تسارع التضخم/.test(text)) {
    return { direction: 'bullish', sign: 0.7, reason: 'Higher inflation pressure can support gold when real yields do not offset it.', reasonAr: 'ضغوط التضخم الأعلى قد تدعم الذهب إذا لم تعوضها العوائد الحقيقية.' };
  }
  if (/inflation (cools|falls|slows|below)|cooler inflation|تباطؤ التضخم|انخفاض التضخم/.test(text)) {
    return { direction: 'bearish', sign: -0.45, reason: 'Cooling inflation can reduce part of the inflation-hedge bid.', reasonAr: 'تباطؤ التضخم قد يقلل جزءاً من طلب التحوط بالذهب.' };
  }
  if (/oil (surges|jumps|rises)|crude (surges|jumps|rises)|ارتفاع النفط|قفزة النفط/.test(text)) {
    return { direction: 'bullish', sign: 0.55, reason: 'An oil shock can lift inflation expectations and geopolitical risk.', reasonAr: 'صدمة النفط قد ترفع توقعات التضخم والمخاطر الجيوسياسية.' };
  }
  if (/oil (falls|drops|slides)|crude (falls|drops|slides)|هبوط النفط|تراجع النفط/.test(text)) {
    return { direction: 'bearish', sign: -0.35, reason: 'Falling oil can ease inflation pressure, all else equal.', reasonAr: 'هبوط النفط قد يخفف ضغوط التضخم مع ثبات العوامل الأخرى.' };
  }

  if (story.eventType === 'geopolitical_event') {
    return { direction: 'bullish', sign: 0.45, reason: 'Geopolitical uncertainty can add safe-haven demand, subject to event details.', reasonAr: 'عدم اليقين الجيوسياسي قد يضيف طلباً على الملاذ الآمن بحسب تفاصيل الحدث.' };
  }

  return { direction: 'neutral', sign: 0, reason: 'The event is relevant context but does not have enough evidence for a directional gold effect.', reasonAr: 'الحدث مهم كسياق لكن لا توجد أدلة كافية لإسناد اتجاه محدد للذهب.' };
}

function toScenarioEvent(story: ConsolidatedNewsStory): GoldScenarioEvent {
  const classification = eventDirection(story);
  const contribution = impactMagnitude(story) * classification.sign;
  return {
    id: story.id,
    title: story.title,
    publishedAt: story.publishedAt,
    sourceName: story.sourceName,
    sourceUrl: story.originalUrl || null,
    eventType: story.eventType,
    verificationStatus: story.verificationStatus,
    expectedImpact: story.expectedImpact,
    direction: classification.direction,
    contribution: Number(contribution.toFixed(4)),
    whyItMatters: classification.reason,
    whyItMattersAr: classification.reasonAr,
  };
}

function relevantStory(story: ConsolidatedNewsStory) {
  const text = `${story.title} ${story.summary ?? ''}`.toLowerCase();
  return story.eventType === 'geopolitical_event'
    || story.eventType === 'interest_rate_decision'
    || story.eventType === 'inflation_report'
    || story.eventType === 'commodity_price_event'
    || story.eventType === 'currency_event'
    || story.eventType === 'macroeconomic_release'
    || /gold|bullion|federal reserve|white house|treasury|dollar|inflation|oil|opec|tariff|sanction|war|conflict|ceasefire|central bank|ذهب|الدولار|التضخم|النفط|عقوبات|حرب/.test(text);
}

async function loadMacro(id: MacroIndicatorId) {
  try {
    return await getMacroIndicator('United States', id);
  } catch {
    return null;
  }
}

export async function getGoldScenarioSnapshot(whatIf?: GoldWhatIfInput): Promise<GoldScenarioSnapshot> {
  const now = new Date();
  const newsFrom = addDays(now, -7);
  const calendarTo = addDays(now, 14);

  const [quotesResult, policyRate, inflation, yieldCurve, unemployment, newsResult, calendarResult] = await Promise.all([
    fetchTraderQuotesDetailed([...QUOTE_SYMBOLS], { includeHistory: true, includeNews: false }).catch(() => null),
    loadMacro('policyRate'),
    loadMacro('inflation'),
    loadMacro('yieldCurve'),
    loadMacro('unemployment'),
    aggregateFinancialNews({
      query: EVENT_QUERY,
      from: isoDate(newsFrom),
      to: isoDate(now),
      marketCodes: ['GLOBAL', 'US'],
      limit: 80,
    }, {
      page: 1,
      pageSize: 40,
      sort: 'importance',
      providers: createGoldScenarioNewsProviders(),
      providerBudgetMs: 6_500,
    }).catch(() => null),
    getEconomicCalendar({
      from: isoDate(now),
      to: isoDate(calendarTo),
      currency: 'USD',
    }).catch(() => null),
  ]);

  const quotes = quotesResult?.quotes ?? [];
  const gold = quoteFor(quotes, 'XAUUSD');
  const dxy = quoteFor(quotes, 'DXY');
  const wti = quoteFor(quotes, 'WTI');
  const brent = quoteFor(quotes, 'BRENT');
  const spx = quoteFor(quotes, 'SPX500');
  const btc = quoteFor(quotes, 'BTCUSD');

  const stories = (newsResult?.stories ?? []).filter(relevantStory);
  const scenarioEvents = stories.map(toScenarioEvent)
    .sort((left, right) => {
      const impact = Math.abs(right.contribution) - Math.abs(left.contribution);
      return impact !== 0 ? impact : Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    })
    .slice(0, 16);

  const calendarEvents = (calendarResult?.data ?? [])
    .filter(event => event.impact === 'high' || event.impact === 'medium')
    .slice(0, 16)
    .map(event => ({
      id: event.id,
      title: event.title,
      dateTimeUtc: event.dateTimeUtc,
      impact: event.impact,
      country: event.country,
      currency: event.currency,
      source: event.source,
    }));

  const market: GoldScenarioMarketInput = {
    goldPrice: gold?.available ? gold.price : null,
    goldHistory: (gold?.history ?? []).map(point => point.close).filter(value => Number.isFinite(value) && value > 0),
    quotes: {
      gold: quoteInput(gold),
      dxy: quoteInput(dxy),
      wti: quoteInput(wti),
      brent: quoteInput(brent),
      spx: quoteInput(spx),
      btc: quoteInput(btc),
    },
    macro: {
      policyRate: macroInput(policyRate),
      inflation: macroInput(inflation),
      yieldCurve: macroInput(yieldCurve),
      unemployment: macroInput(unemployment),
    },
    events: scenarioEvents,
    upcomingRiskEvents: calendarEvents,
    sourceHealth: [
      ...(quotesResult?.loaded ?? []).map(item => `quote:${item.provider}`),
      ...(newsResult?.providerCoverage ?? []).filter(item => item.status === 'success').map(item => `news:${item.providerId}`),
      ...(calendarResult?.sources ?? []).filter(item => item.status === 'success').map(item => `calendar:${item.provider}`),
      policyRate?.source ? `macro:${policyRate.source}` : '',
      inflation?.source ? `macro:${inflation.source}` : '',
    ].filter(Boolean),
  };

  return buildGoldScenarioSnapshot(market, whatIf);
}

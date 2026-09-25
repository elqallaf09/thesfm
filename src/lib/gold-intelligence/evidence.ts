import 'server-only';

import { aggregateFinancialNews } from '@/lib/market-news/engine';
import { createRssNewsProvider } from '@/lib/market-news/providers/rss';
import { createFinancialNewsProviders } from '@/lib/market-news/registry';
import type { ConsolidatedNewsStory } from '@/lib/market-news/types';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import type { GoldCalendarRisk, GoldDataQuality, GoldEventSignal } from './types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

export type RealYieldEvidence = { value: number; previous: number; date: string; quality: 'live' } | null;

export async function loadRealYield(): Promise<RealYieldEvidence> {
  const key = process.env.FRED_API_KEY?.trim();
  try {
    if (key) {
      const url = new URL('https://api.stlouisfed.org/fred/series/observations');
      Object.entries({ series_id: 'DFII10', api_key: key, file_type: 'json', sort_order: 'desc', limit: '12' })
        .forEach(([name, value]) => url.searchParams.set(name, value));
      const response = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error('fred_error');
      const json = await response.json() as { observations?: Array<{ date?: string; value?: string }> };
      const rows = (json.observations ?? []).map(row => ({ date: row.date ?? '', value: Number(row.value) }))
        .filter(row => row.date && Number.isFinite(row.value));
      if (rows.length >= 2) return { value: rows[0].value, previous: rows[1].value, date: rows[0].date, quality: 'live' };
    }
    const response = await fetch('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFII10', { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;
    const rows = (await response.text()).trim().split(/\r?\n/).slice(1).map(line => {
      const [date, raw] = line.split(','); return { date, value: Number(raw) };
    }).filter(row => row.date && Number.isFinite(row.value));
    if (rows.length < 2) return null;
    return { value: rows.at(-1)!.value, previous: rows.at(-2)!.value, date: rows.at(-1)!.date, quality: 'live' };
  } catch { return null; }
}

function whiteHouseProvider() {
  const url = new URL('https://news.google.com/rss/search');
  url.search = new URLSearchParams({
    q: 'site:whitehouse.gov (gold OR dollar OR oil OR tariff OR sanctions OR trade OR inflation OR "Federal Reserve") when:7d',
    hl: 'en-US', gl: 'US', ceid: 'US:en',
  }).toString();
  return createRssNewsProvider({
    id: 'rss-gold-white-house-monitor', name: 'White House monitor — Google News index', url: url.toString(),
    sourceType: 'public_rss', priority: 2, reliabilityScore: 0.72, officialSource: false,
    sourceNetworkId: 'news.google.com:whitehouse.gov', supportedMarkets: ['US', 'GLOBAL'], marketCodes: ['US', 'GLOBAL'],
    countries: ['US'], originalLanguage: 'en', revalidateSeconds: 300, timeoutMs: 6_000,
  });
}

function confidence(story: ConsolidatedNewsStory) {
  const verified = story.verificationStatus === 'official' ? 1 : story.verificationStatus === 'confirmed' ? .88
    : story.verificationStatus === 'single_source' ? .58 : story.verificationStatus === 'conflicting' ? .25 : .38;
  return round(clamp(verified * .7 + clamp(story.sourceReliability ?? .5, 0, 1) * .3, .15, 1));
}

function bias(story: ConsolidatedNewsStory) {
  const text = `${story.title} ${story.summary ?? ''} ${story.impactReason ?? ''}`.toLowerCase();
  let score = 0;
  if (/\b(war|conflict|attack|sanction|crisis|default|shutdown|geopolitical)\b|حرب|صراع|عقوبات|أزمة/.test(text)) score += .42;
  if (/\b(rate cut|easing|dovish|lower rates|falling yields)\b|خفض الفائدة|تيسير/.test(text)) score += .42;
  if (/\b(dollar weak|weaker dollar|dollar falls|dxy falls)\b|ضعف الدولار|هبوط الدولار/.test(text)) score += .34;
  if (/\b(central bank|reserve)\b.{0,45}\b(buy|purchase|accumulat|add.*gold)\b|شراء.*ذهب/.test(text)) score += .36;
  if (/\b(tariff|trade war)\b|رسوم جمركية|حرب تجارية/.test(text)) score += .18;
  if (/\b(rate hike|hawkish|higher for longer|rising real yields)\b|رفع الفائدة|تشدد نقدي/.test(text)) score -= .46;
  if (/\b(dollar strong|stronger dollar|dollar rises|dxy rises)\b|قوة الدولار|ارتفاع الدولار/.test(text)) score -= .36;
  if (/\b(central bank|reserve)\b.{0,45}\b(sell|selling|reduce.*gold)\b|بيع.*ذهب/.test(text)) score -= .38;
  if (/\b(ceasefire|de-escalation|peace deal)\b|وقف إطلاق النار|تهدئة/.test(text)) score -= .18;
  if (story.eventType === 'geopolitical_event' && score === 0) score = .28;
  return round(clamp(score, -1, 1));
}

export async function loadGoldEvents() {
  const now = new Date();
  const params = {
    query: 'gold bullion Federal Reserve FOMC White House Treasury dollar oil sanctions war conflict tariff central bank inflation rates',
    from: dateOnly(new Date(now.getTime() - 7 * 86_400_000)), to: dateOnly(now), limit: 60, marketCodes: ['US', 'GLOBAL'],
  };
  const base = createFinancialNewsProviders(params).filter(provider =>
    ['finnhub', 'newsapi', 'official-federal-reserve-press', 'official-federal-reserve-monetary-policy', 'rss-google-global-markets'].includes(provider.id)
    || provider.id.startsWith('custom-rss-'));
  try {
    const result = await aggregateFinancialNews(params, { page: 1, pageSize: 36, sort: 'importance', providers: [whiteHouseProvider(), ...base].slice(0, 8), providerBudgetMs: 6_500 });
    const events: GoldEventSignal[] = result.stories.map(story => {
      const eventBias = bias(story); const eventConfidence = confidence(story);
      const positive = eventBias > .12; const negative = eventBias < -.12;
      return {
        id: story.id, title: story.title, source: story.sourceName, url: story.originalUrl || null, publishedAt: story.publishedAt,
        eventType: story.eventType, verificationStatus: story.verificationStatus, expectedImpact: story.expectedImpact,
        bias: eventBias, confidence: eventConfidence,
        rationale: positive ? 'Verified event channels are supportive for gold.' : negative ? 'Verified event channels are restrictive for gold.' : 'Directional effect is mixed or insufficiently evidenced.',
        rationaleAr: positive ? 'قنوات الحدث الموثقة داعمة للذهب.' : negative ? 'قنوات الحدث الموثقة ضاغطة على الذهب.' : 'الأثر الاتجاهي مختلط أو لا توجد أدلة كافية لحسمه.',
      };
    }).sort((a, b) => Math.abs(b.bias) * b.confidence - Math.abs(a.bias) * a.confidence).slice(0, 10);
    const quality: GoldDataQuality = result.storedFallbackUsed ? 'cached' : result.liveUpdatesAvailable ? (result.partialFailure ? 'cached' : 'live') : events.length ? 'stale' : 'unavailable';
    return { events, quality, partial: result.partialFailure, warnings: result.warnings };
  } catch { return { events: [] as GoldEventSignal[], quality: 'unavailable' as GoldDataQuality, partial: true, warnings: ['News-event context is temporarily unavailable.'] }; }
}

export async function loadGoldCalendar() {
  const from = new Date(); const to = new Date(from.getTime() + 7 * 86_400_000);
  try {
    const response = await getEconomicCalendar({ from: dateOnly(from), to: dateOnly(to) });
    const data: GoldCalendarRisk[] = response.data
      .filter(event => (event.currency === 'USD' || event.country === 'US') && (event.impact === 'high' || event.impact === 'medium'))
      .slice(0, 12).map(event => ({ id: event.id, title: event.title, dateTimeUtc: event.dateTimeUtc, impact: event.impact, country: event.country, currency: event.currency, source: event.source, stale: Boolean(event.stale) }));
    const quality: GoldDataQuality = response.status !== 'success' && !data.length ? 'unavailable' : response.stale ? 'stale' : response.cached || response.partial ? 'cached' : 'live';
    return { data, quality, partial: Boolean(response.partial) };
  } catch { return { data: [] as GoldCalendarRisk[], quality: 'unavailable' as GoldDataQuality, partial: true }; }
}

export function eventBiasScore(events: GoldEventSignal[]) {
  if (!events.length) return null;
  let numerator = 0; let denominator = 0;
  for (const event of events) {
    const impact = event.expectedImpact === 'high' ? 1 : event.expectedImpact === 'medium' ? .7 : .45;
    const weight = event.confidence * impact; numerator += event.bias * weight; denominator += weight;
  }
  return denominator ? round(clamp(numerator / denominator, -1, 1)) : 0;
}

export function eventRiskScore(events: GoldEventSignal[]) {
  if (!events.length) return 0;
  const total = events.reduce((sum, event) => sum + Math.abs(event.bias) * event.confidence * (event.expectedImpact === 'high' ? 1 : event.expectedImpact === 'medium' ? .65 : .35), 0);
  return round(clamp(total / Math.max(2, events.length * .55), 0, 1));
}

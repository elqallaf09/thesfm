import 'server-only';

import { buildGoldAdvancedAnalysis } from './advanced';
import { annualizedVolatilityFromCloses, buildGoldForecastSet, calculateGoldFactorScore, confidenceFromEvidence } from './core';
import { eventBiasScore, eventRiskScore, loadGoldCalendar, loadGoldEvents, loadRealYield } from './evidence';
import type { GoldDataQuality, GoldDriver, GoldScenarioSnapshot } from './types';
import { getEconomicCycleIndicators } from '@/lib/providers/economic-data';
import { fetchTraderQuotes, type TraderQuote } from '@/lib/trader/marketQuotes';

const WEIGHT = { usd: .22, real_yields: .22, risk_events: .18, momentum: .16, nominal_rates: .08, oil: .06, etf_proxy: .05, macro_policy: .03 } as const;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;

function quality(quote?: TraderQuote): GoldDataQuality {
  if (!quote?.available || typeof quote.price !== 'number') return 'unavailable';
  return quote.dataQuality === 'cached' || quote.dataQuality === 'delayed' || quote.dataQuality === 'partial' || quote.delayed ? 'cached' : 'live';
}

function find(quotes: TraderQuote[], symbol: string) {
  const key = symbol.toUpperCase();
  return quotes.find(q => [q.symbol, q.requestedSymbol, q.displaySymbol, q.canonicalSymbol]
    .some(value => String(value ?? '').toUpperCase() === key));
}

function finiteNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/[%,$\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function marketScore(change: number | null | undefined, divisor: number, inverse = false) {
  if (typeof change !== 'number' || !Number.isFinite(change)) return null;
  const score = clamp(change / divisor, -1, 1);
  return inverse ? -score : score;
}

function momentum(gold: TraderQuote) {
  if (!gold.available || typeof gold.price !== 'number') return null;
  const parts: number[] = [];
  if (typeof gold.changePercent === 'number') parts.push(clamp(gold.changePercent / 1.5, -1, 1));
  if (typeof gold.sma20 === 'number' && gold.sma20 > 0) parts.push(gold.price >= gold.sma20 ? .55 : -.55);
  if (typeof gold.sma50 === 'number' && gold.sma50 > 0) parts.push(gold.price >= gold.sma50 ? .65 : -.65);
  if (typeof gold.rsi === 'number') parts.push(gold.rsi >= 70 ? -.2 : gold.rsi <= 30 ? .2 : clamp((gold.rsi - 50) / 25, -.5, .5));
  return parts.length ? round(parts.reduce((sum, value) => sum + value, 0) / parts.length) : null;
}

function makeDriver(args: Omit<GoldDriver, 'available'>): GoldDriver {
  return { ...args, available: typeof args.score === 'number' };
}

export async function buildGoldScenarioSnapshot(): Promise<GoldScenarioSnapshot> {
  const [quotes, realYield, macro, news, calendar] = await Promise.all([
    fetchTraderQuotes(['XAUUSD', 'DXY', 'WTI', 'BRENT', '^VIX', 'TLT', 'GLD'], { includeHistory: true, includeNews: false }),
    loadRealYield(),
    getEconomicCycleIndicators({ country: 'United States' }).catch(() => ({ ok: false, status: 'error' as const, source: null, updated_at: null, indicators: [] })),
    loadGoldEvents(),
    loadGoldCalendar(),
  ]);

  const gold = find(quotes, 'XAUUSD');
  if (!gold?.available || typeof gold.price !== 'number' || gold.price <= 0) throw new Error('GOLD_PRICE_UNAVAILABLE');

  const dxy = find(quotes, 'DXY');
  const wti = find(quotes, 'WTI');
  const brent = find(quotes, 'BRENT');
  const vix = find(quotes, '^VIX');
  const tlt = find(quotes, 'TLT');
  const gld = find(quotes, 'GLD');
  const policy = macro.indicators.find(item => item.id === 'policyRate');
  const eventScore = eventBiasScore(news.events);
  const eventRisk = eventRiskScore(news.events);
  const oilMoves = [wti?.changePercent, brent?.changePercent]
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const oilMove = oilMoves.length ? oilMoves.reduce((sum, value) => sum + value, 0) / oilMoves.length : null;
  const vixScore = marketScore(vix?.changePercent, 8);
  const riskScore = eventScore === null && vixScore === null
    ? null
    : round(clamp((eventScore ?? 0) * .72 + (vixScore ?? 0) * .28, -1, 1));
  const realYieldBps = realYield ? (realYield.value - realYield.previous) * 100 : null;
  const policyDelta = policy?.change?.delta ?? null;
  const explanation = (en: string, ar: string) => ({ explanation: en, explanationAr: ar });

  const drivers: GoldDriver[] = [
    makeDriver({ id: 'usd', label: 'U.S. dollar', labelAr: 'الدولار الأمريكي', weight: WEIGHT.usd, score: marketScore(dxy?.changePercent, 1.5, true), value: dxy?.price ?? null, unit: dxy?.currency ?? null, change: dxy?.changePercent ?? null, source: dxy?.source ?? null, asOf: dxy?.lastUpdated ?? null, quality: quality(dxy), ...explanation('DXY enters inversely.', 'يدخل DXY بعلاقة عكسية مع الذهب.') }),
    makeDriver({ id: 'real_yields', label: '10Y real yield', labelAr: 'العائد الحقيقي 10 سنوات', weight: WEIGHT.real_yields, score: realYieldBps === null ? null : clamp(-realYieldBps / 20, -1, 1), value: realYield?.value ?? null, unit: '%', change: realYieldBps, source: realYield ? 'FRED · DFII10' : null, asOf: realYield?.date ?? null, quality: realYield ? 'live' : 'unavailable', ...explanation('Real-yield changes enter inversely.', 'تغير العائد الحقيقي يدخل بصورة عكسية.') }),
    makeDriver({ id: 'risk_events', label: 'Global risk & events', labelAr: 'المخاطر والأحداث العالمية', weight: WEIGHT.risk_events, score: riskScore, value: vix?.price ?? null, unit: vix ? 'VIX' : null, change: vix?.changePercent ?? null, source: news.events.length ? 'SFM events + VIX' : vix?.source ?? null, asOf: news.events[0]?.publishedAt ?? vix?.lastUpdated ?? null, quality: news.quality === 'unavailable' ? quality(vix) : news.quality, ...explanation('Verified events are cross-checked with VIX.', 'تُراجع الأحداث الموثقة مع VIX.') }),
    makeDriver({ id: 'momentum', label: 'Gold momentum', labelAr: 'زخم الذهب', weight: WEIGHT.momentum, score: momentum(gold), value: gold.price, unit: gold.currency, change: gold.changePercent, source: gold.source, asOf: gold.lastUpdated, quality: quality(gold), ...explanation('Price trend, averages and RSI.', 'اتجاه السعر والمتوسطات وRSI.') }),
    makeDriver({ id: 'nominal_rates', label: 'Nominal-rate proxy', labelAr: 'مؤشر الفائدة الاسمية', weight: WEIGHT.nominal_rates, score: marketScore(tlt?.changePercent, 2.5), value: tlt?.price ?? null, unit: tlt?.currency ?? null, change: tlt?.changePercent ?? null, source: tlt ? `${tlt.source} · TLT proxy` : null, asOf: tlt?.lastUpdated ?? null, quality: quality(tlt), ...explanation('TLT is a proxy, not the yield itself.', 'TLT مؤشر بديل وليس العائد نفسه.') }),
    makeDriver({ id: 'oil', label: 'Oil / inflation pressure', labelAr: 'النفط وضغط التضخم', weight: WEIGHT.oil, score: oilMove === null ? null : clamp(oilMove / 4, -1, 1), value: wti?.price ?? brent?.price ?? null, unit: 'USD', change: oilMove, source: [wti?.source, brent?.source].filter(Boolean).join(' / ') || null, asOf: wti?.lastUpdated ?? brent?.lastUpdated ?? null, quality: quality(wti) === 'unavailable' ? quality(brent) : quality(wti), ...explanation('WTI and Brent carry a low model weight.', 'WTI وBrent بوزن منخفض في النموذج.') }),
    makeDriver({ id: 'etf_proxy', label: 'Gold ETF market proxy', labelAr: 'مؤشر سوق صناديق الذهب', weight: WEIGHT.etf_proxy, score: marketScore(gld?.changePercent, 2), value: gld?.price ?? null, unit: gld?.currency ?? null, change: gld?.changePercent ?? null, source: gld ? `${gld.source} · GLD price proxy` : null, asOf: gld?.lastUpdated ?? null, quality: quality(gld), ...explanation('GLD price is a proxy, not fund-flow data.', 'سعر GLD مؤشر بديل وليس بيانات تدفقات.') }),
    makeDriver({ id: 'macro_policy', label: 'Macro policy direction', labelAr: 'اتجاه السياسة الاقتصادية', weight: WEIGHT.macro_policy, score: typeof policyDelta === 'number' ? clamp(-policyDelta / .5, -1, 1) : null, value: finiteNumber(policy?.value), unit: policy?.change?.unit ?? null, change: policyDelta, source: policy?.source ?? macro.source, asOf: policy?.date ?? macro.updated_at, quality: macro.status === 'available' ? 'live' : 'unavailable', ...explanation('Policy direction has a deliberately low weight.', 'اتجاه السياسة له وزن منخفض عمداً.') }),
  ];

  const factor = calculateGoldFactorScore(drivers);
  const historyCloses = gold.history.map(point => point.close);
  const volatility = annualizedVolatilityFromCloses(historyCloses);
  const highImpact = calendar.data.filter(event => event.impact === 'high').length;
  const horizons = buildGoldForecastSet({
    price: gold.price,
    annualizedVolatility: volatility,
    factorScore: factor.score,
    eventRisk,
    upcomingHighImpactCount: highImpact,
  });
  const confidence = confidenceFromEvidence({
    coverage: factor.coverage,
    annualizedVolatility: volatility,
    eventCount: news.events.length,
    calendarAvailable: calendar.quality !== 'unavailable',
    quoteQuality: quality(gold),
  });

  const warnings: string[] = [];
  if (volatility === null) warnings.push('Insufficient verified history for statistical price ranges.');
  drivers.filter(item => !item.available).forEach(item => warnings.push(`${item.label} unavailable; excluded from score.`));
  if (news.partial) warnings.push('News coverage is partial.');
  if (calendar.partial) warnings.push('Economic-calendar coverage is partial.');

  const baseSnapshot: GoldScenarioSnapshot = {
    engine: 'SFM Gold Scenario Engine',
    engineVersion: '1.1.0',
    methodology: 'explainable-quant-v1',
    status: factor.coverage >= .75 && volatility !== null ? 'available' : 'partial',
    generatedAt: new Date().toISOString(),
    spot: {
      symbol: 'XAUUSD',
      price: gold.price,
      currency: gold.currency ?? 'USD',
      changePercent: gold.changePercent,
      source: gold.source,
      asOf: gold.lastUpdated,
    },
    factorScore: factor.score,
    confidence,
    dataCoverage: Math.round(factor.coverage * 100),
    annualizedVolatility: volatility,
    drivers,
    horizons,
    events: news.events,
    upcomingEvents: calendar.data,
    sourceStatus: {
      quotes: quality(gold),
      macro: macro.status === 'available' ? 'live' : 'unavailable',
      realYields: realYield ? 'live' : 'unavailable',
      news: news.quality,
      calendar: calendar.quality,
    },
    warnings,
  };

  return {
    ...baseSnapshot,
    advanced: buildGoldAdvancedAnalysis(baseSnapshot, historyCloses),
  };
}

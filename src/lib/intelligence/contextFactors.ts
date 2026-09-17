import type { FactorResult, IntelligenceEvidence, IntelligenceFactorKey, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import type { IntelligenceContextEvidence } from '@/providers/intelligence/contextEvidence';
import type { FactorContext, IntelligenceFactorModule } from './coreFactors';
import { calculateFreshness } from './freshness';

type ContextKey = 'NEWS' | 'SENTIMENT' | 'MACRO' | 'SHARIA';
const DAY = 86_400;
const TTL = {
  NEWS: { INTRADAY: 6 * 3600, SHORT_TERM: 12 * 3600, SWING: 3 * DAY, POSITION: 7 * DAY, LONG_TERM: 14 * DAY },
  SENTIMENT: { INTRADAY: 6 * 3600, SHORT_TERM: 12 * 3600, SWING: 2 * DAY, POSITION: 5 * DAY, LONG_TERM: 7 * DAY },
  MACRO: { INTRADAY: DAY, SHORT_TERM: 2 * DAY, SWING: 7 * DAY, POSITION: 14 * DAY, LONG_TERM: 30 * DAY },
};
const bias = (score: number | null) => score === null ? 'UNAVAILABLE' as const : score >= 12 ? 'BULLISH' as const : score <= -12 ? 'BEARISH' as const : 'NEUTRAL' as const;
function contextData(context: FactorContext) { return (context.snapshot as VerifiedIntelligenceSnapshot & { contextEvidence?: IntelligenceContextEvidence | null }).contextEvidence; }
function validTime(value: string | null | undefined, now: number, ageSeconds: number) {
  const stamp = Date.parse(value ?? '');
  return Number.isFinite(stamp) && stamp <= now && now - stamp <= ageSeconds * 1000;
}
function item(factor: ContextKey, key: string, value: IntelligenceEvidence['value'], at: string | null, source: string, provider = source): IntelligenceEvidence {
  return { id: `${factor.toLowerCase()}:${key}`, factor, kind: 'OBSERVATION', labelKey: `intelligence_evidence_${key}`, value, unit: null, observedAt: at, source, provider, direction: 'NEUTRAL', significance: 50 };
}
function result(context: FactorContext, factor: ContextKey, source: string, at: string | null, evidence: IntelligenceEvidence[], score: number | null, reason: string | null = null, partial = false, stale = false): FactorResult {
  const thresholdSeconds = factor === 'SHARIA' ? 180 * DAY : TTL[factor][context.request.horizon];
  const current = !stale && validTime(at, context.now, thresholdSeconds);
  const failure = reason ?? (!current ? 'STALE_OR_UNDATED_CONTEXT' : null);
  const normalizedScore = failure || score === null ? null : Math.round(Math.max(-100, Math.min(100, score)));
  return {
    factor, availability: failure ? 'UNAVAILABLE' : partial || score === null ? 'PARTIAL' : 'AVAILABLE',
    normalizedScore, directionalBias: bias(normalizedScore), strength: Math.abs(normalizedScore ?? 0),
    required: context.config.requiredFactors.includes(factor),
    freshness: calculateFreshness({ observedAt: at, thresholdSeconds, providerState: stale ? 'CACHED' : current ? 'LIVE' : 'UNAVAILABLE', now: context.now }),
    evidence, source, provider: source, operationalReliability: context.snapshot.operationalReliability,
    warnings: failure ? [{ code: failure, severity: 'INFO', factor, detailKey: 'intelligence_warning_factor_unavailable' }] : [], failureReason: failure,
  };
}
function warning(output: FactorResult, code: string, detailKey = 'intelligence_warning_factor_unavailable') {
  output.warnings.push({ code, severity: 'INFO', factor: output.factor, detailKey });
  return output;
}

const sentimentFactor: IntelligenceFactorModule = {
  key: 'SENTIMENT', analyze(context) {
    const data = contextData(context)?.sentiment;
    if (!data) return result(context, 'SENTIMENT', 'unavailable', null, [], null, 'SENTIMENT_PROVIDER_NOT_AVAILABLE');
    const values = [data.positivePercent, data.negativePercent, data.sampleSize];
    if (values.some(value => !Number.isFinite(value)) || data.positivePercent < 0 || data.positivePercent > 100 || data.negativePercent < 0 || data.negativePercent > 100 || Math.abs(data.positivePercent + data.negativePercent - 100) > 1 || !Number.isInteger(data.sampleSize) || data.sampleSize <= 0) {
      return result(context, 'SENTIMENT', data.provider, data.observedAt, [], null, 'INVALID_SENTIMENT_SAMPLE');
    }
    const evidence = [
      item('SENTIMENT', 'positive_sentiment_percent', data.positivePercent, data.observedAt, data.provider),
      item('SENTIMENT', 'negative_sentiment_percent', data.negativePercent, data.observedAt, data.provider),
      item('SENTIMENT', 'sentiment_sample_size', data.sampleSize, data.observedAt, data.provider),
    ];
    const output = result(context, 'SENTIMENT', data.provider, data.observedAt, evidence, (data.positivePercent - data.negativePercent) * 1.2, null, data.sampleSize < 5);
    if (data.sampleSize < 5) warning(output, 'LIMITED_SENTIMENT_SAMPLE', 'intelligence_warning_limited_sentiment_sample');
    return warning(output, 'SENTIMENT_IS_NOT_WIN_PROBABILITY', 'intelligence_warning_sentiment_not_probability');
  },
};

const newsFactor: IntelligenceFactorModule = {
  key: 'NEWS', analyze(context) {
    const data = contextData(context)?.news;
    const articles = (data?.articles ?? []).filter(article => article.headline && article.source && validTime(article.publishedAt, context.now, TTL.NEWS[context.request.horizon]));
    const source = data?.provider ?? 'unavailable';
    if (!articles.length) return result(context, 'NEWS', source, data?.observedAt ?? null, [], null, data?.failureCode ?? 'NEWS_NO_RELEVANT_RESULTS');
    // A headline is evidence of a news item, not evidence of a bullish or bearish prediction.
    const classified = articles.filter(article => article.sentimentSource === 'provider' && ['positive', 'neutral', 'negative'].includes(article.sentiment ?? ''));
    const up = classified.filter(article => article.sentiment === 'positive').length;
    const down = classified.filter(article => article.sentiment === 'negative').length;
    const duplicateNewsBasis = contextData(context)?.sentiment?.provider === 'alphavantage';
    const score = classified.length && !duplicateNewsBasis ? (up - down) / classified.length * 35 : null;
    const at = [...articles].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))[0].publishedAt;
    const evidence = [item('NEWS', 'news_article_count', articles.length, at, source), item('NEWS', 'positive_news_count', up, at, source), item('NEWS', 'negative_news_count', down, at, source)];
    for (const [index, article] of articles.entries()) {
      evidence.push({ ...item('NEWS', 'latest_news_headline', article.headline.slice(0, 240), article.publishedAt, article.source, source), id: `news:headline:${index}` });
      if (article.sourceUrl) evidence.push({ ...item('NEWS', 'news_source_url', article.sourceUrl, article.publishedAt, article.source, source), id: `news:source:${index}` });
    }
    const output = result(context, 'NEWS', source, at, evidence, score, null, classified.length !== articles.length, data?.stale);
    if (score === null) warning(output, duplicateNewsBasis ? 'NEWS_SENTIMENT_OVERLAP' : 'NEWS_DIRECTION_UNCLEAR', 'intelligence_warning_news_direction_unclear');
    return output;
  },
};

type Quantity = { value: number; dimension: 'number' | 'percent' };
export function parseMacroQuantity(value: unknown, unit?: string | null): Quantity | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const raw = String(value).trim();
  const match = raw.match(/^([+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+))\s*([KMB%]?)$/i);
  if (!match) return null;
  const suffix = match[2].toUpperCase();
  const scale = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1;
  const number = Number(match[1].replace(/,/g, '')) * scale;
  if (!Number.isFinite(number)) return null;
  return { value: number, dimension: suffix === '%' || unit === '%' ? 'percent' : 'number' };
}
function macroRule(title: string, actual: number, forecast: number): number | null {
  const higher = actual > forecast;
  const employment = /\b(unemployment|jobless claims|unemployment claims)\b/i.test(title);
  const growth = /\b(gdp|gross domestic product|retail sales|payrolls?|employment|industrial production|pmi|purchasing managers|consumer confidence|business confidence)\b/i.test(title);
  const rates = /\b(cpi|inflation|pce|ppi|consumer price|producer price|interest rate|rate decision|policy rate|fed funds)\b/i.test(title);
  if (!employment && !growth && !rates) return null;
  if (actual === forecast) return 0;
  return (higher ? 1 : -1) * (employment ? -30 : rates ? -20 : 25);
}
function country(value: string | null) {
  const raw = (value ?? '').trim().toUpperCase();
  return ({ USA: 'US', 'UNITED STATES': 'US', KUWAIT: 'KW', 'SAUDI ARABIA': 'SA', UAE: 'AE', 'UNITED ARAB EMIRATES': 'AE' } as Record<string, string>)[raw] ?? raw;
}
const macroFactor: IntelligenceFactorModule = {
  key: 'MACRO', analyze(context) {
    const data = contextData(context)?.macro;
    const events = (data?.events ?? []).filter(event => {
      const at = Date.parse(event.dateTimeUtc);
      return Number.isFinite(at) && at >= context.now - 3 * DAY * 1000 && at <= context.now + 7 * DAY * 1000;
    });
    const source = data?.provider ?? 'unavailable';
    if (!events.length) return result(context, 'MACRO', source, data?.observedAt ?? null, [], null, data?.failureCode ?? 'MACRO_NO_RELEVANT_EVENTS');
    const scores: number[] = [];
    const evidence = [item('MACRO', 'macro_event_count', events.length, data?.observedAt ?? null, source)];
    let next: typeof events[number] | null = null;
    for (const [index, event] of events.entries()) {
      const at = Date.parse(event.dateTimeUtc);
      if (at > context.now) { if (!next || at < Date.parse(next.dateTimeUtc)) next = event; continue; }
      // The equity surprise rule is not silently reused for the base/quote legs of FX or for commodities.
      if (!['STOCK', 'INDEX', 'FUND'].includes(context.snapshot.asset.assetType) || !country(context.snapshot.asset.country) || country(event.country) !== country(context.snapshot.asset.country)) continue;
      const actual = parseMacroQuantity(event.actual), forecast = parseMacroQuantity(event.forecast);
      if (!actual || !forecast || actual.dimension !== forecast.dimension) continue;
      const score = macroRule(event.title, actual.value, forecast.value);
      if (score === null) continue;
      scores.push(score * (event.impact === 'high' ? 1 : event.impact === 'medium' ? 0.65 : 0.35));
      evidence.push({ ...item('MACRO', 'macro_actual', event.actual, event.dateTimeUtc, event.provider), id: `macro:actual:${index}` });
      evidence.push({ ...item('MACRO', 'macro_forecast', event.forecast, event.dateTimeUtc, event.provider), id: `macro:forecast:${index}` });
    }
    evidence.push(item('MACRO', 'macro_high_impact_count', events.filter(event => event.impact === 'high').length, data?.observedAt ?? null, source));
    evidence.push(item('MACRO', 'macro_surprise_count', scores.length, data?.observedAt ?? null, source));
    if (next) evidence.push(item('MACRO', 'next_macro_event', next.title.slice(0, 200), next.dateTimeUtc, next.provider));
    const score = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
    const output = result(context, 'MACRO', source, data?.observedAt ?? null, evidence, score, null, !scores.length, data?.stale);
    return warning(output, scores.length ? 'MACRO_RULE_BASED_CONTEXT' : 'MACRO_DIRECTION_UNCLEAR', scores.length ? 'intelligence_warning_macro_rule_based' : 'intelligence_warning_macro_direction_unclear');
  },
};
const shariaFactor: IntelligenceFactorModule = {
  key: 'SHARIA', analyze(context) {
    const sharia = context.snapshot.sharia;
    if (!sharia.status || sharia.status === 'unclassified' || !sharia.source || !validTime(sharia.reviewedAt, context.now, 180 * DAY)) {
      return result(context, 'SHARIA', sharia.source ?? 'unavailable', sharia.reviewedAt, [], null, 'VERIFIED_SHARIA_STATUS_UNAVAILABLE');
    }
    const evidence = [item('SHARIA', 'verified_sharia_status', sharia.status, sharia.reviewedAt, sharia.source)];
    return result(context, 'SHARIA', sharia.source, sharia.reviewedAt, evidence, 0, null, sharia.status === 'needs_review');
  },
};

export const CONTEXT_FACTOR_MODULES: IntelligenceFactorModule[] = [sentimentFactor, newsFactor, macroFactor, shariaFactor];
export const CONTEXT_FACTOR_KEYS = new Set<IntelligenceFactorKey>(CONTEXT_FACTOR_MODULES.map(module => module.key));

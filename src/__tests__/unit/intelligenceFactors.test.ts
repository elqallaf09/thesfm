import { describe, expect, it } from 'vitest';
import type { AnalysisRequest, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import type { IntelligenceContextEvidence } from '@/providers/intelligence/contextEvidence';
import { getIntelligenceMethodologyConfig } from '@/lib/intelligence/config';
import { calculateDeterministicConfidence } from '@/lib/intelligence/confidence';
import { runIntelligenceFactors } from '@/lib/intelligence/factors';
import { parseMacroQuantity } from '@/lib/intelligence/contextFactors';

const now = Date.parse('2026-07-19T08:00:00.000Z');
const request: AnalysisRequest = {
  userId: null, asset: { symbol: 'AAPL', assetType: 'STOCK' }, horizon: 'SWING', locale: 'en',
  requestedModules: ['TECHNICAL', 'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK', 'SHARIA'],
  providerPreferences: null, source: 'INTERNAL', correlationId: '00000000-0000-4000-8000-000000000001', forceRefresh: false,
};
type Snapshot = VerifiedIntelligenceSnapshot & { contextEvidence?: IntelligenceContextEvidence };
function snapshot(): Snapshot {
  const start = Date.UTC(2026, 0, 1);
  return {
    asset: { canonicalSymbol: 'AAPL', providerSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD', country: 'US', logoUrl: null },
    provider: 'verified-test-provider', receivedAt: new Date(now).toISOString(), dataAsOf: '2026-07-19T07:59:30.000Z', dataStatus: 'LIVE', fallbackUsed: false, operationalReliability: 1, reportedRiskLevel: 'MEDIUM',
    quote: { price: 150, change: 1, changePercent: 0.67, volume: 1_500_000 }, levels: { support: 120, resistance: 160 },
    candles: Array.from({ length: 80 }, (_, index) => ({ at: new Date(start + index * 86_400_000).toISOString(), open: 100 + index * 0.6, high: 102 + index * 0.6, low: 99 + index * 0.6, close: 101 + index * 0.6, volume: 1_000_000 + index * 10_000 })),
    fundamentals: { trailingPE: 26, trailingEps: 6.2, revenueGrowth: 0.12 }, fundamentalsSource: 'verified-test-provider',
    sharia: { status: 'unclassified', reason: null, source: null, reviewedAt: null }, warnings: [], providerAttempts: [],
  };
}
function contextualSnapshot(): Snapshot & { contextEvidence: IntelligenceContextEvidence } {
  return { ...snapshot(), contextEvidence: {
    sentiment: { provider: 'finnhub', positivePercent: 70, negativePercent: 30, sampleSize: 12, observedAt: '2026-07-19T06:30:00.000Z' },
    news: { provider: 'finnhub', observedAt: '2026-07-19T06:45:00.000Z', stale: false, failureCode: null, articles: [
      { headline: 'Apple reports record profit and raises guidance', source: 'Fixture Publisher', sourceUrl: 'https://example.com/news/one', publishedAt: '2026-07-19T06:45:00.000Z', sentiment: 'positive', sentimentSource: 'provider' },
      { headline: 'Apple supplier outlook remains stable', source: 'Fixture Publisher', sourceUrl: 'https://example.com/news/two', publishedAt: '2026-07-19T05:30:00.000Z', sentiment: 'neutral', sentimentSource: 'provider' },
    ] },
    macro: { provider: 'finnhub', observedAt: '2026-07-19T07:00:00.000Z', stale: false, failureCode: null, events: [
      { title: 'US GDP Growth Rate', country: 'US', currency: 'USD', dateTimeUtc: '2026-07-19T05:00:00.000Z', impact: 'high', actual: 3.2, forecast: 2.1, previous: 2.4, provider: 'finnhub' },
      { title: 'Federal Reserve Rate Decision', country: 'US', currency: 'USD', dateTimeUtc: '2026-07-20T18:00:00.000Z', impact: 'high', actual: null, forecast: 4.5, previous: 4.5, provider: 'finnhub' },
    ] }, sharia: null,
  } };
}
function run(input: Snapshot, modules: AnalysisRequest['requestedModules']) {
  return runIntelligenceFactors({ request, snapshot: input, config: getIntelligenceMethodologyConfig('STOCK', 'SWING'), now }, modules);
}

describe('intelligence factor normalization', () => {
  it('preserves canonical score bounds and evidence for the released market factors', () => {
    for (const factor of run(snapshot(), request.requestedModules).filter(item => item.availability !== 'UNAVAILABLE')) {
      expect(factor.normalizedScore).toBeGreaterThanOrEqual(-100);
      expect(factor.normalizedScore).toBeLessThanOrEqual(100);
      expect(factor.evidence.length).toBeGreaterThan(0);
    }
  });
  it('does not infer Sharia status when verified source context is missing', () => {
    const [factor] = run(snapshot(), ['SHARIA']);
    expect(factor.availability).toBe('UNAVAILABLE'); expect(factor.normalizedScore).toBeNull();
    expect(factor.failureReason).toBe('VERIFIED_SHARIA_STATUS_UNAVAILABLE');
  });
  it('reports missing contextual evidence truthfully', () => {
    const factors = run(snapshot(), ['SENTIMENT', 'NEWS', 'MACRO']);
    expect(factors.every(factor => factor.availability === 'UNAVAILABLE')).toBe(true);
    expect(factors.map(factor => factor.failureReason)).toEqual(['SENTIMENT_PROVIDER_NOT_AVAILABLE', 'NEWS_NO_RELEVANT_RESULTS', 'MACRO_NO_RELEVANT_EVENTS']);
  });
  it('connects provider-classified news, observed sentiment and released economic data', () => {
    const [sentiment, news, macro] = run(contextualSnapshot(), ['SENTIMENT', 'NEWS', 'MACRO']);
    for (const factor of [sentiment, news, macro]) { expect(factor.availability).toBe('AVAILABLE'); expect(factor.normalizedScore).toBeGreaterThan(0); }
    expect(sentiment.source).toBe('finnhub');
    expect(sentiment.evidence.some(item => item.labelKey === 'intelligence_evidence_sentiment_sample_size')).toBe(true);
    expect(news.evidence.some(item => item.value === 'Apple reports record profit and raises guidance')).toBe(true);
    expect(news.evidence.some(item => item.value === 'https://example.com/news/one')).toBe(true);
    expect(macro.evidence.some(item => item.labelKey === 'intelligence_evidence_next_macro_event')).toBe(true);
    expect(macro.evidence.some(item => item.labelKey === 'intelligence_evidence_macro_actual' && item.value === 3.2)).toBe(true);
  });
  it('exposes observed official funding rates without inventing forecasts or a directional recommendation', () => {
    const input = contextualSnapshot();
    input.contextEvidence.macro = { provider: 'New York Fed', observedAt: new Date(now).toISOString(), events: [], stale: false, failureCode: null, observations: [{ series: 'SOFR', country: 'US', currency: 'USD', value: 3.5, previous: 3.25, previousPeriod: '2026-07-16', unit: '%', period: '2026-07-17', retrievedAt: new Date(now).toISOString(), provider: 'New York Fed', sourceUrl: 'https://www.newyorkfed.org/markets/reference-rates/sofr' }] };
    const [factor] = run(input, ['MACRO']);
    expect(factor.availability).toBe('PARTIAL'); expect(factor.normalizedScore).toBeNull(); expect(factor.failureReason).toBeNull();
    expect(factor.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ labelKey: 'intelligence_evidence_macro_observation_sofr', value: 3.5, unit: '%', observedAt: '2026-07-17' })]));
    expect(factor.evidence.some(item => item.labelKey.endsWith('macro_forecast'))).toBe(false);
    input.contextEvidence.macro.observations![0].period = '2025-01-01';
    expect(run(input, ['MACRO'])[0].availability).toBe('UNAVAILABLE');
  });
  it('does not count an upcoming event as directional evidence or as an observed zero surprise', () => {
    const input = contextualSnapshot(); input.contextEvidence.macro.events = [input.contextEvidence.macro.events[1]];
    const [macro] = run(input, ['MACRO']);
    expect(macro.availability).toBe('PARTIAL'); expect(macro.normalizedScore).toBeNull();
    expect(macro.warnings.some(item => item.code === 'MACRO_DIRECTION_UNCLEAR')).toBe(true);
    expect(calculateDeterministicConfidence([macro], getIntelligenceMethodologyConfig('STOCK', 'SWING')).calculation.availableDirectionalFactors).toBe(0);
  });
  it('retains completed monthly macro periods without treating them as daily quotes or directional votes', () => {
    const input = contextualSnapshot();
    input.contextEvidence.macro = { provider: 'BLS', observedAt: new Date(now).toISOString(), events: [], stale: false, failureCode: null, observations: [{ series: 'CPI_YOY', country: 'US', currency: 'USD', value: 3.2, previous: 3.1, previousPeriod: '2026-05-31', unit: '%', period: '2026-06-30', retrievedAt: new Date(now).toISOString(), provider: 'BLS', sourceUrl: 'https://data.bls.gov/timeseries/CUUR0000SA0' }] };
    const [factor] = run(input, ['MACRO']);
    expect(factor.availability).toBe('PARTIAL'); expect(factor.normalizedScore).toBeNull();
    expect(factor.evidence).toEqual(expect.arrayContaining([expect.objectContaining({ labelKey: 'intelligence_evidence_macro_observation_cpi_yoy', value: 3.2, observedAt: '2026-06-30' })]));
    expect(calculateDeterministicConfidence([factor], getIntelligenceMethodologyConfig('STOCK', 'SWING')).calculation.availableDirectionalFactors).toBe(0);
  });
  it('does not turn an unclassified headline into a predicted direction from keywords', () => {
    const input = contextualSnapshot();
    input.contextEvidence.news.articles = [{ ...input.contextEvidence.news.articles[0], headline: 'No investigation: finance company denies bankruptcy rumors', sentiment: null, sentimentSource: null }];
    const [news] = run(input, ['NEWS']);
    expect(news.availability).toBe('PARTIAL'); expect(news.normalizedScore).toBeNull();
    expect(news.warnings.some(item => item.code === 'NEWS_DIRECTION_UNCLEAR')).toBe(true);
  });
  it('keeps a measured neutral sentiment distinct from missing sentiment', () => {
    const input = contextualSnapshot(); input.contextEvidence.sentiment!.positivePercent = 50; input.contextEvidence.sentiment!.negativePercent = 50;
    expect(run(input, ['SENTIMENT'])[0].normalizedScore).toBe(0);
  });
  it.each(['2026-07-01T00:00:00Z', '2026-07-20T00:00:00Z', 'not-a-date'])('rejects stale, future or invalid sentiment timestamps: %s', stamp => {
    const input = contextualSnapshot(); input.contextEvidence.sentiment!.observedAt = stamp;
    const [factor] = run(input, ['SENTIMENT']); expect(factor.availability).toBe('UNAVAILABLE'); expect(factor.normalizedScore).toBeNull();
  });
  it('does not let a fresh headline launder older evidence', () => {
    const input = contextualSnapshot(); input.contextEvidence.news.articles.push({ ...input.contextEvidence.news.articles[0], headline: 'Old bearish story', sentiment: 'negative', publishedAt: '2026-06-01T00:00:00Z' });
    const [news] = run(input, ['NEWS']); expect(news.evidence.some(item => item.value === 'Old bearish story')).toBe(false);
  });
  it('does not use stale cached news in the decision', () => {
    const input = contextualSnapshot(); input.contextEvidence.news.stale = true;
    const [factor] = run(input, ['NEWS']); expect(factor.availability).toBe('UNAVAILABLE'); expect(factor.normalizedScore).toBeNull();
  });
  it('does not double count news-derived sentiment as a separate news direction', () => {
    const input = contextualSnapshot(); input.contextEvidence.sentiment!.provider = 'alphavantage';
    expect(run(input, ['NEWS'])[0].normalizedScore).toBeNull();
  });
  it('does not apply a US equity GDP rule to a foreign equity or a currency pair', () => {
    const foreign = contextualSnapshot(); foreign.asset.country = 'KW'; expect(run(foreign, ['MACRO'])[0].normalizedScore).toBeNull();
    const fx = contextualSnapshot(); fx.asset.assetType = 'FOREX'; expect(run(fx, ['MACRO'])[0].normalizedScore).toBeNull();
  });
  it('compares economic magnitudes with K and M units rather than their first digits', () => {
    const input = contextualSnapshot(); Object.assign(input.contextEvidence.macro.events[0], { title: 'US Nonfarm Payrolls', actual: '250K', forecast: '0.3M' });
    expect(run(input, ['MACRO'])[0].normalizedScore).toBeLessThan(0);
  });
  it('does not invent a comparable surprise from a range or incompatible units', () => {
    const input = contextualSnapshot(); Object.assign(input.contextEvidence.macro.events[0], { actual: '3-4%', forecast: 3 });
    expect(run(input, ['MACRO'])[0].normalizedScore).toBeNull();
    Object.assign(input.contextEvidence.macro.events[0], { actual: '3%', forecast: '3M' });
    expect(run(input, ['MACRO'])[0].normalizedScore).toBeNull();
  });
  it('attributes Sharia evidence to its own reviewed source rather than the quote provider', () => {
    const input = snapshot(); input.sharia = { status: 'needs_review', source: 'Source-verified screening', reviewedAt: '2026-07-18T00:00:00Z', reason: 'Review pending' };
    const [sharia] = run(input, ['SHARIA']); expect(sharia.availability).toBe('PARTIAL'); expect(sharia.evidence[0].provider).toBe('Source-verified screening');
  });
  it.each(['2026-07-20T00:00:00Z', '2025-01-01T00:00:00Z'])('does not accept an expired or future Sharia review: %s', reviewedAt => {
    const input = snapshot(); input.sharia = { status: 'compliant', source: 'Fixture source', reviewedAt, reason: 'Fixture only' };
    expect(run(input, ['SHARIA'])[0].availability).toBe('UNAVAILABLE');
  });
});

describe('strict macro number parser', () => {
  it.each([[null], [undefined], [''], [' '], [false], ['N/A'], ['3 to 4'], ['1,2'], ['1.2.3']])('rejects a non-observation %s', value => { expect(parseMacroQuantity(value)).toBeNull(); });
  it('normalizes explicit multipliers and preserves percentage dimension', () => {
    expect(parseMacroQuantity('250K')).toEqual({ value: 250000, dimension: 'number' });
    expect(parseMacroQuantity('0.3M')).toEqual({ value: 300000, dimension: 'number' });
    expect(parseMacroQuantity('-2.5%')).toEqual({ value: -2.5, dimension: 'percent' });
    expect(parseMacroQuantity(0)).toEqual({ value: 0, dimension: 'number' });
  });
});

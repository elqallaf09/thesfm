import type {
  AnalysisRequest,
  DirectionalBias,
  FactorAvailability,
  FactorResult,
  IntelligenceEvidence,
  IntelligenceFactorKey,
  IntelligenceWarning,
  VerifiedIntelligenceSnapshot,
} from '@/domain/intelligence/contracts';
import type { IntelligenceMethodologyConfig } from './config';
import { calculateFreshness, freshnessThresholdSeconds } from './freshness';

export type FactorContext = {
  request: AnalysisRequest;
  snapshot: VerifiedIntelligenceSnapshot;
  config: IntelligenceMethodologyConfig;
  now: number;
};

export type IntelligenceFactorModule = {
  key: IntelligenceFactorKey;
  analyze(context: FactorContext): FactorResult;
};

type ContextNewsArticle = {
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentimentSource: 'provider' | 'ai' | null;
};

type ContextEvidence = {
  news: {
    provider: string | null;
    observedAt: string | null;
    stale: boolean;
    articles: ContextNewsArticle[];
    failureCode: string | null;
  };
  sentiment: {
    provider: 'finnhub' | 'alphavantage' | 'myfxbook';
    positivePercent: number;
    negativePercent: number;
    sampleSize: number;
    observedAt: string | null;
  } | null;
  macro: {
    provider: string | null;
    observedAt: string | null;
    stale: boolean;
    events: Array<{
      title: string;
      country: string | null;
      currency: string | null;
      dateTimeUtc: string;
      impact: 'high' | 'medium' | 'low' | 'unknown';
      actual: string | number | null;
      forecast: string | number | null;
      previous: string | number | null;
      provider: string;
    }>;
    failureCode: string | null;
  };
};

type SnapshotWithContext = VerifiedIntelligenceSnapshot & {
  contextEvidence?: ContextEvidence | null;
};

const CONTEXT_TTL_SECONDS = {
  SENTIMENT: {
    INTRADAY: 6 * 3600,
    SHORT_TERM: 12 * 3600,
    SWING: 48 * 3600,
    POSITION: 5 * 86_400,
    LONG_TERM: 7 * 86_400,
  },
  NEWS: {
    INTRADAY: 6 * 3600,
    SHORT_TERM: 12 * 3600,
    SWING: 72 * 3600,
    POSITION: 7 * 86_400,
    LONG_TERM: 14 * 86_400,
  },
  MACRO: {
    INTRADAY: 24 * 3600,
    SHORT_TERM: 48 * 3600,
    SWING: 7 * 86_400,
    POSITION: 14 * 86_400,
    LONG_TERM: 30 * 86_400,
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numericObservation(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values: number[]) {
  const mean = average(values);
  if (mean === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function simpleMovingAverage(values: number[], period: number) {
  return values.length >= period ? average(values.slice(-period)) : null;
}

function relativeStrengthIndex(values: number[], period = 14) {
  if (values.length <= period) return null;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  let gains = 0;
  let losses = 0;
  for (const change of changes.slice(-period)) {
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  if (losses === 0) return gains > 0 ? 100 : 50;
  const strength = (gains / period) / (losses / period);
  return 100 - (100 / (1 + strength));
}

function percentChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function scoreBias(score: number | null): DirectionalBias {
  if (score === null) return 'UNAVAILABLE';
  if (score >= 12) return 'BULLISH';
  if (score <= -12) return 'BEARISH';
  return 'NEUTRAL';
}

function factorFreshness(context: FactorContext, observedAt = context.snapshot.dataAsOf) {
  return calculateFreshness({
    observedAt,
    providerState: context.snapshot.dataStatus,
    thresholdSeconds: freshnessThresholdSeconds({
      assetType: context.request.asset.assetType,
      horizon: context.request.horizon,
    }),
    now: context.now,
  });
}

function contextualFreshness(
  context: FactorContext,
  factor: 'SENTIMENT' | 'NEWS' | 'MACRO',
  observedAt: string | null,
  stale = false,
) {
  return calculateFreshness({
    observedAt,
    providerState: stale ? 'CACHED' : observedAt ? 'LIVE' : 'UNAVAILABLE',
    thresholdSeconds: CONTEXT_TTL_SECONDS[factor][context.request.horizon],
    now: context.now,
  });
}

function contextEvidence(context: FactorContext) {
  return (context.snapshot as SnapshotWithContext).contextEvidence ?? null;
}

function freshnessWarnings(factor: IntelligenceFactorKey, state: ReturnType<typeof factorFreshness>['state']): IntelligenceWarning[] {
  if (state === 'STALE') {
    return [{ code: 'STALE_FACTOR_DATA', severity: 'WARNING', factor, detailKey: 'intelligence_warning_stale_factor' }];
  }
  if (state === 'DELAYED') {
    return [{ code: 'DELAYED_FACTOR_DATA', severity: 'INFO', factor, detailKey: 'intelligence_warning_delayed_factor' }];
  }
  return [];
}

function evidence(
  context: FactorContext,
  factor: IntelligenceFactorKey,
  key: string,
  value: IntelligenceEvidence['value'],
  unit: string | null,
  direction: DirectionalBias,
  significance: number,
  observedAt = context.snapshot.dataAsOf,
  sourceOverride?: { source?: string | null; provider?: string | null },
): IntelligenceEvidence {
  return {
    id: `${factor.toLowerCase()}:${key}`,
    factor,
    kind: 'OBSERVATION',
    labelKey: `intelligence_evidence_${key}`,
    value,
    unit,
    observedAt,
    source: sourceOverride?.source ?? context.snapshot.provider,
    provider: sourceOverride?.provider ?? sourceOverride?.source ?? context.snapshot.provider,
    direction,
    significance: clamp(Math.round(significance), 0, 100),
  };
}

function unavailable(
  context: FactorContext,
  factor: IntelligenceFactorKey,
  reason: string,
  observedAt = context.snapshot.dataAsOf,
): FactorResult {
  const freshness = factorFreshness(context, observedAt);
  return {
    factor,
    availability: 'UNAVAILABLE',
    normalizedScore: null,
    directionalBias: 'UNAVAILABLE',
    strength: 0,
    required: context.config.requiredFactors.includes(factor),
    freshness,
    evidence: [],
    source: context.snapshot.provider,
    provider: context.snapshot.provider,
    operationalReliability: context.snapshot.operationalReliability,
    warnings: [{ code: reason, severity: 'INFO', factor, detailKey: 'intelligence_warning_factor_unavailable' }],
    failureReason: reason,
  };
}

function contextualUnavailable(
  context: FactorContext,
  factor: 'SENTIMENT' | 'NEWS' | 'MACRO',
  reason: string,
  input?: { source?: string | null; observedAt?: string | null; stale?: boolean },
): FactorResult {
  const source = input?.source ?? context.snapshot.provider;
  const freshness = contextualFreshness(context, factor, input?.observedAt ?? null, input?.stale);
  return {
    factor,
    availability: 'UNAVAILABLE',
    normalizedScore: null,
    directionalBias: 'UNAVAILABLE',
    strength: 0,
    required: context.config.requiredFactors.includes(factor),
    freshness,
    evidence: [],
    source,
    provider: source,
    operationalReliability: context.snapshot.operationalReliability,
    warnings: [{ code: reason, severity: 'INFO', factor, detailKey: 'intelligence_warning_factor_unavailable' }],
    failureReason: reason,
  };
}

function availableFactor(input: {
  context: FactorContext;
  factor: IntelligenceFactorKey;
  availability?: FactorAvailability;
  score: number;
  strength?: number;
  evidence: IntelligenceEvidence[];
  warnings?: IntelligenceWarning[];
  observedAt?: string | null;
  source?: string | null;
  provider?: string | null;
  freshness?: FactorResult['freshness'];
}) {
  const freshness = input.freshness ?? factorFreshness(input.context, input.observedAt ?? input.context.snapshot.dataAsOf);
  const score = clamp(Math.round(input.score), -100, 100);
  const source = input.source ?? input.context.snapshot.provider;
  return {
    factor: input.factor,
    availability: input.availability ?? 'AVAILABLE',
    normalizedScore: score,
    directionalBias: scoreBias(score),
    strength: clamp(Math.round(input.strength ?? Math.abs(score)), 0, 100),
    required: input.context.config.requiredFactors.includes(input.factor),
    freshness,
    evidence: input.evidence,
    source,
    provider: input.provider ?? source,
    operationalReliability: input.context.snapshot.operationalReliability,
    warnings: [...freshnessWarnings(input.factor, freshness.state), ...(input.warnings ?? [])],
    failureReason: null,
  } satisfies FactorResult;
}

function closes(context: FactorContext) {
  return context.snapshot.candles
    .map(item => finite(item.close))
    .filter((value): value is number => value !== null && value > 0);
}

const technicalFactor: IntelligenceFactorModule = {
  key: 'TECHNICAL',
  analyze(context) {
    const values = closes(context);
    if (values.length < 20) return unavailable(context, 'TECHNICAL', 'INSUFFICIENT_TECHNICAL_HISTORY');

    const current = values.at(-1)!;
    const sma20 = simpleMovingAverage(values, 20);
    const sma50 = simpleMovingAverage(values, 50);
    const rsi = relativeStrengthIndex(values);
    let score = 0;
    let observations = 0;
    const items: IntelligenceEvidence[] = [];

    if (sma20 !== null) {
      const direction = current >= sma20 ? 'BULLISH' : 'BEARISH';
      score += current >= sma20 ? 24 : -24;
      observations += 1;
      items.push(evidence(context, 'TECHNICAL', 'price_vs_sma20', rounded(((current - sma20) / sma20) * 100), '%', direction, 70));
    }
    if (sma20 !== null && sma50 !== null) {
      const direction = sma20 >= sma50 ? 'BULLISH' : 'BEARISH';
      score += sma20 >= sma50 ? 28 : -28;
      observations += 1;
      items.push(evidence(context, 'TECHNICAL', 'sma20_vs_sma50', rounded(((sma20 - sma50) / sma50) * 100), '%', direction, 80));
    }
    if (rsi !== null) {
      let rsiScore = 0;
      let direction: DirectionalBias = 'NEUTRAL';
      if (rsi >= 75) { rsiScore = -24; direction = 'BEARISH'; }
      else if (rsi <= 25) { rsiScore = 16; direction = 'BULLISH'; }
      else if (rsi >= 55 && rsi < 70) { rsiScore = 12; direction = 'BULLISH'; }
      else if (rsi > 30 && rsi <= 45) { rsiScore = -12; direction = 'BEARISH'; }
      score += rsiScore;
      observations += 1;
      items.push(evidence(context, 'TECHNICAL', 'rsi14', rounded(rsi, 1), null, direction, Math.min(80, Math.abs(rsi - 50) * 2)));
    }

    const normalizedScore = observations ? score / observations : 0;
    return availableFactor({
      context,
      factor: 'TECHNICAL',
      availability: values.length >= 50 ? 'AVAILABLE' : 'PARTIAL',
      score: normalizedScore,
      evidence: items,
      warnings: values.length < 50
        ? [{ code: 'LIMITED_TECHNICAL_HISTORY', severity: 'INFO', factor: 'TECHNICAL', detailKey: 'intelligence_warning_limited_history' }]
        : [],
    });
  },
};

const momentumFactor: IntelligenceFactorModule = {
  key: 'MOMENTUM',
  analyze(context) {
    const values = closes(context);
    if (values.length < 6) return unavailable(context, 'MOMENTUM', 'INSUFFICIENT_MOMENTUM_HISTORY');
    const current = values.at(-1)!;
    const change5 = percentChange(current, values.at(-6) ?? null);
    const change20 = values.length >= 21 ? percentChange(current, values.at(-21) ?? null) : null;
    const inputs = [change5, change20].filter((value): value is number => value !== null);
    const score = average(inputs.map(value => clamp(value * 5, -100, 100))) ?? 0;
    const items = inputs.map((value, index) => evidence(
      context,
      'MOMENTUM',
      index === 0 ? 'change_5_period' : 'change_20_period',
      rounded(value),
      '%',
      scoreBias(value),
      Math.min(100, Math.abs(value) * 8),
    ));
    return availableFactor({
      context,
      factor: 'MOMENTUM',
      availability: change20 === null ? 'PARTIAL' : 'AVAILABLE',
      score,
      evidence: items,
    });
  },
};

function volatilityPercent(context: FactorContext) {
  const values = closes(context);
  if (values.length < 20) return null;
  const recentValues = values.slice(-61);
  const returns = recentValues.slice(1).map((value, index) => {
    const previous = recentValues[index];
    return previous > 0 ? (value - previous) / previous : 0;
  });
  const deviation = standardDeviation(returns);
  return deviation === null ? null : deviation * Math.sqrt(252) * 100;
}

const volatilityFactor: IntelligenceFactorModule = {
  key: 'VOLATILITY',
  analyze(context) {
    const volatility = volatilityPercent(context);
    if (volatility === null) return unavailable(context, 'VOLATILITY', 'INSUFFICIENT_VOLATILITY_HISTORY');
    const score = volatility >= 80 ? -90 : volatility >= 55 ? -65 : volatility >= 35 ? -38 : volatility <= 18 ? 20 : 0;
    return availableFactor({
      context,
      factor: 'VOLATILITY',
      score,
      strength: Math.min(100, Math.abs(score)),
      evidence: [evidence(context, 'VOLATILITY', 'annualized_volatility', rounded(volatility), '%', scoreBias(score), Math.min(100, volatility))],
      warnings: volatility >= 55
        ? [{ code: 'EXCESSIVE_VOLATILITY', severity: 'WARNING', factor: 'VOLATILITY', detailKey: 'intelligence_warning_excessive_volatility' }]
        : [],
    });
  },
};

const liquidityFactor: IntelligenceFactorModule = {
  key: 'LIQUIDITY',
  analyze(context) {
    const volumes = context.snapshot.candles
      .map(item => finite(item.volume))
      .filter((value): value is number => value !== null && value > 0);
    if (volumes.length < 10) return unavailable(context, 'LIQUIDITY', 'LIQUIDITY_DATA_UNAVAILABLE');
    const recent = average(volumes.slice(-5));
    const baseline = average(volumes.slice(-20));
    if (recent === null || baseline === null || baseline <= 0) return unavailable(context, 'LIQUIDITY', 'LIQUIDITY_DATA_UNAVAILABLE');
    const ratio = recent / baseline;
    const score = clamp((ratio - 1) * 70, -70, 60);
    return availableFactor({
      context,
      factor: 'LIQUIDITY',
      availability: volumes.length >= 20 ? 'AVAILABLE' : 'PARTIAL',
      score,
      evidence: [evidence(context, 'LIQUIDITY', 'recent_volume_ratio', rounded(ratio), 'x', scoreBias(score), Math.min(100, Math.abs(ratio - 1) * 100))],
      warnings: ratio < 0.55
        ? [{ code: 'WEAK_LIQUIDITY', severity: 'WARNING', factor: 'LIQUIDITY', detailKey: 'intelligence_warning_weak_liquidity' }]
        : [],
    });
  },
};

function fundamentalMetric(fundamentals: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = finite(fundamentals[key]);
    if (value !== null) return value;
  }
  return null;
}

const fundamentalFactor: IntelligenceFactorModule = {
  key: 'FUNDAMENTAL',
  analyze(context) {
    const values = context.snapshot.fundamentals;
    if (!values || Object.keys(values).length === 0) return unavailable(context, 'FUNDAMENTAL', 'FUNDAMENTAL_DATA_UNAVAILABLE');

    const pe = fundamentalMetric(values, ['peRatio', 'trailingPE', 'forwardPE', 'pe']);
    const eps = fundamentalMetric(values, ['eps', 'trailingEps', 'epsTrailingTwelveMonths']);
    const revenueGrowth = fundamentalMetric(values, ['revenueGrowth', 'revenue_growth']);
    const earningsGrowth = fundamentalMetric(values, ['earningsGrowth', 'earnings_growth']);
    const debtToEquity = fundamentalMetric(values, ['debtToEquity', 'debt_to_equity']);
    const items: IntelligenceEvidence[] = [];
    const contributions: number[] = [];

    if (eps !== null) {
      const score = eps > 0 ? 22 : eps < 0 ? -32 : 0;
      contributions.push(score);
      items.push(evidence(context, 'FUNDAMENTAL', 'earnings_per_share', rounded(eps), null, scoreBias(score), 65));
    }
    if (revenueGrowth !== null) {
      const score = clamp(revenueGrowth * (Math.abs(revenueGrowth) <= 2 ? 100 : 1) * 2, -45, 45);
      contributions.push(score);
      items.push(evidence(context, 'FUNDAMENTAL', 'revenue_growth', rounded(revenueGrowth), null, scoreBias(score), Math.min(90, Math.abs(score))));
    }
    if (earningsGrowth !== null) {
      const score = clamp(earningsGrowth * (Math.abs(earningsGrowth) <= 2 ? 100 : 1) * 2, -55, 55);
      contributions.push(score);
      items.push(evidence(context, 'FUNDAMENTAL', 'earnings_growth', rounded(earningsGrowth), null, scoreBias(score), Math.min(90, Math.abs(score))));
    }
    if (debtToEquity !== null) {
      const score = debtToEquity > 200 ? -35 : debtToEquity < 80 ? 12 : 0;
      contributions.push(score);
      items.push(evidence(context, 'FUNDAMENTAL', 'debt_to_equity', rounded(debtToEquity), '%', scoreBias(score), Math.min(80, Math.abs(score) * 2)));
    }
    if (pe !== null && pe > 0) {
      const score = pe > 60 ? -18 : pe <= 35 ? 8 : 0;
      contributions.push(score);
      items.push(evidence(context, 'FUNDAMENTAL', 'price_earnings_ratio', rounded(pe), 'x', scoreBias(score), Math.min(60, Math.abs(score) * 2)));
    }

    if (contributions.length === 0) return unavailable(context, 'FUNDAMENTAL', 'FUNDAMENTAL_FIELDS_UNSUPPORTED');
    return availableFactor({
      context,
      factor: 'FUNDAMENTAL',
      availability: contributions.length >= 2 ? 'AVAILABLE' : 'PARTIAL',
      score: average(contributions) ?? 0,
      evidence: items,
      source: context.snapshot.fundamentalsSource,
    });
  },
};

const sentimentFactor: IntelligenceFactorModule = {
  key: 'SENTIMENT',
  analyze(context) {
    const sentiment = contextEvidence(context)?.sentiment;
    if (!sentiment) return contextualUnavailable(context, 'SENTIMENT', 'SENTIMENT_PROVIDER_NOT_AVAILABLE');
    const score = clamp((sentiment.positivePercent - sentiment.negativePercent) * 1.2, -100, 100);
    const freshness = contextualFreshness(context, 'SENTIMENT', sentiment.observedAt);
    const source = sentiment.provider;
    const items = [
      evidence(context, 'SENTIMENT', 'positive_sentiment_percent', rounded(sentiment.positivePercent), '%', 'BULLISH', Math.min(100, sentiment.positivePercent), sentiment.observedAt, { source }),
      evidence(context, 'SENTIMENT', 'negative_sentiment_percent', rounded(sentiment.negativePercent), '%', 'BEARISH', Math.min(100, sentiment.negativePercent), sentiment.observedAt, { source }),
      evidence(context, 'SENTIMENT', 'sentiment_sample_size', sentiment.sampleSize, null, scoreBias(score), Math.min(100, sentiment.sampleSize * 8), sentiment.observedAt, { source }),
    ];
    return availableFactor({
      context,
      factor: 'SENTIMENT',
      availability: sentiment.sampleSize >= 5 ? 'AVAILABLE' : 'PARTIAL',
      score,
      evidence: items,
      source,
      provider: source,
      freshness,
      warnings: sentiment.sampleSize < 5
        ? [{ code: 'LIMITED_SENTIMENT_SAMPLE', severity: 'INFO', factor: 'SENTIMENT', detailKey: 'intelligence_warning_limited_sentiment_sample' }]
        : [],
    });
  },
};

const POSITIVE_NEWS_PHRASES = [
  'beats estimates', 'beat estimates', 'raises guidance', 'raised guidance', 'record profit',
  'profit rises', 'earnings rise', 'revenue rises', 'upgrade', 'wins contract', 'contract award',
  'dividend increase', 'dividend raised', 'buyback', 'approval', 'strong growth', 'profit growth',
];
const NEGATIVE_NEWS_PHRASES = [
  'misses estimates', 'missed estimates', 'cuts guidance', 'cut guidance', 'profit falls', 'loss widens',
  'downgrade', 'lawsuit', 'investigation', 'probe', 'fine', 'default', 'bankruptcy', 'dividend cut',
  'profit warning', 'fraud', 'restructuring charge',
];

function headlineDirection(article: ContextNewsArticle) {
  if (article.sentiment === 'positive') return 35;
  if (article.sentiment === 'negative') return -35;
  if (article.sentiment === 'neutral') return 0;
  const text = article.headline.toLowerCase();
  const positive = POSITIVE_NEWS_PHRASES.filter(phrase => text.includes(phrase)).length;
  const negative = NEGATIVE_NEWS_PHRASES.filter(phrase => text.includes(phrase)).length;
  if (positive === negative) return 0;
  return positive > negative ? Math.min(45, 20 + positive * 8) : Math.max(-45, -20 - negative * 8);
}

const newsFactor: IntelligenceFactorModule = {
  key: 'NEWS',
  analyze(context) {
    const news = contextEvidence(context)?.news;
    if (!news || news.articles.length === 0) {
      return contextualUnavailable(context, 'NEWS', news?.failureCode ?? 'NEWS_NO_RELEVANT_RESULTS', {
        source: news?.provider,
        observedAt: news?.observedAt,
        stale: news?.stale,
      });
    }
    const scored = news.articles.map(article => ({ article, score: headlineDirection(article) }));
    const directional = scored.filter(item => item.score !== 0);
    const score = directional.length ? average(directional.map(item => item.score)) ?? 0 : 0;
    const positive = scored.filter(item => item.score > 0).length;
    const negative = scored.filter(item => item.score < 0).length;
    const source = news.provider ?? 'market-news';
    const freshness = contextualFreshness(context, 'NEWS', news.observedAt, news.stale);
    const latest = news.articles[0];
    const items = [
      evidence(context, 'NEWS', 'news_article_count', news.articles.length, null, scoreBias(score), Math.min(100, news.articles.length * 10), news.observedAt, { source }),
      evidence(context, 'NEWS', 'positive_news_count', positive, null, 'BULLISH', Math.min(100, positive * 20), news.observedAt, { source }),
      evidence(context, 'NEWS', 'negative_news_count', negative, null, 'BEARISH', Math.min(100, negative * 20), news.observedAt, { source }),
      evidence(context, 'NEWS', 'latest_news_headline', latest.headline.slice(0, 240), null, scoreBias(headlineDirection(latest)), 55, latest.publishedAt, { source: latest.source, provider: source }),
    ];
    return availableFactor({
      context,
      factor: 'NEWS',
      availability: directional.length > 0 ? 'AVAILABLE' : 'PARTIAL',
      score,
      evidence: items,
      source,
      provider: source,
      freshness,
      warnings: directional.length === 0
        ? [{ code: 'NEWS_DIRECTION_UNCLEAR', severity: 'INFO', factor: 'NEWS', detailKey: 'intelligence_warning_news_direction_unclear' }]
        : [],
    });
  },
};

function macroImpactWeight(impact: 'high' | 'medium' | 'low' | 'unknown') {
  if (impact === 'high') return 1;
  if (impact === 'medium') return 0.65;
  if (impact === 'low') return 0.35;
  return 0.4;
}

function macroSurpriseScore(context: FactorContext, title: string, actual: number, forecast: number) {
  if (actual === forecast) return 0;
  const lowerTitle = title.toLowerCase();
  const actualHigher = actual > forecast;
  if (/unemployment|jobless claims|unemployment claims/.test(lowerTitle)) return actualHigher ? -30 : 30;
  if (/gdp|gross domestic product|retail sales|payroll|employment|industrial production|pmi|purchasing managers|consumer confidence|business confidence/.test(lowerTitle)) {
    return actualHigher ? 25 : -25;
  }
  const rateSensitiveAsset = ['STOCK', 'CRYPTO', 'INDEX', 'FUND'].includes(context.request.asset.assetType);
  if (rateSensitiveAsset && /cpi|inflation|pce|ppi|consumer price|producer price/.test(lowerTitle)) return actualHigher ? -20 : 20;
  if (rateSensitiveAsset && /interest rate|rate decision|policy rate|fed funds/.test(lowerTitle)) return actualHigher ? -25 : 25;
  return null;
}

const macroFactor: IntelligenceFactorModule = {
  key: 'MACRO',
  analyze(context) {
    const macro = contextEvidence(context)?.macro;
    if (!macro || macro.events.length === 0) {
      return contextualUnavailable(context, 'MACRO', macro?.failureCode ?? 'MACRO_NO_RELEVANT_EVENTS', {
        source: macro?.provider,
        observedAt: macro?.observedAt,
        stale: macro?.stale,
      });
    }
    const now = context.now;
    const contributions: number[] = [];
    let completedSurprises = 0;
    let highImpact = 0;
    let nextEvent: ContextEvidence['macro']['events'][number] | null = null;
    for (const event of macro.events) {
      if (event.impact === 'high') highImpact += 1;
      const eventAt = Date.parse(event.dateTimeUtc);
      if (Number.isFinite(eventAt) && eventAt > now && (!nextEvent || eventAt < Date.parse(nextEvent.dateTimeUtc))) nextEvent = event;
      if (!Number.isFinite(eventAt) || eventAt > now) continue;
      const actual = numericObservation(event.actual);
      const forecast = numericObservation(event.forecast);
      if (actual === null || forecast === null) continue;
      const rawScore = macroSurpriseScore(context, event.title, actual, forecast);
      if (rawScore === null) continue;
      contributions.push(rawScore * macroImpactWeight(event.impact));
      completedSurprises += 1;
    }
    const score = average(contributions) ?? 0;
    const source = macro.provider ?? macro.events[0]?.provider ?? 'economic-calendar';
    const freshness = contextualFreshness(context, 'MACRO', macro.observedAt, macro.stale);
    const items: IntelligenceEvidence[] = [
      evidence(context, 'MACRO', 'macro_event_count', macro.events.length, null, scoreBias(score), Math.min(100, macro.events.length * 6), macro.observedAt, { source }),
      evidence(context, 'MACRO', 'macro_high_impact_count', highImpact, null, 'NEUTRAL', Math.min(100, highImpact * 20), macro.observedAt, { source }),
      evidence(context, 'MACRO', 'macro_surprise_count', completedSurprises, null, scoreBias(score), Math.min(100, completedSurprises * 25), macro.observedAt, { source }),
    ];
    if (nextEvent) {
      items.push(evidence(context, 'MACRO', 'next_macro_event', nextEvent.title.slice(0, 200), null, 'NEUTRAL', nextEvent.impact === 'high' ? 85 : 50, nextEvent.dateTimeUtc, { source: nextEvent.provider, provider: source }));
    }
    return availableFactor({
      context,
      factor: 'MACRO',
      availability: completedSurprises > 0 ? 'AVAILABLE' : 'PARTIAL',
      score,
      evidence: items,
      source,
      provider: source,
      freshness,
      warnings: completedSurprises === 0
        ? [{ code: 'MACRO_DIRECTION_UNCLEAR', severity: 'INFO', factor: 'MACRO', detailKey: 'intelligence_warning_macro_direction_unclear' }]
        : [],
    });
  },
};

const riskFactor: IntelligenceFactorModule = {
  key: 'RISK',
  analyze(context) {
    const volatility = volatilityPercent(context);
    const reported = context.snapshot.reportedRiskLevel;
    if (volatility === null && reported === null) return unavailable(context, 'RISK', 'RISK_DATA_UNAVAILABLE');
    const contributions: number[] = [];
    const items: IntelligenceEvidence[] = [];
    if (reported) {
      const score = reported === 'HIGH' ? -65 : reported === 'MEDIUM' ? -25 : 18;
      contributions.push(score);
      items.push(evidence(context, 'RISK', 'reported_risk_level', reported, null, scoreBias(score), 75));
    }
    if (volatility !== null) {
      const score = volatility >= 80 ? -90 : volatility >= 55 ? -70 : volatility >= 35 ? -40 : volatility <= 18 ? 18 : -10;
      contributions.push(score);
      items.push(evidence(context, 'RISK', 'volatility_risk', rounded(volatility), '%', scoreBias(score), Math.min(100, volatility)));
    }
    if (context.snapshot.dataStatus === 'CACHED') contributions.push(-20);
    if (context.snapshot.operationalReliability < 0.7) contributions.push(-25);
    const score = average(contributions) ?? -20;
    return availableFactor({ context, factor: 'RISK', score, evidence: items });
  },
};

const shariaFactor: IntelligenceFactorModule = {
  key: 'SHARIA',
  analyze(context) {
    const sharia = context.snapshot.sharia;
    if (!sharia.status || sharia.status === 'unclassified' || !sharia.source || !sharia.reviewedAt) {
      return unavailable(context, 'SHARIA', 'VERIFIED_SHARIA_STATUS_UNAVAILABLE', sharia.reviewedAt);
    }
    const freshness = calculateFreshness({
      observedAt: sharia.reviewedAt,
      thresholdSeconds: 180 * 24 * 60 * 60,
      now: context.now,
    });
    return {
      factor: 'SHARIA',
      availability: 'AVAILABLE',
      normalizedScore: 0,
      directionalBias: 'NEUTRAL',
      strength: 0,
      required: context.config.requiredFactors.includes('SHARIA'),
      freshness,
      evidence: [evidence(context, 'SHARIA', 'verified_sharia_status', sharia.status, null, 'NEUTRAL', 100, sharia.reviewedAt, { source: sharia.source })],
      source: sharia.source,
      provider: sharia.source,
      operationalReliability: context.snapshot.operationalReliability,
      warnings: freshnessWarnings('SHARIA', freshness.state),
      failureReason: null,
    };
  },
};

export const DEFAULT_INTELLIGENCE_FACTOR_MODULES: IntelligenceFactorModule[] = [
  technicalFactor,
  fundamentalFactor,
  sentimentFactor,
  newsFactor,
  macroFactor,
  momentumFactor,
  liquidityFactor,
  volatilityFactor,
  riskFactor,
  shariaFactor,
];

export function runIntelligenceFactors(
  context: FactorContext,
  modules: IntelligenceFactorKey[],
  availableModules: IntelligenceFactorModule[] = DEFAULT_INTELLIGENCE_FACTOR_MODULES,
) {
  const byKey = new Map(availableModules.map(module => [module.key, module]));
  return modules.map(key => byKey.get(key)?.analyze(context) ?? unavailable(context, key, 'FACTOR_MODULE_NOT_REGISTERED'));
}

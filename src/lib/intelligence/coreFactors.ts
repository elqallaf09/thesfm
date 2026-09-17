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
): IntelligenceEvidence {
  return {
    id: `${factor.toLowerCase()}:${key}`,
    factor,
    kind: 'OBSERVATION',
    labelKey: `intelligence_evidence_${key}`,
    value,
    unit,
    observedAt,
    source: context.snapshot.provider,
    provider: context.snapshot.provider,
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
}) {
  const freshness = factorFreshness(input.context, input.observedAt ?? input.context.snapshot.dataAsOf);
  const score = clamp(Math.round(input.score), -100, 100);
  return {
    factor: input.factor,
    availability: input.availability ?? 'AVAILABLE',
    normalizedScore: score,
    directionalBias: scoreBias(score),
    strength: clamp(Math.round(input.strength ?? Math.abs(score)), 0, 100),
    required: input.context.config.requiredFactors.includes(input.factor),
    freshness,
    evidence: input.evidence,
    source: input.source ?? input.context.snapshot.provider,
    provider: input.context.snapshot.provider,
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
  const returns = values.slice(-61).slice(1).map((value, index) => {
    const previous = values.slice(-61)[index];
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
      evidence: [evidence(context, 'SHARIA', 'verified_sharia_status', sharia.status, null, 'NEUTRAL', 100, sharia.reviewedAt)],
      source: sharia.source,
      provider: context.snapshot.provider,
      operationalReliability: context.snapshot.operationalReliability,
      warnings: freshnessWarnings('SHARIA', freshness.state),
      failureReason: null,
    };
  },
};

function unavailableModule(key: IntelligenceFactorKey, reason: string): IntelligenceFactorModule {
  return { key, analyze: context => unavailable(context, key, reason) };
}

export const DEFAULT_INTELLIGENCE_FACTOR_MODULES: IntelligenceFactorModule[] = [
  technicalFactor,
  fundamentalFactor,
  unavailableModule('SENTIMENT', 'SENTIMENT_PROVIDER_NOT_AVAILABLE'),
  unavailableModule('NEWS', 'NEWS_FACTOR_NOT_CONNECTED'),
  unavailableModule('MACRO', 'MACRO_FACTOR_NOT_CONNECTED'),
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

import type { AnalysisRequest, IntelligenceFactorKey, VerifiedIntelligenceSnapshot } from '@/domain/intelligence/contracts';
import { getIntelligenceMethodologyConfig } from '@/lib/intelligence/config';
import { runIntelligenceFactors } from '@/lib/intelligence/factors';
import type { VerifiedChatMarketSnapshot } from '@/lib/ai-analyst/marketChat';

export const CHAT_GROUNDING_MODULES = [
  'TECHNICAL', 'MOMENTUM', 'LIQUIDITY', 'VOLATILITY', 'RISK', 'SHARIA',
] as const satisfies readonly IntelligenceFactorKey[];

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number | null, digits = 4) {
  return value === null ? null : Number(value.toFixed(digits));
}

function latestCandleVolume(snapshot: VerifiedIntelligenceSnapshot) {
  for (let index = snapshot.candles.length - 1; index >= 0; index -= 1) {
    const candle = snapshot.candles[index]!;
    const value = finite(candle.volume);
    if (value !== null && value > 0) return { value, at: candle.at };
  }
  return null;
}

function recentRange(snapshot: VerifiedIntelligenceSnapshot) {
  const sample = snapshot.candles.slice(-40);
  if (sample.length < 20) return null;
  const lows = sample
    .map(candle => finite(candle.low) ?? finite(candle.close))
    .filter((value): value is number => value !== null && value > 0);
  const highs = sample
    .map(candle => finite(candle.high) ?? finite(candle.close))
    .filter((value): value is number => value !== null && value > 0);
  if (!lows.length || !highs.length) return null;
  const support = Math.min(...lows);
  const resistance = Math.max(...highs);
  if (!Number.isFinite(support) || !Number.isFinite(resistance) || support <= 0 || resistance < support) return null;
  return { support, resistance, at: sample.at(-1)?.at ?? snapshot.dataAsOf };
}

function metric(values: Record<string, unknown> | null, keys: string[]) {
  if (!values) return null;
  for (const key of keys) {
    const value = finite(values[key]);
    if (value !== null) return value;
  }
  return null;
}

function selectedFundamentals(snapshot: VerifiedIntelligenceSnapshot) {
  const values = snapshot.fundamentals;
  const picked = {
    peRatio: metric(values, ['peRatio', 'trailingPE', 'forwardPE', 'pe']),
    eps: metric(values, ['eps', 'trailingEps', 'epsTrailingTwelveMonths']),
    revenueGrowth: metric(values, ['revenueGrowth', 'revenue_growth']),
    earningsGrowth: metric(values, ['earningsGrowth', 'earnings_growth']),
    debtToEquity: metric(values, ['debtToEquity', 'debt_to_equity']),
  };
  const available = Object.fromEntries(Object.entries(picked).filter(([, value]) => value !== null)) as Record<string, number>;
  return Object.keys(available).length ? available : null;
}

function evidenceNumber(
  factors: ReturnType<typeof runIntelligenceFactors>,
  factor: IntelligenceFactorKey,
  label: string,
) {
  const result = factors.find(item => item.factor === factor);
  const item = result?.evidence.find(entry => entry.labelKey === `intelligence_evidence_${label}`);
  return rounded(finite(item?.value));
}

function derivedRisk(volatility: number | null) {
  if (volatility === null) return null;
  if (volatility >= 80) return 'VERY_HIGH' as const;
  if (volatility >= 55) return 'HIGH' as const;
  if (volatility > 18) return 'MEDIUM' as const;
  return 'LOW' as const;
}

export function buildVerifiedChatMarketSnapshot(
  snapshot: VerifiedIntelligenceSnapshot,
  request: AnalysisRequest,
  now = Date.now(),
): VerifiedChatMarketSnapshot {
  const config = getIntelligenceMethodologyConfig(snapshot.asset.assetType, request.horizon);
  const modules = [...CHAT_GROUNDING_MODULES];
  const factors = runIntelligenceFactors({ request, snapshot, config, now }, modules);

  const quoteVolume = finite(snapshot.quote.volume);
  const candleVolume = quoteVolume === null ? latestCandleVolume(snapshot) : null;
  const volume = quoteVolume ?? candleVolume?.value ?? null;
  const volumeBasis = quoteVolume !== null ? 'QUOTE' as const : candleVolume ? 'LATEST_CANDLE' as const : null;
  const volumeAsOf = quoteVolume !== null ? snapshot.dataAsOf : candleVolume?.at ?? null;

  const providerSupport = finite(snapshot.levels.support);
  const providerResistance = finite(snapshot.levels.resistance);
  const derivedRange = providerSupport === null || providerResistance === null ? recentRange(snapshot) : null;
  const support = providerSupport ?? derivedRange?.support ?? null;
  const resistance = providerResistance ?? derivedRange?.resistance ?? null;
  const levelsMethod = providerSupport !== null && providerResistance !== null
    ? 'PROVIDER' as const
    : derivedRange ? 'RECENT_40_CANDLE_RANGE' as const : null;
  const levelsAsOf = levelsMethod === 'PROVIDER' ? snapshot.dataAsOf : derivedRange?.at ?? null;

  const annualizedVolatilityPercent = evidenceNumber(factors, 'VOLATILITY', 'annualized_volatility');
  const riskLevel = snapshot.reportedRiskLevel ?? derivedRisk(annualizedVolatilityPercent);
  const riskMethod = snapshot.reportedRiskLevel
    ? 'PROVIDER' as const
    : riskLevel ? 'ANNUALIZED_VOLATILITY' as const : null;

  return {
    provider: snapshot.provider,
    dataAsOf: snapshot.dataAsOf,
    dataStatus: snapshot.dataStatus,
    fallbackUsed: snapshot.fallbackUsed,
    price: snapshot.quote.price,
    change: finite(snapshot.quote.change),
    changePercent: finite(snapshot.quote.changePercent),
    currency: snapshot.asset.quoteCurrency,
    volume,
    volumeBasis,
    volumeAsOf,
    support: rounded(support),
    resistance: rounded(resistance),
    levelsMethod,
    levelsAsOf,
    reportedRiskLevel: snapshot.reportedRiskLevel,
    riskLevel,
    riskMethod,
    annualizedVolatilityPercent,
    rsi14: evidenceNumber(factors, 'TECHNICAL', 'rsi14'),
    priceVsSma20Percent: evidenceNumber(factors, 'TECHNICAL', 'price_vs_sma20'),
    sma20VsSma50Percent: evidenceNumber(factors, 'TECHNICAL', 'sma20_vs_sma50'),
    recentVolumeRatio: evidenceNumber(factors, 'LIQUIDITY', 'recent_volume_ratio'),
    fundamentals: selectedFundamentals(snapshot),
    fundamentalsSource: snapshot.fundamentalsSource,
    shariaStatus: snapshot.sharia.status,
    shariaReason: snapshot.sharia.reason,
    shariaSource: snapshot.sharia.source,
    shariaReviewedAt: snapshot.sharia.reviewedAt,
  };
}

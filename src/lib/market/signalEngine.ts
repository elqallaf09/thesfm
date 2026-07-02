import type { MarketAnalysis, MarketAssetType, MarketHistoryPoint, MarketRiskLevel } from '@/lib/market/marketService';
import {
  AGENT_PRECISION_MIN_SAMPLES,
  AGENT_PRECISION_MIN_WINRATE,
  AGENT_SL_ATR_MULTIPLE,
  AGENT_TP1_ATR_MULTIPLE,
  backtestAgentFirstTouch,
  type MarketAgentBacktest,
  type MarketAgentPrecisionMode,
} from '@/lib/market/marketAgent';

export type MarketSignalAction =
  | 'buy'
  | 'cautious_buy'
  | 'watch'
  | 'sell_or_avoid'
  | 'insufficient_data'
  | 'sell'
  | 'wait';
export type MarketSignalActionLabelAr = 'شراء' | 'شراء بحذر' | 'مراقبة' | 'تجنب / بيع' | 'بيانات غير كافية' | 'انتظار';
export type MarketSignalActionLabelEn = 'Buy' | 'Cautious Buy' | 'Watch' | 'Avoid / Sell' | 'Insufficient data' | 'Wait';
export type MarketSignalRiskLevel = 'low' | 'medium' | 'high';
export type MarketSignalDataQuality = 'live' | 'delayed' | 'partial' | 'unavailable';
export type MarketSignalProvider = 'Yahoo Finance' | 'FMP' | 'Finnhub' | 'Trading Economics' | 'THE SFM' | string;

export const MARKET_SIGNAL_DISCLAIMER_AR =
  'هذه إشارات تحليلية تعليمية مبنية على البيانات المتاحة، ولا تُعد نصيحة مالية أو توصية ملزمة بالشراء أو البيع. القرار النهائي مسؤولية المستخدم.';
export const MARKET_SIGNAL_DISCLAIMER_EN =
  'These are educational analytical signals based on available data and are not financial advice.';

export type MarketSignalInputPoint = {
  date?: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
};

export type MarketSignalFundamentals = {
  valuation?: 'cheap' | 'fair' | 'expensive' | 'unknown';
  peRatio?: number | null;
  eps?: number | null;
  revenue?: number | null;
  dividend?: number | null;
  earningsTrend?: 'positive' | 'flat' | 'negative' | 'unknown';
  sector?: string | null;
  riskLevel?: MarketSignalRiskLevel | 'unknown' | null;
};

export type MarketSignalNewsSentiment = {
  sentiment?: 'positive' | 'neutral' | 'negative' | 'unknown';
  positiveCount?: number | null;
  negativeCount?: number | null;
  highImpact?: boolean | null;
  providerStatus?: 'available' | 'partial' | 'unavailable' | string | null;
};

export type MarketSignalInput = {
  symbol: string;
  assetName?: string | null;
  assetType: MarketAssetType | string;
  market?: string | null;
  currency?: string | null;
  currentPrice?: number | null;
  dailyChangePercent?: number | null;
  sevenDayChangePercent?: number | null;
  thirtyDayChangePercent?: number | null;
  history?: MarketSignalInputPoint[];
  fundamentals?: MarketSignalFundamentals | Record<string, unknown> | null;
  newsSentiment?: MarketSignalNewsSentiment | null;
  provider?: MarketSignalProvider | null;
  dataQuality?: MarketSignalDataQuality | null;
  delayed?: boolean | null;
  lastUpdated?: string | null;
};

export type MarketSignalScoreBreakdown = {
  technicalScore: number;
  momentumScore: number;
  newsScore: number;
  fundamentalsScore: number;
  riskAdjustment: number;
  dataQualityPenalty: number;
  totalScore: number;
};

export type MarketSignalTechnicalSummary = {
  trendDirection: 'bullish' | 'bearish' | 'mixed' | 'unknown';
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  support: number | null;
  resistance: number | null;
  volatility: number | null;
  volumeTrend: 'rising' | 'falling' | 'flat' | 'unknown';
};

export type MarketSignal = {
  symbol: string;
  assetName: string;
  assetType: string;
  market: string;
  currency: string;
  action: MarketSignalAction;
  actionLabelAr: MarketSignalActionLabelAr;
  actionLabelEn: MarketSignalActionLabelEn;
  confidence: number;
  riskLevel: MarketSignalRiskLevel;
  currentPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  upsidePercent: number | null;
  downsidePercent: number | null;
  riskRewardRatio: number | null;
  signalExplanationAr: string;
  signalExplanationEn: string;
  timeframe: string;
  reasons: string[];
  warnings: string[];
  provider: MarketSignalProvider;
  dataQuality: MarketSignalDataQuality;
  lastUpdated: string;
  scoreBreakdown: MarketSignalScoreBreakdown;
  technicalSummary: MarketSignalTechnicalSummary;
  backtest?: MarketAgentBacktest;
  precisionMode?: MarketAgentPrecisionMode;
  disclaimerAr: typeof MARKET_SIGNAL_DISCLAIMER_AR;
  disclaimerEn: typeof MARKET_SIGNAL_DISCLAIMER_EN;
};

type NumericSummary = {
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
};

const EXTREME_RISK_WARNINGS = [
  'مخاطر مرتفعة جداً',
  'خبر عالي التأثير',
  'كسر مستوى وقف الخسارة',
];

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(Number(value))) return null;
  const parsed = Number(value);
  return Number(parsed.toFixed(digits));
}

function roundPrice(value: number | null | undefined, reference?: number | null) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(Number(value))) return null;
  const price = Number(value);
  const absReference = Math.abs(Number(reference ?? price));
  const digits = absReference >= 100 ? 2 : absReference >= 10 ? 3 : absReference >= 1 ? 4 : 6;
  return round(price, digits);
}

export function calculateSignalRiskMetrics(input: {
  currentPrice?: number | null;
  targetPrice?: number | null;
  stopLoss?: number | null;
}) {
  const currentPrice = finiteNumber(input.currentPrice);
  const targetPrice = finiteNumber(input.targetPrice);
  const stopLoss = finiteNumber(input.stopLoss);
  const upsidePercent = currentPrice !== null && currentPrice > 0 && targetPrice !== null
    ? ((targetPrice - currentPrice) / currentPrice) * 100
    : null;
  const downsidePercent = currentPrice !== null && currentPrice > 0 && stopLoss !== null
    ? ((currentPrice - stopLoss) / currentPrice) * 100
    : null;
  const riskRewardRatio = upsidePercent !== null && downsidePercent !== null && downsidePercent !== 0
    ? upsidePercent / downsidePercent
    : null;

  return {
    upsidePercent: round(upsidePercent, 2),
    downsidePercent: round(downsidePercent, 2),
    riskRewardRatio: round(riskRewardRatio, 2),
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return null;
  const mean = average(values);
  if (mean === null) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  return average(values.slice(-period));
}

function emaSeries(values: number[], period: number) {
  const output: number[] = [];
  if (values.length < period) return output;
  const seed = average(values.slice(0, period));
  if (seed === null) return output;
  const multiplier = 2 / (period + 1);
  let current = seed;
  output.push(current);
  for (let index = period; index < values.length; index += 1) {
    current = (values[index] - current) * multiplier + current;
    output.push(current);
  }
  return output;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  let averageGain = 0;
  let averageLoss = 0;
  for (const change of changes.slice(0, period)) {
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }
  averageGain /= period;
  averageLoss /= period;
  for (const change of changes.slice(period)) {
    averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
  }
  if (averageLoss === 0) return averageGain > 0 ? 100 : 50;
  const relativeStrength = averageGain / averageLoss;
  return 100 - (100 / (1 + relativeStrength));
}

function macd(values: number[]) {
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  if (!fast.length || !slow.length) return { macd: null, signal: null, histogram: null };
  const offset = fast.length - slow.length;
  const line = slow.map((slowValue, index) => fast[index + offset] - slowValue);
  const signalSeries = emaSeries(line, 9);
  const macdValue = line.at(-1) ?? null;
  const signalValue = signalSeries.at(-1) ?? null;
  return {
    macd: macdValue,
    signal: signalValue,
    histogram: macdValue !== null && signalValue !== null ? macdValue - signalValue : null,
  };
}

function atr(points: MarketSignalInputPoint[], period = 14) {
  const ranges: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[index - 1];
    const high = finiteNumber(point.high) ?? point.close;
    const low = finiteNumber(point.low) ?? point.close;
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(previous.close)) continue;
    ranges.push(Math.max(high - low, Math.abs(high - previous.close), Math.abs(low - previous.close)));
  }
  if (ranges.length < period) return null;
  return average(ranges.slice(-period));
}

function percentChange(current: number | null, previous: number | null | undefined) {
  if (current === null || !Number.isFinite(current) || !previous || !Number.isFinite(previous)) return null;
  return ((current - previous) / previous) * 100;
}

function normalizeHistory(history: MarketSignalInput['history']): NumericSummary {
  const points = Array.isArray(history) ? history : [];
  return {
    closes: points.map(point => finiteNumber(point.close)).filter((value): value is number => value !== null && value > 0),
    highs: points.map(point => finiteNumber(point.high) ?? finiteNumber(point.close)).filter((value): value is number => value !== null && value > 0),
    lows: points.map(point => finiteNumber(point.low) ?? finiteNumber(point.close)).filter((value): value is number => value !== null && value > 0),
    volumes: points.map(point => finiteNumber(point.volume)).filter((value): value is number => value !== null && value >= 0),
  };
}

function normalizeFundamentals(value: MarketSignalInput['fundamentals']): MarketSignalFundamentals {
  if (!value || typeof value !== 'object') return {};
  const raw = value as Record<string, unknown>;
  const peRatio = finiteNumber(raw.peRatio ?? raw.pe ?? raw.trailingPE);
  const dividend = finiteNumber(raw.dividend ?? raw.dividendYield);
  const eps = finiteNumber(raw.eps ?? raw.epsTTM);
  const revenue = finiteNumber(raw.revenue ?? raw.revenuePerShare);
  const valuation: MarketSignalFundamentals['valuation'] =
    raw.valuation === 'cheap' || raw.valuation === 'fair' || raw.valuation === 'expensive'
      ? raw.valuation
      : peRatio === null
        ? 'unknown'
        : peRatio > 0 && peRatio <= 22
          ? 'fair'
          : peRatio > 40
            ? 'expensive'
            : 'unknown';
  const earningsTrend: MarketSignalFundamentals['earningsTrend'] =
    raw.earningsTrend === 'positive' || raw.earningsTrend === 'flat' || raw.earningsTrend === 'negative'
      ? raw.earningsTrend
      : eps !== null && eps > 0
        ? 'positive'
        : eps !== null && eps < 0
          ? 'negative'
          : 'unknown';
  const riskLevel =
    raw.riskLevel === 'low' || raw.riskLevel === 'medium' || raw.riskLevel === 'high' ? raw.riskLevel : undefined;
  return {
    valuation,
    peRatio,
    dividend,
    eps,
    revenue,
    earningsTrend,
    sector: typeof raw.sector === 'string' ? raw.sector : null,
    riskLevel,
  };
}

function inferDataQuality(input: MarketSignalInput, pointCount: number): MarketSignalDataQuality {
  if (input.dataQuality) return input.dataQuality;
  if (!Number.isFinite(Number(input.currentPrice)) || Number(input.currentPrice) <= 0) return 'unavailable';
  if (pointCount < 20) return 'partial';
  if (pointCount < 50) return 'partial';
  return input.delayed ? 'delayed' : 'live';
}

function trendDirection(price: number | null, sma20: number | null, sma50: number | null, sma200: number | null) {
  if (price === null || sma20 === null || sma50 === null) return 'unknown' as const;
  if (price > sma20 && sma20 >= sma50 && (sma200 === null || sma50 >= sma200 * 0.98)) return 'bullish' as const;
  if (price < sma20 && sma20 <= sma50 && (sma200 === null || sma50 <= sma200 * 1.02)) return 'bearish' as const;
  return 'mixed' as const;
}

function volumeTrend(volumes: number[]) {
  if (volumes.length < 10) return 'unknown' as const;
  const recent = average(volumes.slice(-5));
  const prior = average(volumes.slice(-20, -5));
  if (recent === null || prior === null || prior === 0) return 'unknown' as const;
  const ratio = recent / prior;
  if (ratio >= 1.12) return 'rising' as const;
  if (ratio <= 0.88) return 'falling' as const;
  return 'flat' as const;
}

function buildTechnicalSummary(input: MarketSignalInput, price: number | null): MarketSignalTechnicalSummary {
  const numeric = normalizeHistory(input.history);
  const closes = numeric.closes;
  const volatilityBase = closes.length >= 20
    ? standardDeviation(closes.slice(-20).map((close, index, list) => index === 0 ? 0 : (close - list[index - 1]) / list[index - 1]).slice(1))
    : null;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const macdValues = macd(closes);
  const recentHighs = numeric.highs.slice(-30);
  const recentLows = numeric.lows.slice(-30);
  const support = recentLows.length ? Math.min(...recentLows) : null;
  const resistance = recentHighs.length ? Math.max(...recentHighs) : null;
  return {
    trendDirection: trendDirection(price, sma20, sma50, sma200),
    rsi: round(rsi(closes, 14), 1),
    macd: round(macdValues.macd, 5),
    macdSignal: round(macdValues.signal, 5),
    macdHistogram: round(macdValues.histogram, 5),
    sma20: roundPrice(sma20, price),
    sma50: roundPrice(sma50, price),
    sma200: roundPrice(sma200, price),
    support: roundPrice(support, price),
    resistance: roundPrice(resistance, price),
    volatility: volatilityBase === null ? null : round(volatilityBase * Math.sqrt(252) * 100, 2),
    volumeTrend: volumeTrend(numeric.volumes),
  };
}

function technicalScore(summary: MarketSignalTechnicalSummary, price: number | null) {
  let score = 20;
  if (price !== null && summary.sma20 !== null) score += price > summary.sma20 ? 5 : -5;
  if (summary.sma20 !== null && summary.sma50 !== null) score += summary.sma20 > summary.sma50 ? 6 : -6;
  if (summary.sma50 !== null && summary.sma200 !== null) score += summary.sma50 > summary.sma200 ? 5 : -5;
  if (summary.macdHistogram !== null) score += summary.macdHistogram > 0 ? 5 : -5;
  if (summary.rsi !== null) {
    if (summary.rsi >= 45 && summary.rsi <= 65) score += 4;
    else if (summary.rsi > 75) score -= 6;
    else if (summary.rsi < 30) score -= 4;
    else if (summary.rsi >= 65 && summary.rsi <= 75) score += 1;
    else score -= 1;
  }
  if (price !== null && summary.support !== null && summary.resistance !== null && summary.resistance > summary.support) {
    const position = (price - summary.support) / (summary.resistance - summary.support);
    if (position >= 0.35 && position <= 0.78) score += 3;
    if (position > 0.94) score -= 3;
    if (position < 0.08) score -= 2;
  }
  return clamp(Math.round(score), 0, 40);
}

function momentumScore(input: MarketSignalInput, price: number | null, history: NumericSummary) {
  const sevenDay = input.sevenDayChangePercent ?? percentChange(price, history.closes.at(-8));
  const thirtyDay = input.thirtyDayChangePercent ?? percentChange(price, history.closes.at(-31));
  let score = 10;
  const daily = finiteNumber(input.dailyChangePercent);
  if (daily !== null) score += clamp(daily * 1.2, -5, 5);
  if (sevenDay !== null) score += clamp(sevenDay * 0.45, -5, 5);
  if (thirtyDay !== null) score += clamp(thirtyDay * 0.2, -5, 5);
  return clamp(Math.round(score), 0, 20);
}

function newsScore(news: MarketSignalNewsSentiment | null | undefined) {
  if (!news || news.providerStatus === 'unavailable') return 7;
  let score = 7;
  if (news.sentiment === 'positive') score += 5;
  if (news.sentiment === 'negative') score -= 5;
  const positive = finiteNumber(news.positiveCount) ?? 0;
  const negative = finiteNumber(news.negativeCount) ?? 0;
  if (positive || negative) score += clamp((positive - negative) * 1.5, -4, 4);
  if (news.highImpact && news.sentiment === 'negative') score -= 4;
  if (news.highImpact && news.sentiment === 'positive') score += 2;
  return clamp(Math.round(score), 0, 15);
}

function fundamentalsScore(assetType: string, fundamentals: MarketSignalFundamentals) {
  if (assetType !== 'stock' && assetType !== 'etf') return 8;
  const hasAnyFundamentals = Object.values(fundamentals).some(value => value !== null && value !== undefined && value !== 'unknown');
  if (!hasAnyFundamentals) return 7;
  let score = 7;
  if (fundamentals.valuation === 'cheap' || fundamentals.valuation === 'fair') score += 3;
  if (fundamentals.valuation === 'expensive') score -= 3;
  if (fundamentals.earningsTrend === 'positive') score += 3;
  if (fundamentals.earningsTrend === 'negative') score -= 4;
  if (fundamentals.dividend !== null && fundamentals.dividend !== undefined && fundamentals.dividend > 0) score += 1;
  if (fundamentals.riskLevel === 'high') score -= 3;
  return clamp(Math.round(score), 0, 15);
}

function riskAdjustment(summary: MarketSignalTechnicalSummary, fundamentals: MarketSignalFundamentals, news?: MarketSignalNewsSentiment | null) {
  let adjustment = 0;
  if (summary.volatility !== null) {
    if (summary.volatility >= 70) adjustment -= 14;
    else if (summary.volatility >= 40) adjustment -= 9;
    else if (summary.volatility >= 24) adjustment -= 4;
  }
  if (fundamentals.riskLevel === 'high') adjustment -= 5;
  if (news?.highImpact && news.sentiment === 'negative') adjustment -= 6;
  return clamp(Math.round(adjustment), -20, 0);
}

function dataQualityPenalty(dataQuality: MarketSignalDataQuality) {
  if (dataQuality === 'unavailable') return -20;
  if (dataQuality === 'partial') return -12;
  if (dataQuality === 'delayed') return -5;
  return 0;
}

function riskLevel(summary: MarketSignalTechnicalSummary, score: number, inputRisk?: MarketRiskLevel | MarketSignalRiskLevel | 'unknown' | null): MarketSignalRiskLevel {
  if (inputRisk === 'high') return 'high';
  if (inputRisk === 'low' && (summary.volatility === null || summary.volatility < 25) && score >= 55) return 'low';
  if (summary.volatility !== null && summary.volatility >= 45) return 'high';
  if (score <= 38) return 'high';
  if (summary.volatility !== null && summary.volatility >= 24) return 'medium';
  return score >= 72 ? 'low' : 'medium';
}

function actionFromScore(score: number, risk: MarketSignalRiskLevel, dataQuality: MarketSignalDataQuality, warnings: string[]): MarketSignalAction {
  if (dataQuality === 'unavailable') return 'watch';
  if (dataQuality === 'partial') return score >= 70 || score <= 35 ? 'watch' : 'wait';
  const majorNegative = warnings.some(warning => EXTREME_RISK_WARNINGS.some(marker => warning.includes(marker)));
  if (!majorNegative && score >= 70 && risk !== 'high') return 'buy';
  if (score <= 35 || majorNegative) return 'sell';
  return 'wait';
}

export function actionLabelAr(action: MarketSignalAction): MarketSignalActionLabelAr {
  if (action === 'buy') return 'شراء';
  if (action === 'cautious_buy') return 'شراء بحذر';
  if (action === 'sell' || action === 'sell_or_avoid') return 'تجنب / بيع';
  if (action === 'insufficient_data') return 'بيانات غير كافية';
  if (action === 'wait') return 'انتظار';
  return 'مراقبة';
}

export function actionLabelEn(action: MarketSignalAction): MarketSignalActionLabelEn {
  if (action === 'buy') return 'Buy';
  if (action === 'cautious_buy') return 'Cautious Buy';
  if (action === 'sell' || action === 'sell_or_avoid') return 'Avoid / Sell';
  if (action === 'insufficient_data') return 'Insufficient data';
  if (action === 'wait') return 'Wait';
  return 'Watch';
}

function confidenceForAction(action: MarketSignalAction, score: number, dataQuality: MarketSignalDataQuality) {
  let confidence: number;
  if (action === 'buy') confidence = score;
  else if (action === 'sell') confidence = 100 - score;
  else if (action === 'watch') confidence = dataQuality === 'unavailable' ? 35 : 52;
  else confidence = 50 + Math.min(16, Math.abs(score - 52));
  if (dataQuality === 'partial') confidence = Math.min(confidence, 65);
  if (dataQuality === 'unavailable') confidence = Math.min(confidence, 45);
  return clamp(Math.round(confidence), 0, 95);
}

export function classifyTradingSignal(input: {
  currentPrice?: number | null;
  targetPrice?: number | null;
  stopLoss?: number | null;
  confidence?: number | null;
  dataQuality?: MarketSignalDataQuality | null;
  technicalSummary?: Partial<MarketSignalTechnicalSummary> | null;
}) {
  const currentPrice = finiteNumber(input.currentPrice);
  const targetPrice = finiteNumber(input.targetPrice);
  const stopLoss = finiteNumber(input.stopLoss);
  const confidence = clamp(Math.round(finiteNumber(input.confidence) ?? 0), 0, 100);
  const metrics = calculateSignalRiskMetrics({ currentPrice, targetPrice, stopLoss });
  const technicalIncomplete =
    input.dataQuality === 'unavailable' ||
    !input.technicalSummary ||
    input.technicalSummary.trendDirection === 'unknown';

  let action: MarketSignalAction = 'watch';
  let signalExplanationAr = 'لا توجد إشارة تداول كافية حالياً.';
  let signalExplanationEn = 'There is not enough confirmation for a trading signal right now.';

  if (currentPrice === null || currentPrice <= 0 || targetPrice === null || targetPrice <= 0 || input.dataQuality === 'unavailable') {
    action = 'insufficient_data';
    signalExplanationAr = 'البيانات الفنية غير مكتملة.';
    signalExplanationEn = 'Technical data is incomplete.';
  } else if (targetPrice < currentPrice && confidence >= 55) {
    action = 'sell_or_avoid';
    signalExplanationAr = 'الهدف أدنى من السعر الحالي والثقة تدعم تجنب الصفقة أو البيع.';
    signalExplanationEn = 'The target is below the current price, and confidence supports avoiding or selling.';
  } else if (targetPrice > currentPrice && confidence >= 60 && (metrics.riskRewardRatio ?? Number.NEGATIVE_INFINITY) >= 1.5) {
    action = 'buy';
    signalExplanationAr = 'الهدف أعلى من السعر الحالي ونسبة العائد إلى المخاطرة كافية للشراء.';
    signalExplanationEn = 'The target is above the current price and the risk/reward ratio supports a buy.';
  } else if (targetPrice > currentPrice && confidence >= 50) {
    action = 'cautious_buy';
    const weakRiskReward = metrics.riskRewardRatio !== null && metrics.riskRewardRatio < 1.5;
    signalExplanationAr = weakRiskReward
      ? 'الهدف أعلى من السعر الحالي، لكن الثقة متوسطة ونسبة العائد إلى المخاطرة غير كافية للشراء القوي.'
      : technicalIncomplete
        ? 'الهدف أعلى من السعر الحالي، لكن البيانات الفنية غير مكتملة.'
        : 'الهدف أعلى من السعر الحالي، لكن الثقة متوسطة.';
    signalExplanationEn = weakRiskReward
      ? 'The target is above the current price, but confidence is moderate and risk/reward is not enough for a strong buy.'
      : technicalIncomplete
        ? 'The target is above the current price, but technical data is incomplete.'
        : 'The target is above the current price, but confidence is moderate.';
  } else if (targetPrice <= currentPrice && stopLoss !== null && stopLoss < currentPrice) {
    action = 'watch';
    signalExplanationAr = 'الهدف لا يتجاوز السعر الحالي، لذلك تبقى الإشارة للمراقبة.';
    signalExplanationEn = 'The target does not exceed the current price, so the signal remains a watch.';
  } else if (targetPrice > currentPrice) {
    action = 'watch';
    signalExplanationAr = 'الهدف أعلى من السعر الحالي، لكن الثقة دون الحد الأدنى.';
    signalExplanationEn = 'The target is above the current price, but confidence is below the minimum threshold.';
  }

  return {
    action,
    actionLabelAr: actionLabelAr(action),
    actionLabelEn: actionLabelEn(action),
    signalExplanationAr,
    signalExplanationEn,
    ...metrics,
  };
}

function targetAndStop(input: {
  action: MarketSignalAction;
  price: number | null;
  summary: MarketSignalTechnicalSummary;
  history: MarketSignalInputPoint[];
}) {
  const { action, price, summary, history } = input;
  if (price === null || price <= 0) return { targetPrice: null, stopLoss: null };
  const atrValue = atr(history, 14);
  const range = atrValue && atrValue > 0 ? atrValue : Math.max(price * 0.025, Math.abs((summary.resistance ?? price) - (summary.support ?? price)) / 2);
  if (action === 'sell') {
    const supportTarget = summary.support !== null && summary.support < price ? summary.support : price - range * 2;
    const stop = summary.resistance !== null && summary.resistance > price ? summary.resistance : price + range * 1.3;
    return {
      targetPrice: roundPrice(Math.max(0, Math.min(supportTarget, price - range * 1.2)), price),
      stopLoss: roundPrice(Math.max(stop, price + range), price),
    };
  }
  if (action === 'buy') {
    const resistanceTarget = summary.resistance !== null && summary.resistance > price ? summary.resistance : price + range * 2;
    const stop = summary.support !== null && summary.support < price ? summary.support : price - range * 1.3;
    return {
      targetPrice: roundPrice(Math.max(resistanceTarget, price + range * 1.2), price),
      stopLoss: roundPrice(Math.max(0, Math.min(stop, price - range)), price),
    };
  }
  return {
    targetPrice: summary.resistance !== null ? roundPrice(summary.resistance, price) : roundPrice(price + range * 1.5, price),
    stopLoss: summary.support !== null ? roundPrice(summary.support, price) : roundPrice(Math.max(0, price - range * 1.2), price),
  };
}

function buildReasons(input: {
  action: MarketSignalAction;
  score: number;
  summary: MarketSignalTechnicalSummary;
  fundamentals: MarketSignalFundamentals;
  news?: MarketSignalNewsSentiment | null;
  dataQuality: MarketSignalDataQuality;
}) {
  const reasons: string[] = [];
  if (input.dataQuality === 'unavailable') {
    return ['البيانات غير كافية لإصدار إشارة شراء أو بيع موثوقة.'];
  }
  if (input.summary.trendDirection === 'bullish') reasons.push('الاتجاه الفني إيجابي والسعر أعلى من متوسطات رئيسية.');
  if (input.summary.trendDirection === 'bearish') reasons.push('الاتجاه الفني سلبي والسعر أدنى من متوسطات رئيسية.');
  if (input.summary.trendDirection === 'mixed') reasons.push('الاتجاه الفني مختلط ويحتاج إلى تأكيد إضافي.');
  if (input.summary.rsi !== null) reasons.push(`قراءة RSI عند ${input.summary.rsi} وتستخدم كمرشح زخم لا كتنبؤ مؤكد.`);
  if (input.summary.macdHistogram !== null) {
    reasons.push(input.summary.macdHistogram >= 0 ? 'MACD يميل إلى الزخم الإيجابي.' : 'MACD يميل إلى الزخم السلبي.');
  }
  if (input.news?.sentiment === 'positive') reasons.push('الأخبار أو المعنويات المتاحة داعمة.');
  if (input.news?.sentiment === 'negative') reasons.push('الأخبار أو المعنويات المتاحة تضغط على الإشارة.');
  if (input.fundamentals.earningsTrend === 'positive') reasons.push('المؤشرات الأساسية المتاحة تظهر اتجاهاً أرباحياً إيجابياً.');
  if (input.fundamentals.earningsTrend === 'negative') reasons.push('المؤشرات الأساسية المتاحة تظهر ضغطاً على الأرباح.');
  if (input.action === 'wait') reasons.push('النتيجة بين منطقتي الشراء والبيع، لذلك الأفضل انتظار تأكيد أقوى.');
  if (input.action === 'watch') reasons.push('الإشارة تحت المراقبة بسبب جودة بيانات جزئية أو قوة غير كافية.');
  if (input.action === 'cautious_buy') reasons.push('الهدف أعلى من السعر الحالي، لكن الإشارة مصنفة كشراء بحذر بسبب الثقة أو العائد إلى المخاطرة.');
  if (input.action === 'sell_or_avoid' || input.action === 'sell') reasons.push('الهدف دون السعر الحالي أو المخاطر أعلى من العائد المتوقع، لذلك الإشارة للتجنب أو البيع.');
  reasons.push(`النتيجة المركبة الحالية ${input.score}/100 بناءً على السعر والمؤشرات والمخاطر وجودة البيانات.`);
  return Array.from(new Set(reasons)).slice(0, 6);
}

function buildWarnings(input: {
  dataQuality: MarketSignalDataQuality;
  risk: MarketSignalRiskLevel;
  summary: MarketSignalTechnicalSummary;
  news?: MarketSignalNewsSentiment | null;
}) {
  const warnings = [MARKET_SIGNAL_DISCLAIMER_AR];
  if (input.dataQuality === 'unavailable') warnings.unshift('البيانات غير كافية.');
  if (input.dataQuality === 'partial') warnings.unshift('جودة البيانات جزئية وتم تقييد الثقة.');
  if (input.dataQuality === 'delayed') warnings.push('الأسعار قد تكون متأخرة حسب المزود.');
  if (input.risk === 'high') warnings.push('مستوى المخاطر مرتفع؛ لا تستخدم الإشارة دون إدارة وقف خسارة.');
  if (input.summary.volatility !== null && input.summary.volatility >= 45) warnings.push('السوق متقلب.');
  if (input.news?.highImpact && input.news.sentiment === 'negative') warnings.push('خبر عالي التأثير قد يغير الاتجاه بسرعة.');
  return Array.from(new Set(warnings));
}

function wilderAtrFromSummary(summary: NumericSummary, period = 14): number | null {
  const length = Math.min(summary.highs.length, summary.lows.length, summary.closes.length);
  if (length < period + 2) return null;
  const trueRanges: number[] = [];
  for (let index = 1; index < length; index += 1) {
    trueRanges.push(Math.max(
      summary.highs[index] - summary.lows[index],
      Math.abs(summary.highs[index] - summary.closes[index - 1]),
      Math.abs(summary.lows[index] - summary.closes[index - 1]),
    ));
  }
  let value = trueRanges.slice(0, period).reduce((sum, item) => sum + item, 0) / period;
  for (let index = period; index < trueRanges.length; index += 1) {
    value = (value * (period - 1) + trueRanges[index]) / period;
  }
  return Number.isFinite(value) ? value : null;
}

export function generateMarketSignal(input: MarketSignalInput): MarketSignal {
  const history = Array.isArray(input.history) ? input.history : [];
  const numericHistory = normalizeHistory(history);
  const price = finiteNumber(input.currentPrice) ?? numericHistory.closes.at(-1) ?? null;
  const fundamentals = normalizeFundamentals(input.fundamentals);
  const dataQuality = inferDataQuality({ ...input, currentPrice: price }, numericHistory.closes.length);
  const technicalSummary = buildTechnicalSummary(input, price);
  const tech = technicalScore(technicalSummary, price);
  const momentum = momentumScore(input, price, numericHistory);
  const news = newsScore(input.newsSentiment);
  const fundamental = fundamentalsScore(String(input.assetType), fundamentals);
  const riskAdj = riskAdjustment(technicalSummary, fundamentals, input.newsSentiment);
  const qualityPenalty = dataQualityPenalty(dataQuality);
  const totalScore = clamp(Math.round(tech + momentum + news + fundamental + riskAdj + qualityPenalty), 0, 100);
  const risk = riskLevel(technicalSummary, totalScore, fundamentals.riskLevel);
  const preWarnings = buildWarnings({ dataQuality, risk, summary: technicalSummary, news: input.newsSentiment });
  let action = actionFromScore(totalScore, risk, dataQuality, preWarnings);

  // ── بوابة الدقة العالية (موحّدة مع بقية المحركات) ──────────────────
  const backtest = backtestAgentFirstTouch(history.map(point => ({
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  })));
  const precisionMode: MarketAgentPrecisionMode = {
    enabled: true,
    required: AGENT_PRECISION_MIN_WINRATE,
    measuredWinRate: backtest.winRate,
    samples: backtest.samples,
    passed: false,
  };
  let gateReasonAr = '';
  let gateBlocked = false;

  if (action === 'buy' || action === 'sell') {
    if (backtest.winRate === null || backtest.samples < AGENT_PRECISION_MIN_SAMPLES) {
      action = 'wait';
      gateBlocked = true;
      gateReasonAr = `وضع الدقة العالية: عينات الاختبار الخلفي (${backtest.samples}) غير كافية لإثبات نسبة نجاح ${AGENT_PRECISION_MIN_WINRATE}%، لذلك لا تُنشر الإشارة.`;
    } else if (backtest.winRate < AGENT_PRECISION_MIN_WINRATE) {
      action = 'wait';
      gateBlocked = true;
      gateReasonAr = `وضع الدقة العالية: نسبة إصابة هذا الإعداد تاريخياً ${backtest.winRate}% وهي أقل من الحد المطلوب ${AGENT_PRECISION_MIN_WINRATE}%.`;
    } else {
      precisionMode.passed = true;
      gateReasonAr = `اجتازت الإشارة فلتر الدقة العالية: إصابة الهدف الأول ${backtest.winRate}% عبر ${backtest.samples} صفقة تاريخية على نفس الرمز.`;
    }
  }

  let { targetPrice, stopLoss } = targetAndStop({ action, price, summary: technicalSummary, history });

  // نفس هندسة الاختبار الخلفي للإشارات المجتازة: هدف أول 0.9×ATR ووقف 1.8×ATR
  // خلف الهيكل — حتى يقيس التتبع الحي نفس الأرقام التي بُنيت عليها نسبة النجاح.
  if (precisionMode.passed && price !== null && (action === 'buy' || action === 'sell')) {
    const atrValue = wilderAtrFromSummary(numericHistory);
    const range = Math.max(atrValue ?? 0, price * 0.004);
    const direction = action === 'buy' ? 1 : -1;
    targetPrice = roundPrice(price + direction * range * AGENT_TP1_ATR_MULTIPLE, price);
    const structural = action === 'buy' ? technicalSummary.support : technicalSummary.resistance;
    stopLoss = roundPrice(action === 'buy'
      ? Math.min(structural !== null ? structural - range * 0.15 : Number.POSITIVE_INFINITY, price - range * AGENT_SL_ATR_MULTIPLE)
      : Math.max(structural !== null ? structural + range * 0.15 : Number.NEGATIVE_INFINITY, price + range * AGENT_SL_ATR_MULTIPLE), price);
  }

  let confidence = confidenceForAction(action, totalScore, dataQuality);
  if (precisionMode.passed && backtest.winRate !== null) {
    const smoothedWinRate = ((backtest.wins + 2) / (backtest.samples + 4)) * 100;
    confidence = Math.min(96, Math.max(62, Math.round(smoothedWinRate * 0.7 + confidence * 0.3)));
  } else if (gateBlocked) {
    confidence = Math.min(confidence, 62);
  }
  const provider = input.provider || 'Yahoo Finance';
  const currency = String(input.currency || 'USD').toUpperCase();
  const classification = classifyTradingSignal({
    currentPrice: price,
    targetPrice,
    stopLoss,
    confidence,
    dataQuality,
    technicalSummary,
  });
  action = classification.action;

  return {
    symbol: input.symbol.trim().toUpperCase(),
    assetName: input.assetName?.trim() || input.symbol.trim().toUpperCase(),
    assetType: String(input.assetType || 'stock'),
    market: input.market?.trim() || inferMarket(input.symbol, String(input.assetType)),
    currency,
    action,
    actionLabelAr: classification.actionLabelAr,
    actionLabelEn: classification.actionLabelEn,
    confidence,
    riskLevel: risk,
    currentPrice: roundPrice(price, price),
    targetPrice,
    stopLoss,
    upsidePercent: classification.upsidePercent,
    downsidePercent: classification.downsidePercent,
    riskRewardRatio: classification.riskRewardRatio,
    signalExplanationAr: classification.signalExplanationAr,
    signalExplanationEn: classification.signalExplanationEn,
    timeframe: action === 'insufficient_data' ? 'بيانات غير كافية' : action === 'watch' ? 'مراقبة' : '1-3 أسابيع',
    reasons: [classification.signalExplanationAr, gateReasonAr, ...buildReasons({ action, score: totalScore, summary: technicalSummary, fundamentals, news: input.newsSentiment, dataQuality })].filter(Boolean),
    warnings: preWarnings,
    provider,
    dataQuality,
    lastUpdated: input.lastUpdated || new Date().toISOString(),
    scoreBreakdown: {
      technicalScore: tech,
      momentumScore: momentum,
      newsScore: news,
      fundamentalsScore: fundamental,
      riskAdjustment: riskAdj,
      dataQualityPenalty: qualityPenalty,
      totalScore,
    },
    technicalSummary,
    backtest,
    precisionMode,
    disclaimerAr: MARKET_SIGNAL_DISCLAIMER_AR,
    disclaimerEn: MARKET_SIGNAL_DISCLAIMER_EN,
  };
}

function inferMarket(symbol: string, assetType: string) {
  const normalized = symbol.toUpperCase();
  if (assetType === 'crypto') return 'Crypto';
  if (assetType === 'forex') return 'Forex';
  if (assetType === 'gold' || assetType === 'commodity') return 'Commodities';
  if (normalized.endsWith('.KW')) return 'Kuwait';
  if (normalized.endsWith('.SR') || normalized.endsWith('.SA')) return 'Saudi';
  if (normalized.endsWith('.AE') || normalized.endsWith('.DU') || normalized.endsWith('.AD')) return 'UAE';
  if (normalized.endsWith('.QA')) return 'Qatar';
  if (normalized.endsWith('.BH')) return 'Bahrain';
  if (normalized.endsWith('.OM')) return 'Oman';
  return 'US';
}

export function signalFromMarketAnalysis(analysis: MarketAnalysis): MarketSignal {
  const history: MarketSignalInputPoint[] = (analysis.history || []).map((point: MarketHistoryPoint) => ({
    date: point.date,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  }));
  const sevenDayChangePercent = percentChange(analysis.latestPrice, history.at(-8)?.close);
  const thirtyDayChangePercent = percentChange(analysis.latestPrice, history.at(-31)?.close);
  return generateMarketSignal({
    symbol: analysis.symbol,
    assetName: analysis.name,
    assetType: analysis.assetType,
    market: analysis.market || analysis.exchange || analysis.country,
    currency: analysis.currency ?? analysis.quote?.currency ?? null,
    currentPrice: analysis.latestPrice,
    dailyChangePercent: analysis.changePercent ?? analysis.quote?.changePercent,
    sevenDayChangePercent,
    thirtyDayChangePercent,
    history,
    fundamentals: {
      ...(analysis.fundamentals ?? {}),
      sector: analysis.fundamentals && typeof analysis.fundamentals.sector === 'string' ? analysis.fundamentals.sector : undefined,
      riskLevel: analysis.riskLevel,
    },
    provider: analysis.source || analysis.provider || 'Yahoo Finance',
    dataQuality: analysis.dataStatus === 'unavailable' ? 'unavailable' : analysis.dataStatus === 'live' ? 'live' : analysis.history.length >= 50 ? 'delayed' : 'partial',
    delayed: analysis.dataStatus !== 'live',
    lastUpdated: analysis.lastUpdated || analysis.fetchedAt || analysis.quote?.timestamp,
  });
}

export function unavailableMarketSignal(input: {
  symbol: string;
  assetName?: string | null;
  assetType?: string | null;
  market?: string | null;
  currency?: string | null;
  provider?: string | null;
  reason?: string | null;
}): MarketSignal {
  const signal = generateMarketSignal({
    symbol: input.symbol,
    assetName: input.assetName || input.symbol,
    assetType: input.assetType || 'stock',
    market: input.market,
    currency: input.currency || 'USD',
    currentPrice: null,
    history: [],
    provider: input.provider || 'Yahoo Finance',
    dataQuality: 'unavailable',
  });
  return {
    ...signal,
    reasons: ['البيانات غير كافية لإصدار إشارة شراء أو بيع موثوقة.'],
    warnings: Array.from(new Set([input.reason || 'البيانات غير كافية.', ...signal.warnings])),
  };
}

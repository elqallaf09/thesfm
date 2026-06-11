import { detectPriceUnit, normalizeMarketPrice, resolveMarketCurrency } from '@/lib/market/marketCurrency';
import type { MarketAssetType } from '@/lib/market/marketService';

export const MARKET_AGENT_DISCLAIMER_AR = 'هذا التحليل مجرد قراءة آلية للسوق وليس توصية مالية أو دعوة للشراء أو البيع. قرارات الاستثمار والتداول تقع على مسؤوليتك الشخصية.';
export const MARKET_AGENT_DISCLAIMER_EN = 'This analysis is an automated market reading only and is not financial advice or a recommendation to buy or sell. Trading and investment decisions are your own responsibility.';
export const MARKET_AGENT_INSUFFICIENT_DATA_AR = 'لا توجد بيانات كافية لإصدار قراءة موثوقة لهذا الأصل حالياً.';

export type MarketAgentAssetType = 'stock' | 'forex' | 'index' | 'metal' | 'crypto';
export type MarketAgentTimeframe = '15m' | '1h' | '4h' | '1D' | '1W';
export type MarketAgentDirection = 'bullish' | 'bearish' | 'neutral';
export type MarketAgentAction = 'buy' | 'sell' | 'wait';
export type MarketAgentRiskLevel = 'low' | 'medium' | 'high';

export type MarketAgentPricePoint = {
  time?: string;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
};

export type MarketAgentInput = {
  symbol: string;
  assetType: MarketAgentAssetType;
  timeframe: MarketAgentTimeframe;
  providerSymbol?: string;
  providerAssetType?: MarketAssetType;
  currency?: string | null;
  source?: string;
  updatedAt?: string;
};

export type MarketAgentSuccessResponse = {
  ok: true;
  success: true;
  symbol: string;
  assetType: MarketAgentAssetType;
  timeframe: MarketAgentTimeframe;
  currentPrice: number;
  direction: MarketAgentDirection;
  suggestedAction: MarketAgentAction;
  confidence: number;
  riskLevel: MarketAgentRiskLevel;
  entryZone: { from: number; to: number };
  stopLoss: number | null;
  takeProfit: number[];
  support: number[];
  resistance: number[];
  trends: {
    shortTerm: MarketAgentDirection;
    mediumTerm: MarketAgentDirection;
    longTerm: MarketAgentDirection;
  };
  indicators: {
    rsi: number | null;
    macd: 'bullish' | 'bearish' | 'neutral';
    macdValue: number | null;
    macdSignal: number | null;
    ema20: number | null;
    ema50: number | null;
    ema200: number | null;
    volume: number | null;
    atr: number | null;
    pivotPoints: {
      pivot: number;
      r1: number;
      r2: number;
      r3: number;
      s1: number;
      s2: number;
      s3: number;
    } | null;
  };
  summaryArabic: string;
  disclaimerArabic: string;
  disclaimerEnglish: string;
  dataStatus: 'available';
  source: string;
  updatedAt: string;
  debugSignals?: {
    bullishScore: number;
    bearishScore: number;
    waitScore: number;
    alignedSignals: number;
    totalSignals: number;
  };
};

export type MarketAgentUnavailableResponse = {
  ok: false;
  success: false;
  code: 'INSUFFICIENT_MARKET_DATA' | 'INVALID_SYMBOL' | 'PROVIDER_UNAVAILABLE';
  symbol: string;
  assetType: MarketAgentAssetType;
  timeframe: MarketAgentTimeframe;
  currentPrice: null;
  message: string;
  summaryArabic: string;
  disclaimerArabic: string;
  disclaimerEnglish: string;
  dataStatus: 'unavailable';
  source?: string;
  updatedAt: string;
};

export type MarketAgentResponse = MarketAgentSuccessResponse | MarketAgentUnavailableResponse;

const MIN_RELIABLE_POINTS = 50;
const EPSILON = 0.0000001;

export const MARKET_AGENT_TIMEFRAME_CONFIG: Record<MarketAgentTimeframe, { period: string; interval: string; aggregateHours?: number }> = {
  '15m': { period: '5d', interval: '15m' },
  '1h': { period: '1mo', interval: '1h' },
  '4h': { period: '3mo', interval: '1h', aggregateHours: 4 },
  '1D': { period: '1y', interval: '1d' },
  '1W': { period: '5y', interval: '1wk' },
};

export function normalizeMarketAgentAssetType(value: unknown): MarketAgentAssetType {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'stocks' || normalized === 'stock' || normalized === 'etf') return 'stock';
  if (normalized === 'forex' || normalized === 'fx') return 'forex';
  if (normalized === 'indices' || normalized === 'indexes' || normalized === 'index') return 'index';
  if (normalized === 'metals' || normalized === 'metal' || normalized === 'gold' || normalized === 'commodity' || normalized === 'commodities') return 'metal';
  if (normalized === 'crypto' || normalized === 'cryptocurrency') return 'crypto';
  return 'stock';
}

export function normalizeMarketAgentTimeframe(value: unknown): MarketAgentTimeframe {
  const normalized = String(value ?? '').trim();
  const lower = normalized.toLowerCase();
  if (lower === '15m') return '15m';
  if (lower === '1h') return '1h';
  if (lower === '4h') return '4h';
  if (normalized.toUpperCase() === '1W') return '1W';
  return '1D';
}

export function agentAssetTypeFromProvider(assetType: MarketAssetType | string): MarketAgentAssetType {
  if (assetType === 'forex') return 'forex';
  if (assetType === 'crypto') return 'crypto';
  if (assetType === 'index') return 'index';
  if (assetType === 'commodity' || assetType === 'gold') return 'metal';
  return 'stock';
}

export function providerAssetTypeForAgent(assetType: MarketAgentAssetType): MarketAssetType {
  if (assetType === 'metal') return 'gold';
  if (assetType === 'index') return 'index';
  if (assetType === 'forex') return 'forex';
  if (assetType === 'crypto') return 'crypto';
  return 'stock';
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundPrice(value: number | null | undefined, currentPrice?: number): number | null {
  if (!Number.isFinite(Number(value))) return null;
  const price = Number(value);
  const reference = Math.abs(currentPrice ?? price);
  const decimals = reference >= 1000 ? 2 : reference >= 100 ? 2 : reference >= 10 ? 3 : reference >= 1 ? 4 : 6;
  return Number(price.toFixed(decimals));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const avg = average(values) ?? 0;
  return Math.sqrt((average(values.map(value => (value - avg) ** 2)) ?? 0));
}

export function calculateEma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const seed = average(values.slice(0, period));
  if (seed === null) return null;
  const multiplier = 2 / (period + 1);
  return values.slice(period).reduce((ema, value) => (value - ema) * multiplier + ema, seed);
}

export function calculateRsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  let gains = 0;
  let losses = 0;
  for (const change of changes.slice(0, period)) {
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  for (const change of changes.slice(period)) {
    averageGain = ((averageGain * (period - 1)) + Math.max(0, change)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(0, -change)) / period;
  }
  if (averageLoss <= EPSILON) return averageGain > EPSILON ? 100 : 50;
  const rs = averageGain / averageLoss;
  return 100 - (100 / (1 + rs));
}

function emaSeries(values: number[], period: number): Array<number | null> {
  const output = Array<number | null>(values.length).fill(null);
  if (values.length < period) return output;
  let ema = average(values.slice(0, period));
  if (ema === null) return output;
  output[period - 1] = ema;
  const multiplier = 2 / (period + 1);
  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    output[index] = ema;
  }
  return output;
}

export function calculateMacd(values: number[]): {
  value: number | null;
  signal: number | null;
  histogram: number | null;
  trend: 'bullish' | 'bearish' | 'neutral';
} {
  if (values.length < 35) return { value: null, signal: null, histogram: null, trend: 'neutral' as const };
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  const macdSeries = values.map((_, index) => {
    const fastValue = fast[index];
    const slowValue = slow[index];
    return fastValue !== null && slowValue !== null ? fastValue - slowValue : null;
  });
  const compactMacd = macdSeries.filter((value): value is number => value !== null);
  const signal = calculateEma(compactMacd, 9);
  const value = compactMacd.at(-1) ?? null;
  const histogram = value !== null && signal !== null ? value - signal : null;
  const trend: 'bullish' | 'bearish' | 'neutral' = histogram === null || Math.abs(histogram) <= EPSILON ? 'neutral' : histogram > 0 ? 'bullish' : 'bearish';
  return { value, signal, histogram, trend };
}

export function calculateAtr(points: MarketAgentPricePoint[], period = 14): number | null {
  const trueRanges: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[index - 1];
    if (!Number.isFinite(point.high) || !Number.isFinite(point.low) || !Number.isFinite(previous.close)) continue;
    trueRanges.push(Math.max(
      Number(point.high) - Number(point.low),
      Math.abs(Number(point.high) - previous.close),
      Math.abs(Number(point.low) - previous.close),
    ));
  }
  if (trueRanges.length < period) return null;
  return average(trueRanges.slice(-period));
}

function pivotPoints(point: MarketAgentPricePoint, currentPrice: number) {
  if (!Number.isFinite(point.high) || !Number.isFinite(point.low)) return null;
  const high = Number(point.high);
  const low = Number(point.low);
  const close = point.close;
  const pivot = (high + low + close) / 3;
  return {
    pivot: roundPrice(pivot, currentPrice)!,
    r1: roundPrice((2 * pivot) - low, currentPrice)!,
    r2: roundPrice(pivot + (high - low), currentPrice)!,
    r3: roundPrice(high + 2 * (pivot - low), currentPrice)!,
    s1: roundPrice((2 * pivot) - high, currentPrice)!,
    s2: roundPrice(pivot - (high - low), currentPrice)!,
    s3: roundPrice(low - 2 * (high - pivot), currentPrice)!,
  };
}

function normalizePoint(raw: unknown): MarketAgentPricePoint | null {
  const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const close = finiteNumber(item.close ?? item.c);
  if (close === null || close <= 0) return null;
  return {
    time: String(item.time ?? item.date ?? item.timestamp ?? '').trim() || undefined,
    open: finiteNumber(item.open ?? item.o),
    high: finiteNumber(item.high ?? item.h),
    low: finiteNumber(item.low ?? item.l),
    close,
    volume: finiteNumber(item.volume ?? item.v),
  };
}

export function normalizeMarketAgentPoints(history: unknown): MarketAgentPricePoint[] {
  if (!Array.isArray(history)) return [];
  return history.map(normalizePoint).filter((point): point is MarketAgentPricePoint => point !== null);
}

export function normalizeMarketAgentCurrencyPoints(points: MarketAgentPricePoint[], input: {
  symbol: string;
  providerSymbol: string;
  assetType: MarketAssetType;
  providerCurrency?: unknown;
}) {
  const currency = resolveMarketCurrency({
    providerCurrency: input.providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
  });
  const lastClose = points.at(-1)?.close ?? null;
  const priceUnit = detectPriceUnit({
    price: lastClose,
    currency: currency.currency,
    providerCurrency: input.providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
  });
  const normalizeValue = (value: number | null | undefined) => normalizeMarketPrice({
    price: value ?? null,
    currency: currency.currency,
    providerCurrency: input.providerCurrency,
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    assetType: input.assetType,
    priceUnit,
  }).price;

  return {
    currency: currency.currency,
    points: points.map(point => ({
      ...point,
      open: normalizeValue(point.open),
      high: normalizeValue(point.high),
      low: normalizeValue(point.low),
      close: normalizeValue(point.close) ?? point.close,
    })),
  };
}

export function aggregateMarketAgentPoints(points: MarketAgentPricePoint[], hours?: number): MarketAgentPricePoint[] {
  if (!hours || hours <= 1 || points.length < 2) return points;
  const groups = new Map<number, MarketAgentPricePoint[]>();
  for (const point of points) {
    const timestamp = point.time ? Date.parse(point.time) : NaN;
    if (!Number.isFinite(timestamp)) return points;
    const bucket = Math.floor(timestamp / (hours * 60 * 60 * 1000));
    groups.set(bucket, [...(groups.get(bucket) ?? []), point]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, group]) => {
      const first = group[0];
      const last = group[group.length - 1];
      return {
        time: first.time,
        open: first.open ?? first.close,
        high: Math.max(...group.map(point => point.high ?? point.close)),
        low: Math.min(...group.map(point => point.low ?? point.close)),
        close: last.close,
        volume: group.some(point => point.volume !== null && point.volume !== undefined)
          ? group.reduce((sum, point) => sum + (point.volume ?? 0), 0)
          : null,
      };
    });
}

function directionFromAverages(price: number, fast: number | null, slow: number | null): MarketAgentDirection {
  if (fast === null || slow === null) return 'neutral';
  if (price > fast && fast > slow) return 'bullish';
  if (price < fast && fast < slow) return 'bearish';
  return 'neutral';
}

function supportResistance(points: MarketAgentPricePoint[], currentPrice: number) {
  const recent = points.slice(-80);
  const lows = recent.map(point => point.low ?? point.close).filter(Number.isFinite) as number[];
  const highs = recent.map(point => point.high ?? point.close).filter(Number.isFinite) as number[];
  const uniqueNear = (values: number[], mode: 'support' | 'resistance') => {
    const filtered = values
      .filter(value => mode === 'support' ? value <= currentPrice : value >= currentPrice)
      .sort((a, b) => mode === 'support' ? b - a : a - b);
    const output: number[] = [];
    for (const value of filtered) {
      if (output.every(existing => Math.abs(existing - value) / currentPrice > 0.003)) output.push(value);
      if (output.length === 3) break;
    }
    return output.map(value => roundPrice(value, currentPrice)!).filter(Number.isFinite);
  };
  const supports = uniqueNear(lows, 'support');
  const resistances = uniqueNear(highs, 'resistance');
  if (supports.length === 0 && lows.length) supports.push(roundPrice(Math.min(...lows), currentPrice)!);
  if (resistances.length === 0 && highs.length) resistances.push(roundPrice(Math.max(...highs), currentPrice)!);
  return { support: supports.slice(0, 3), resistance: resistances.slice(0, 3) };
}

function percentDistance(left: number, right: number) {
  return Math.abs(left - right) / Math.max(Math.abs(right), EPSILON) * 100;
}

function buildSummaryArabic(input: {
  symbol: string;
  direction: MarketAgentDirection;
  action: MarketAgentAction;
  riskLevel: MarketAgentRiskLevel;
  confidence: number;
  rsi: number | null;
  macd: 'bullish' | 'bearish' | 'neutral';
  trend: MarketAgentDirection;
  conflict: boolean;
}) {
  const directionText = input.direction === 'bullish' ? 'إيجابي' : input.direction === 'bearish' ? 'سلبي' : 'محايد';
  const actionText = input.action === 'buy' ? 'الشراء' : input.action === 'sell' ? 'البيع' : 'الانتظار';
  const riskText = input.riskLevel === 'high' ? 'مرتفعة' : input.riskLevel === 'low' ? 'منخفضة' : 'متوسطة';
  const rsiText = input.rsi === null
    ? 'ولا تتوفر قراءة RSI كافية'
    : input.rsi > 70
      ? 'بينما يظهر RSI اقتراباً من منطقة التشبع الشرائي'
      : input.rsi < 30
        ? 'بينما يظهر RSI اقتراباً من منطقة التشبع البيعي'
        : `مع قراءة RSI حول ${Math.round(input.rsi)} وهي ضمن نطاق قابل للمتابعة`;
  const macdText = input.macd === 'bullish'
    ? 'كما أن MACD يميل إلى الزخم الإيجابي'
    : input.macd === 'bearish'
      ? 'كما أن MACD يميل إلى الزخم السلبي'
      : 'بينما لا يعطي MACD إشارة حاسمة حالياً';
  const conflictText = input.conflict
    ? 'توجد بعض الإشارات المختلطة، لذلك يجب التعامل مع القراءة بحذر.'
    : 'الإشارات الرئيسية أكثر اتساقاً من القراءة المختلطة.';

  return [
    `تشير القراءة الحالية لـ ${input.symbol} إلى ميل ${directionText}.`,
    `يميل التحليل إلى ${actionText} بدرجة ثقة ${input.confidence}%، ${rsiText}.`,
    `${macdText}، والاتجاه الفني العام ${directionText}.`,
    `المخاطرة ${riskText} بسبب مستوى التذبذب وتوافق المؤشرات.`,
    conflictText,
  ].join(' ');
}

function insufficientResponse(input: MarketAgentInput, code: MarketAgentUnavailableResponse['code'] = 'INSUFFICIENT_MARKET_DATA'): MarketAgentUnavailableResponse {
  return {
    ok: false,
    success: false,
    code,
    symbol: input.symbol,
    assetType: input.assetType,
    timeframe: input.timeframe,
    currentPrice: null,
    message: MARKET_AGENT_INSUFFICIENT_DATA_AR,
    summaryArabic: MARKET_AGENT_INSUFFICIENT_DATA_AR,
    disclaimerArabic: MARKET_AGENT_DISCLAIMER_AR,
    disclaimerEnglish: MARKET_AGENT_DISCLAIMER_EN,
    dataStatus: 'unavailable',
    source: input.source,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function analyzeMarketAgentFromHistory(input: MarketAgentInput, history: unknown): MarketAgentResponse {
  const points = normalizeMarketAgentPoints(history);
  if (points.length < MIN_RELIABLE_POINTS) return insufficientResponse(input);

  const closes = points.map(point => point.close).filter(Number.isFinite);
  const currentPrice = closes.at(-1);
  if (!Number.isFinite(currentPrice) || Number(currentPrice) <= 0) return insufficientResponse(input);
  const price = Number(currentPrice);
  const ema20 = calculateEma(closes, 20);
  const ema50 = calculateEma(closes, 50);
  const ema200 = calculateEma(closes, 200);
  const rsi = calculateRsi(closes);
  const macd = calculateMacd(closes);
  const atr = calculateAtr(points);
  const volatilityPct = atr ? (atr / price) * 100 : (standardDeviation(closes.slice(-30)) / price) * 100;
  const levels = supportResistance(points, price);
  const latestVolume = points.at(-1)?.volume ?? null;
  const averageVolume = average(points.slice(-20).map(point => point.volume).filter((value): value is number => Number.isFinite(value)));
  const previousClose = closes.at(-2) ?? price;
  const pivot = pivotPoints(points.at(-1)!, price);

  let bullishScore = 0;
  let bearishScore = 0;
  let waitScore = 0;
  let totalSignals = 0;
  const addSignal = (side: 'bullish' | 'bearish' | 'wait', weight = 1) => {
    totalSignals += weight;
    if (side === 'bullish') bullishScore += weight;
    else if (side === 'bearish') bearishScore += weight;
    else waitScore += weight;
  };

  if (ema20 !== null && ema50 !== null) {
    if (price > ema20 && price > ema50) addSignal('bullish', 2);
    else if (price < ema20 && price < ema50) addSignal('bearish', 2);
    else addSignal('wait', 2);

    if (ema20 > ema50) addSignal('bullish', 2);
    else if (ema20 < ema50) addSignal('bearish', 2);
    else addSignal('wait', 2);
  }

  if (ema50 !== null && ema200 !== null) {
    if (ema50 > ema200 && price > ema50) addSignal('bullish', 1);
    else if (ema50 < ema200 && price < ema50) addSignal('bearish', 1);
    else addSignal('wait', 1);
  }

  if (rsi !== null) {
    if (rsi >= 45 && rsi <= 70) addSignal('bullish', 1);
    else if (rsi < 45 && rsi >= 25) addSignal('bearish', 1);
    else addSignal('wait', 2);
  }

  if (macd.trend === 'bullish') addSignal('bullish', 2);
  else if (macd.trend === 'bearish') addSignal('bearish', 2);
  else addSignal('wait', 1);

  const nearestSupport = levels.support[0];
  const nearestResistance = levels.resistance[0];
  if (nearestSupport && percentDistance(price, nearestSupport) <= Math.max(1.2, volatilityPct * 0.7)) addSignal('bullish', 1);
  if (nearestResistance && percentDistance(price, nearestResistance) <= Math.max(1.2, volatilityPct * 0.7)) addSignal('bearish', 1);
  if (nearestResistance && price > nearestResistance) addSignal('bullish', 1);
  if (nearestSupport && price < nearestSupport) addSignal('bearish', 1);

  if (latestVolume && averageVolume) {
    if (latestVolume > averageVolume * 1.05 && price > previousClose) addSignal('bullish', 1);
    else if (latestVolume > averageVolume * 1.05 && price < previousClose) addSignal('bearish', 1);
    else addSignal('wait', 0.5);
  }

  const conflictingSignals = Math.min(bullishScore, bearishScore) + waitScore * 0.5;
  const overextended = rsi !== null && (rsi > 75 || rsi < 25);
  let suggestedAction: MarketAgentAction = 'wait';
  if (!overextended && bullishScore >= bearishScore + 2 && bullishScore >= waitScore + 1) suggestedAction = 'buy';
  if (!overextended && bearishScore >= bullishScore + 2 && bearishScore >= waitScore + 1) suggestedAction = 'sell';

  const direction: MarketAgentDirection = suggestedAction === 'buy' ? 'bullish' : suggestedAction === 'sell' ? 'bearish' : 'neutral';
  const winningScore = suggestedAction === 'buy' ? bullishScore : suggestedAction === 'sell' ? bearishScore : Math.max(waitScore, Math.abs(bullishScore - bearishScore));
  const rawConfidence = suggestedAction === 'wait'
    ? 48 + Math.min(24, (winningScore / Math.max(totalSignals, 1)) * 30) - Math.min(12, conflictingSignals * 2)
    : 52 + Math.min(35, (winningScore / Math.max(totalSignals, 1)) * 40) - Math.min(12, conflictingSignals * 1.5);
  const confidence = Math.max(35, Math.min(85, Math.round(rawConfidence)));

  const alignedSignals = suggestedAction === 'buy' ? bullishScore : suggestedAction === 'sell' ? bearishScore : waitScore;
  const conflictHigh = Math.abs(bullishScore - bearishScore) < 2 || waitScore >= Math.max(bullishScore, bearishScore) * 0.65;
  const riskLevel: MarketAgentRiskLevel = conflictHigh || volatilityPct >= 4 || overextended
    ? 'high'
    : confidence >= 74 && volatilityPct < 1.6 && alignedSignals >= 6
      ? 'low'
      : 'medium';

  const range = atr && atr > 0 ? atr : price * 0.012;
  const zonePadding = Math.max(range * 0.25, price * 0.001);
  const entryZone = suggestedAction === 'buy'
    ? { from: roundPrice(Math.min(price, nearestSupport ?? price) - zonePadding * 0.25, price)!, to: roundPrice(price + zonePadding, price)! }
    : suggestedAction === 'sell'
      ? { from: roundPrice(price - zonePadding, price)!, to: roundPrice(Math.max(price, nearestResistance ?? price) + zonePadding * 0.25, price)! }
      : { from: roundPrice(price - zonePadding, price)!, to: roundPrice(price + zonePadding, price)! };

  const stopLoss = suggestedAction === 'buy'
    ? roundPrice(Math.min(nearestSupport ?? price - range, price - range * 1.5), price)
    : suggestedAction === 'sell'
      ? roundPrice(Math.max(nearestResistance ?? price + range, price + range * 1.5), price)
      : null;

  const riskDistance = stopLoss ? Math.abs(price - stopLoss) : range;
  const takeProfit = suggestedAction === 'buy'
    ? [...levels.resistance.filter(level => level > price), price + riskDistance * 1.5, price + riskDistance * 2.4, price + riskDistance * 3.2]
    : suggestedAction === 'sell'
      ? [...levels.support.filter(level => level < price), price - riskDistance * 1.5, price - riskDistance * 2.4, price - riskDistance * 3.2]
      : [];
  const uniqueTakeProfit = takeProfit
    .filter(value => value > 0)
    .map(value => roundPrice(value, price)!)
    .filter((value, index, list) => list.findIndex(item => Math.abs(item - value) / price < 0.002) === index)
    .slice(0, 3);

  const shortTerm = directionFromAverages(price, ema20, ema50);
  const mediumTerm = directionFromAverages(price, ema50, ema200);
  const longTerm = ema200 === null ? 'neutral' : price > ema200 ? 'bullish' : price < ema200 ? 'bearish' : 'neutral';
  const summaryArabic = buildSummaryArabic({
    symbol: input.symbol,
    direction,
    action: suggestedAction,
    riskLevel,
    confidence,
    rsi,
    macd: macd.trend,
    trend: shortTerm,
    conflict: conflictHigh,
  });

  return {
    ok: true,
    success: true,
    symbol: input.symbol,
    assetType: input.assetType,
    timeframe: input.timeframe,
    currentPrice: roundPrice(price, price)!,
    direction,
    suggestedAction,
    confidence,
    riskLevel,
    entryZone,
    stopLoss,
    takeProfit: uniqueTakeProfit,
    support: levels.support,
    resistance: levels.resistance,
    trends: { shortTerm, mediumTerm, longTerm },
    indicators: {
      rsi: rsi === null ? null : Number(rsi.toFixed(1)),
      macd: macd.trend,
      macdValue: macd.value === null ? null : roundPrice(macd.value, price),
      macdSignal: macd.signal === null ? null : roundPrice(macd.signal, price),
      ema20: roundPrice(ema20, price),
      ema50: roundPrice(ema50, price),
      ema200: roundPrice(ema200, price),
      volume: latestVolume ?? null,
      atr: roundPrice(atr, price),
      pivotPoints: pivot,
    },
    summaryArabic,
    disclaimerArabic: MARKET_AGENT_DISCLAIMER_AR,
    disclaimerEnglish: MARKET_AGENT_DISCLAIMER_EN,
    dataStatus: 'available',
    source: input.source ?? 'openbb',
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    debugSignals: {
      bullishScore,
      bearishScore,
      waitScore,
      alignedSignals,
      totalSignals,
    },
  };
}

export function insufficientMarketAgentData(input: MarketAgentInput, code?: MarketAgentUnavailableResponse['code']) {
  return insufficientResponse(input, code);
}

export function isMarketAgentResponse(value: unknown): value is MarketAgentResponse {
  const data = value && typeof value === 'object' ? value as Partial<MarketAgentResponse> : {};
  if (data.ok === false) {
    return data.success === false
      && typeof data.symbol === 'string'
      && typeof data.message === 'string'
      && data.currentPrice === null
      && typeof data.disclaimerArabic === 'string'
      && typeof data.disclaimerEnglish === 'string';
  }
  return data.ok === true
    && data.success === true
    && typeof data.symbol === 'string'
    && Number.isFinite((data as Partial<MarketAgentSuccessResponse>).currentPrice)
    && ['buy', 'sell', 'wait'].includes(String((data as Partial<MarketAgentSuccessResponse>).suggestedAction))
    && Number.isFinite((data as Partial<MarketAgentSuccessResponse>).confidence)
    && Number((data as Partial<MarketAgentSuccessResponse>).confidence) <= 85
    && typeof data.disclaimerArabic === 'string'
    && typeof data.disclaimerEnglish === 'string';
}

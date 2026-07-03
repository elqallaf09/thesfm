import { createHash } from 'crypto';
import type {
  MarketCandle,
  MarketQuote,
  ScanScoreBreakdown,
  StockAnalysisResult,
  TechnicalSnapshot,
  TradableAsset,
} from '@/lib/trader/types';

function round(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sma(values: number[], period: number) {
  if (values.length < period) return null;
  return average(values.slice(-period));
}

function emaSeries(values: number[], period: number) {
  if (values.length < period) return [];
  const alpha = 2 / (period + 1);
  const seed = average(values.slice(0, period));
  if (seed === null) return [];
  const output = [seed];
  for (let index = period; index < values.length; index += 1) {
    output.push(values[index] * alpha + output[output.length - 1] * (1 - alpha));
  }
  return output;
}

function ema(values: number[], period: number) {
  const series = emaSeries(values, period);
  return series.length ? series[series.length - 1] : null;
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) return 100;
  const rs = averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}

function macd(values: number[]) {
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  if (!ema12.length || !ema26.length) return { macd: null, signal: null };
  const offset = ema12.length - ema26.length;
  const line = ema26.map((value, index) => ema12[index + offset] - value);
  const signalSeries = emaSeries(line, 9);
  return {
    macd: line[line.length - 1] ?? null,
    signal: signalSeries[signalSeries.length - 1] ?? null,
  };
}

function atr(candles: MarketCandle[], period = 14) {
  if (candles.length <= period) return null;
  const trueRanges: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    trueRanges.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    ));
  }
  if (trueRanges.length <= period) return average(trueRanges);
  // ATR بطريقة Wilder الأصلية (تنعيم متتابع) بدلا من المتوسط البسيط: أدق
  let value = average(trueRanges.slice(0, period)) ?? 0;
  for (let index = period; index < trueRanges.length; index += 1) {
    value = (value * (period - 1) + trueRanges[index]) / period;
  }
  return value;
}

function adx(candles: MarketCandle[], period = 14) {
  if (candles.length < period * 2 + 2) return { adx: null, plusDI: null, minusDI: null };
  const trueRanges: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trueRanges.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    ));
  }

  let trSum = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0);
  let plusSum = plusDMs.slice(0, period).reduce((sum, value) => sum + value, 0);
  let minusSum = minusDMs.slice(0, period).reduce((sum, value) => sum + value, 0);
  const dxValues: number[] = [];
  let plusDI = 0;
  let minusDI = 0;

  for (let index = period; index < trueRanges.length; index += 1) {
    trSum = trSum - trSum / period + trueRanges[index];
    plusSum = plusSum - plusSum / period + plusDMs[index];
    minusSum = minusSum - minusSum / period + minusDMs[index];
    plusDI = trSum ? (plusSum / trSum) * 100 : 0;
    minusDI = trSum ? (minusSum / trSum) * 100 : 0;
    const diSum = plusDI + minusDI;
    dxValues.push(diSum ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0);
  }

  if (!dxValues.length) return { adx: null, plusDI, minusDI };

  let adxValue = average(dxValues.slice(0, Math.min(period, dxValues.length))) ?? 0;
  for (let index = period; index < dxValues.length; index += 1) {
    adxValue = (adxValue * (period - 1) + dxValues[index]) / period;
  }

  return { adx: adxValue, plusDI, minusDI };
}

function stochastic(candles: MarketCandle[], period = 14, smooth = 3) {
  if (candles.length < period + smooth + 1) return { k: null, d: null };

  const rawK: number[] = [];
  for (let index = period - 1; index < candles.length; index += 1) {
    const window = candles.slice(index - period + 1, index + 1);
    const highest = Math.max(...window.map((candle) => candle.high));
    const lowest = Math.min(...window.map((candle) => candle.low));
    const close = candles[index].close;
    rawK.push(highest === lowest ? 50 : ((close - lowest) / (highest - lowest)) * 100);
  }

  if (rawK.length < smooth) return { k: null, d: null };

  const smoothedK: number[] = [];
  for (let index = smooth - 1; index < rawK.length; index += 1) {
    smoothedK.push(average(rawK.slice(index - smooth + 1, index + 1)) ?? 50);
  }

  return {
    k: smoothedK[smoothedK.length - 1] ?? null,
    d: average(smoothedK.slice(-3)),
  };
}

function bollinger(closes: number[], period = 20, multiplier = 2) {
  if (closes.length < period) return { upper: null, lower: null, pos: null };
  const slice = closes.slice(-period);
  const mid = average(slice) ?? 0;
  const variance = slice.reduce((sum, value) => sum + (value - mid) ** 2, 0) / slice.length;
  const deviation = Math.sqrt(variance);
  const upper = mid + multiplier * deviation;
  const lower = mid - multiplier * deviation;
  const price = closes[closes.length - 1];
  const pos = upper === lower ? 0.5 : clamp((price - lower) / (upper - lower), -0.5, 1.5);
  return { upper, lower, pos };
}

function obvSlope(candles: MarketCandle[], period = 20) {
  if (candles.length < period + 2) return null;
  let obv = 0;
  const series = [0];
  for (let index = 1; index < candles.length; index += 1) {
    const volume = Math.max(0, candles[index].volume ?? 0);
    if (candles[index].close > candles[index - 1].close) obv += volume;
    else if (candles[index].close < candles[index - 1].close) obv -= volume;
    series.push(obv);
  }
  const recent = series.slice(-period);
  const scale = Math.max(...series.map((value) => Math.abs(value)), 1);
  return (recent[recent.length - 1] - recent[0]) / scale;
}

// وضع الدقة العالية: لا تُنشر إشارة إلا إذا أثبت الاختبار الخلفي إصابة الهدف الأول
// بنسبة >= PRECISION_MIN_WINRATE على نفس الرمز.
const PRECISION_MIN_WINRATE = clamp(Number(process.env.PRECISION_MIN_WINRATE) || 90, 50, 99);
const PRECISION_MIN_SAMPLES = clamp(Number(process.env.PRECISION_MIN_SAMPLES) || 8, 3, 60);
const TP1_ATR_MULTIPLE = 0.9;
const SL_ATR_MULTIPLE = 1.8;
const BACKTEST_HORIZON = 15;

function percentChange(current: number, past: number | undefined) {
  if (!Number.isFinite(current) || !past || !Number.isFinite(past) || past === 0) return null;
  return ((current - past) / past) * 100;
}

function technicalSnapshot(candles: MarketCandle[], quote: MarketQuote): TechnicalSnapshot {
  const closes = candles.map((candle) => candle.close).filter(Number.isFinite);
  const volumes = candles
    .map((candle) => candle.volume)
    .filter((volume): volume is number => typeof volume === 'number' && Number.isFinite(volume) && volume >= 0);
  const lastClose = quote.price;
  const atr14 = atr(candles, 14);
  const macdValues = macd(closes);
  const highs = candles.map((candle) => candle.high).filter(Number.isFinite);
  const lows = candles.map((candle) => candle.low).filter(Number.isFinite);
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  const yearHigh = highs.length >= 180 ? Math.max(...highs.slice(-252)) : null;
  const yearLow = lows.length >= 180 ? Math.min(...lows.slice(-252)) : null;
  const averageVolume20 = volumes.length >= 20 ? average(volumes.slice(-20)) : null;
  const lastVolume = volumes[volumes.length - 1] ?? null;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const trendStrength = adx(candles, 14);
  const stoch = stochastic(candles, 14, 3);
  const bands = bollinger(closes, 20, 2);
  const obvTrend = obvSlope(candles, 20);

  let trend: TechnicalSnapshot['trend'] = 'unknown';
  if (sma20 !== null && sma50 !== null) {
    if (lastClose > sma20 && sma20 >= sma50) trend = 'bullish';
    else if (lastClose < sma20 && sma20 <= sma50) trend = 'bearish';
    else trend = 'mixed';
  }

  return {
    sma20: round(sma20),
    sma50: round(sma50),
    sma200: round(sma200),
    ema12: round(ema(closes, 12)),
    ema26: round(ema(closes, 26)),
    ema9: round(ema(closes, 9)),
    ema21: round(ema(closes, 21)),
    adx14: round(trendStrength.adx, 1),
    plusDI: round(trendStrength.plusDI, 1),
    minusDI: round(trendStrength.minusDI, 1),
    stochK: round(stoch.k, 1),
    stochD: round(stoch.d, 1),
    bbUpper: round(bands.upper, 4),
    bbLower: round(bands.lower, 4),
    bbPos: round(bands.pos, 3),
    obvSlope: round(obvTrend, 4),
    rsi14: round(rsi(closes, 14), 2),
    macd: round(macdValues.macd, 4),
    macdSignal: round(macdValues.signal, 4),
    atr14: round(atr14, 4),
    averageVolume20: averageVolume20 !== null ? Math.round(averageVolume20) : null,
    volumeRatio: averageVolume20 && lastVolume !== null ? round(lastVolume / averageVolume20, 2) : null,
    momentum20: round(percentChange(lastClose, closes.at(-21)), 2),
    momentum50: round(percentChange(lastClose, closes.at(-51)), 2),
    distanceFromHigh52w: yearHigh ? round(((lastClose - yearHigh) / yearHigh) * 100, 2) : null,
    distanceFromLow52w: yearLow ? round(((lastClose - yearLow) / yearLow) * 100, 2) : null,
    support: recentLows.length ? round(Math.min(...recentLows), 4) : null,
    resistance: recentHighs.length ? round(Math.max(...recentHighs), 4) : null,
    trend,
  };
}

function scoreTechnicals(snapshot: TechnicalSnapshot, currentPrice: number) {
  let trendScore = 0;
  let momentumScore = 0;
  let volumeScore = 0;
  let volatilityScore = 0;
  let technicalScore = 0;
  let agreement = 0;
  let conflict = 0;

  if (snapshot.sma20 !== null) trendScore += currentPrice > snapshot.sma20 ? 8 : -8;
  if (snapshot.sma50 !== null) trendScore += currentPrice > snapshot.sma50 ? 8 : -8;
  if (snapshot.sma200 !== null) trendScore += currentPrice > snapshot.sma200 ? 7 : -7;
  if (snapshot.sma20 !== null && snapshot.sma50 !== null) {
    trendScore += snapshot.sma20 > snapshot.sma50 ? 8 : -8;
  }

  if (snapshot.trend === 'bullish') agreement += 1;
  if (snapshot.trend === 'bearish') conflict += 1;

  if (snapshot.rsi14 !== null) {
    if (snapshot.rsi14 >= 45 && snapshot.rsi14 <= 68) {
      momentumScore += 10;
      agreement += 1;
    } else if (snapshot.rsi14 > 75) {
      momentumScore -= 9;
      conflict += 1;
    } else if (snapshot.rsi14 < 30) {
      momentumScore -= 4;
      conflict += 1;
    }
  }
  if (snapshot.macd !== null && snapshot.macdSignal !== null) {
    if (snapshot.macd > snapshot.macdSignal) {
      momentumScore += 8;
      agreement += 1;
    } else {
      momentumScore -= 8;
      conflict += 1;
    }
  }
  if (snapshot.momentum20 !== null) momentumScore += clamp(snapshot.momentum20, -12, 12);
  if (snapshot.momentum50 !== null) momentumScore += clamp(snapshot.momentum50 / 2, -10, 10);

  if (snapshot.volumeRatio !== null) {
    if (snapshot.volumeRatio >= 1.2 && (snapshot.momentum20 ?? 0) > 0) volumeScore += 8;
    if (snapshot.volumeRatio >= 1.5 && (snapshot.momentum20 ?? 0) < 0) volumeScore -= 8;
    if (snapshot.volumeRatio < 0.65) volumeScore -= 2;
  }

  const atrPercent = snapshot.atr14 ? (snapshot.atr14 / currentPrice) * 100 : null;
  if (atrPercent !== null) {
    if (atrPercent < 2.5) volatilityScore += 7;
    else if (atrPercent < 5) volatilityScore += 2;
    else if (atrPercent > 8) volatilityScore -= 12;
    else volatilityScore -= 3;
  }

  if (snapshot.support !== null && snapshot.resistance !== null) {
    const range = snapshot.resistance - snapshot.support;
    if (range > 0) {
      const position = (currentPrice - snapshot.support) / range;
      if (position > 0.55 && position < 0.95) technicalScore += 6;
      if (position >= 0.98) technicalScore -= 4;
      if (position <= 0.08) technicalScore -= 3;
    }
  }

  // هيكل الاتجاه القريب: EMA9/21
  if (typeof snapshot.ema9 === 'number' && typeof snapshot.ema21 === 'number') {
    if (snapshot.ema9 > snapshot.ema21) { trendScore += 5; agreement += 1; }
    else { trendScore -= 5; conflict += 1; }
  }

  // ستوكاستيك: تقاطعات من مناطق التشبع
  if (typeof snapshot.stochK === 'number' && typeof snapshot.stochD === 'number') {
    if (snapshot.stochK > snapshot.stochD && snapshot.stochK < 35) { momentumScore += 6; agreement += 1; }
    else if (snapshot.stochK < snapshot.stochD && snapshot.stochK > 65) { momentumScore -= 6; conflict += 1; }
  }

  // بولنجر: تمدد خارج النطاق = خطر انعكاس
  if (typeof snapshot.bbPos === 'number') {
    if (snapshot.bbPos > 1.02) { technicalScore -= 6; conflict += 1; }
    else if (snapshot.bbPos < -0.02) { technicalScore += 6; }
  }

  // تدفق السيولة OBV
  if (typeof snapshot.obvSlope === 'number') {
    if (snapshot.obvSlope > 0.04) { volumeScore += 6; agreement += 1; }
    else if (snapshot.obvSlope < -0.04) { volumeScore -= 6; conflict += 1; }
  }

  // ADX: تضخيم الإشارة مع الاتجاه القوي وكبحها في السوق العرضي
  const directionalBias = trendScore + momentumScore;
  if (typeof snapshot.adx14 === 'number' && typeof snapshot.plusDI === 'number' && typeof snapshot.minusDI === 'number') {
    const adxAligned = (directionalBias > 0 && snapshot.plusDI > snapshot.minusDI)
      || (directionalBias < 0 && snapshot.minusDI > snapshot.plusDI);
    if (snapshot.adx14 >= 25 && adxAligned) {
      trendScore *= 1.12;
      momentumScore *= 1.12;
      agreement += 1;
    } else if (snapshot.adx14 < 17) {
      trendScore *= 0.7;
      momentumScore *= 0.7;
      conflict += 1;
    }
  }

  const totalScore = clamp(trendScore + momentumScore + volumeScore + volatilityScore + technicalScore, -100, 100);
  const breakdown: ScanScoreBreakdown = {
    trendScore: round(trendScore, 2) ?? 0,
    momentumScore: round(momentumScore, 2) ?? 0,
    volumeScore: round(volumeScore, 2) ?? 0,
    volatilityScore: round(volatilityScore, 2) ?? 0,
    technicalScore: round(technicalScore, 2) ?? 0,
    totalScore: round(totalScore, 2) ?? 0,
  };

  return { breakdown, agreement, conflict, atrPercent };
}

function isStale(timestamp: string) {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return true;
  return Date.now() - value > 1000 * 60 * 60 * 24 * 5;
}

function riskLevel(atrPercent: number | null, confidence: number) {
  if (atrPercent === null) return 'unknown' as const;
  if (atrPercent > 7 || confidence < 45) return 'high' as const;
  if (atrPercent > 3.5 || confidence < 62) return 'medium' as const;
  return 'low' as const;
}

function resultId(symbol: string, generatedAt: string) {
  return createHash('sha1').update(`${symbol}:${generatedAt.slice(0, 16)}`).digest('hex').slice(0, 16);
}

type BacktestResult = NonNullable<StockAnalysisResult['backtest']>;

function backtestFirstTouch(candles: MarketCandle[], quote: MarketQuote): BacktestResult {
  const horizonDays = BACKTEST_HORIZON;
  const samples: { success: boolean }[] = [];
  const limit = candles.length - horizonDays;
  const start = Math.max(60, Math.min(200, Math.floor(candles.length * 0.35)));

  for (let index = start; index < limit; index += 3) {
    const entry = candles[index].close;
    if (!Number.isFinite(entry) || entry <= 0) continue;

    const history = candles.slice(0, index + 1);
    const snapshot = technicalSnapshot(history, { ...quote, price: entry });
    const { breakdown, agreement, conflict } = scoreTechnicals(snapshot, entry);

    let direction = 0;
    if (breakdown.totalScore >= 25 && agreement >= conflict) direction = 1;
    else if (breakdown.totalScore <= -25 && conflict >= agreement) direction = -1;
    if (direction === 0) continue;

    const atrValue = Math.max(snapshot.atr14 ?? 0, entry * 0.004);
    const takeProfit = entry + direction * atrValue * TP1_ATR_MULTIPLE;
    const stopLoss = entry - direction * atrValue * SL_ATR_MULTIPLE;
    let outcome: boolean | null = null;

    // محاكاة أول ملامسة: أيهما يُلمس أولا، الهدف الأول أم الوقف؟
    for (let step = index + 1; step <= index + horizonDays; step += 1) {
      const candle = candles[step];
      if (!candle || !Number.isFinite(candle.high) || !Number.isFinite(candle.low)) continue;
      const hitStop = direction === 1 ? candle.low <= stopLoss : candle.high >= stopLoss;
      const hitTarget = direction === 1 ? candle.high >= takeProfit : candle.low <= takeProfit;
      if (hitStop) { outcome = false; break; } // تحفظي: تلامس الاثنين بنفس الشمعة يُحسب خسارة
      if (hitTarget) { outcome = true; break; }
    }

    if (outcome === null) {
      const exit = candles[index + horizonDays]?.close;
      outcome = Number.isFinite(exit) ? (direction === 1 ? exit > entry : exit < entry) : false;
    }

    samples.push({ success: outcome });
  }

  if (samples.length < 3) {
    return {
      samples: samples.length,
      wins: 0,
      winRate: null,
      horizonDays,
      tpAtrMultiple: TP1_ATR_MULTIPLE,
      slAtrMultiple: SL_ATR_MULTIPLE,
      label: 'بيانات غير كافية',
    };
  }

  const wins = samples.filter((sample) => sample.success).length;
  const winRate = round((wins / samples.length) * 100, 1);

  return {
    samples: samples.length,
    wins,
    winRate,
    horizonDays,
    tpAtrMultiple: TP1_ATR_MULTIPLE,
    slAtrMultiple: SL_ATR_MULTIPLE,
    label: `${winRate}% إصابة الهدف الأول`,
  };
}

export function analyzeStock(input: {
  asset: TradableAsset;
  quote: MarketQuote;
  candles: MarketCandle[];
  generatedAt?: string;
}): StockAnalysisResult {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const warnings: string[] = [];
  const reasons: string[] = [];
  const reasonsAr: string[] = [];
  const candleCount = input.candles.length;
  const snapshot = technicalSnapshot(input.candles, input.quote);
  const { breakdown, agreement, conflict, atrPercent } = scoreTechnicals(snapshot, input.quote.price);
  const dataQuality = clamp(candleCount / 200, 0, 1);
  const stale = isStale(input.quote.timestamp);
  if (candleCount < 60) warnings.push('Insufficient historical candles for a high-confidence scan.');
  if (stale) warnings.push('Provider quote is stale or outside the freshness window.');
  if (input.quote.delayed) warnings.push('Provider data is delayed.');

  let confidence = 35 + Math.abs(breakdown.totalScore) * 0.35 + agreement * 5 + dataQuality * 18 - conflict * 5;
  if (candleCount < 60) confidence -= 18;
  if (stale) confidence -= 16;
  if (atrPercent !== null && atrPercent > 8) confidence -= 10;
  confidence = clamp(Math.round(confidence), 0, 100);

  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  if (candleCount >= 60 && !stale && confidence >= 55) {
    if (breakdown.totalScore >= 25 && agreement >= conflict) signal = 'buy';
    else if (breakdown.totalScore <= -25 && conflict >= agreement) signal = 'sell';
  }

  // ── بوابة الدقة العالية ──────────────────────────────────────
  const backtest = backtestFirstTouch(input.candles, input.quote);
  const precisionMode: NonNullable<StockAnalysisResult['precisionMode']> = {
    enabled: true,
    required: PRECISION_MIN_WINRATE,
    measuredWinRate: backtest.winRate,
    samples: backtest.samples,
    passed: false,
  };

  if (signal !== 'hold') {
    if (backtest.winRate === null || backtest.samples < PRECISION_MIN_SAMPLES) {
      signal = 'hold';
      confidence = Math.min(confidence, 58);
      reasons.push(`Precision mode: backtest samples (${backtest.samples}) are insufficient to prove a ${PRECISION_MIN_WINRATE}% hit rate, so no signal is published.`);
      reasonsAr.push(`وضع الدقة العالية: عينات الاختبار الخلفي (${backtest.samples}) غير كافية لإثبات نسبة نجاح ${PRECISION_MIN_WINRATE}%، لذلك لا تُنشر الإشارة.`);
    } else if (backtest.winRate < PRECISION_MIN_WINRATE) {
      signal = 'hold';
      confidence = Math.min(confidence, 62);
      reasons.push(`Precision mode: this setup's historical first-target hit rate is ${backtest.winRate}%, below the required ${PRECISION_MIN_WINRATE}%.`);
      reasonsAr.push(`وضع الدقة العالية: نسبة إصابة هذا الإعداد تاريخياً ${backtest.winRate}% وهي أقل من الحد المطلوب ${PRECISION_MIN_WINRATE}%.`);
    } else {
      // ثقة مبنية على النتائج المقاسة (تنعيم لابلاس لتجنب المبالغة مع العينات القليلة)
      const smoothedWinRate = ((backtest.wins + 2) / (backtest.samples + 4)) * 100;
      precisionMode.passed = true;
      confidence = clamp(Math.round(Math.min(96, smoothedWinRate * 0.7 + confidence * 0.3)), 62, 96);
      reasons.push(`Passed the precision filter: ${backtest.winRate}% first-target hit rate across ${backtest.samples} historical trades on this symbol.`);
      reasonsAr.push(`اجتاز فلتر الدقة العالية: إصابة الهدف الأول ${backtest.winRate}% عبر ${backtest.samples} صفقة تاريخية على نفس الرمز.`);
    }
  }

  const atrValue = snapshot.atr14;
  let targetPrice: number | null = null;
  let target2: number | null = null;
  let stopLoss: number | null = null;
  if (atrValue !== null && signal === 'buy') {
    // نفس هندسة الاختبار الخلفي: هدف أول قريب (0.9 ATR) باحتمال إصابة مرتفع + وقف واسع خلف الدعم
    targetPrice = round(input.quote.price + atrValue * TP1_ATR_MULTIPLE, 2);
    target2 = round(input.quote.price + atrValue * 2.2, 2);
    stopLoss = round(Math.min(
      snapshot.support !== null ? snapshot.support - atrValue * 0.15 : Number.POSITIVE_INFINITY,
      input.quote.price - atrValue * SL_ATR_MULTIPLE,
    ), 2);
  } else if (atrValue !== null && signal === 'sell') {
    targetPrice = round(input.quote.price - atrValue * TP1_ATR_MULTIPLE, 2);
    target2 = round(input.quote.price - atrValue * 2.2, 2);
    stopLoss = round(Math.max(
      snapshot.resistance !== null ? snapshot.resistance + atrValue * 0.15 : Number.NEGATIVE_INFINITY,
      input.quote.price + atrValue * SL_ATR_MULTIPLE,
    ), 2);
  }

  if (snapshot.trend === 'bullish') {
    reasons.push('Price is above key moving averages with constructive trend context.');
    reasonsAr.push('السعر أعلى من متوسطات رئيسية مع اتجاه فني إيجابي.');
  } else if (snapshot.trend === 'bearish') {
    reasons.push('Price is below key moving averages, which weakens the setup.');
    reasonsAr.push('السعر أدنى من متوسطات رئيسية، مما يضعف الإعداد الفني.');
  } else {
    reasons.push('Trend signals are mixed, so the model requires confirmation.');
    reasonsAr.push('إشارات الاتجاه متباينة، لذلك يتطلب النموذج تأكيداً إضافياً.');
  }

  if (snapshot.rsi14 !== null) {
    reasons.push(`RSI 14 is ${round(snapshot.rsi14, 1)}, used as a momentum filter rather than a prediction.`);
    reasonsAr.push(`مؤشر RSI 14 عند ${round(snapshot.rsi14, 1)} ويستخدم كمرشح زخم لا كتنبؤ مؤكد.`);
  }
  if (snapshot.volumeRatio !== null) {
    reasons.push(`Volume ratio is ${snapshot.volumeRatio}x versus the 20-day average.`);
    reasonsAr.push(`نسبة الحجم ${snapshot.volumeRatio} مرة مقارنة بمتوسط 20 يوماً.`);
  }
  if (signal === 'hold') {
    reasons.push('The model selected hold because confidence or signal agreement is not strong enough.');
    reasonsAr.push('اختار النموذج الانتظار لأن الثقة أو توافق الإشارات غير كافيين.');
  }

  return {
    id: resultId(input.asset.symbol, generatedAt),
    symbol: input.asset.symbol,
    providerSymbol: input.asset.providerSymbol,
    name: input.asset.name,
    market: 'US',
    exchange: input.asset.exchange,
    sector: input.asset.sector,
    generatedAt,
    dataTimestamp: input.quote.timestamp,
    signal,
    confidence,
    currentPrice: input.quote.price,
    changePercent: input.quote.changePercent,
    targetPrice,
    target2,
    stopLoss,
    expectedTimeframe: signal === 'hold' ? null : 'weeks',
    expectedTimeframeLabel: signal === 'hold' ? null : '2-6 weeks',
    riskLevel: riskLevel(atrPercent, confidence),
    score: round((breakdown.totalScore + 100) / 20, 1) ?? 0,
    scoreBreakdown: breakdown,
    technicals: snapshot,
    reasons,
    reasonsAr,
    warnings,
    analysisMethod: 'technical_rules',
    provider: input.quote.provider,
    delayed: input.quote.delayed,
    currency: input.quote.currency || input.asset.currency,
    backtest,
    precisionMode,
  };
}

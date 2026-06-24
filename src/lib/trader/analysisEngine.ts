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
  return average(trueRanges.slice(-period));
}

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

  const atrValue = snapshot.atr14;
  let targetPrice: number | null = null;
  let stopLoss: number | null = null;
  if (atrValue !== null && signal === 'buy') {
    const resistanceTarget = snapshot.resistance && snapshot.resistance > input.quote.price
      ? snapshot.resistance
      : input.quote.price + atrValue * 2;
    targetPrice = round(Math.max(resistanceTarget, input.quote.price + atrValue * 1.25), 2);
    stopLoss = round(Math.min(snapshot.support ?? input.quote.price - atrValue * 1.5, input.quote.price - atrValue), 2);
  } else if (atrValue !== null && signal === 'sell') {
    const supportTarget = snapshot.support && snapshot.support < input.quote.price
      ? snapshot.support
      : input.quote.price - atrValue * 2;
    targetPrice = round(Math.min(supportTarget, input.quote.price - atrValue * 1.25), 2);
    stopLoss = round(Math.max(snapshot.resistance ?? input.quote.price + atrValue * 1.5, input.quote.price + atrValue), 2);
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
    targetPrice,
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
  };
}

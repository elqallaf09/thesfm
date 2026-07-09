export type RecommendationSignal = 'buy' | 'sell' | 'watch';
export type RecommendationRiskLevel = 'low' | 'medium' | 'high';
export type RecommendationDataQuality = 'complete' | 'delayed' | 'partial' | 'cached' | 'unavailable';

export type RecommendationPricePoint = {
  date?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close: number;
  volume?: number | null;
};

export type RecommendationNewsSentiment = {
  status: 'available' | 'unavailable';
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  score: number;
  summaryEn: string;
  summaryAr: string;
  articleCount: number;
  provider: string | null;
  updatedAt: string | null;
};

export type RecommendationStrategy = {
  id: string;
  nameEn: string;
  nameAr: string;
  signal: RecommendationSignal;
  score: number;
  available: boolean;
  weight: number;
  noteEn: string;
  noteAr: string;
};

export type MultiFactorRecommendation = {
  finalRecommendation: 'Strong Buy' | 'Buy' | 'Weak Buy' | 'Watch' | 'Weak Sell' | 'Sell' | 'Insufficient data';
  finalRecommendationAr: string;
  signal: RecommendationSignal;
  confidence: number | null;
  finalScore: number | null;
  riskLevel: RecommendationRiskLevel;
  strategyCount: number;
  marketRegime: { regime: MarketRegime; adx: number | null; labelEn: string; labelAr: string };
  strategyAgreement: {
    label: 'Strong agreement' | 'Moderate agreement' | 'Mixed consensus' | 'Limited consensus' | 'Insufficient data';
    labelAr: string;
    agreementPct: number | null;
    buyPct: number;
    sellPct: number;
    watchPct: number;
    strategyCount: number;
  };
  technicalAvailable: boolean;
  samples: number;
  dataQualityStatus: {
    status: RecommendationDataQuality;
    labelEn: string;
    labelAr: string;
    score: number;
  };
  technicalSummary: {
    summaryEn: string;
    summaryAr: string;
    indicators: {
      ema20: number | null;
      ema50: number | null;
      ema200: number | null;
      rsi14: number | null;
      macd: number | null;
      macdSignal: number | null;
      priceMomentum20: number | null;
      support: number | null;
      resistance: number | null;
      volumeRatio: number | null;
      atr: number | null;
    };
  };
  newsSentimentSummary: RecommendationNewsSentiment;
  explanationEn: string;
  explanationAr: string;
  disclaimerEn: string;
  disclaimerAr: string;
  scoreBreakdown: {
    trend: number;
    momentum: number;
    supportResistance: number;
    volume: number;
    newsSentiment: number;
    dataQuality: number;
    risk: number;
    finalScore: number | null;
  };
  strategies: RecommendationStrategy[];
  targetPrice: number | null;
  stopLoss: number | null;
  expectedMovePct: number | null;
};

type BuildRecommendationInput = {
  price: number | null;
  changePercent?: number | null;
  history: RecommendationPricePoint[];
  dataQuality: Exclude<RecommendationDataQuality, 'complete'> | 'complete';
  delayed: boolean;
  assetType: string;
  newsSentiment?: RecommendationNewsSentiment | null;
};

const WEIGHTS = {
  trend: 25,
  momentum: 20,
  supportResistance: 15,
  volume: 15,
  newsSentiment: 10,
  dataQuality: 10,
  risk: 5,
} as const;

export const UNAVAILABLE_NEWS_SENTIMENT: RecommendationNewsSentiment = {
  status: 'unavailable',
  sentiment: 'unknown',
  score: 50,
  summaryEn: 'No recent provider news or sentiment data is available.',
  summaryAr: 'لا تتوفر أخبار أو بيانات معنويات حديثة من المزود.',
  articleCount: 0,
  provider: null,
  updatedAt: null,
};

const DISCLAIMER_EN = 'This automated market reading is for information only and is not financial advice.';
const DISCLAIMER_AR = 'هذه قراءة سوق آلية لأغراض معلوماتية فقط وليست نصيحة مالية.';

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

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

function emaSeries(values: number[], period: number) {
  if (values.length < period) return [];
  const seed = average(values.slice(0, period));
  if (seed === null) return [];
  const alpha = 2 / (period + 1);
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
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }
  if (averageLoss === 0) return averageGain > 0 ? 100 : 50;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

function macd(values: number[]) {
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  if (!fast.length || !slow.length) return { value: null, signal: null };
  const offset = fast.length - slow.length;
  const line = slow.map((value, index) => fast[index + offset] - value);
  const signal = emaSeries(line, 9);
  return {
    value: line.at(-1) ?? null,
    signal: signal.at(-1) ?? null,
  };
}

function standardDeviation(values: number[]) {
  const avg = average(values);
  if (avg === null) return null;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function atr(points: RecommendationPricePoint[], period = 14) {
  if (points.length <= period) return null;
  const ranges: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    const high = finiteNumber(current.high) ?? current.close;
    const low = finiteNumber(current.low) ?? current.close;
    ranges.push(Math.max(high - low, Math.abs(high - previous.close), Math.abs(low - previous.close)));
  }
  if (ranges.length < period) return average(ranges);
  let value = average(ranges.slice(0, period)) ?? 0;
  for (let index = period; index < ranges.length; index += 1) {
    value = (value * (period - 1) + ranges[index]) / period;
  }
  return value;
}

export type MarketRegime = 'trending' | 'ranging' | 'mixed' | 'unknown';

// ADX بطريقة وايلدر من نقاط تحتوي high/low/close؛ يرجع null عند نقص البيانات.
export function adxFromPoints(points: RecommendationPricePoint[], period = 14): number | null {
  const rows = points
    .map(point => ({ high: finiteNumber(point.high), low: finiteNumber(point.low), close: finiteNumber(point.close) }))
    .filter((row): row is { high: number; low: number; close: number } =>
      row.high !== null && row.low !== null && row.close !== null && row.high >= row.low);
  if (rows.length < period * 2 + 1) return null;
  let trInit = 0, plusInit = 0, minusInit = 0;
  let smoothedTr = 0, smoothedPlus = 0, smoothedMinus = 0;
  const dxValues: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const upMove = rows[i].high - rows[i - 1].high;
    const downMove = rows[i - 1].low - rows[i].low;
    const plusDm = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDm = downMove > upMove && downMove > 0 ? downMove : 0;
    const trueRange = Math.max(
      rows[i].high - rows[i].low,
      Math.abs(rows[i].high - rows[i - 1].close),
      Math.abs(rows[i].low - rows[i - 1].close),
    );
    if (i <= period) {
      trInit += trueRange; plusInit += plusDm; minusInit += minusDm;
      if (i === period) { smoothedTr = trInit; smoothedPlus = plusInit; smoothedMinus = minusInit; }
      continue;
    }
    smoothedTr = smoothedTr - smoothedTr / period + trueRange;
    smoothedPlus = smoothedPlus - smoothedPlus / period + plusDm;
    smoothedMinus = smoothedMinus - smoothedMinus / period + minusDm;
    if (smoothedTr <= 0) continue;
    const plusDi = (smoothedPlus / smoothedTr) * 100;
    const minusDi = (smoothedMinus / smoothedTr) * 100;
    const diSum = plusDi + minusDi;
    if (diSum <= 0) continue;
    dxValues.push((Math.abs(plusDi - minusDi) / diSum) * 100);
  }
  if (dxValues.length < period) return null;
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) adx = (adx * (period - 1) + dxValues[i]) / period;
  return Math.round(adx * 10) / 10;
}

export function marketRegimeFromAdx(value: number | null): MarketRegime {
  if (value === null) return 'unknown';
  if (value >= 25) return 'trending';
  if (value < 20) return 'ranging';
  return 'mixed';
}

function regimeLabels(regime: MarketRegime) {
  if (regime === 'trending') return { labelEn: 'Trending market', labelAr: 'سوق ذو اتجاه' };
  if (regime === 'ranging') return { labelEn: 'Ranging market', labelAr: 'سوق عرضي' };
  if (regime === 'mixed') return { labelEn: 'Transitional market', labelAr: 'سوق انتقالي' };
  return { labelEn: 'Undetermined regime', labelAr: 'نظام غير محدد' };
}

function percentChange(current: number, past: number | undefined) {
  if (!past || past <= 0) return null;
  return ((current - past) / past) * 100;
}

function signalFromScore(score: number): RecommendationSignal {
  if (score >= 60) return 'buy';
  if (score <= 40) return 'sell';
  return 'watch';
}

function unavailableStrategy(id: string, nameEn: string, nameAr: string, weight: number, noteEn: string, noteAr: string): RecommendationStrategy {
  return { id, nameEn, nameAr, signal: 'watch', score: 50, available: false, weight, noteEn, noteAr };
}

function strategy(
  id: string,
  nameEn: string,
  nameAr: string,
  weight: number,
  score: number,
  noteEn: string,
  noteAr: string,
): RecommendationStrategy {
  return { id, nameEn, nameAr, signal: signalFromScore(score), score: clamp(Math.round(score), 0, 100), available: true, weight, noteEn, noteAr };
}

function dataQualityStatus(input: BuildRecommendationInput, samples: number, technicalAvailable: boolean): MultiFactorRecommendation['dataQualityStatus'] {
  let status: RecommendationDataQuality = input.dataQuality;
  if (input.delayed && status !== 'unavailable' && status !== 'partial' && status !== 'cached') status = 'delayed';
  if (samples >= 200 && technicalAvailable && !input.delayed && status !== 'cached' && status !== 'unavailable') {
    status = 'complete';
  }
  const scores: Record<RecommendationDataQuality, number> = {
    complete: 100,
    delayed: 70,
    cached: 62,
    partial: 45,
    unavailable: 0,
  };
  const labels: Record<RecommendationDataQuality, { en: string; ar: string }> = {
    complete: { en: 'Complete', ar: 'مكتملة' },
    delayed: { en: 'Delayed provider data', ar: 'بيانات مزود متأخرة' },
    cached: { en: 'Cached provider data', ar: 'بيانات مخزنة مؤقتاً' },
    partial: { en: 'Partial', ar: 'جزئية' },
    unavailable: { en: 'Unavailable', ar: 'غير متاحة' },
  };
  return { status, labelEn: labels[status].en, labelAr: labels[status].ar, score: scores[status] };
}

function riskLevel(assetType: string, atrPercent: number | null, annualizedVolatility: number | null): RecommendationRiskLevel {
  if (/crypto/i.test(assetType) && (annualizedVolatility === null || annualizedVolatility >= 55)) return 'high';
  const riskValue = annualizedVolatility ?? (atrPercent === null ? null : atrPercent * 12);
  if (riskValue === null) return 'medium';
  if (riskValue >= 45 || (atrPercent !== null && atrPercent >= 6)) return 'high';
  if (riskValue >= 22 || (atrPercent !== null && atrPercent >= 3)) return 'medium';
  return 'low';
}

function riskScore(level: RecommendationRiskLevel) {
  if (level === 'low') return 100;
  if (level === 'medium') return 60;
  return 20;
}

function consensus(strategies: RecommendationStrategy[]): MultiFactorRecommendation['strategyAgreement'] {
  const available = strategies.filter(item => item.available);
  if (!available.length) {
    return { label: 'Insufficient data', labelAr: 'بيانات غير كافية', agreementPct: null, buyPct: 0, sellPct: 0, watchPct: 0, strategyCount: 0 };
  }

  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const scoreFor = (signal: RecommendationSignal) => available
    .filter(item => item.signal === signal)
    .reduce((sum, item) => sum + item.weight, 0);
  const buy = scoreFor('buy');
  const sell = scoreFor('sell');
  const watch = scoreFor('watch');
  const top = Math.max(buy, sell, watch);
  let agreementPct = totalWeight > 0 ? Math.round((top / totalWeight) * 100) : null;
  if (agreementPct !== null && available.length < 3) agreementPct = Math.min(agreementPct, 66);

  const label = available.length < 3
    ? 'Limited consensus'
    : agreementPct !== null && agreementPct >= 75
      ? 'Strong agreement'
      : agreementPct !== null && agreementPct >= 60
        ? 'Moderate agreement'
        : 'Mixed consensus';
  const labelAr = label === 'Limited consensus'
    ? 'توافق محدود'
    : label === 'Strong agreement'
      ? 'توافق قوي'
      : label === 'Moderate agreement'
        ? 'توافق متوسط'
        : 'توافق مختلط';

  return {
    label,
    labelAr,
    agreementPct,
    buyPct: totalWeight > 0 ? Math.round((buy / totalWeight) * 100) : 0,
    sellPct: totalWeight > 0 ? Math.round((sell / totalWeight) * 100) : 0,
    watchPct: totalWeight > 0 ? Math.round((watch / totalWeight) * 100) : 0,
    strategyCount: available.length,
  };
}

function yearlyVolatility(closes: number[]) {
  if (closes.length < 3) return null;
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index - 1] > 0) returns.push((closes[index] - closes[index - 1]) / closes[index - 1]);
  }
  const std = standardDeviation(returns);
  return std === null ? null : std * Math.sqrt(252) * 100;
}

function targetAndStop(signal: RecommendationSignal, price: number, support: number | null, resistance: number | null, atrValue: number | null) {
  if (signal === 'watch') return { targetPrice: null, stopLoss: null, expectedMovePct: null };
  const range = Math.max(atrValue ?? 0, price * 0.015);
  const direction = signal === 'buy' ? 1 : -1;
  const targetPrice = round(price + direction * range * 1.4, 4);
  const fallbackStop = price - direction * range * 1.4;
  const structuralStop = signal === 'buy'
    ? support === null ? fallbackStop : Math.min(fallbackStop, support - range * 0.15)
    : resistance === null ? fallbackStop : Math.max(fallbackStop, resistance + range * 0.15);
  const stopLoss = round(structuralStop, 4);
  return {
    targetPrice,
    stopLoss,
    expectedMovePct: targetPrice === null ? null : round(((targetPrice - price) / price) * 100, 2),
  };
}

export function buildMultiFactorRecommendation(input: BuildRecommendationInput): MultiFactorRecommendation {
  const price = input.price;
  const cleanHistory = input.history
    .map(point => ({ ...point, close: finiteNumber(point.close) ?? 0 }))
    .filter(point => point.close > 0);
  const closes = cleanHistory.map(point => point.close);
  const samples = closes.length;
  const news = input.newsSentiment ?? UNAVAILABLE_NEWS_SENTIMENT;
  // نظام السوق عبر ADX: يوجّه ترجيح الاستراتيجيات المتضادة (زخم/عودة، اختراق/ارتداد)
  const adxValue = adxFromPoints(cleanHistory);
  const regime = marketRegimeFromAdx(adxValue);
  const regimeMeta = { regime, adx: adxValue, ...regimeLabels(regime) };

  if (price === null || price <= 0 || samples === 0 || input.dataQuality === 'unavailable') {
    const quality = dataQualityStatus({ ...input, dataQuality: 'unavailable' }, samples, false);
    return {
      finalRecommendation: 'Insufficient data',
      finalRecommendationAr: 'بيانات غير كافية',
      marketRegime: { regime: 'unknown', adx: null, ...regimeLabels('unknown') },
      signal: 'watch',
      confidence: null,
      finalScore: null,
      riskLevel: 'medium',
      strategyCount: 0,
      strategyAgreement: consensus([]),
      technicalAvailable: false,
      samples,
      dataQualityStatus: quality,
      technicalSummary: {
        summaryEn: 'Technical indicators are unavailable because no usable price history was returned.',
        summaryAr: 'المؤشرات الفنية غير متاحة لأن المزود لم يرجع تاريخ أسعار صالحاً.',
        indicators: { ema20: null, ema50: null, ema200: null, rsi14: null, macd: null, macdSignal: null, priceMomentum20: null, support: null, resistance: null, volumeRatio: null, atr: null },
      },
      newsSentimentSummary: news,
      explanationEn: 'The provider did not return enough real market data, so the system shows Insufficient data instead of a Buy or Sell signal.',
      explanationAr: 'لم يرجع المزود بيانات سوق حقيقية كافية، لذلك يعرض النظام بيانات غير كافية بدلاً من إشارة شراء أو بيع.',
      disclaimerEn: DISCLAIMER_EN,
      disclaimerAr: DISCLAIMER_AR,
      scoreBreakdown: { trend: 0, momentum: 0, supportResistance: 0, volume: 0, newsSentiment: 0, dataQuality: quality.score, risk: 0, finalScore: null },
      strategies: [],
      targetPrice: null,
      stopLoss: null,
      expectedMovePct: null,
    };
  }

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const rsi14 = rsi(closes, 14);
  const macdValues = macd(closes);
  const momentum20 = percentChange(price, closes.at(-21));
  const atrValue = atr(cleanHistory, 14);
  const atrPercent = atrValue !== null ? (atrValue / price) * 100 : null;
  const highs = cleanHistory.map(point => finiteNumber(point.high) ?? point.close);
  const lows = cleanHistory.map(point => finiteNumber(point.low) ?? point.close);
  const support = lows.length >= 20 ? Math.min(...lows.slice(-20)) : null;
  const resistance = highs.length >= 20 ? Math.max(...highs.slice(-20)) : null;
  const priorHigh = highs.length >= 22 ? Math.max(...highs.slice(-21, -1)) : null;
  const priorLow = lows.length >= 22 ? Math.min(...lows.slice(-21, -1)) : null;
  const volumes = cleanHistory.map(point => finiteNumber(point.volume)).filter((value): value is number => value !== null && value >= 0);
  const latestVolume = finiteNumber(cleanHistory.at(-1)?.volume);
  const averageVolume20 = volumes.length >= 20 ? average(volumes.slice(-20)) : null;
  const volumeRatio = latestVolume !== null && averageVolume20 && averageVolume20 > 0 ? latestVolume / averageVolume20 : null;
  const closeStd20 = closes.length >= 20 ? standardDeviation(closes.slice(-20)) : null;
  const technicalAvailable = [ema20, ema50, rsi14, macdValues.value, macdValues.signal, support, resistance].filter(value => value !== null).length >= 5;
  const quality = dataQualityStatus(input, samples, technicalAvailable);
  const risk = riskLevel(input.assetType, atrPercent, yearlyVolatility(closes));

  const trend = ema20 !== null && ema50 !== null && ema200 !== null
    ? strategy(
        'trend',
        'Trend following',
        'اتباع الاتجاه',
        25,
        (() => {
          // درجة متصلة بدل السلالم: هيكل ترتيب المتوسطات يحدد المنطقة،
          // والمسافة المعيارية (ميل EMA20-50 + امتداد السعر عن EMA200 بوحدات ATR)
          // تحدد الشدة عبر سيجمويد كسري بطيء التشبع، فيتمايز الترند القوي عن المعتدل.
          const atrRef = atrValue !== null && atrValue > 0 ? atrValue : price * 0.01;
          const gap1 = (ema20 - ema50) / atrRef;
          const gap2 = (ema50 - ema200) / atrRef;
          const raw = gap1 + (price - ema200) / (atrRef * 6);
          const intensity = raw / (1 + Math.abs(raw));
          // بوابة ضجيج: التكديس لا يُحتسب هيكلاً إلا إذا تجاوزت فجوات المتوسطات
          // 0.15×ATR — تذبذب عرضي ضيق لا يجب أن يأخذ درجات ترند كاملة.
          const NOISE = 0.15;
          if (price > ema20 && gap1 > NOISE && gap2 > NOISE) return 68 + 24 * Math.max(0, intensity);
          if (price < ema20 && gap1 < -NOISE && gap2 < -NOISE) return 32 - 24 * Math.max(0, -intensity);
          if (price > ema200 && gap1 >= 0) return 52 + 16 * Math.max(0, intensity);
          if (price < ema200 && gap1 <= 0) return 48 - 16 * Math.max(0, -intensity);
          return 50 + 8 * Math.max(-1, Math.min(1, intensity));
        })(),
        `EMA20 ${round(ema20, 4)}, EMA50 ${round(ema50, 4)}, EMA200 ${round(ema200, 4)}.`,
        `EMA20 ${round(ema20, 4)}، EMA50 ${round(ema50, 4)}، EMA200 ${round(ema200, 4)}.`,
      )
    : unavailableStrategy('trend', 'Trend following', 'اتباع الاتجاه', 25, 'EMA20/50/200 history is incomplete.', 'تاريخ EMA20/50/200 غير مكتمل.');

  const momentumScore = rsi14 !== null && macdValues.value !== null && macdValues.signal !== null && momentum20 !== null
    ? clamp((
        (rsi14 >= 50 && rsi14 <= 68 ? 68 : rsi14 > 75 ? 42 : rsi14 < 30 ? 55 : rsi14 >= 45 ? 55 : 38)
        + (macdValues.value > macdValues.signal ? 66 : 34)
        + (momentum20 > 2 ? 70 : momentum20 < -2 ? 30 : 50)
      ) / 3, 0, 100)
    : null;
  const momentum = momentumScore !== null
    ? strategy(
        'momentum',
        'Momentum',
        'الزخم',
        20,
        momentumScore,
        `RSI ${round(rsi14, 1)}, MACD ${macdValues.value! > macdValues.signal! ? 'positive' : 'negative'}, 20-period momentum ${round(momentum20, 2)}%.`,
        `RSI عند ${round(rsi14, 1)}، MACD ${macdValues.value! > macdValues.signal! ? 'إيجابي' : 'سلبي'}، وزخم 20 فترة ${round(momentum20, 2)}%.`,
      )
    : unavailableStrategy('momentum', 'Momentum', 'الزخم', 20, 'RSI, MACD, or price momentum is unavailable.', 'RSI أو MACD أو زخم السعر غير متاح.');

  let supportScore: number | null = null;
  if (support !== null && resistance !== null && resistance > support) {
    const position = clamp((price - support) / (resistance - support), -0.25, 1.25);
    supportScore = position <= 0.2 ? 65 : position >= 0.85 ? 35 : price > (support + resistance) / 2 ? 56 : 48;
  }
  const supportResistance = supportScore !== null
    ? strategy(
        'support_resistance',
        'Support and resistance',
        'الدعم والمقاومة',
        15,
        supportScore,
        `Nearest support ${round(support, 4)} and resistance ${round(resistance, 4)}.`,
        `أقرب دعم ${round(support, 4)} وأقرب مقاومة ${round(resistance, 4)}.`,
      )
    : unavailableStrategy('support_resistance', 'Support and resistance', 'الدعم والمقاومة', 15, 'Support and resistance need at least 20 valid candles.', 'الدعم والمقاومة يحتاجان إلى 20 شمعة صالحة على الأقل.');

  let breakoutScore: number | null = null;
  let breakoutNoteEn = 'No confirmed breakout.';
  let breakoutNoteAr = 'لا يوجد اختراق مؤكد.';
  if (priorHigh !== null && priorLow !== null && volumeRatio !== null) {
    if (price > priorHigh && volumeRatio >= 1.5) {
      breakoutScore = 82;
      breakoutNoteEn = `Breakout above the 20-period high with ${round(volumeRatio, 2)}x volume.`;
      breakoutNoteAr = `اختراق أعلى قمة 20 فترة مع حجم ${round(volumeRatio, 2)} مرة.`;
    } else if (price < priorLow && volumeRatio >= 1.5) {
      breakoutScore = 18;
      breakoutNoteEn = `Breakdown below the 20-period low with ${round(volumeRatio, 2)}x volume.`;
      breakoutNoteAr = `كسر أسفل قاع 20 فترة مع حجم ${round(volumeRatio, 2)} مرة.`;
    } else if ((price > priorHigh || price < priorLow) && volumeRatio < 1.5) {
      breakoutScore = 50;
      breakoutNoteEn = `Price moved beyond a recent range, but volume confirmation is weak at ${round(volumeRatio, 2)}x.`;
      breakoutNoteAr = `تحرك السعر خارج النطاق الأخير لكن تأكيد الحجم ضعيف عند ${round(volumeRatio, 2)} مرة.`;
    } else {
      breakoutScore = 50;
    }
  }
  const breakout = breakoutScore !== null
    ? strategy('breakout', 'Breakout with volume', 'الاختراق مع الحجم', 15, breakoutScore, breakoutNoteEn, breakoutNoteAr)
    : unavailableStrategy('breakout', 'Breakout with volume', 'الاختراق مع الحجم', 15, 'Breakout detection needs high/low and volume history.', 'كشف الاختراق يحتاج إلى بيانات القمم والقيعان والحجم.');

  let meanReversionScore: number | null = null;
  if (rsi14 !== null && ema20 !== null && closeStd20 !== null && closeStd20 > 0) {
    const deviation = (price - ema20) / closeStd20;
    meanReversionScore = rsi14 <= 30 && deviation <= -1 ? 72 : rsi14 >= 70 && deviation >= 1 ? 28 : 50;
  }
  const meanReversion = meanReversionScore !== null
    ? strategy(
        'mean_reversion',
        'Mean reversion',
        'العودة للمتوسط',
        20,
        meanReversionScore,
        `RSI ${round(rsi14, 1)} with price deviation from EMA20.`,
        `RSI عند ${round(rsi14, 1)} مع انحراف السعر عن EMA20.`,
      )
    : unavailableStrategy('mean_reversion', 'Mean reversion', 'العودة للمتوسط', 20, 'Mean reversion needs RSI and 20-period dispersion.', 'العودة للمتوسط تحتاج RSI وتشتت 20 فترة.');

  let volumeScore: number | null = null;
  if (volumeRatio !== null) {
    volumeScore = volumeRatio >= 1.2 && (momentum20 ?? input.changePercent ?? 0) > 0
      ? 70
      : volumeRatio >= 1.2 && (momentum20 ?? input.changePercent ?? 0) < 0
        ? 30
        : volumeRatio < 0.65
          ? 44
          : 52;
  }
  const volume = volumeScore !== null
    ? strategy(
        'volume_confirmation',
        'Volume confirmation',
        'تأكيد الحجم',
        15,
        volumeScore,
        `Latest volume is ${round(volumeRatio, 2)}x the 20-period average.`,
        `آخر حجم يساوي ${round(volumeRatio, 2)} مرة من متوسط 20 فترة.`,
      )
    : unavailableStrategy('volume_confirmation', 'Volume confirmation', 'تأكيد الحجم', 15, 'Provider volume history is unavailable.', 'تاريخ الحجم من المزود غير متاح.');

  const newsStrategy = news.status === 'available'
    ? strategy('news_sentiment', 'News and sentiment', 'الأخبار والمعنويات', 10, news.score, news.summaryEn, news.summaryAr)
    : unavailableStrategy('news_sentiment', 'News and sentiment', 'الأخبار والمعنويات', 10, news.summaryEn, news.summaryAr);

  const dataQualityStrategy = strategy(
    'data_quality',
    'Data quality',
    'جودة البيانات',
    10,
    quality.score,
    `${quality.labelEn}; ${samples} samples.`,
    `${quality.labelAr}؛ ${samples} عينة.`,
  );
  const riskStrategy = strategy(
    'risk',
    'Risk scoring',
    'تقييم المخاطر',
    5,
    riskScore(risk),
    `Risk is ${risk}.`,
    `المخاطرة ${risk === 'high' ? 'مرتفعة' : risk === 'low' ? 'منخفضة' : 'متوسطة'}.`,
  );

  const strategies = [trend, momentum, supportResistance, breakout, meanReversion, volume, newsStrategy, dataQualityStrategy, riskStrategy];
  const strategyAgreement = consensus(strategies);
  const strategyCount = strategyAgreement.strategyCount;

  // كل فئة تُبنى من عواملها المتاحة فقط؛ الفئة غير المتاحة تُعلَّم null بدل
  // حقن 50 ثابتة تسطّح كل الرموز. الوزن يُعاد توزيعه لاحقاً على المتاح.
  const availScore = (s: RecommendationStrategy): number | null => (s.available ? s.score : null);
  // دمج مرجّح لزوج استراتيجيات متضاد: في الترند يرجح الزخم/الاختراق،
  // وفي السوق العرضي ترجح العودة للمتوسط/الارتداد عن الدعم والمقاومة.
  const pairAvail = (primary: number | null, primaryWeight: number, secondary: number | null): number | null => {
    if (primary === null && secondary === null) return null;
    if (primary === null) return secondary;
    if (secondary === null) return primary;
    const secondaryWeight = 1 - primaryWeight;
    return Math.round(primary * primaryWeight + secondary * secondaryWeight);
  };
  const momentumLean = regime === 'trending' ? 0.75 : regime === 'ranging' ? 0.25 : 0.5;
  const breakoutLean = regime === 'trending' ? 0.7 : regime === 'ranging' ? 0.3 : 0.5;
  const categoryScores = {
    trend: availScore(trend),
    momentum: pairAvail(availScore(momentum), momentumLean, availScore(meanReversion)),
    supportResistance: pairAvail(availScore(breakout), breakoutLean, availScore(supportResistance)),
    volume: availScore(volume),
    newsSentiment: newsStrategy.available ? newsStrategy.score : null,
    dataQuality: quality.score,
    risk: riskScore(risk),
  };

  // إعادة توزيع الوزن: فقط الفئات ذات الدرجة المتاحة تدخل المتوسط المرجّح،
  // فيصبح finalScore انعكاساً حقيقياً للعوامل الفنية بدل تخفيفه بأصفار محايدة.
  // أوزان الفئات حسب النظام (المجموع 100 دائماً): الترند يرفع وزن الاتجاه،
  // والسوق العرضي يرفع الدعم/المقاومة والحجم على حساب الاتجاه والزخم.
  const weights = regime === 'trending'
    ? { ...WEIGHTS, trend: 30, momentum: 23, supportResistance: 10, volume: 12 }
    : regime === 'ranging'
      ? { ...WEIGHTS, trend: 20, momentum: 17, supportResistance: 20, volume: 18 }
      : WEIGHTS;
  const weightedInputs = ([
    { score: categoryScores.trend, weight: weights.trend },
    { score: categoryScores.momentum, weight: weights.momentum },
    { score: categoryScores.supportResistance, weight: weights.supportResistance },
    { score: categoryScores.volume, weight: weights.volume },
    { score: categoryScores.newsSentiment, weight: weights.newsSentiment },
    { score: categoryScores.dataQuality, weight: weights.dataQuality },
    { score: categoryScores.risk, weight: weights.risk },
  ] as Array<{ score: number | null; weight: number }>)
    .filter((item): item is { score: number; weight: number } => item.score !== null);
  const activeWeight = weightedInputs.reduce((sum, item) => sum + item.weight, 0);
  let finalScore = activeWeight > 0
    ? Math.round(weightedInputs.reduce((sum, item) => sum + item.score * item.weight, 0) / activeWeight)
    : 50;

  if (!technicalAvailable) finalScore = Math.min(finalScore, 54);
  if (quality.status === 'partial') finalScore = Math.min(finalScore, 56);
  if (quality.status === 'cached') finalScore = Math.min(finalScore, 62);
  // البيانات المتأخرة موثوقة اتجاهياً — سقف مرتفع يسمح بالتمايز الحقيقي بدل حشر كل رمز.
  if (quality.status === 'delayed') finalScore = Math.min(finalScore, 82);
  if (risk === 'high') finalScore = Math.min(finalScore, 68);

  // الثقة تُبنى من قوة الإشارة (بعدها عن الحياد) وعدد الاستراتيجيات المتفقة.
  let confidence = Math.round(
    35
    + Math.abs(finalScore - 50) * 0.82
    + Math.min(strategyCount, 8) * 2.4
    + Math.max(0, (strategyAgreement.agreementPct ?? 0) - 50) * 0.16,
  );
  // خصومات نسبية بدل حوائط صلبة: تخفّض الثقة تناسبياً مع إبقاء ترتيب الرموز
  // بعضها فوق بعض، فلا تتجمّع كلها عند رقم واحد.
  if (strategyCount < 3) confidence = Math.min(confidence, 54);
  if (!technicalAvailable) confidence = Math.round(confidence * 0.7);
  if (quality.status === 'partial') confidence = Math.round(confidence * 0.72);
  if (quality.status === 'cached') confidence = Math.round(confidence * 0.86);
  if (quality.status === 'delayed') confidence = Math.round(confidence * 0.93);
  if (risk === 'high') confidence = Math.round(confidence * 0.9);
  confidence = clamp(confidence, 0, 95);

  // البيانات المكتملة أو المتأخرة تُعتبر قابلة للتداول (المتأخرة موثوقة اتجاهياً).
  // الجزئية/المخزّنة/الناقصة تبقى للمراقبة فقط.
  const tradeableQuality = quality.status === 'complete' || quality.status === 'delayed';

  let finalRecommendation: MultiFactorRecommendation['finalRecommendation'] = 'Watch';
  if (finalScore >= 80
    && confidence >= 68
    && strategyCount >= 3
    && technicalAvailable
    && quality.status === 'complete'
    && risk !== 'high') {
    finalRecommendation = 'Strong Buy';
  } else if (finalScore >= 68 && confidence >= 56 && technicalAvailable && strategyCount >= 3 && risk !== 'high' && tradeableQuality) {
    finalRecommendation = 'Buy';
  } else if (finalScore >= 58 && confidence >= 50 && technicalAvailable && strategyCount >= 3 && risk !== 'high' && tradeableQuality) {
    finalRecommendation = 'Weak Buy';
  } else if (finalScore <= 34 && confidence >= 56 && technicalAvailable && strategyCount >= 3 && tradeableQuality) {
    finalRecommendation = 'Sell';
  } else if (finalScore <= 42 && confidence >= 50 && technicalAvailable && strategyCount >= 3 && tradeableQuality) {
    finalRecommendation = 'Weak Sell';
  }

  // فقط انعدام البيانات الفعلي يُلغي التوصية؛ التأخير لم يعد يُجبرها على "مراقبة".
  if (samples === 0 || !technicalAvailable || quality.status === 'unavailable') finalRecommendation = 'Insufficient data';
  if ((quality.status === 'partial' || quality.status === 'cached' || strategyCount < 3)
    && finalRecommendation !== 'Insufficient data') {
    finalRecommendation = 'Watch';
  }

  const signal: RecommendationSignal = finalRecommendation === 'Buy' || finalRecommendation === 'Strong Buy' || finalRecommendation === 'Weak Buy'
    ? 'buy'
    : finalRecommendation === 'Sell' || finalRecommendation === 'Weak Sell'
      ? 'sell'
      : 'watch';
  const target = targetAndStop(signal, price, support, resistance, atrValue);
  const finalRecommendationAr = finalRecommendation === 'Strong Buy'
    ? 'شراء قوي'
    : finalRecommendation === 'Buy'
      ? 'شراء'
      : finalRecommendation === 'Weak Buy'
        ? 'شراء ضعيف'
        : finalRecommendation === 'Sell'
          ? 'بيع'
          : finalRecommendation === 'Weak Sell'
            ? 'بيع ضعيف'
            : finalRecommendation === 'Insufficient data'
              ? 'بيانات غير كافية'
              : 'مراقبة';

  const regimeTextEn = regime === 'trending'
    ? ` Market regime is trending (ADX ${adxValue}), so trend and breakout modules carry extra weight.`
    : regime === 'ranging'
      ? ` Market regime is ranging (ADX ${adxValue}), so mean-reversion and support/resistance modules carry extra weight.`
      : '';
  const regimeTextAr = regime === 'trending'
    ? ` نظام السوق ذو اتجاه (ADX ${adxValue})، لذا زاد وزن وحدتي الاتجاه والاختراق.`
    : regime === 'ranging'
      ? ` نظام السوق عرضي (ADX ${adxValue})، لذا زاد وزن وحدتي العودة للمتوسط والدعم والمقاومة.`
      : '';
  const summaryEn = (technicalAvailable
    ? `EMA trend, momentum, support/resistance, volume, and risk were scored with ${samples} real provider samples.`
    : `Technical coverage is incomplete with ${samples} real provider samples.`) + regimeTextEn;
  const summaryAr = (technicalAvailable
    ? `تم تقييم اتجاه EMA والزخم والدعم والمقاومة والحجم والمخاطر باستخدام ${samples} عينة حقيقية من المزود.`
    : `التغطية الفنية غير مكتملة مع ${samples} عينة حقيقية من المزود.`) + regimeTextAr;
  const qualityPenaltyTextEn = quality.status === 'complete' ? '' : ` Data quality is ${quality.labelEn.toLowerCase()}, so the recommendation is downgraded.`;
  const qualityPenaltyTextAr = quality.status === 'complete' ? '' : ` جودة البيانات ${quality.labelAr}، لذلك تم تخفيض قوة التوصية.`;
  const limitedTextEn = strategyCount < 3 ? ' Strategy coverage is below three modules, so consensus is limited.' : '';
  const limitedTextAr = strategyCount < 3 ? ' تغطية الاستراتيجيات أقل من ثلاث وحدات، لذلك التوافق محدود.' : '';

  return {
    finalRecommendation,
    finalRecommendationAr,
    marketRegime: regimeMeta,
    signal,
    confidence,
    finalScore,
    riskLevel: risk,
    strategyCount,
    strategyAgreement,
    technicalAvailable,
    samples,
    dataQualityStatus: quality,
    technicalSummary: {
      summaryEn,
      summaryAr,
      indicators: {
        ema20: round(ema20, 4),
        ema50: round(ema50, 4),
        ema200: round(ema200, 4),
        rsi14: round(rsi14, 1),
        macd: round(macdValues.value, 6),
        macdSignal: round(macdValues.signal, 6),
        priceMomentum20: round(momentum20, 2),
        support: round(support, 4),
        resistance: round(resistance, 4),
        volumeRatio: round(volumeRatio, 2),
        atr: round(atrValue, 4),
      },
    },
    newsSentimentSummary: news,
    explanationEn: `${finalRecommendation} was selected from the weighted score (${finalScore}/100), AI confidence ${confidence}%, ${strategyCount} available strategy modules, ${strategyAgreement.label.toLowerCase()}, and ${risk} risk.${qualityPenaltyTextEn}${limitedTextEn}`,
    explanationAr: `تم اختيار ${finalRecommendationAr} من الدرجة الموزونة (${finalScore}/100)، وثقة AI ${confidence}%، و${strategyCount} وحدات استراتيجية متاحة، و${strategyAgreement.labelAr}، ومخاطرة ${risk === 'high' ? 'مرتفعة' : risk === 'low' ? 'منخفضة' : 'متوسطة'}.${qualityPenaltyTextAr}${limitedTextAr}`,
    disclaimerEn: DISCLAIMER_EN,
    disclaimerAr: DISCLAIMER_AR,
    scoreBreakdown: {
      trend: categoryScores.trend ?? 50,
      momentum: categoryScores.momentum ?? 50,
      supportResistance: categoryScores.supportResistance ?? 50,
      volume: categoryScores.volume ?? 50,
      newsSentiment: categoryScores.newsSentiment ?? 50,
      dataQuality: categoryScores.dataQuality,
      risk: categoryScores.risk,
      finalScore,
    },
    strategies,
    targetPrice: target.targetPrice,
    stopLoss: target.stopLoss,
    expectedMovePct: target.expectedMovePct,
  };
}

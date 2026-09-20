import type {
  GoldDriver,
  GoldHorizon,
  GoldHorizonForecast,
  GoldScenario,
  GoldScenarioSnapshot,
  GoldWhatIfRequest,
  GoldWhatIfResult,
  GoldWhatIfShocks,
} from './types';

export const GOLD_HORIZON_DAYS: Record<GoldHorizon, number> = {
  // Volatility is annualized on 252 trading sessions, so horizon scaling must
  // use trading-session equivalents rather than calendar days.
  '24h': 1,
  '7d': 5,
  '1m': 21,
  '3m': 63,
  '6m': 126,
  '12m': 252,
};

const DEFAULT_SHOCKS: GoldWhatIfShocks = {
  dollarPct: 0,
  oilPct: 0,
  realYieldBps: 0,
  geopoliticalRisk: 0,
  centralBankDemand: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeProbabilityRows(rows: Array<{ id: GoldScenario['id']; raw: number }>) {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.raw), 0) || 1;
  const scaled = rows.map(row => ({ ...row, value: Math.round((Math.max(0, row.raw) / total) * 100) }));
  const delta = 100 - scaled.reduce((sum, row) => sum + row.value, 0);
  const base = scaled.find(row => row.id === 'base') ?? scaled[0];
  if (base) base.value += delta;
  return new Map(scaled.map(row => [row.id, row.value]));
}

export function calculateGoldFactorScore(drivers: GoldDriver[]) {
  const totalWeight = drivers.reduce((sum, driver) => sum + driver.weight, 0) || 1;
  const available = drivers.filter(driver => driver.available && typeof driver.score === 'number');
  const availableWeight = available.reduce((sum, driver) => sum + driver.weight, 0);
  const weighted = available.reduce((sum, driver) => sum + (driver.score ?? 0) * driver.weight, 0);
  return {
    score: availableWeight > 0 ? round(clamp(weighted / availableWeight, -1, 1), 4) : 0,
    coverage: round(clamp(availableWeight / totalWeight, 0, 1), 4),
  };
}

export function annualizedVolatilityFromCloses(closes: number[]) {
  const usable = closes.filter(value => Number.isFinite(value) && value > 0);
  if (usable.length < 20) return null;
  const returns: number[] = [];
  for (let i = 1; i < usable.length; i += 1) {
    returns.push(Math.log(usable[i] / usable[i - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  return round(Math.sqrt(variance) * Math.sqrt(252) * 100, 3);
}

function scenarioRange(
  price: number,
  annualizedVolatility: number | null,
  days: number,
  lowSigma: number,
  highSigma: number,
  driftSigma: number,
  riskAmplifier: number,
) {
  if (!annualizedVolatility || annualizedVolatility <= 0) return { low: null, high: null, midpoint: null };
  const horizonSigma = (annualizedVolatility / 100) * Math.sqrt(days / 252) * riskAmplifier;
  const midpoint = price * (1 + horizonSigma * driftSigma);
  const low = price * (1 + horizonSigma * lowSigma);
  const high = price * (1 + horizonSigma * highSigma);
  return {
    low: round(Math.max(0, Math.min(low, high)), 2),
    high: round(Math.max(low, high), 2),
    midpoint: round(Math.max(0, midpoint), 2),
  };
}

function scenarioCopy(id: GoldScenario['id'], score: number) {
  if (id === 'bull') return {
    thesis: 'Dollar/real-yield weakness and stronger safe-haven demand support gold.',
    thesisAr: 'ضعف الدولار والعوائد الحقيقية وارتفاع طلب الملاذ الآمن يدعم الذهب.',
    invalidation: 'Persistent dollar and real-yield strength weakens this scenario.',
    invalidationAr: 'يضعف السيناريو مع استمرار قوة الدولار وارتفاع العائد الحقيقي.',
  };
  if (id === 'bear') return {
    thesis: 'Dollar/real-yield strength and fading risk demand pressure gold.',
    thesisAr: 'قوة الدولار والعوائد الحقيقية وتراجع طلب الملاذ الآمن تضغط على الذهب.',
    invalidation: 'Falling real yields or a verified risk shock weakens this scenario.',
    invalidationAr: 'يضعف السيناريو مع هبوط العوائد الحقيقية أو ظهور صدمة مخاطر موثقة.',
  };
  if (id === 'tail') return {
    thesis: 'A shock can push gold outside normal volatility bands.',
    thesisAr: 'قد تدفع صدمة الذهب خارج نطاقات التذبذب المعتادة.',
    invalidation: 'This stress scenario shrinks as event risk normalizes.',
    invalidationAr: 'يتراجع وزن سيناريو الضغط عندما تهدأ مخاطر الأحداث.',
  };
  return {
    thesis: score >= 0
      ? 'Verified drivers are modestly supportive; the base follows the observed regime.'
      : 'Verified drivers are modestly restrictive; the base follows the observed regime.',
    thesisAr: score >= 0
      ? 'العوامل الموثقة تميل للدعم؛ ويتبع السيناريو الأساسي النظام المرصود.'
      : 'العوامل الموثقة تميل للضغط؛ ويتبع السيناريو الأساسي النظام المرصود.',
    invalidation: 'A persistent reversal in major drivers changes the base regime.',
    invalidationAr: 'يتغير السيناريو الأساسي عند انعكاس مستمر في العوامل الرئيسية.',
  };
}

export function buildGoldHorizonForecast(args: {
  price: number;
  annualizedVolatility: number | null;
  factorScore: number;
  horizon: GoldHorizon;
  eventRisk: number;
  upcomingHighImpactCount: number;
}): GoldHorizonForecast {
  const score = clamp(args.factorScore, -1, 1);
  const days = GOLD_HORIZON_DAYS[args.horizon];
  const eventRisk = clamp(args.eventRisk, 0, 1);
  const tailProbability = clamp(6 + eventRisk * 8 + Math.min(args.upcomingHighImpactCount, 4) * 1.5, 5, 20);
  const remaining = 100 - tailProbability;
  const raw = normalizeProbabilityRows([
    { id: 'base', raw: Math.max(0.16, 0.44 - Math.abs(score) * 0.14) },
    { id: 'bull', raw: Math.max(0.08, 0.28 + score * 0.22) },
    { id: 'bear', raw: Math.max(0.08, 0.28 - score * 0.22) },
  ]);
  const bullProbability = Math.round((raw.get('bull') ?? 0) * remaining / 100);
  const bearProbability = Math.round((raw.get('bear') ?? 0) * remaining / 100);
  const baseProbability = Math.round(remaining - bullProbability - bearProbability);
  const tailRounded = 100 - baseProbability - bullProbability - bearProbability;

  const riskAmplifier = 1 + eventRisk * 0.18 + Math.min(args.upcomingHighImpactCount, 4) * 0.025;
  const baseDrift = score * 0.32;
  const scenarios: GoldScenario[] = [
    {
      id: 'base', probability: baseProbability,
      ...scenarioRange(args.price, args.annualizedVolatility, days, baseDrift - 0.5, baseDrift + 0.5, baseDrift, riskAmplifier),
      ...scenarioCopy('base', score),
    },
    {
      id: 'bull', probability: bullProbability,
      ...scenarioRange(args.price, args.annualizedVolatility, days, 0.35 + Math.max(0, score) * 0.25, 1.55 + Math.max(0, score) * 0.35, 0.88 + Math.max(0, score) * 0.25, riskAmplifier),
      ...scenarioCopy('bull', score),
    },
    {
      id: 'bear', probability: bearProbability,
      ...scenarioRange(args.price, args.annualizedVolatility, days, -1.55 + Math.min(0, score) * 0.35, -0.35 + Math.min(0, score) * 0.25, -0.88 + Math.min(0, score) * 0.25, riskAmplifier),
      ...scenarioCopy('bear', score),
    },
    {
      id: 'tail', probability: tailRounded,
      ...scenarioRange(args.price, args.annualizedVolatility, days, -2.5, 2.8, score * 0.45, riskAmplifier * 1.15),
      ...scenarioCopy('tail', score),
    },
  ];
  return { horizon: args.horizon, days, scenarios };
}

export function buildGoldForecastSet(args: {
  price: number;
  annualizedVolatility: number | null;
  factorScore: number;
  eventRisk: number;
  upcomingHighImpactCount: number;
}) {
  return (Object.keys(GOLD_HORIZON_DAYS) as GoldHorizon[]).map(horizon => buildGoldHorizonForecast({ ...args, horizon }));
}

export function confidenceFromEvidence(args: {
  coverage: number;
  annualizedVolatility: number | null;
  eventCount: number;
  calendarAvailable: boolean;
  quoteQuality: 'live' | 'cached' | 'stale' | 'unavailable';
}) {
  let score = args.coverage * 72;
  if (args.annualizedVolatility !== null) score += 8;
  if (args.eventCount >= 3) score += 6;
  if (args.calendarAvailable) score += 4;
  if (args.quoteQuality === 'live') score += 5;
  else if (args.quoteQuality === 'cached') score += 2;
  else if (args.quoteQuality === 'stale') score -= 8;
  return Math.round(clamp(score, 20, 90));
}

function normalizeShocks(input: GoldWhatIfRequest['shocks']): GoldWhatIfShocks {
  return {
    dollarPct: clamp(Number(input?.dollarPct ?? 0) || 0, -10, 10),
    oilPct: clamp(Number(input?.oilPct ?? 0) || 0, -30, 30),
    realYieldBps: clamp(Number(input?.realYieldBps ?? 0) || 0, -100, 100),
    geopoliticalRisk: clamp(Number(input?.geopoliticalRisk ?? 0) || 0, -100, 100),
    centralBankDemand: clamp(Number(input?.centralBankDemand ?? 0) || 0, -100, 100),
  };
}

export function whatIfFactorDelta(shocks: GoldWhatIfShocks) {
  const usd = -shocks.dollarPct / 10 * 0.34;
  const oil = shocks.oilPct / 30 * 0.10;
  const realYield = -shocks.realYieldBps / 100 * 0.32;
  const geopolitical = shocks.geopoliticalRisk / 100 * 0.16;
  const centralBank = shocks.centralBankDemand / 100 * 0.18;
  return round(clamp(usd + oil + realYield + geopolitical + centralBank, -0.75, 0.75), 4);
}

export function applyGoldWhatIf(snapshot: GoldScenarioSnapshot, request: GoldWhatIfRequest): GoldWhatIfResult {
  const horizon = request.horizon && request.horizon in GOLD_HORIZON_DAYS ? request.horizon : '1m';
  const shocks = normalizeShocks(request.shocks ?? DEFAULT_SHOCKS);
  const factorDelta = whatIfFactorDelta(shocks);
  const simulatedFactorScore = round(clamp(snapshot.factorScore + factorDelta, -1, 1), 4);
  const forecast = buildGoldHorizonForecast({
    price: snapshot.spot.price,
    annualizedVolatility: snapshot.annualizedVolatility,
    factorScore: simulatedFactorScore,
    horizon,
    eventRisk: clamp((snapshot.events.reduce((sum, event) => sum + Math.abs(event.bias) * event.confidence, 0) / Math.max(1, snapshot.events.length)) + Math.max(0, shocks.geopoliticalRisk) / 180, 0, 1),
    upcomingHighImpactCount: snapshot.upcomingEvents.filter(event => event.impact === 'high').length,
  });
  return {
    horizon,
    shocks,
    baselineFactorScore: snapshot.factorScore,
    simulatedFactorScore,
    factorDelta,
    forecast,
  };
}

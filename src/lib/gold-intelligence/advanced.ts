import {
  annualizedVolatilityFromCloses,
  applyGoldWhatIf,
} from './core';
import type { GoldDriver, GoldScenarioSnapshot, GoldWhatIfShocks } from './types';
import type {
  GoldAdvancedAnalysis,
  GoldCausalChain,
  GoldModelDiagnostics,
  GoldRegimeAnalysis,
  GoldRegimeId,
  GoldStressCase,
} from './advancedTypes';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

function driver(snapshot: GoldScenarioSnapshot, id: GoldDriver['id']) {
  return snapshot.drivers.find(item => item.id === id) ?? null;
}

function scoreOf(snapshot: GoldScenarioSnapshot, id: GoldDriver['id']) {
  const item = driver(snapshot, id);
  return item?.available && typeof item.score === 'number' ? item.score : null;
}

function regimeCopy(id: GoldRegimeId) {
  const copy: Record<GoldRegimeId, { label: string; labelAr: string }> = {
    risk_off_haven: { label: 'Risk-off / safe-haven regime', labelAr: 'نظام عزوف عن المخاطر / ملاذ آمن' },
    real_yield_tailwind: { label: 'Falling real-yield tailwind', labelAr: 'دعم من هبوط العوائد الحقيقية' },
    real_yield_pressure: { label: 'Real-yield pressure', labelAr: 'ضغط من العوائد الحقيقية' },
    dollar_weakness: { label: 'Dollar-weakness regime', labelAr: 'نظام ضعف الدولار' },
    dollar_pressure: { label: 'Dollar-pressure regime', labelAr: 'ضغط من قوة الدولار' },
    energy_inflation: { label: 'Energy / inflation shock regime', labelAr: 'نظام صدمة طاقة / تضخم' },
    momentum_trend: { label: 'Momentum-led gold trend', labelAr: 'اتجاه ذهب يقوده الزخم' },
    balanced: { label: 'Balanced / mixed regime', labelAr: 'نظام متوازن / مختلط' },
    data_thin: { label: 'Insufficient regime evidence', labelAr: 'أدلة غير كافية لتحديد النظام' },
  };
  return copy[id];
}

export function detectGoldRegime(snapshot: GoldScenarioSnapshot): GoldRegimeAnalysis {
  const usd = scoreOf(snapshot, 'usd');
  const realYields = scoreOf(snapshot, 'real_yields');
  const risk = scoreOf(snapshot, 'risk_events');
  const oil = scoreOf(snapshot, 'oil');
  const momentum = scoreOf(snapshot, 'momentum');
  const coverage = snapshot.dataCoverage / 100;

  let id: GoldRegimeId = 'balanced';
  const reasons: string[] = [];
  const reasonsAr: string[] = [];

  if (coverage < 0.5) {
    id = 'data_thin';
    reasons.push('Less than half of weighted evidence is available.');
    reasonsAr.push('أقل من نصف الأدلة الموزونة متاح حالياً.');
  } else if ((risk ?? 0) >= 0.38) {
    id = 'risk_off_haven';
    reasons.push('Verified risk/event evidence is strongly gold-supportive.');
    reasonsAr.push('أدلة المخاطر والأحداث الموثقة داعمة للذهب بقوة.');
  } else if ((realYields ?? 0) >= 0.38) {
    id = 'real_yield_tailwind';
    reasons.push('Falling real yields are reducing gold opportunity cost.');
    reasonsAr.push('هبوط العوائد الحقيقية يقلل تكلفة الفرصة لحيازة الذهب.');
  } else if ((realYields ?? 0) <= -0.38) {
    id = 'real_yield_pressure';
    reasons.push('Rising real yields are increasing gold opportunity cost.');
    reasonsAr.push('ارتفاع العوائد الحقيقية يزيد تكلفة الفرصة لحيازة الذهب.');
  } else if ((usd ?? 0) >= 0.38) {
    id = 'dollar_weakness';
    reasons.push('Dollar weakness is a dominant supportive driver.');
    reasonsAr.push('ضعف الدولار هو أحد المحركات الداعمة المسيطرة.');
  } else if ((usd ?? 0) <= -0.38) {
    id = 'dollar_pressure';
    reasons.push('Dollar strength is a dominant restrictive driver.');
    reasonsAr.push('قوة الدولار هي أحد المحركات الضاغطة المسيطرة.');
  } else if ((oil ?? 0) >= 0.45 && Math.abs(snapshot.factorScore) >= 0.12) {
    id = 'energy_inflation';
    reasons.push('Oil pressure is elevated and interacting with the broader factor mix.');
    reasonsAr.push('ضغط النفط مرتفع ويتفاعل مع بقية العوامل في النموذج.');
  } else if (Math.abs(momentum ?? 0) >= 0.45) {
    id = 'momentum_trend';
    reasons.push('Gold price momentum is stronger than the other measured channels.');
    reasonsAr.push('زخم سعر الذهب أقوى من القنوات المقاسة الأخرى.');
  } else {
    reasons.push('No single verified driver currently dominates the factor mix.');
    reasonsAr.push('لا يوجد عامل موثق واحد يسيطر حالياً على مزيج العوامل.');
  }

  const active = [usd, realYields, risk, oil, momentum].filter((value): value is number => value !== null);
  const dominance = active.length ? Math.max(...active.map(value => Math.abs(value))) : 0;
  const confidence = Math.round(clamp(snapshot.confidence * 0.7 + dominance * 30, 15, 94));
  const copy = regimeCopy(id);

  return {
    id,
    ...copy,
    confidence,
    score: round(snapshot.factorScore, 3),
    supportive: id === 'data_thin' || id === 'balanced' ? null : snapshot.factorScore >= 0,
    reasons,
    reasonsAr,
  };
}

function chainForDriver(item: GoldDriver): GoldCausalChain | null {
  if (!item.available || typeof item.score !== 'number' || Math.abs(item.score) < 0.12) return null;
  const supportive = item.score > 0;
  const direction = supportive ? 'supportive' as const : 'restrictive' as const;
  const strength = Math.round(clamp(Math.abs(item.score) * 100, 0, 100));
  const confidence = item.quality === 'live' ? 86 : item.quality === 'cached' ? 72 : item.quality === 'stale' ? 52 : 35;

  const map: Partial<Record<GoldDriver['id'], Omit<GoldCausalChain, 'direction' | 'strength' | 'confidence' | 'sourceDriver'>>> = {
    usd: {
      id: 'usd-gold',
      label: 'Dollar → global gold affordability → gold',
      labelAr: 'الدولار ← تكلفة الذهب عالمياً ← الذهب',
      nodes: [
        { id: 'usd', label: supportive ? 'Dollar weakens' : 'Dollar strengthens', labelAr: supportive ? 'ضعف الدولار' : 'قوة الدولار' },
        { id: 'affordability', label: supportive ? 'Gold becomes cheaper outside USD' : 'Gold becomes costlier outside USD', labelAr: supportive ? 'الذهب يصبح أرخص خارج الدولار' : 'الذهب يصبح أغلى خارج الدولار' },
        { id: 'gold', label: supportive ? 'Demand support' : 'Demand pressure', labelAr: supportive ? 'دعم للطلب' : 'ضغط على الطلب' },
      ],
      caveat: 'The dollar-gold relationship is regime-dependent and not mechanically fixed.',
      caveatAr: 'علاقة الدولار بالذهب تختلف حسب النظام السوقي وليست ميكانيكية ثابتة.',
    },
    real_yields: {
      id: 'real-yield-gold',
      label: 'Real yields → opportunity cost → gold',
      labelAr: 'العوائد الحقيقية ← تكلفة الفرصة ← الذهب',
      nodes: [
        { id: 'real-yields', label: supportive ? 'Real yields fall' : 'Real yields rise', labelAr: supportive ? 'هبوط العوائد الحقيقية' : 'ارتفاع العوائد الحقيقية' },
        { id: 'opportunity-cost', label: supportive ? 'Holding cost falls' : 'Holding cost rises', labelAr: supportive ? 'تنخفض تكلفة الفرصة' : 'ترتفع تكلفة الفرصة' },
        { id: 'gold', label: supportive ? 'Gold support' : 'Gold pressure', labelAr: supportive ? 'دعم الذهب' : 'ضغط على الذهب' },
      ],
      caveat: 'Large risk shocks can temporarily dominate the real-yield channel.',
      caveatAr: 'صدمات المخاطر الكبيرة قد تتغلب مؤقتاً على قناة العائد الحقيقي.',
    },
    risk_events: {
      id: 'risk-gold',
      label: 'Global risk → safe-haven demand → gold',
      labelAr: 'المخاطر العالمية ← طلب الملاذ الآمن ← الذهب',
      nodes: [
        { id: 'risk', label: supportive ? 'Risk rises' : 'Risk premium fades', labelAr: supportive ? 'ارتفاع المخاطر' : 'تراجع علاوة المخاطر' },
        { id: 'haven', label: supportive ? 'Safe-haven demand rises' : 'Safe-haven demand eases', labelAr: supportive ? 'ارتفاع طلب الملاذ الآمن' : 'تراجع طلب الملاذ الآمن' },
        { id: 'gold', label: supportive ? 'Gold support' : 'Gold pressure', labelAr: supportive ? 'دعم الذهب' : 'ضغط على الذهب' },
      ],
      caveat: 'Liquidity crises can strengthen the dollar and offset part of the haven effect.',
      caveatAr: 'أزمات السيولة قد تقوي الدولار وتلغي جزءاً من أثر الملاذ الآمن.',
    },
    oil: {
      id: 'oil-gold',
      label: 'Oil → inflation expectations → policy/real yields → gold',
      labelAr: 'النفط ← توقعات التضخم ← السياسة/العوائد الحقيقية ← الذهب',
      nodes: [
        { id: 'oil', label: supportive ? 'Oil pressure rises' : 'Oil pressure eases', labelAr: supportive ? 'ارتفاع ضغط النفط' : 'تراجع ضغط النفط' },
        { id: 'inflation', label: supportive ? 'Inflation expectations rise' : 'Inflation pressure eases', labelAr: supportive ? 'ارتفاع توقعات التضخم' : 'تراجع ضغط التضخم' },
        { id: 'gold', label: supportive ? 'Potential gold support' : 'Potential gold pressure', labelAr: supportive ? 'دعم محتمل للذهب' : 'ضغط محتمل على الذهب' },
      ],
      caveat: 'Oil affects gold indirectly; the policy and real-yield response can reverse the final effect.',
      caveatAr: 'تأثير النفط غير مباشر؛ استجابة السياسة والعائد الحقيقي قد تعكس الأثر النهائي.',
    },
    nominal_rates: {
      id: 'rates-gold',
      label: 'Bond proxy → nominal-rate conditions → gold',
      labelAr: 'مؤشر السندات ← ظروف الفائدة الاسمية ← الذهب',
      nodes: [
        { id: 'tlt', label: 'TLT proxy changes', labelAr: 'تغير مؤشر TLT' },
        { id: 'rates', label: supportive ? 'Rate pressure eases' : 'Rate pressure rises', labelAr: supportive ? 'تراجع ضغط الفائدة' : 'ارتفاع ضغط الفائدة' },
        { id: 'gold', label: supportive ? 'Gold support' : 'Gold pressure', labelAr: supportive ? 'دعم الذهب' : 'ضغط على الذهب' },
      ],
      caveat: 'TLT is a market proxy, not a direct yield observation.',
      caveatAr: 'TLT مؤشر سوقي بديل وليس قراءة مباشرة للعائد.',
    },
    macro_policy: {
      id: 'policy-gold',
      label: 'Policy direction → yields / dollar → gold',
      labelAr: 'اتجاه السياسة ← العوائد / الدولار ← الذهب',
      nodes: [
        { id: 'policy', label: supportive ? 'Policy eases' : 'Policy tightens', labelAr: supportive ? 'تيسير السياسة' : 'تشديد السياسة' },
        { id: 'transmission', label: 'Yields and dollar react', labelAr: 'تفاعل العوائد والدولار' },
        { id: 'gold', label: supportive ? 'Gold support' : 'Gold pressure', labelAr: supportive ? 'دعم الذهب' : 'ضغط على الذهب' },
      ],
      caveat: 'Policy effects depend on what markets had already priced.',
      caveatAr: 'أثر السياسة يعتمد على ما كان السوق قد سعّره مسبقاً.',
    },
    momentum: {
      id: 'momentum-gold',
      label: 'Price persistence → momentum → gold trend',
      labelAr: 'استمرارية السعر ← الزخم ← اتجاه الذهب',
      nodes: [
        { id: 'price', label: supportive ? 'Price persistence strengthens' : 'Price persistence weakens', labelAr: supportive ? 'تعزز استمرارية الصعود' : 'تعزز استمرارية الهبوط' },
        { id: 'momentum', label: supportive ? 'Positive momentum' : 'Negative momentum', labelAr: supportive ? 'زخم إيجابي' : 'زخم سلبي' },
        { id: 'gold', label: supportive ? 'Trend support' : 'Trend pressure', labelAr: supportive ? 'دعم الاتجاه' : 'ضغط على الاتجاه' },
      ],
      caveat: 'Momentum is descriptive and can reverse quickly around macro shocks.',
      caveatAr: 'الزخم وصفي وقد ينعكس بسرعة حول الصدمات الاقتصادية.',
    },
    etf_proxy: {
      id: 'etf-proxy-gold',
      label: 'GLD price proxy → investor participation → gold',
      labelAr: 'مؤشر سعر GLD ← مشاركة المستثمرين ← الذهب',
      nodes: [
        { id: 'gld', label: supportive ? 'GLD price proxy strengthens' : 'GLD price proxy weakens', labelAr: supportive ? 'قوة مؤشر GLD' : 'ضعف مؤشر GLD' },
        { id: 'participation', label: 'Investor participation proxy', labelAr: 'مؤشر بديل لمشاركة المستثمرين' },
        { id: 'gold', label: supportive ? 'Gold support' : 'Gold pressure', labelAr: supportive ? 'دعم الذهب' : 'ضغط على الذهب' },
      ],
      caveat: 'GLD price is not ETF flow data and must not be interpreted as creations/redemptions.',
      caveatAr: 'سعر GLD ليس بيانات تدفقات ETF ولا يمثل عمليات الإنشاء والاسترداد.',
    },
  };

  const base = map[item.id];
  return base ? { ...base, direction, strength, confidence, sourceDriver: item.id } : null;
}

export function buildGoldCausalChains(snapshot: GoldScenarioSnapshot) {
  return snapshot.drivers
    .map(chainForDriver)
    .filter((item): item is GoldCausalChain => Boolean(item))
    .sort((left, right) => right.strength * right.confidence - left.strength * left.confidence)
    .slice(0, 6);
}

const STRESS_CASES: Array<{
  id: string;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  shocks: GoldWhatIfShocks;
}> = [
  {
    id: 'hawkish-fed',
    label: 'Hawkish Fed shock',
    labelAr: 'صدمة فيدرالي متشدد',
    description: 'Stronger dollar and higher real yields.',
    descriptionAr: 'دولار أقوى وعوائد حقيقية أعلى.',
    shocks: { dollarPct: 4, oilPct: -3, realYieldBps: 55, geopoliticalRisk: -10, centralBankDemand: 0 },
  },
  {
    id: 'dovish-fed',
    label: 'Dovish Fed / easing',
    labelAr: 'فيدرالي ميسّر / خفض',
    description: 'Weaker dollar and lower real yields.',
    descriptionAr: 'دولار أضعف وعوائد حقيقية أقل.',
    shocks: { dollarPct: -4, oilPct: 2, realYieldBps: -55, geopoliticalRisk: 0, centralBankDemand: 10 },
  },
  {
    id: 'geopolitical-escalation',
    label: 'Geopolitical escalation',
    labelAr: 'تصعيد جيوسياسي',
    description: 'Risk spike with an oil shock and stronger haven demand.',
    descriptionAr: 'قفزة في المخاطر مع صدمة نفط وارتفاع طلب الملاذ الآمن.',
    shocks: { dollarPct: 1, oilPct: 18, realYieldBps: -10, geopoliticalRisk: 85, centralBankDemand: 15 },
  },
  {
    id: 'liquidity-squeeze',
    label: 'Global liquidity squeeze',
    labelAr: 'أزمة سيولة عالمية',
    description: 'Dollar strength offsets some safe-haven demand.',
    descriptionAr: 'قوة الدولار تعوض جزءاً من طلب الملاذ الآمن.',
    shocks: { dollarPct: 7, oilPct: -18, realYieldBps: 20, geopoliticalRisk: 65, centralBankDemand: 0 },
  },
  {
    id: 'central-bank-accumulation',
    label: 'Central-bank accumulation',
    labelAr: 'تراكم مشتريات البنوك المركزية',
    description: 'A sustained official-sector demand shock.',
    descriptionAr: 'صدمة طلب مستمرة من القطاع الرسمي.',
    shocks: { dollarPct: -1, oilPct: 0, realYieldBps: -5, geopoliticalRisk: 10, centralBankDemand: 85 },
  },
];

export function buildGoldStressTests(snapshot: GoldScenarioSnapshot): GoldStressCase[] {
  return STRESS_CASES.map(test => ({
    ...test,
    result: applyGoldWhatIf(snapshot, { horizon: '1m', shocks: test.shocks }),
  }));
}

function oneSigmaCoverage(closes: number[]) {
  if (closes.length < 45) return null;
  let hits = 0;
  let samples = 0;
  for (let index = 21; index < closes.length; index += 1) {
    const history = closes.slice(index - 21, index);
    const vol = annualizedVolatilityFromCloses(history);
    if (vol === null || closes[index - 1] <= 0 || closes[index] <= 0) continue;
    const expectedDailySigma = (vol / 100) / Math.sqrt(252);
    const realized = Math.abs(Math.log(closes[index] / closes[index - 1]));
    if (realized <= expectedDailySigma) hits += 1;
    samples += 1;
  }
  return samples >= 20 ? { coverage: hits / samples, samples } : null;
}

export function diagnoseGoldModel(closes: number[]): GoldModelDiagnostics {
  const usable = closes.filter(value => Number.isFinite(value) && value > 0);
  if (usable.length < 20) {
    return {
      observations: usable.length,
      status: 'unavailable',
      volatilityBandCoverage: null,
      calibrationScore: null,
      recentVolatility: null,
      priorVolatility: null,
      volatilityShift: null,
      trendStrength: null,
      note: 'Not enough verified history for diagnostics.',
      noteAr: 'لا يوجد تاريخ موثق كافٍ لتشخيص النموذج.',
    };
  }

  const recent = annualizedVolatilityFromCloses(usable.slice(-30));
  const prior = annualizedVolatilityFromCloses(usable.slice(-60, -30));
  const shift = recent !== null && prior !== null && prior > 0 ? ((recent - prior) / prior) * 100 : null;
  const calibration = oneSigmaCoverage(usable);
  const calibrationScore = calibration
    ? Math.round(clamp(100 - Math.abs(calibration.coverage * 100 - 68) * 2.2, 0, 100))
    : null;
  const lookback = Math.min(20, usable.length - 1);
  const anchor = usable[usable.length - 1 - lookback];
  const current = usable.at(-1)!;
  const totalVol = annualizedVolatilityFromCloses(usable.slice(-(lookback + 20)));
  const expectedMove = totalVol ? (totalVol / 100) * Math.sqrt(lookback / 252) : null;
  const actualMove = anchor > 0 ? Math.abs(current / anchor - 1) : 0;
  const trendStrength = expectedMove && expectedMove > 0 ? round(clamp(actualMove / expectedMove, 0, 3), 2) : null;
  const status = usable.length >= 80 ? 'strong' : usable.length >= 45 ? 'usable' : 'thin';

  return {
    observations: usable.length,
    status,
    volatilityBandCoverage: calibration ? round(calibration.coverage * 100, 1) : null,
    calibrationScore,
    recentVolatility: recent,
    priorVolatility: prior,
    volatilityShift: shift === null ? null : round(shift, 1),
    trendStrength,
    note: 'Diagnostics evaluate volatility-band calibration and regime stability; they are not a historical proof of scenario-forecast accuracy.',
    noteAr: 'التشخيص يقيس معايرة نطاقات التذبذب واستقرار النظام؛ ولا يمثل إثباتاً تاريخياً لدقة توقعات السيناريو.',
  };
}

export function buildGoldAdvancedAnalysis(snapshot: GoldScenarioSnapshot, closes: number[]): GoldAdvancedAnalysis {
  return {
    regime: detectGoldRegime(snapshot),
    causalChains: buildGoldCausalChains(snapshot),
    stressTests: buildGoldStressTests(snapshot),
    diagnostics: diagnoseGoldModel(closes),
  };
}

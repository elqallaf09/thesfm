import type {
  GoldDriverDirection,
  GoldScenario,
  GoldScenarioDataQuality,
  GoldScenarioDriver,
  GoldScenarioHorizon,
  GoldScenarioMarketInput,
  GoldScenarioSnapshot,
  GoldWhatIfInput,
} from './types';

export const GOLD_SCENARIO_MODEL_VERSION = 'sfm-gse-1.0.0';

const HORIZON_DAYS: Record<GoldScenarioHorizon, number> = {
  '24H': 1,
  '7D': 7,
  '1M': 21,
  '3M': 63,
  '6M': 126,
  '12M': 252,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function directionFromContribution(value: number): GoldDriverDirection {
  if (value >= 0.035) return 'bullish';
  if (value <= -0.035) return 'bearish';
  return Math.abs(value) < 0.01 ? 'neutral' : value > 0 ? 'bullish' : 'bearish';
}

function quoteDriver(args: {
  id: string;
  label: string;
  labelAr: string;
  category: GoldScenarioDriver['category'];
  changePercent: number | null | undefined;
  inverse?: boolean;
  divisor: number;
  weight: number;
  source?: string | null;
  asOf?: string | null;
  value?: number | string | null;
  rationale: string;
  rationaleAr: string;
}): GoldScenarioDriver {
  const available = Number.isFinite(args.changePercent);
  const normalized = available ? clamp((args.changePercent as number) / args.divisor, -1, 1) : 0;
  const contribution = normalized * args.weight * (args.inverse ? -1 : 1);
  return {
    id: args.id,
    label: args.label,
    labelAr: args.labelAr,
    category: args.category,
    direction: available ? directionFromContribution(contribution) : 'unknown',
    contribution: round(contribution, 4),
    weight: args.weight,
    available,
    value: args.value ?? null,
    changePercent: args.changePercent ?? null,
    source: args.source ?? null,
    asOf: args.asOf ?? null,
    rationale: args.rationale,
    rationaleAr: args.rationaleAr,
  };
}

function macroDriver(args: {
  id: string;
  label: string;
  labelAr: string;
  category: GoldScenarioDriver['category'];
  value: number | string | null | undefined;
  delta: number | null | undefined;
  inverse?: boolean;
  divisor: number;
  weight: number;
  source?: string | null;
  asOf?: string | null;
  rationale: string;
  rationaleAr: string;
}): GoldScenarioDriver {
  const available = Number.isFinite(args.delta);
  const normalized = available ? clamp((args.delta as number) / args.divisor, -1, 1) : 0;
  const contribution = normalized * args.weight * (args.inverse ? -1 : 1);
  return {
    id: args.id,
    label: args.label,
    labelAr: args.labelAr,
    category: args.category,
    direction: available ? directionFromContribution(contribution) : 'unknown',
    contribution: round(contribution, 4),
    weight: args.weight,
    available,
    value: args.value ?? null,
    source: args.source ?? null,
    asOf: args.asOf ?? null,
    rationale: args.rationale,
    rationaleAr: args.rationaleAr,
  };
}

function annualizedVolatility(history: number[]) {
  const closes = history.filter(value => Number.isFinite(value) && value > 0).slice(-90);
  if (closes.length < 12) return null;
  const returns: number[] = [];
  for (let index = 1; index < closes.length; index += 1) {
    returns.push(Math.log(closes[index] / closes[index - 1]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function momentumDriver(history: number[], currentPrice: number | null): GoldScenarioDriver {
  const usable = history.filter(value => Number.isFinite(value) && value > 0);
  const current = currentPrice && currentPrice > 0 ? currentPrice : usable.at(-1) ?? null;
  if (!current || usable.length < 20) {
    return {
      id: 'gold-momentum',
      label: 'Gold momentum',
      labelAr: 'زخم الذهب',
      category: 'gold',
      direction: 'unknown',
      contribution: 0,
      weight: 0.18,
      available: false,
      value: current,
      source: 'SFM market history',
      asOf: null,
      rationale: 'Uses the 20-session price trend as a measured market input.',
      rationaleAr: 'يستخدم اتجاه السعر خلال 20 جلسة كمدخل سوقي مقاس.',
    };
  }
  const anchor = usable[Math.max(0, usable.length - 20)];
  const changePercent = anchor > 0 ? ((current - anchor) / anchor) * 100 : 0;
  return quoteDriver({
    id: 'gold-momentum',
    label: 'Gold momentum',
    labelAr: 'زخم الذهب',
    category: 'gold',
    changePercent,
    divisor: 6,
    weight: 0.18,
    value: current,
    source: 'SFM market history',
    rationale: 'Persistent gold momentum can reinforce an existing regime, but does not determine the forecast alone.',
    rationaleAr: 'زخم الذهب المستمر قد يعزز النظام السائد، لكنه لا يحدد التوقع منفرداً.',
  });
}

function eventDriver(events: GoldScenarioMarketInput['events']): GoldScenarioDriver {
  const recent = events.slice(0, 12);
  const raw = recent.reduce((sum, event) => sum + clamp(event.contribution, -0.16, 0.16), 0);
  const contribution = clamp(raw, -0.22, 0.22);
  return {
    id: 'global-events',
    label: 'Global event risk',
    labelAr: 'مخاطر الأحداث العالمية',
    category: 'event',
    direction: recent.length ? directionFromContribution(contribution) : 'unknown',
    contribution: round(contribution, 4),
    weight: 0.22,
    available: recent.length > 0,
    value: recent.length,
    source: recent.length ? 'SFM multi-source news intelligence' : null,
    asOf: recent[0]?.publishedAt ?? null,
    rationale: 'Verified geopolitical, policy, currency and commodity events are converted into bounded gold-specific risk contributions.',
    rationaleAr: 'تُحوّل الأحداث الجيوسياسية والسياسات والعملات والسلع المتحققة إلى مساهمات محدودة ومخصصة للذهب.',
  };
}

function whatIfDrivers(input: GoldWhatIfInput | undefined): GoldScenarioDriver[] {
  if (!input) return [];
  const drivers: GoldScenarioDriver[] = [];
  if (Number.isFinite(input.dollarIndexPct)) {
    drivers.push(quoteDriver({
      id: 'what-if-dxy',
      label: 'What-if: U.S. dollar',
      labelAr: 'ماذا لو: الدولار الأمريكي',
      category: 'currency',
      changePercent: clamp(input.dollarIndexPct as number, -15, 15),
      inverse: true,
      divisor: 4,
      weight: 0.24,
      value: input.dollarIndexPct as number,
      source: 'User scenario',
      rationale: 'A stronger dollar generally raises the opportunity cost of dollar-priced gold for non-dollar buyers.',
      rationaleAr: 'ارتفاع الدولار يرفع عادةً تكلفة الذهب المسعّر بالدولار على المشترين خارج الدولار.',
    }));
  }
  if (Number.isFinite(input.oilPct)) {
    drivers.push(quoteDriver({
      id: 'what-if-oil',
      label: 'What-if: oil shock',
      labelAr: 'ماذا لو: صدمة النفط',
      category: 'energy',
      changePercent: clamp(input.oilPct as number, -40, 40),
      divisor: 12,
      weight: 0.12,
      value: input.oilPct as number,
      source: 'User scenario',
      rationale: 'Oil shocks can change inflation expectations and geopolitical risk, creating an indirect gold channel.',
      rationaleAr: 'صدمات النفط قد تغير توقعات التضخم والمخاطر الجيوسياسية، فتؤثر على الذهب بشكل غير مباشر.',
    }));
  }
  if (Number.isFinite(input.policyRateBps)) {
    const delta = clamp((input.policyRateBps as number) / 100, -3, 3);
    drivers.push(macroDriver({
      id: 'what-if-rates',
      label: 'What-if: policy-rate shock',
      labelAr: 'ماذا لو: تغير الفائدة',
      category: 'rates',
      value: input.policyRateBps as number,
      delta,
      divisor: 1,
      inverse: true,
      weight: 0.24,
      source: 'User scenario',
      rationale: 'Higher policy rates can increase gold opportunity cost; cuts can reduce it.',
      rationaleAr: 'ارتفاع الفائدة قد يزيد تكلفة الفرصة للذهب، بينما الخفض قد يقللها.',
    }));
  }
  if (Number.isFinite(input.inflationSurprisePct)) {
    drivers.push(macroDriver({
      id: 'what-if-inflation',
      label: 'What-if: inflation surprise',
      labelAr: 'ماذا لو: مفاجأة التضخم',
      category: 'inflation',
      value: input.inflationSurprisePct as number,
      delta: clamp(input.inflationSurprisePct as number, -3, 3),
      divisor: 1.2,
      weight: 0.14,
      source: 'User scenario',
      rationale: 'A positive inflation surprise can support gold when it is not fully offset by higher real yields.',
      rationaleAr: 'مفاجأة تضخم إيجابية قد تدعم الذهب إذا لم يعوضها ارتفاع قوي في العوائد الحقيقية.',
    }));
  }
  if (Number.isFinite(input.geopoliticalRisk)) {
    const normalized = clamp(input.geopoliticalRisk as number, -100, 100) / 100;
    const contribution = normalized * 0.26;
    drivers.push({
      id: 'what-if-geopolitics',
      label: 'What-if: geopolitical risk',
      labelAr: 'ماذا لو: المخاطر الجيوسياسية',
      category: 'risk',
      direction: directionFromContribution(contribution),
      contribution: round(contribution, 4),
      weight: 0.26,
      available: true,
      value: input.geopoliticalRisk as number,
      source: 'User scenario',
      asOf: null,
      rationale: 'Higher geopolitical stress can increase safe-haven demand; de-escalation can remove part of that premium.',
      rationaleAr: 'ارتفاع التوتر الجيوسياسي قد يزيد طلب الملاذ الآمن، بينما التهدئة قد تخفض جزءاً من علاوة المخاطر.',
    });
  }
  return drivers;
}

function dataQuality(drivers: GoldScenarioDriver[], sourceHealth: string[] = []): GoldScenarioDataQuality {
  const total = drivers.length;
  const available = drivers.filter(driver => driver.available).length;
  const weightedTotal = drivers.reduce((sum, driver) => sum + driver.weight, 0);
  const weightedAvailable = drivers.filter(driver => driver.available).reduce((sum, driver) => sum + driver.weight, 0);
  const coverage = weightedTotal > 0 ? weightedAvailable / weightedTotal : 0;
  const score = Math.round(clamp(coverage * 100, 0, 100));
  const level = score >= 82 ? 'high' : score >= 65 ? 'medium' : score >= 45 ? 'low' : 'insufficient';
  return {
    score,
    level,
    availableDrivers: available,
    totalDrivers: total,
    staleDrivers: 0,
    missing: drivers.filter(driver => !driver.available).map(driver => driver.id),
    sources: Array.from(new Set([
      ...drivers.map(driver => driver.source).filter((value): value is string => Boolean(value)),
      ...sourceHealth,
    ])),
  };
}

function scenarioProbabilities(score: number) {
  const directional = clamp(score, -1, 1);
  const bull = 0.28 + directional * 0.20;
  const bear = 0.28 - directional * 0.20;
  const tail = 0.08 + Math.min(0.08, Math.abs(directional) * 0.05);
  const base = Math.max(0.18, 1 - bull - bear - tail);
  const sum = bull + bear + tail + base;
  return {
    bull: bull / sum,
    bear: bear / sum,
    tail: tail / sum,
    base: base / sum,
  };
}

function ranges(current: number, annualVol: number, evidenceScore: number, scenario: GoldScenario['id']) {
  const result = {} as GoldScenario['ranges'];
  const score = clamp(evidenceScore, -1, 1);
  for (const [horizon, days] of Object.entries(HORIZON_DAYS) as Array<[GoldScenarioHorizon, number]>) {
    const sigma = clamp(annualVol, 0.06, 0.65) * Math.sqrt(days / 252);
    const baseDrift = score * sigma * 0.32;
    const scenarioShift = scenario === 'bull'
      ? sigma * 0.72
      : scenario === 'bear'
        ? -sigma * 0.72
        : scenario === 'tail-risk'
          ? sigma * 1.35
          : baseDrift;
    const centerReturn = scenario === 'base' ? baseDrift : scenarioShift + baseDrift * 0.35;
    const halfWidth = scenario === 'tail-risk' ? sigma * 0.55 : sigma * 0.34;
    const lowReturn = centerReturn - halfWidth;
    const highReturn = centerReturn + halfWidth;
    result[horizon] = {
      low: round(Math.max(0, current * (1 + lowReturn))),
      midpoint: round(Math.max(0, current * (1 + centerReturn))),
      high: round(Math.max(0, current * (1 + highReturn))),
    };
  }
  return result;
}

function buildScenarios(current: number | null, annualVol: number | null, score: number): GoldScenario[] {
  const price = current && current > 0 ? current : 0;
  const vol = annualVol ?? 0.18;
  const probabilities = scenarioProbabilities(score);
  const unavailableRanges = Object.fromEntries((Object.keys(HORIZON_DAYS) as GoldScenarioHorizon[]).map(horizon => [
    horizon, { low: 0, midpoint: 0, high: 0 },
  ])) as GoldScenario['ranges'];
  const rangeFor = (id: GoldScenario['id']) => price > 0 ? ranges(price, vol, score, id) : unavailableRanges;
  return [
    {
      id: 'base',
      label: 'Base regime',
      labelAr: 'السيناريو الأساسي',
      probability: round(probabilities.base * 100, 1),
      thesis: 'Current cross-asset and macro conditions persist without a major regime break.',
      thesisAr: 'استمرار ظروف الأسواق والاقتصاد الحالية دون تحول كبير في النظام.',
      invalidation: ['A large dollar/rate shock', 'A major geopolitical escalation or de-escalation'],
      invalidationAr: ['صدمة كبيرة في الدولار أو الفائدة', 'تصعيد أو تهدئة جيوسياسية كبيرة'],
      ranges: rangeFor('base'),
    },
    {
      id: 'bull',
      label: 'Bullish gold',
      labelAr: 'صعود الذهب',
      probability: round(probabilities.bull * 100, 1),
      thesis: 'Weaker dollar, easier rates, stronger safe-haven demand or persistent inflation risk reinforces gold demand.',
      thesisAr: 'ضعف الدولار أو تيسير الفائدة أو ارتفاع طلب الملاذ الآمن أو استمرار مخاطر التضخم يدعم الطلب على الذهب.',
      invalidation: ['Dollar and yields rise together', 'Risk premium fades while momentum breaks down'],
      invalidationAr: ['ارتفاع الدولار والعوائد معاً', 'تراجع علاوة المخاطر مع كسر الزخم'],
      ranges: rangeFor('bull'),
    },
    {
      id: 'bear',
      label: 'Bearish gold',
      labelAr: 'هبوط الذهب',
      probability: round(probabilities.bear * 100, 1),
      thesis: 'A stronger dollar, tighter financial conditions and fading risk demand pressure gold.',
      thesisAr: 'قوة الدولار وتشدد الأوضاع المالية وتراجع طلب الملاذ الآمن تضغط على الذهب.',
      invalidation: ['Dollar reverses lower', 'Rates fall or a new risk shock appears'],
      invalidationAr: ['انعكاس الدولار للهبوط', 'هبوط الفائدة أو ظهور صدمة مخاطر جديدة'],
      ranges: rangeFor('bear'),
    },
    {
      id: 'tail-risk',
      label: 'Tail-risk upside',
      labelAr: 'سيناريو مخاطر قصوى',
      probability: round(probabilities.tail * 100, 1),
      thesis: 'A low-frequency but high-impact stress event creates an outsized safe-haven response.',
      thesisAr: 'حدث نادر مرتفع التأثير يولد طلباً استثنائياً على الملاذ الآمن.',
      invalidation: ['Stress event resolves quickly', 'Liquidity shock strengthens the dollar enough to offset haven demand'],
      invalidationAr: ['حل سريع للحدث الضاغط', 'صدمة سيولة تقوي الدولار بما يعوض طلب الملاذ الآمن'],
      ranges: rangeFor('tail-risk'),
    },
  ];
}

export function buildGoldScenarioSnapshot(
  market: GoldScenarioMarketInput,
  whatIf?: GoldWhatIfInput,
): GoldScenarioSnapshot {
  const drivers: GoldScenarioDriver[] = [
    momentumDriver(market.goldHistory, market.goldPrice),
    quoteDriver({
      id: 'dxy',
      label: 'U.S. dollar index',
      labelAr: 'مؤشر الدولار',
      category: 'currency',
      changePercent: market.quotes.dxy?.changePercent,
      inverse: true,
      divisor: 1.5,
      weight: 0.18,
      value: market.quotes.dxy?.value,
      source: market.quotes.dxy?.source,
      asOf: market.quotes.dxy?.asOf,
      rationale: 'A stronger dollar is usually a headwind for dollar-priced gold.',
      rationaleAr: 'قوة الدولار تكون عادةً ضغطاً على الذهب المسعّر بالدولار.',
    }),
    quoteDriver({
      id: 'oil',
      label: 'Oil complex',
      labelAr: 'مجمع النفط',
      category: 'energy',
      changePercent: [market.quotes.wti?.changePercent, market.quotes.brent?.changePercent]
        .filter((value): value is number => Number.isFinite(value))
        .reduce((sum, value, _, values) => sum + value / values.length, 0) || null,
      divisor: 4,
      weight: 0.08,
      value: market.quotes.wti?.value ?? market.quotes.brent?.value ?? null,
      source: market.quotes.wti?.source ?? market.quotes.brent?.source,
      asOf: market.quotes.wti?.asOf ?? market.quotes.brent?.asOf,
      rationale: 'Oil is treated as an indirect inflation and geopolitical channel, not a fixed gold correlation.',
      rationaleAr: 'يُعامل النفط كقناة غير مباشرة للتضخم والجيوسياسة وليس كارتباط ثابت مع الذهب.',
    }),
    quoteDriver({
      id: 'equities-risk',
      label: 'Equity risk pulse',
      labelAr: 'نبض مخاطر الأسهم',
      category: 'risk',
      changePercent: market.quotes.spx?.changePercent,
      inverse: true,
      divisor: 2.2,
      weight: 0.06,
      value: market.quotes.spx?.value,
      source: market.quotes.spx?.source,
      asOf: market.quotes.spx?.asOf,
      rationale: 'Sharp equity weakness can increase safe-haven demand, but the relationship is regime-dependent.',
      rationaleAr: 'ضعف الأسهم الحاد قد يزيد طلب الملاذ الآمن، لكن العلاقة تختلف حسب النظام السوقي.',
    }),
    macroDriver({
      id: 'policy-rate',
      label: 'Policy-rate impulse',
      labelAr: 'أثر الفائدة',
      category: 'rates',
      value: market.macro.policyRate?.value,
      delta: market.macro.policyRate?.delta,
      inverse: true,
      divisor: 0.5,
      weight: 0.14,
      source: market.macro.policyRate?.source,
      asOf: market.macro.policyRate?.asOf,
      rationale: 'Higher policy rates can raise the opportunity cost of holding non-yielding gold.',
      rationaleAr: 'ارتفاع الفائدة قد يزيد تكلفة الفرصة لحيازة الذهب غير المدر للعائد.',
    }),
    macroDriver({
      id: 'inflation',
      label: 'Inflation impulse',
      labelAr: 'أثر التضخم',
      category: 'inflation',
      value: market.macro.inflation?.value,
      delta: market.macro.inflation?.delta,
      divisor: 0.5,
      weight: 0.08,
      source: market.macro.inflation?.source,
      asOf: market.macro.inflation?.asOf,
      rationale: 'Rising inflation pressure can support gold, especially when real yields do not rise as quickly.',
      rationaleAr: 'ارتفاع ضغوط التضخم قد يدعم الذهب خصوصاً إذا لم ترتفع العوائد الحقيقية بالسرعة نفسها.',
    }),
    macroDriver({
      id: 'yield-curve',
      label: 'Yield-curve impulse',
      labelAr: 'أثر منحنى العائد',
      category: 'macro',
      value: market.macro.yieldCurve?.value,
      delta: market.macro.yieldCurve?.delta,
      inverse: true,
      divisor: 0.6,
      weight: 0.06,
      source: market.macro.yieldCurve?.source,
      asOf: market.macro.yieldCurve?.asOf,
      rationale: 'A rapidly tightening yield backdrop can pressure gold; this is a secondary proxy, not a real-yield substitute.',
      rationaleAr: 'تشدد بيئة العوائد قد يضغط على الذهب؛ وهذا وكيل ثانوي وليس بديلاً للعائد الحقيقي.',
    }),
    eventDriver(market.events),
  ];

  const scenarioDrivers = [...drivers, ...whatIfDrivers(whatIf)];
  const quality = dataQuality(scenarioDrivers, market.sourceHealth);
  const weightedScore = scenarioDrivers.reduce((sum, driver) => sum + (driver.available ? driver.contribution : 0), 0);
  const evidenceScore = clamp(weightedScore, -1, 1);
  const annualVol = annualizedVolatility(market.goldHistory);
  const agreement = scenarioDrivers.filter(driver => driver.available && Math.abs(driver.contribution) >= 0.02);
  const aligned = agreement.filter(driver => Math.sign(driver.contribution) === Math.sign(evidenceScore)).length;
  const consistency = agreement.length ? aligned / agreement.length : 0.5;
  const confidence = Math.round(clamp(quality.score * (0.62 + consistency * 0.38), 0, 96));
  const directionalBias: GoldDriverDirection = quality.level === 'insufficient'
    ? 'unknown'
    : directionFromContribution(evidenceScore);

  return {
    generatedAt: new Date().toISOString(),
    modelVersion: GOLD_SCENARIO_MODEL_VERSION,
    currentGoldPrice: market.goldPrice,
    currency: 'USD',
    unit: 'troy_ounce',
    annualizedVolatility: annualVol === null ? null : round(annualVol * 100, 2),
    evidenceScore: round(evidenceScore, 4),
    directionalBias,
    confidence,
    drivers: scenarioDrivers,
    events: market.events.slice(0, 12),
    upcomingRiskEvents: market.upcomingRiskEvents.slice(0, 12),
    scenarios: buildScenarios(market.goldPrice, annualVol, evidenceScore),
    dataQuality: quality,
    methodology: {
      approach: 'Explainable weighted evidence + volatility-scaled scenario bands',
      note: 'Scenario probabilities are model weights, not guarantees. Price bands are conditional estimates derived from current price, measured volatility and evidence direction.',
      noteAr: 'احتمالات السيناريو هي أوزان نموذجية وليست ضمانات. نطاقات الأسعار تقديرات شرطية مشتقة من السعر الحالي والتذبذب المقاس واتجاه الأدلة.',
    },
  };
}

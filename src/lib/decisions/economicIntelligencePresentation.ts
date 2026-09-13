import type {
  EconomicDecisionContext,
  EconomicBridgeDecisionType,
} from './economicIntelligenceBridge';

export type EconomicDecisionLocale = 'ar' | 'en' | 'fr';

export const ECONOMIC_ANALYSIS_VERSION = '7.5.0';

export type LocalizedEconomicSignal = {
  code: string;
  label: string;
};

export type EconomicScenarioSummary = {
  id: 'stress' | 'base' | 'optimistic';
  label: string;
  month12: {
    monthlySurplus: number;
    liquidBalance: number;
    investmentBalance: number;
    netWorth: number;
  } | null;
};

export type EconomicDecisionSimulationHorizon = {
  month: 3 | 6 | 12;
  label: string;
  scenarios: Array<{
    id: 'stress' | 'base' | 'optimistic';
    label: string;
    monthlySurplusDelta: number | null;
    liquidBalanceDelta: number | null;
    netWorthDelta: number | null;
  }>;
};

export type EconomicDecisionPresentation = {
  analysisVersion: string;
  generatedAt: string;
  decisionType: EconomicBridgeDecisionType;
  confidencePercent: number;
  confidenceLabel: string;
  missingData: LocalizedEconomicSignal[];
  warnings: LocalizedEconomicSignal[];
  reasons: LocalizedEconomicSignal[];
  scenarios: EconomicScenarioSummary[];
  simulation: {
    title: string;
    unavailable: string;
    horizons: EconomicDecisionSimulationHorizon[];
  } | null;
};

const LABELS = {
  ar: {
    confidence: { high: 'ثقة عالية', medium: 'ثقة متوسطة', low: 'ثقة منخفضة' },
    scenarios: { stress: 'سيناريو ضاغط', base: 'السيناريو الأساسي', optimistic: 'سيناريو متفائل' },
    horizons: { 3: 'بعد 3 أشهر', 6: 'بعد 6 أشهر', 12: 'بعد 12 شهراً' },
    simulationTitle: 'أثر القرار مقارنة بعدم تنفيذه',
    simulationUnavailable: 'المحاكاة الكاملة تحتاج مدخلات إضافية ولا يتم افتراض القيم المفقودة.',
    missing: {
      income: 'بيانات الدخل',
      expenses: 'بيانات المصروفات',
      debts: 'بيانات الديون',
      savings: 'بيانات المدخرات',
      investments: 'بيانات الاستثمارات',
      upfront_cash_outflow: 'الدفعة الأولى أو المبلغ النقدي المدفوع',
      financing_principal: 'قيمة التمويل أو أصل القرض',
      debt_action_direction: 'هل العملية قرض جديد أم سداد دين',
    },
    signals: {
      decision_creates_monthly_deficit: 'القرار يسبب عجزاً شهرياً.',
      post_decision_surplus_below_10_percent: 'الفائض بعد القرار أقل من 10% من الدخل.',
      liquidity_runway_below_one_month: 'السيولة المتبقية لا تغطي شهراً واحداً.',
      liquidity_runway_below_three_months: 'السيولة المتبقية تغطي أقل من 3 أشهر.',
      projected_debt_service_above_50_percent: 'التزامات الدين المتوقعة تتجاوز 50% من الدخل.',
      projected_debt_service_above_35_percent: 'التزامات الدين المتوقعة تتجاوز 35% من الدخل.',
      assessment_based_on_incomplete_data: 'التقييم مبني على بيانات مالية غير مكتملة.',
      monthly_cash_flow_remains_positive: 'التدفق النقدي الشهري يبقى موجباً بعد القرار.',
      liquidity_buffer_remains_at_least_three_months: 'احتياطي السيولة يبقى كافياً لثلاثة أشهر على الأقل.',
      projected_debt_service_within_conservative_range: 'نسبة خدمة الدين المتوقعة ضمن نطاق محافظ.',
    },
  },
  en: {
    confidence: { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' },
    scenarios: { stress: 'Stress scenario', base: 'Base scenario', optimistic: 'Optimistic scenario' },
    horizons: { 3: 'After 3 months', 6: 'After 6 months', 12: 'After 12 months' },
    simulationTitle: 'Decision impact versus not taking the decision',
    simulationUnavailable: 'Full simulation needs additional inputs; missing values are not assumed.',
    missing: {
      income: 'Income data',
      expenses: 'Expense data',
      debts: 'Debt data',
      savings: 'Savings data',
      investments: 'Investment data',
      upfront_cash_outflow: 'Down payment or upfront cash outflow',
      financing_principal: 'Financing principal',
      debt_action_direction: 'Whether this is a new loan or debt repayment',
    },
    signals: {
      decision_creates_monthly_deficit: 'The decision creates a monthly deficit.',
      post_decision_surplus_below_10_percent: 'Post-decision surplus is below 10% of income.',
      liquidity_runway_below_one_month: 'Remaining liquidity covers less than one month.',
      liquidity_runway_below_three_months: 'Remaining liquidity covers less than three months.',
      projected_debt_service_above_50_percent: 'Projected debt service exceeds 50% of income.',
      projected_debt_service_above_35_percent: 'Projected debt service exceeds 35% of income.',
      assessment_based_on_incomplete_data: 'The assessment is based on incomplete financial data.',
      monthly_cash_flow_remains_positive: 'Monthly cash flow remains positive after the decision.',
      liquidity_buffer_remains_at_least_three_months: 'The liquidity buffer remains at least three months.',
      projected_debt_service_within_conservative_range: 'Projected debt service remains within a conservative range.',
    },
  },
  fr: {
    confidence: { high: 'Confiance élevée', medium: 'Confiance moyenne', low: 'Confiance faible' },
    scenarios: { stress: 'Scénario de stress', base: 'Scénario de base', optimistic: 'Scénario optimiste' },
    horizons: { 3: 'Après 3 mois', 6: 'Après 6 mois', 12: 'Après 12 mois' },
    simulationTitle: 'Impact de la décision par rapport à son absence',
    simulationUnavailable: 'La simulation complète nécessite des données supplémentaires ; aucune valeur manquante n’est supposée.',
    missing: {
      income: 'Données de revenus',
      expenses: 'Données de dépenses',
      debts: 'Données de dettes',
      savings: 'Données d’épargne',
      investments: 'Données d’investissement',
      upfront_cash_outflow: 'Acompte ou sortie de trésorerie initiale',
      financing_principal: 'Montant principal du financement',
      debt_action_direction: 'Préciser nouveau prêt ou remboursement de dette',
    },
    signals: {
      decision_creates_monthly_deficit: 'La décision crée un déficit mensuel.',
      post_decision_surplus_below_10_percent: 'Le surplus après décision est inférieur à 10 % du revenu.',
      liquidity_runway_below_one_month: 'La liquidité restante couvre moins d’un mois.',
      liquidity_runway_below_three_months: 'La liquidité restante couvre moins de trois mois.',
      projected_debt_service_above_50_percent: 'Le service de la dette projeté dépasse 50 % du revenu.',
      projected_debt_service_above_35_percent: 'Le service de la dette projeté dépasse 35 % du revenu.',
      assessment_based_on_incomplete_data: 'L’évaluation repose sur des données financières incomplètes.',
      monthly_cash_flow_remains_positive: 'Le flux de trésorerie mensuel reste positif après la décision.',
      liquidity_buffer_remains_at_least_three_months: 'La réserve de liquidité reste suffisante pour au moins trois mois.',
      projected_debt_service_within_conservative_range: 'Le service de la dette projeté reste dans une plage prudente.',
    },
  },
} as const;

function confidenceBand(percent: number): 'high' | 'medium' | 'low' {
  if (percent >= 80) return 'high';
  if (percent >= 60) return 'medium';
  return 'low';
}

function localizeSignal(code: string, locale: EconomicDecisionLocale): LocalizedEconomicSignal {
  const signals = LABELS[locale].signals as Record<string, string>;
  return { code, label: signals[code] ?? code.replaceAll('_', ' ') };
}

function localizeMissing(code: string, locale: EconomicDecisionLocale): LocalizedEconomicSignal {
  const missing = LABELS[locale].missing as Record<string, string>;
  return { code, label: missing[code] ?? code.replaceAll('_', ' ') };
}

export function presentEconomicDecision(
  context: EconomicDecisionContext,
  decisionType: EconomicBridgeDecisionType,
  locale: EconomicDecisionLocale,
): EconomicDecisionPresentation {
  const confidencePercent = Math.round(Math.max(0, Math.min(1, context.snapshot.dataQuality.completeness)) * 100);
  const band = confidenceBand(confidencePercent);
  const scenarioIds = ['stress', 'base', 'optimistic'] as const;

  const scenarios = scenarioIds.map((id) => {
    const points = context.forecast.scenarios[id].points;
    const last = points.at(-1) ?? null;
    return {
      id,
      label: LABELS[locale].scenarios[id],
      month12: last
        ? {
            monthlySurplus: last.surplus,
            liquidBalance: last.liquidBalance,
            investmentBalance: last.investmentBalance,
            netWorth: last.netWorth,
          }
        : null,
    };
  });

  const horizonMap = [
    [3, context.simulation?.horizons.month3],
    [6, context.simulation?.horizons.month6],
    [12, context.simulation?.horizons.month12],
  ] as const;

  const simulation = context.simulation
    ? {
        title: LABELS[locale].simulationTitle,
        unavailable: LABELS[locale].simulationUnavailable,
        horizons: horizonMap.map(([month, values]) => ({
          month,
          label: LABELS[locale].horizons[month],
          scenarios: scenarioIds.map((id) => ({
            id,
            label: LABELS[locale].scenarios[id],
            monthlySurplusDelta: values?.[id]?.monthlySurplus ?? null,
            liquidBalanceDelta: values?.[id]?.liquidBalance ?? null,
            netWorthDelta: values?.[id]?.netWorth ?? null,
          })),
        })),
      }
    : null;

  return {
    analysisVersion: ECONOMIC_ANALYSIS_VERSION,
    generatedAt: context.forecast.generatedAt,
    decisionType,
    confidencePercent,
    confidenceLabel: LABELS[locale].confidence[band],
    missingData: [...context.snapshot.dataQuality.missing, ...context.simulationMissing]
      .filter((code, index, all) => all.indexOf(code) === index)
      .map((code) => localizeMissing(code, locale)),
    warnings: context.assessment.warnings.map((code) => localizeSignal(code, locale)),
    reasons: context.assessment.reasons.map((code) => localizeSignal(code, locale)),
    scenarios,
    simulation,
  };
}

export function versionedEconomicAnalysis(
  context: EconomicDecisionContext,
  decisionType: EconomicBridgeDecisionType,
) {
  return {
    version: ECONOMIC_ANALYSIS_VERSION,
    generatedAt: context.forecast.generatedAt,
    decisionType,
    snapshot: context.snapshot,
    forecast: context.forecast,
    assessment: context.assessment,
    simulation: context.simulation,
    simulationMissing: context.simulationMissing,
  };
}

import type {
  EconomicDecisionContext,
  EconomicBridgeDecisionType,
} from './economicIntelligenceBridge';

export type EconomicDecisionLocale = 'ar' | 'en' | 'fr';

export const ECONOMIC_ANALYSIS_VERSION = '7.1.0';

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

export type EconomicDecisionPresentation = {
  analysisVersion: string;
  generatedAt: string;
  decisionType: EconomicBridgeDecisionType;
  confidencePercent: number;
  confidenceLabel: string;
  missingData: string[];
  warnings: LocalizedEconomicSignal[];
  reasons: LocalizedEconomicSignal[];
  scenarios: EconomicScenarioSummary[];
};

const LABELS = {
  ar: {
    confidence: { high: 'ثقة عالية', medium: 'ثقة متوسطة', low: 'ثقة منخفضة' },
    scenarios: { stress: 'سيناريو ضاغط', base: 'السيناريو الأساسي', optimistic: 'سيناريو متفائل' },
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

export function presentEconomicDecision(
  context: EconomicDecisionContext,
  decisionType: EconomicBridgeDecisionType,
  locale: EconomicDecisionLocale,
): EconomicDecisionPresentation {
  const confidencePercent = Math.round(Math.max(0, Math.min(1, context.snapshot.dataQuality.completeness)) * 100);
  const band = confidenceBand(confidencePercent);

  const scenarios = (['stress', 'base', 'optimistic'] as const).map((id) => {
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

  return {
    analysisVersion: ECONOMIC_ANALYSIS_VERSION,
    generatedAt: context.forecast.generatedAt,
    decisionType,
    confidencePercent,
    confidenceLabel: LABELS[locale].confidence[band],
    missingData: [...context.snapshot.dataQuality.missing],
    warnings: context.assessment.warnings.map((code) => localizeSignal(code, locale)),
    reasons: context.assessment.reasons.map((code) => localizeSignal(code, locale)),
    scenarios,
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
  };
}

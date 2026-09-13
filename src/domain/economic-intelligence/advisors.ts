import type { EconomicContextSnapshot } from './economicContext';
import type { PersonalEconomicImpact } from './personalEconomicImpact';
import type { FinancialTwinForecast, FinancialTwinSnapshot } from './types';

export type EconomicAdvisorId = 'finance' | 'investment' | 'business';

export type AdvisorEvidenceFact = {
  key: string;
  value: string | number | null;
  source: 'financial_twin' | 'forecast' | 'economic_context' | 'personal_impact' | 'domain_context' | 'decision_memory';
};

export type AdvisorGroundingInput = {
  twin: FinancialTwinSnapshot;
  forecast?: FinancialTwinForecast | null;
  economicContext?: EconomicContextSnapshot | null;
  impacts?: PersonalEconomicImpact[];
  hasMarketEvidence?: boolean;
  hasBusinessEvidence?: boolean;
  decisionMemoryFacts?: Array<{ key: string; value: string | number }>;
};

export type AdvisorGrounding = {
  advisor: EconomicAdvisorId;
  confidence: number;
  facts: AdvisorEvidenceFact[];
  warnings: string[];
  missing: string[];
  allowedClaims: string[];
  prohibitedClaims: string[];
};

const COMMON_PROHIBITED_CLAIMS = [
  'guaranteed_return',
  'guaranteed_outcome',
  'fabricated_user_data',
  'fabricated_market_data',
  'licensed_legal_tax_or_investment_advice_claim',
  'causal_claim_from_decision_memory',
] as const;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lastBasePoint(forecast?: FinancialTwinForecast | null) {
  const points = forecast?.scenarios.base.points ?? [];
  return points[points.length - 1] ?? null;
}

function baseConfidence(input: AdvisorGroundingInput) {
  let confidence = input.twin.dataQuality.completeness;
  if (input.economicContext) {
    confidence *= input.economicContext.status === 'available' ? 1 : input.economicContext.status === 'partial' ? 0.9 : 0.8;
  }
  return clamp(confidence);
}

export function buildAdvisorGrounding(
  advisor: EconomicAdvisorId,
  input: AdvisorGroundingInput,
): AdvisorGrounding {
  const facts: AdvisorEvidenceFact[] = [
    { key: 'monthly_income', value: input.twin.monthlyIncome, source: 'financial_twin' },
    { key: 'monthly_expenses', value: input.twin.monthlyExpenses, source: 'financial_twin' },
    { key: 'monthly_surplus', value: input.twin.monthlySurplus, source: 'financial_twin' },
    { key: 'net_worth', value: input.twin.netWorth, source: 'financial_twin' },
    { key: 'runway_months', value: input.twin.runwayMonths, source: 'financial_twin' },
    { key: 'debt_service_ratio', value: input.twin.debtServiceRatio, source: 'financial_twin' },
  ];

  const missing = [...input.twin.dataQuality.missing];
  const warnings = [...input.twin.dataQuality.warnings];
  const allowedClaims = [
    'explain_current_financial_position',
    'explain_data_gaps',
    'compare_explicit_scenarios',
    'describe_risk_factors_with_evidence',
  ];
  let confidence = baseConfidence(input);

  const basePoint = lastBasePoint(input.forecast);
  if (basePoint) {
    facts.push(
      { key: 'forecast_month', value: basePoint.month, source: 'forecast' },
      { key: 'forecast_monthly_surplus', value: basePoint.surplus, source: 'forecast' },
      { key: 'forecast_net_worth', value: basePoint.netWorth, source: 'forecast' },
    );
    allowedClaims.push('describe_base_forecast_as_simulation');
  } else {
    missing.push('forecast');
  }

  if (input.economicContext) {
    facts.push(
      { key: 'inflation_direction', value: input.economicContext.signals.inflation, source: 'economic_context' },
      { key: 'policy_regime', value: input.economicContext.signals.policyRegime, source: 'economic_context' },
      { key: 'growth_direction', value: input.economicContext.signals.growth, source: 'economic_context' },
      { key: 'labor_signal', value: input.economicContext.signals.labor, source: 'economic_context' },
    );
    if (input.economicContext.status !== 'available') warnings.push('economic_context_incomplete');
    allowedClaims.push('explain_macro_context_with_sources');
  } else {
    missing.push('economic_context');
  }

  for (const impact of input.impacts ?? []) {
    facts.push({ key: `impact:${impact.code}`, value: impact.severity, source: 'personal_impact' });
  }

  const memoryFacts = input.decisionMemoryFacts ?? [];
  if (memoryFacts.length > 0) {
    for (const fact of memoryFacts) facts.push({ key: fact.key, value: fact.value, source: 'decision_memory' });
    allowedClaims.push('describe_user_owned_decision_history_without_causal_inference');
  }

  if (advisor === 'finance') {
    allowedClaims.push('suggest_budget_review', 'suggest_liquidity_buffer_review', 'suggest_debt_review');
  }

  if (advisor === 'investment') {
    facts.push({ key: 'investment_balance', value: input.twin.investmentBalance, source: 'financial_twin' });
    allowedClaims.push('explain_portfolio_capacity', 'explain_macro_risk_backdrop');
    if (!input.hasMarketEvidence) {
      missing.push('market_evidence');
      warnings.push('investment_conclusions_limited_without_market_evidence');
      confidence *= 0.75;
    } else {
      allowedClaims.push('discuss_market_evidence_without_guarantees');
    }
  }

  if (advisor === 'business') {
    allowedClaims.push('explain_business_cash_resilience', 'explain_macro_business_pressure');
    if (!input.hasBusinessEvidence) {
      missing.push('business_evidence');
      warnings.push('business_conclusions_limited_without_business_evidence');
      confidence *= 0.75;
    } else {
      allowedClaims.push('discuss_business_evidence');
    }
  }

  return {
    advisor,
    confidence: clamp(confidence),
    facts,
    warnings: [...new Set(warnings)],
    missing: [...new Set(missing)],
    allowedClaims: [...new Set(allowedClaims)],
    prohibitedClaims: [...COMMON_PROHIBITED_CLAIMS],
  };
}

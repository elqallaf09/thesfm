import type { EconomicContextSnapshot } from './economicContext';
import type { FinancialTwinSnapshot } from './types';

export type PersonalEconomicImpactCode =
  | 'inflation_budget_attention'
  | 'tightening_debt_attention'
  | 'weakening_growth_investment_attention'
  | 'weakening_labor_income_resilience'
  | 'macro_context_incomplete';

export type PersonalEconomicImpact = {
  code: PersonalEconomicImpactCode;
  severity: 'info' | 'watch' | 'high';
  reason: string;
  evidence: string[];
};

export function assessPersonalEconomicImpact(
  twin: FinancialTwinSnapshot,
  context: EconomicContextSnapshot,
): PersonalEconomicImpact[] {
  const impacts: PersonalEconomicImpact[] = [];

  if (context.signals.inflation === 'rising' && twin.monthlyExpenses > 0) {
    const constrained = twin.monthlyIncome > 0 && twin.monthlySurplus / twin.monthlyIncome < 0.15;
    impacts.push({
      code: 'inflation_budget_attention',
      severity: constrained ? 'high' : 'watch',
      reason: 'Rising inflation can increase pressure on recurring household or business expenses.',
      evidence: ['inflation:rising', `monthly_surplus:${twin.monthlySurplus}`],
    });
  }

  if (context.signals.policyRegime === 'tightening' && twin.debtBalance > 0) {
    impacts.push({
      code: 'tightening_debt_attention',
      severity: twin.debtServiceRatio !== null && twin.debtServiceRatio > 0.35 ? 'high' : 'watch',
      reason: 'A tightening rate environment deserves attention when debt obligations are material.',
      evidence: ['policy_regime:tightening', `debt_balance:${twin.debtBalance}`],
    });
  }

  if (context.signals.growth === 'falling' && twin.investmentBalance > 0) {
    impacts.push({
      code: 'weakening_growth_investment_attention',
      severity: 'watch',
      reason: 'A weakening growth trend can change the risk backdrop for growth-sensitive investments.',
      evidence: ['growth:falling', `investment_balance:${twin.investmentBalance}`],
    });
  }

  if (context.signals.labor === 'weakening' && twin.monthlyIncome > 0) {
    impacts.push({
      code: 'weakening_labor_income_resilience',
      severity: twin.runwayMonths !== null && twin.runwayMonths < 3 ? 'high' : 'info',
      reason: 'A weakening labor backdrop increases the value of maintaining an adequate liquidity buffer.',
      evidence: ['labor:weakening', `runway_months:${twin.runwayMonths ?? 'unknown'}`],
    });
  }

  if (context.status !== 'available') {
    impacts.push({
      code: 'macro_context_incomplete',
      severity: 'info',
      reason: 'Some macroeconomic indicators are unavailable, so economic-context conclusions are intentionally limited.',
      evidence: context.missing.map((id) => `missing:${id}`),
    });
  }

  return impacts;
}

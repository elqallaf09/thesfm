import type {
  FinancialDecisionAssessment,
  FinancialDecisionInput,
  FinancialTwinSnapshot,
} from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function assessFinancialDecision(
  snapshot: FinancialTwinSnapshot,
  input: FinancialDecisionInput,
): FinancialDecisionAssessment {
  const upfrontCost = Math.max(0, input.upfrontCost ?? 0);
  const monthlyCost = Math.max(0, input.monthlyCost ?? 0);
  const monthlyIncomeChange = input.monthlyIncomeChange ?? 0;
  const investmentAmount = Math.max(0, input.investmentAmount ?? 0);
  const debtPaydownAmount = Math.max(0, input.debtPaydownAmount ?? 0);

  const liquidAfterUpfront = Math.max(0, snapshot.liquidBalance - upfrontCost - investmentAmount - debtPaydownAmount);
  const monthlySurplusAfterDecision = snapshot.monthlySurplus + monthlyIncomeChange - monthlyCost;
  const monthlyOutflowAfterDecision = snapshot.monthlyExpenses + snapshot.monthlyDebtPayments + monthlyCost;
  const runwayMonthsAfterDecision = monthlyOutflowAfterDecision > 0
    ? liquidAfterUpfront / monthlyOutflowAfterDecision
    : null;

  let riskScore = 20;
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (monthlySurplusAfterDecision < 0) {
    riskScore += 45;
    warnings.push('decision_creates_monthly_deficit');
  } else if (snapshot.monthlyIncome > 0 && monthlySurplusAfterDecision / snapshot.monthlyIncome < 0.1) {
    riskScore += 20;
    warnings.push('post_decision_surplus_below_10_percent');
  } else {
    reasons.push('monthly_cash_flow_remains_positive');
  }

  if (runwayMonthsAfterDecision !== null) {
    if (runwayMonthsAfterDecision < 1) {
      riskScore += 30;
      warnings.push('liquidity_runway_below_one_month');
    } else if (runwayMonthsAfterDecision < 3) {
      riskScore += 15;
      warnings.push('liquidity_runway_below_three_months');
    } else {
      reasons.push('liquidity_buffer_remains_at_least_three_months');
    }
  }

  if (snapshot.debtServiceRatio !== null) {
    const projectedRatio = snapshot.monthlyIncome + monthlyIncomeChange > 0
      ? (snapshot.monthlyDebtPayments + monthlyCost) / (snapshot.monthlyIncome + monthlyIncomeChange)
      : 1;
    if (projectedRatio > 0.5) {
      riskScore += 25;
      warnings.push('projected_debt_service_above_50_percent');
    } else if (projectedRatio > 0.35) {
      riskScore += 12;
      warnings.push('projected_debt_service_above_35_percent');
    } else {
      reasons.push('projected_debt_service_within_conservative_range');
    }
  }

  if (snapshot.dataQuality.completeness < 1) {
    riskScore += 10;
    warnings.push('assessment_based_on_incomplete_data');
  }

  riskScore = clamp(Math.round(riskScore), 0, 100);
  const affordability = riskScore <= 35 ? 'strong' : riskScore <= 60 ? 'borderline' : 'weak';

  return {
    kind: input.kind,
    affordability,
    riskScore,
    monthlySurplusAfterDecision,
    runwayMonthsAfterDecision,
    reasons,
    warnings,
  };
}

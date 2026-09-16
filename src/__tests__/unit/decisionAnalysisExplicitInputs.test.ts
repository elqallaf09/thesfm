import { describe, expect, it } from 'vitest';
import { analyzeDecision, type DecisionSourceData } from '@/lib/decisions/decisionAnalysis';

const data: DecisionSourceData = {
  income: [{ amount: 2500, currency: 'KWD' }],
  expenses: [{ amount: 1000, currency: 'KWD' }],
  debts: [{ remaining_amount: 7000, monthly_payment: 250, currency: 'KWD', status: 'active' }],
  savings: [{ current_value: 10000, currency: 'KWD' }],
  investments: [{ current_value: 6000, currency: 'KWD' }],
  goals: [{ target_amount: 20000 }],
  projects: [],
  financialModels: [],
  zakatCalculations: [],
  zakatAssets: [],
  charityCommitments: [],
};

describe('decision analysis explicit simulation inputs', () => {
  it('passes financed-purchase inputs into economic simulation', () => {
    const analysis = analyzeDecision({
      title: 'Car',
      decisionType: 'purchase',
      amount: 20000,
      currency: 'KWD',
      priority: 'medium',
      upfrontCashOutflow: 4000,
      financingPrincipal: 16000,
      monthlyPayment: 300,
      recurringCost: 60,
      loanTermMonths: 60,
    }, data);

    expect(analysis.source).toBe('economic_intelligence');
    expect(analysis.economicContext?.simulationMissing).toEqual([]);
    expect(analysis.missingData).not.toContain('financing_principal');
    expect(analysis.missingData).not.toContain('monthly_payment');
  });

  it('keeps debt direction explicit instead of guessing', () => {
    const missingDirection = analyzeDecision({
      title: 'Debt choice',
      decisionType: 'debt_saving',
      amount: 3000,
      currency: 'KWD',
      priority: 'medium',
    }, data);

    expect(missingDirection.missingData).toContain('debt_action_direction');
    expect(missingDirection.economicContext?.simulation).toBeNull();

    const repayment = analyzeDecision({
      title: 'Repay debt',
      decisionType: 'debt_saving',
      amount: 3000,
      currency: 'KWD',
      priority: 'medium',
      debtDirection: 'repay_debt',
      debtPaydownAmount: 3000,
      monthlyDebtPaymentReduction: 90,
    }, data);

    expect(repayment.missingData).not.toContain('debt_action_direction');
    expect(repayment.economicContext?.simulation).not.toBeNull();
  });

  it('uses explicit project income changes without fabricating them', () => {
    const noRevenue = analyzeDecision({
      title: 'Project',
      decisionType: 'project',
      amount: 4000,
      currency: 'KWD',
      priority: 'medium',
      expectedMonthlyCost: 250,
    }, data);

    const withRevenue = analyzeDecision({
      title: 'Project',
      decisionType: 'project',
      amount: 4000,
      currency: 'KWD',
      priority: 'medium',
      expectedMonthlyCost: 250,
      expectedMonthlyIncomeChange: 600,
    }, data);

    const baseWithout = noRevenue.economicContext?.simulation?.horizons.month12.base?.monthlySurplus ?? -Infinity;
    const baseWith = withRevenue.economicContext?.simulation?.horizons.month12.base?.monthlySurplus ?? -Infinity;
    expect(baseWith).toBeGreaterThan(baseWithout);
  });
});

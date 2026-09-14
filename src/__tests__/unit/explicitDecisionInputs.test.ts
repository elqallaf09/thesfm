import { describe, expect, it } from 'vitest';
import { buildEconomicDecisionContext } from '@/lib/decisions/economicIntelligenceBridge';

const source = {
  income: [{ amount: 2500, currency: 'KWD' }],
  expenses: [{ amount: 1000, currency: 'KWD' }],
  debts: [{ remaining_amount: 7000, monthly_payment: 250, currency: 'KWD', status: 'active' }],
  savings: [{ current_amount: 10000, currency: 'KWD' }],
  investments: [{ current_value: 6000, currency: 'KWD' }],
};

describe('explicit decision inputs', () => {
  it('models a financed purchase with explicit down payment and principal', () => {
    const context = buildEconomicDecisionContext({
      decisionType: 'purchase',
      amount: 20000,
      upfrontCashOutflow: 4000,
      financingPrincipal: 16000,
      monthlyPayment: 300,
      recurringCost: 60,
      loanTermMonths: 60,
    }, source, 'KWD');

    expect(context?.simulationMissing).toEqual([]);
    expect(context?.simulation?.scenarios.base.afterDecision[0]?.liquidBalance).toBeLessThan(
      context?.simulation?.scenarios.base.baseline[0]?.liquidBalance ?? 0,
    );
    expect(context?.simulation?.scenarios.base.afterDecision[0]?.netWorth).toBeLessThan(
      context?.simulation?.scenarios.base.baseline[0]?.netWorth ?? 0,
    );
  });

  it('models a new loan separately from debt repayment', () => {
    const newLoan = buildEconomicDecisionContext({
      decisionType: 'debt_saving',
      amount: 5000,
      debtDirection: 'new_loan',
      financingPrincipal: 5000,
      monthlyPayment: 120,
    }, source, 'KWD');
    const repayment = buildEconomicDecisionContext({
      decisionType: 'debt_saving',
      amount: 3000,
      debtDirection: 'repay_debt',
      debtPaydownAmount: 3000,
      monthlyDebtPaymentReduction: 90,
    }, source, 'KWD');

    expect(newLoan?.simulationMissing).toEqual([]);
    expect(repayment?.simulationMissing).toEqual([]);
    expect(newLoan?.simulation?.scenarios.base.afterDecision[0]?.netWorth).toBeLessThan(
      newLoan?.simulation?.scenarios.base.baseline[0]?.netWorth ?? 0,
    );
    // Debt payments belong to the simulation, not FinancialDecisionAssessment.
    // Assert the explicit amounts before comparing ratios; a missing scenario
    // must fail rather than passing through a fabricated fallback value.
    const newLoanPoint = newLoan?.simulation?.scenarios.base.afterDecision[0];
    const repaymentPoint = repayment?.simulation?.scenarios.base.afterDecision[0];
    expect(newLoanPoint).toBeDefined();
    expect(repaymentPoint).toBeDefined();
    if (!newLoanPoint || !repaymentPoint) throw new Error('Expected both debt simulations');
    expect(newLoanPoint.debtPayments).toBe(370);
    expect(repaymentPoint.debtPayments).toBe(160);
    expect(newLoanPoint.income).toBe(2500);
    expect(repaymentPoint.income).toBe(2500);
    expect(newLoanPoint.debtPayments / newLoanPoint.income).toBeCloseTo(0.148);
    expect(repaymentPoint.debtPayments / repaymentPoint.income).toBeCloseTo(0.064);
    expect(repaymentPoint.debtPayments / repaymentPoint.income).toBeLessThan(
      newLoanPoint.debtPayments / newLoanPoint.income,
    );
  });

  it('uses an explicit project income change instead of inventing revenue', () => {
    const noRevenueAssumption = buildEconomicDecisionContext({
      decisionType: 'project',
      amount: 4000,
      expectedMonthlyCost: 250,
    }, source, 'KWD');
    const explicitRevenue = buildEconomicDecisionContext({
      decisionType: 'project',
      amount: 4000,
      expectedMonthlyCost: 250,
      expectedMonthlyIncomeChange: 600,
    }, source, 'KWD');

    expect(explicitRevenue?.simulation?.horizons.month12.base?.monthlySurplus).toBeGreaterThan(
      noRevenueAssumption?.simulation?.horizons.month12.base?.monthlySurplus ?? -Infinity,
    );
  });
});

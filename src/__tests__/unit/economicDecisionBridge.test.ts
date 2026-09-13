import { describe, expect, it } from 'vitest';
import { analyzeDecision, type DecisionSourceData } from '@/lib/decisions/decisionAnalysis';

function source(overrides: Partial<DecisionSourceData> = {}): DecisionSourceData {
  return {
    income: [{ amount: 3000, currency: 'KWD' }],
    expenses: [{ amount: 1200, currency: 'KWD' }],
    debts: [{ remaining_amount: 5000, monthly_payment: 300, currency: 'KWD', status: 'active' }],
    savings: [{ amount: 10000, currency: 'KWD' }],
    investments: [],
    goals: [{ target_amount: 20000 }],
    projects: [],
    financialModels: [],
    zakatCalculations: [],
    zakatAssets: [],
    charityCommitments: [],
    ...overrides,
  };
}

describe('economic intelligence decision bridge', () => {
  it('routes supported purchase decisions through the financial digital twin and simulator', () => {
    const result = analyzeDecision({
      title: 'Buy a car',
      decisionType: 'purchase',
      amount: 2000,
      recurringCost: 250,
      currency: 'KWD',
      priority: 'medium',
    }, source());

    expect(result.source).toBe('economic_intelligence');
    expect(result.economicContext?.snapshot.monthlyIncome).toBe(3000);
    expect(result.economicContext?.snapshot.monthlyDebtPayments).toBe(300);
    expect(result.economicContext?.forecast.horizonMonths).toBe(12);
    expect(result.economicContext?.simulation?.horizons.month12.base).not.toBeNull();
    expect(result.netAfterDecision).toBe(1250);
  });

  it('does not pretend a financed purchase is fully paid in cash', () => {
    const result = analyzeDecision({
      title: 'Finance a car',
      decisionType: 'purchase',
      amount: 20000,
      monthlyPayment: 250,
      currency: 'KWD',
      priority: 'medium',
    }, source());

    expect(result.economicContext?.simulationMissing).toEqual(
      expect.arrayContaining(['upfront_cash_outflow', 'financing_principal']),
    );
    expect(result.economicContext?.assessment.runwayMonthsAfterDecision).not.toBe(0);
  });

  it('keeps unsupported charity decisions on the legacy deterministic rules', () => {
    const result = analyzeDecision({
      title: 'Charity',
      decisionType: 'charity_zakat',
      amount: 100,
      currency: 'KWD',
      priority: 'medium',
      donationRequired: true,
    }, source());

    expect(result.source).toBe('rules');
    expect(result.economicContext).toBeNull();
  });

  it('exposes missing debt data instead of inventing debt context', () => {
    const noDebtSource = source();
    delete noDebtSource.debts;
    const result = analyzeDecision({
      title: 'Start a project',
      decisionType: 'project',
      amount: 1000,
      currency: 'KWD',
      priority: 'medium',
    }, noDebtSource);

    expect(result.source).toBe('economic_intelligence');
    expect(result.missingData).toContain('debts');
    expect(result.economicContext?.snapshot.dataQuality.completeness).toBeLessThan(1);
  });
});

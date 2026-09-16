import { describe, expect, it } from 'vitest';
import { compareFinancialDecisions } from '@/lib/decisions/decisionComparison';
import type { DecisionSourceData } from '@/lib/decisions/decisionAnalysis';

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

const base = {
  currency: 'KWD',
  priority: 'medium' as const,
};

describe('decision comparison', () => {
  it('prefers the lower-impact complete option when both are comparable', () => {
    const result = compareFinancialDecisions([
      {
        id: 'cash', label: 'Cash',
        inputs: { ...base, title: 'Cash car', decisionType: 'purchase', amount: 4000, upfrontCashOutflow: 4000 },
      },
      {
        id: 'financed', label: 'Financed',
        inputs: { ...base, title: 'Financed car', decisionType: 'purchase', amount: 12000, upfrontCashOutflow: 2000, financingPrincipal: 10000, monthlyPayment: 300 },
      },
    ], data);

    expect(result.reason).toBe('best_risk_adjusted_fit');
    expect(result.recommendedId).not.toBeNull();
  });

  it('refuses to rank incomplete financing terms', () => {
    const result = compareFinancialDecisions([
      {
        id: 'complete', label: 'Complete',
        inputs: { ...base, title: 'Cash car', decisionType: 'purchase', amount: 4000, upfrontCashOutflow: 4000 },
      },
      {
        id: 'incomplete', label: 'Incomplete',
        inputs: { ...base, title: 'Financed car', decisionType: 'purchase', amount: 12000, financingPrincipal: 10000 },
      },
    ], data);

    expect(result.reason).toBe('insufficient_data');
    expect(result.recommendedId).toBeNull();
    expect(result.entries.find(entry => entry.id === 'incomplete')?.completenessIssues).toEqual(
      expect.arrayContaining(['monthlyPayment', 'upfrontCashOutflow']),
    );
  });

  it('does not compare different currencies without explicit conversion', () => {
    const result = compareFinancialDecisions([
      { id: 'kwd', label: 'KWD', inputs: { ...base, title: 'A', decisionType: 'purchase', amount: 3000 } },
      { id: 'usd', label: 'USD', inputs: { ...base, currency: 'USD', title: 'B', decisionType: 'purchase', amount: 3000 } },
    ], data);

    expect(result.reason).toBe('currency_mismatch');
    expect(result.recommendedId).toBeNull();
  });
});

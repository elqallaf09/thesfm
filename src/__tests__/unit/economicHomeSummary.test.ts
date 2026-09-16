import { describe, expect, it } from 'vitest';
import { buildEconomicHomeSummary } from '@/lib/dashboard/economicHomeSummary';

const snapshot = {
  currency: 'KWD',
  monthlyIncome: 3000,
  monthlyExpenses: 1400,
  monthlyDebtPayments: 400,
  monthlySurplus: 1200,
  liquidBalance: 9000,
  savingsBalance: 6000,
  investmentBalance: 5000,
  debtBalance: 10000,
  netWorth: 10000,
  debtServiceRatio: 0.1333,
  runwayMonths: 5,
  dataQuality: { completeness: 1, missing: [], warnings: [] },
} as any;

describe('economic home summary', () => {
  it('prioritizes deficit as the primary risk', () => {
    const result = buildEconomicHomeSummary({ ...snapshot, monthlySurplus: -100 } as any);
    expect(result.health).toBe('critical');
    expect(result.riskCode).toBe('monthly_deficit');
  });

  it('surfaces liquidity building as an opportunity when surplus exists', () => {
    const result = buildEconomicHomeSummary(snapshot);
    expect(result.opportunityCode).toBe('build_liquidity');
  });

  it('selects the highest-risk unresolved decision for attention', () => {
    const result = buildEconomicHomeSummary(snapshot, [], [
      { id: 'a', title: 'Car', status: 'needs_review', riskScore: 50 },
      { id: 'b', title: 'Loan', status: 'high_risk', riskScore: 85 },
    ]);
    expect(result.attentionDecision?.id).toBe('b');
  });
});

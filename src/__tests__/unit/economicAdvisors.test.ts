import { describe, expect, it } from 'vitest';
import { buildAdvisorGrounding } from '@/domain/economic-intelligence/advisors';
import type { FinancialTwinSnapshot } from '@/domain/economic-intelligence/types';

const twin: FinancialTwinSnapshot = {
  asOf: '2026-09-14T00:00:00.000Z',
  currency: 'KWD',
  monthlyIncome: 2000,
  monthlyExpenses: 1000,
  monthlyDebtPayments: 300,
  monthlySurplus: 700,
  debtBalance: 12000,
  savingsBalance: 6000,
  investmentBalance: 8000,
  liquidBalance: 6000,
  netWorth: 2000,
  debtServiceRatio: 0.15,
  savingsRate: 0.35,
  runwayMonths: 6000 / 1300,
  dataQuality: { completeness: 1, missing: [], warnings: [] },
};

describe('economic advisor grounding', () => {
  it('keeps finance advice evidence-bound', () => {
    const grounding = buildAdvisorGrounding('finance', { twin });
    expect(grounding.advisor).toBe('finance');
    expect(grounding.allowedClaims).toContain('explain_current_financial_position');
    expect(grounding.prohibitedClaims).toContain('guaranteed_outcome');
    expect(grounding.missing).toContain('forecast');
  });

  it('reduces investment confidence without market evidence', () => {
    const grounding = buildAdvisorGrounding('investment', { twin, hasMarketEvidence: false });
    expect(grounding.missing).toContain('market_evidence');
    expect(grounding.warnings).toContain('investment_conclusions_limited_without_market_evidence');
    expect(grounding.confidence).toBeLessThan(1);
  });

  it('reduces business confidence without business evidence', () => {
    const grounding = buildAdvisorGrounding('business', { twin, hasBusinessEvidence: false });
    expect(grounding.missing).toContain('business_evidence');
    expect(grounding.allowedClaims).toContain('explain_business_cash_resilience');
    expect(grounding.confidence).toBeLessThan(1);
  });
});

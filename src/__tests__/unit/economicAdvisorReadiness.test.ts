import { describe, expect, it } from 'vitest';
import { buildAdvisorGrounding } from '@/domain/economic-intelligence/advisors';

const twin = {
  monthlyIncome: 3000, monthlyExpenses: 1500, monthlySurplus: 1000, netWorth: 10000,
  runwayMonths: 4, debtServiceRatio: 0.1, investmentBalance: 3000,
  dataQuality: { completeness: 1, missing: [], warnings: [] },
} as any;

const readiness = {
  overallScore: 40, level: 'low', nextActions: [],
  finance: { score: 100, ready: true, issues: [] },
  trader: { score: 0, ready: false, issues: [] },
  business: { score: 0, ready: false, issues: [] },
} as any;

describe('advisor readiness gates', () => {
  it('caps investment advisor confidence when Trader evidence is incomplete', () => {
    const grounding = buildAdvisorGrounding('investment', { twin, readiness, hasMarketEvidence: false });
    expect(grounding.confidence).toBeLessThanOrEqual(0.5);
    expect(grounding.warnings).toContain('advisor_readiness_partial');
    expect(grounding.prohibitedClaims).toContain('high_confidence_claim_when_readiness_is_low');
  });

  it('does not penalize Finance advisor for unused Trader/Business evidence', () => {
    const grounding = buildAdvisorGrounding('finance', { twin, readiness });
    expect(grounding.confidence).toBe(1);
  });
});

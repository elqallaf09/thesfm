import { describe, expect, it } from 'vitest';
import { buildEconomicIntelligenceReadiness } from '@/domain/economic-intelligence/readiness';

function evidence(overrides: any = {}) {
  return {
    finance: {
      snapshot: {
        investmentBalance: 0,
        dataQuality: { completeness: 1, missing: [], warnings: ['income:empty', 'expenses:empty', 'debts:empty', 'savings:empty', 'investments:empty'] },
        ...(overrides.snapshot ?? {}),
      },
    },
    trader: { watchlistCount: 0, activeAlertCount: 0, triggeredAlertCount: 0, ...(overrides.trader ?? {}) },
    business: { activeProjectCount: 0, fundingNeeds: [], ...(overrides.business ?? {}) },
  } as any;
}

describe('buildEconomicIntelligenceReadiness', () => {
  it('does not report full Finance readiness when source tables are empty', () => {
    const readiness = buildEconomicIntelligenceReadiness(evidence());
    expect(readiness.finance.score).toBe(0);
    expect(readiness.finance.issues.map(item => item.code)).toContain('finance:income_missing');
  });

  it('raises workspace readiness only from explicit evidence', () => {
    const readiness = buildEconomicIntelligenceReadiness(evidence({
      snapshot: { investmentBalance: 5000, dataQuality: { completeness: 1, missing: [], warnings: [] } },
      trader: { watchlistCount: 3, activeAlertCount: 1 },
      business: { activeProjectCount: 1, fundingNeeds: [{ projectId: 'p1', amount: 1000, currency: 'KWD', readinessScore: 80 }] },
    }));
    expect(readiness.finance.score).toBe(100);
    expect(readiness.trader.score).toBe(100);
    expect(readiness.business.score).toBe(100);
    expect(readiness.overallScore).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import { buildCrossWorkspaceBrief } from '@/domain/economic-intelligence/crossWorkspaceBrain';

const snapshot = {
  asOf: '2026-09-14T00:00:00.000Z', currency: 'KWD', monthlyIncome: 3000, monthlyExpenses: 1800, monthlyDebtPayments: 400,
  monthlySurplus: 800, liquidBalance: 6000, savingsBalance: 4000, investmentBalance: 2000, debtBalance: 12000,
  netWorth: -6000, runwayMonths: 2.7, debtServiceRatio: 400 / 3000, savingsRate: 800 / 3000,
  dataQuality: { completeness: 1, confidence: 1, missing: [], warnings: [], sources: [] },
} as any;

function evidence(overrides: any = {}) {
  return {
    finance: { snapshot: overrides.snapshot ?? snapshot },
    trader: { watchlistCount: 0, activeAlertCount: 0, triggeredAlertCount: 0, ...(overrides.trader ?? {}) },
    business: { activeProjectCount: 0, fundingNeeds: [], ...(overrides.business ?? {}) },
  };
}

describe('buildCrossWorkspaceBrief', () => {
  it('prioritizes a market-vs-liquidity conflict from real workspace evidence', () => {
    const brief = buildCrossWorkspaceBrief(evidence({ trader: { watchlistCount: 4, activeAlertCount: 2 } }));
    expect(brief.items.some(item => item.code === 'market_attention_vs_low_liquidity')).toBe(true);
    expect(brief.state).toBe('attention');
  });

  it('refuses to aggregate business funding needs across mixed currencies', () => {
    const brief = buildCrossWorkspaceBrief(evidence({
      business: { activeProjectCount: 2, fundingNeeds: [
        { projectId: 'a', amount: 1000, currency: 'KWD', readinessScore: 70 },
        { projectId: 'b', amount: 5000, currency: 'USD', readinessScore: 80 },
      ] },
    }));
    expect(brief.compatibleFundingNeed).toBeNull();
  });

  it('returns a clear sourced state when no material conflict is detected', () => {
    const strongSnapshot = { ...snapshot, runwayMonths: 8, monthlySurplus: 1000, debtServiceRatio: 0.1 };
    const brief = buildCrossWorkspaceBrief(evidence({ snapshot: strongSnapshot }));
    expect(brief.state).toBe('clear');
    expect(brief.items[0].code).toBe('no_cross_workspace_conflict_detected');
    expect(brief.items[0].sources).toEqual(['finance', 'trader', 'business']);
  });
});

import { describe, expect, it } from 'vitest';
import { buildEconomicIntelligenceReadiness } from '@/domain/economic-intelligence/readiness';

function evidence(overrides: any = {}) {
  return {
    finance: {
      snapshot: {
        debtBalance: 0,
        monthlyDebtPayments: 0,
        investmentBalance: 0,
        dataQuality: { completeness: 1, missing: [], warnings: ['income:empty', 'expenses:empty', 'debts:empty', 'savings:empty', 'investments:empty'] },
        ...(overrides.snapshot ?? {}),
      },
    },
    trader: { watchlistCount: 0, activeAlertCount: 0, triggeredAlertCount: 0, ...(overrides.trader ?? {}) },
    business: { activeProjectCount: 0, fundingNeeds: [], ...(overrides.business ?? {}) },
    ...(Object.prototype.hasOwnProperty.call(overrides, 'freshness') ? { freshness: overrides.freshness } : {}),
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

  it('treats confirmed true-zero states as known evidence without fabricating records', () => {
    const readiness = buildEconomicIntelligenceReadiness(evidence({
      snapshot: { dataQuality: { completeness: 1, missing: [], warnings: ['debts:empty', 'investments:empty'] } },
      trader: { watchlistCount: 2, activeAlertCount: 1 },
    }), ['no_debts', 'no_investments', 'no_business_projects']);
    expect(readiness.finance.issues.map(item => item.code)).not.toContain('finance:debts_missing');
    expect(readiness.finance.issues.map(item => item.code)).not.toContain('finance:investments_missing');
    expect(readiness.business.score).toBe(100);
    expect(readiness.confirmations).toEqual(expect.arrayContaining(['no_debts', 'no_investments', 'no_business_projects']));
  });

  it('invalidates a zero-state confirmation when live evidence contradicts it', () => {
    const readiness = buildEconomicIntelligenceReadiness(evidence({
      snapshot: { debtBalance: 2500, monthlyDebtPayments: 150, investmentBalance: 1000, dataQuality: { completeness: 1, missing: [], warnings: [] } },
      business: { activeProjectCount: 1, fundingNeeds: [] },
    }), ['no_debts', 'no_investments', 'no_business_projects']);
    expect(readiness.confirmations).toEqual([]);
    expect(readiness.invalidatedConfirmations).toEqual(expect.arrayContaining(['no_debts', 'no_investments', 'no_business_projects']));
  });

  it('reduces readiness and adds refresh diagnostics when evidence is stale', () => {
    const now = new Date('2026-09-14T00:00:00.000Z');
    const readiness = buildEconomicIntelligenceReadiness(evidence({
      snapshot: { investmentBalance: 5000, dataQuality: { completeness: 1, missing: [], warnings: [] } },
      trader: { watchlistCount: 3, activeAlertCount: 1 },
      business: { activeProjectCount: 1, fundingNeeds: [{ projectId: 'p1', amount: 1000, currency: 'KWD', readinessScore: 80 }] },
      freshness: { finance: '2026-05-01T00:00:00.000Z', trader: '2026-06-01T00:00:00.000Z', business: '2026-04-01T00:00:00.000Z' },
    }), [], now);
    expect(readiness.finance.score).toBe(60);
    expect(readiness.trader.score).toBe(60);
    expect(readiness.business.score).toBe(60);
    expect(readiness.nextActions.map(item => item.code)).toEqual(expect.arrayContaining(['finance:stale', 'trader:stale', 'business:stale']));
  });
});

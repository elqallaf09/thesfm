import { describe, expect, it } from 'vitest';
import { buildDailyBriefNarrative } from '../dailyBriefNarrative';
import type { CrossWorkspaceBrief } from '../crossWorkspaceBrain';

describe('buildDailyBriefNarrative', () => {
  it('keeps the deterministic priority action and sources', () => {
    const brief: CrossWorkspaceBrief = {
      state: 'critical',
      compatibleFundingNeed: 5000,
      fundingCurrency: 'KWD',
      generatedFrom: ['finance', 'trader', 'business'],
      items: [{
        code: 'market_attention_vs_debt_pressure',
        severity: 'danger',
        sources: ['finance', 'trader'],
        evidence: { debtServiceRatio: 0.55, watchlistCount: 3, triggeredAlertCount: 1 },
      }],
    };

    const narrative = buildDailyBriefNarrative(brief, 'en');
    expect(narrative.severity).toBe('danger');
    expect(narrative.actionUrl).toBe('/debts');
    expect(narrative.sources).toEqual(['finance', 'trader']);
    expect(narrative.evidence.debtServiceRatio).toBe(0.55);
  });

  it('returns a non-alarmist clear narrative when no conflict exists', () => {
    const brief: CrossWorkspaceBrief = {
      state: 'clear',
      compatibleFundingNeed: 0,
      fundingCurrency: 'KWD',
      generatedFrom: ['finance', 'trader', 'business'],
      items: [{
        code: 'no_cross_workspace_conflict_detected',
        severity: 'info',
        sources: ['finance', 'trader', 'business'],
        evidence: { monthlySurplus: 700, runwayMonths: 8, watchlistCount: 0, activeProjectCount: 0 },
      }],
    };

    const narrative = buildDailyBriefNarrative(brief, 'ar');
    expect(narrative.severity).toBe('info');
    expect(narrative.actionUrl).toBe('/dashboard');
    expect(narrative.headline.length).toBeGreaterThan(0);
  });
});

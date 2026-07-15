import { describe, expect, it } from 'vitest';
import {
  evaluateReportReadiness,
  summarizeReportReadiness,
  summarizeWorkflowReportReadiness,
} from '@/lib/reports/reportReadiness';

describe('shared report readiness', () => {
  it('uses real rows and the Reports Center any-of rule for monthly financial reports', () => {
    expect(evaluateReportReadiness('monthly-financial', { income: [{}], expenses: [], savings: [], investments: [] })).toBe('ready');
    expect(evaluateReportReadiness('monthly-financial', { income: [], expenses: [], savings: [], investments: [] })).toBe('needs_data');
  });

  it('does not turn a source that was not loaded into zero or needs-data', () => {
    expect(evaluateReportReadiness('income', {})).toBe('unknown');
    const summary = summarizeReportReadiness({});
    expect(summary.ready).toBe(0);
    expect(summary.unknown).toBeGreaterThan(0);
  });

  it('preserves unavailable and source-error states', () => {
    expect(evaluateReportReadiness('market-analysis', {})).toBe('unavailable');
    expect(evaluateReportReadiness('income', { income: [] }, { income: 'safe_error_code' })).toBe('error');
  });

  it('uses the same compact group rules for task and notification generators', () => {
    expect(summarizeWorkflowReportReadiness({
      income: [{}],
      expenses: [],
      savings: [],
      investments: [],
      projects: [{}],
      zakatCalculations: [],
      zakatAssets: [{}],
      charityProjects: [{}],
      charityBeneficiaries: [],
    })).toEqual({ financial: 'ready', projects: 'ready', zakat: 'ready', charity: 'ready' });
  });
});

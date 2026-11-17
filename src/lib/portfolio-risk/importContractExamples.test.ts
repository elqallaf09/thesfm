import { describe, expect, it } from 'vitest';
import {
  portfolioRiskImportExample,
  type PortfolioRiskImportExample,
  type SyntheticImportExample,
} from '../../__tests__/fixtures/portfolioRiskImportExamples';
import { inspectHistoryCandidate } from './historyEvidence';
import { analyzePortfolioSeries } from './series';

const inspect = ({ fixture, candidate }: PortfolioRiskImportExample) =>
  inspectHistoryCandidate({ ...fixture, candidate });

function expectReviewOnly(input: PortfolioRiskImportExample) {
  const result = inspect(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  expect(result.preview.status).toBe('requires_independent_review');
  expect(Object.keys(result.preview).sort()).toEqual([
    'calendarName', 'currency', 'periodEnd', 'periodStart', 'pointCount',
    'positionCount', 'sourceName', 'status',
  ]);
  expect(result.preview).not.toHaveProperty('metrics');
  expect(result.preview).not.toHaveProperty('verification');
  expect(result.preview).not.toHaveProperty('verifiedAt');
  return result.preview;
}

describe('synthetic historical import contract examples: consistency is not source approval', () => {
  it.each<SyntheticImportExample>([
    'deposits', 'withdrawals', 'mixed_flows', 'two_percent_with_deposit',
  ])('accepts %s for independent review only', example => {
    const input = portfolioRiskImportExample(example);
    const before = JSON.stringify(input.candidate);
    expect(expectReviewOnly(input)).toMatchObject({ pointCount: 62, positionCount: 3, currency: 'KWD' });
    expect(JSON.stringify(input.candidate)).toBe(before);
  });

  it('accepts a stated FX policy as a claim without certifying its rates or provenance', () => {
    const input = portfolioRiskImportExample('deposits');
    input.candidate.history.fxPolicy = 'Synthetic custodian claims that foreign balances were converted to KWD at each valuation cutoff.';
    expectReviewOnly(input);
  });

  const rejected: Array<{
    name: string; code: string; change: (input: PortfolioRiskImportExample) => void;
  }> = [
    { name: 'missing cash balance', code: 'HISTORY_POSITION_COVERAGE_MISMATCH',
      change: input => { Reflect.deleteProperty(input.candidate.history, 'endCashBase'); } },
    { name: 'missing external flow', code: 'HISTORY_INVALID_VALUES',
      change: input => { Reflect.deleteProperty(input.candidate.history.points[4], 'netExternalFlow'); } },
    { name: 'intraday flow convention', code: 'HISTORY_INCOMPLETE_COVERAGE',
      change: input => { input.candidate.history.flowTiming = 'intraday'; } },
    { name: 'NAV cutoff different from calendar cutoff', code: 'HISTORY_INCOMPLETE_DATES',
      change: input => { input.candidate.history.points[4].at = '2025-01-05T13:00:00Z'; } },
    { name: 'NAV session missing from a retained calendar', code: 'HISTORY_INCOMPLETE_DATES',
      change: input => { input.candidate.history.points.splice(4, 1); } },
    { name: 'missing position', code: 'HISTORY_POSITION_COVERAGE_MISMATCH',
      change: input => { input.candidate.history.endPositions.pop(); } },
    { name: 'duplicated position', code: 'HISTORY_POSITION_COVERAGE_MISMATCH',
      change: input => { input.candidate.history.endPositions[1].positionId = input.candidate.history.endPositions[0].positionId; } },
    { name: 'changed asset identity', code: 'HISTORY_POSITION_IDENTITY_MISMATCH',
      change: input => { input.candidate.history.endPositions[0].assetId = '["STOCK","different-synthetic-asset"]'; } },
    { name: 'currency different from owner context', code: 'HISTORY_SCOPE_MISMATCH',
      change: input => { input.fixture.expectedCurrency = 'USD'; } },
    { name: 'calendar currency different from history', code: 'HISTORY_SCOPE_MISMATCH',
      change: input => { input.candidate.calendar.currency = 'USD'; } },
    { name: 'incomplete external-flow coverage', code: 'HISTORY_INCOMPLETE_COVERAGE',
      change: input => { (input.candidate.history.coverage as Record<string, unknown>).externalFlows = 'unknown'; } },
    { name: 'missing FX policy', code: 'HISTORY_FX_OR_CALENDAR_UNVERIFIED',
      change: input => { input.candidate.history.fxPolicy = ''; } },
    { name: 'final positions plus cash do not reconcile', code: 'HISTORY_NAV_RECONCILIATION_FAILED',
      change: input => { input.candidate.history.endCashBase += 1; } },
    { name: 'root ownership supplied by uploader', code: 'HISTORY_IMPORT_FORMAT',
      change: input => { Object.assign(input.candidate, { ownerId: 'different-synthetic-owner' }); } },
    { name: 'root approval marker supplied by uploader', code: 'HISTORY_IMPORT_FORMAT',
      change: input => { Object.assign(input.candidate, { verification: 'server_verified_portfolio_history_v1' }); } },
  ];

  it.each(rejected)('rejects $name with $code', ({ code, change }) => {
    const input = portfolioRiskImportExample();
    change(input);
    expect(inspect(input)).toEqual({ ok: false, code });
  });

  const claimsOnly: Array<{
    name: string; expectedPoints: number; change: (input: PortfolioRiskImportExample) => void;
  }> = [
    { name: 'the same session removed from both submitted NAV and calendar', expectedPoints: 61,
      change: input => {
        input.candidate.history.points.splice(20, 1);
        (input.candidate.calendar.sessions as unknown[]).splice(20, 1);
      } },
    { name: 'different textual source names and references', expectedPoints: 62,
      change: input => {
        input.candidate.history.sourceName = 'Unverified synthetic custodian claim';
        input.candidate.history.sourceReference = 'synthetic-statement-claim-2';
        input.candidate.calendar.sourceName = 'Unverified synthetic calendar claim';
        input.candidate.calendar.sourceReference = 'synthetic-calendar-claim-2';
      } },
  ];

  it.each(claimsOnly)('still requires independent review after $name', ({ expectedPoints, change }) => {
    const input = portfolioRiskImportExample();
    change(input);
    expect(expectReviewOnly(input).pointCount).toBe(expectedPoints);
  });
});

describe('synthetic end-of-period cash-flow arithmetic examples', () => {
  function analyze(input: PortfolioRiskImportExample) {
    return analyzePortfolioSeries({
      points: input.candidate.history.points, weights: [0.6, 0.2, 0.2], currency: 'KWD',
      periodsPerYear: 365, expectedDates: input.sessions.map(session => session.date),
    });
  }

  it.each<SyntheticImportExample>(['deposits', 'withdrawals', 'mixed_flows'])(
    '%s alone produce zero return risk across 61 intervals', example => {
      const input = portfolioRiskImportExample(example);
      const result = analyze(input);
      expect(input.candidate.history.points).toHaveLength(62);
      if ('error' in result) throw new Error(result.error);
      expect(result.metrics).toEqual({
        observations: 61, volatilityAnnualized: 0,
        historicalVar95: 0, historicalCvar95: 0, maximumDrawdown: 0,
      });
      if (example === 'withdrawals') {
        expect(input.candidate.history.points[1]).toMatchObject({ nav: 990, netExternalFlow: -10 });
        expect(input.candidate.history.points[61].nav).toBe(390);
      }
    },
  );

  it('1000 to 1120 with a 100 end-period deposit contributes a 2 percent return, not 12 percent', () => {
    const input = portfolioRiskImportExample('two_percent_with_deposit');
    expect(input.candidate.history.points[0].nav).toBe(1000);
    expect(input.candidate.history.points[1]).toMatchObject({ nav: 1120, netExternalFlow: 100 });
    const result = analyze(input);
    if ('error' in result) throw new Error(result.error);
    // Independently specified returns: one 2% return and sixty zero returns.
    // Their sample standard deviation is 0.02 / sqrt(61).
    expect(result.metrics.observations).toBe(61);
    expect(result.metrics.volatilityAnnualized).toBeCloseTo(0.02 * Math.sqrt(365 / 61), 12);
    expect(result.metrics.maximumDrawdown).toBe(0);
    expect(result.metrics.historicalVar95).toBe(0);
    expect(result.metrics.historicalCvar95).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { historyImportFixture } from '../../__tests__/fixtures/portfolioRiskHistory';
import { inspectHistoryCandidate } from './historyEvidence';

function inspect() {
  const { fixture, candidate } = historyImportFixture();
  return { fixture, candidate, run: () => inspectHistoryCandidate({ ...fixture, candidate }) };
}
describe('untrusted historical import preflight', () => {
  it('returns only a review summary, with no approval, account data or risk metrics', () => {
    const { candidate, run } = inspect(); const before = JSON.stringify(candidate);
    expect(run()).toEqual({ ok: true, preview: {
      status: 'requires_independent_review', currency: 'KWD', periodStart: '2025-01-01',
      periodEnd: '2025-03-03', pointCount: 62, positionCount: 3,
      sourceName: 'Test custodian', calendarName: 'Independent test calendar',
    } });
    expect(JSON.stringify(candidate)).toBe(before);
  });
  it.each(['user_id', 'ownerId', 'verification', 'verifiedAt', 'calendarId'])('rejects a forged %s authority field at every input boundary', field => {
    for (const location of ['root', 'history', 'calendar'] as const) {
      const test = inspect();
      const target = location === 'root' ? test.candidate : test.candidate[location];
      Object.assign(target, { [field]: 'server_verified_portfolio_history_v1' });
      expect(test.run()).toEqual({ ok: false, code: 'HISTORY_IMPORT_FORMAT' });
    }
  });
  it('rejects an incomplete or unsupported format without throwing', () => {
    for (const candidate of [null, [], {}, { schema: 'portfolio-history-review-v1' }]) {
      expect(inspectHistoryCandidate({ ...inspect().fixture, candidate }).ok).toBe(false);
    }
  });
  it('checks the independent calendar, explicit flows, final NAV and canonical identity', () => {
    const missing = inspect();
    (missing.candidate.history.points as unknown[]).splice(4, 1);
    expect(missing.run()).toMatchObject({ ok: false, code: 'HISTORY_INCOMPLETE_DATES' });
    const flows = inspect();
    Reflect.deleteProperty((flows.candidate.history.points as Record<string, unknown>[])[4], 'netExternalFlow');
    expect(flows.run()).toMatchObject({ ok: false, code: 'HISTORY_INVALID_VALUES' });
    const cash = inspect(); cash.candidate.history.endCashBase = 420;
    expect(cash.run()).toMatchObject({ ok: false, code: 'HISTORY_NAV_RECONCILIATION_FAILED' });
    const identity = inspect(); identity.fixture.expectedPositions[0].assetId = 'different';
    expect(identity.run()).toMatchObject({ ok: false, code: 'HISTORY_POSITION_IDENTITY_MISMATCH' });
  });
  it('rejects currency mismatches, unsupported scope, shared references and future observations', () => {
    const currency = inspect(); currency.fixture.expectedCurrency = 'USD'; expect(currency.run().ok).toBe(false);
    const scope = inspect(); scope.candidate.history.scope = 'one_account_only'; expect(scope.run().ok).toBe(false);
    const source = inspect(); source.candidate.calendar.sourceReference = source.candidate.history.sourceReference; expect(source.run().ok).toBe(false);
    const future = inspect(); future.candidate.calendar.observedAt = '2099-01-01T00:00:00Z'; expect(future.run().ok).toBe(false);
  });
});

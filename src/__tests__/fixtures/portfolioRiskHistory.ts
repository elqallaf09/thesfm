import { CALENDAR_SCHEMA, CALENDAR_VERIFICATION, HISTORY_SCHEMA, HISTORY_VERIFICATION } from '../../lib/portfolio-risk/historyEvidence';

// Synthetic test data only. The independent calendar is not copied from NAV rows.
export function historyFixture() {
  const calendarId = '10000000-0000-4000-8000-000000000001';
  const sessions = Array.from({ length: 62 }, (_, i) => {
    const at = new Date(Date.UTC(2025, 0, 1 + i, 12)).toISOString();
    return { date: at.slice(0, 10), at };
  });
  const points = Array.from({ length: 62 }, (_, i) => {
    const at = new Date(Date.UTC(2025, 0, 1 + i, 12)).toISOString();
    return { date: at.slice(0, 10), at, nav: 1000 + i * 10, netExternalFlow: i === 0 ? 0 : 10 };
  });
  const history = {
    id: '10000000-0000-4000-8000-000000000002', user_id: 'owner-a', source: 'custom',
    observed_at: points.at(-1)!.at, received_at: '2025-04-01T12:00:00Z',
    payload: {
      schema: HISTORY_SCHEMA, verification: HISTORY_VERIFICATION, calendarId, currency: 'KWD',
      scope: 'all_recorded_investments_long_only', sourceName: 'Test custodian', sourceReference: 'test-statement-1',
      rights: 'account_analytics_permitted', verifiedAt: '2025-04-01T11:00:00Z', flowTiming: 'end_of_period',
      coverage: { positions: 'complete_over_time', cash: 'included', externalFlows: 'complete', corporateActions: 'accounted_for', liabilities: 'none', shortPositions: 'none', fx: 'synchronized_to_valuation' },
      fxPolicy: 'Test source values converted at each valuation cutoff.',
      points, endCashBase: 410,
      endPositions: [
        { positionId: 'lot-a', assetId: '["STOCK","asset-a"]' , valueBase: 300 },
        { positionId: 'lot-b', assetId: '["STOCK","asset-a"]' , valueBase: 400 },
        { positionId: 'lot-c', assetId: '["STOCK","asset-b"]' , valueBase: 500 },
      ],
    },
  };
  const calendar = {
    id: calendarId, user_id: 'owner-a', source: 'custom', observed_at: '2024-12-20T12:00:00Z', received_at: '2024-12-21T12:00:00Z',
    payload: {
      schema: CALENDAR_SCHEMA, verification: CALENDAR_VERIFICATION, currency: 'KWD', scope: 'all_recorded_investments_long_only',
      sourceName: 'Independent test calendar', sourceReference: 'test-calendar-1', rights: 'account_analytics_permitted',
      verifiedAt: '2024-12-21T11:00:00Z', periodsPerYear: 365, timeZone: 'UTC', valuationPolicy: 'Test daily valuation at 12:00 UTC.', sessions,
    },
  };
  return { ownerId: 'owner-a', history, calendar, expectedPositions: history.payload.endPositions.map(position => ({ id: position.positionId, assetId: position.assetId })), expectedCurrency: 'KWD', now: Date.parse('2025-04-02T00:00:00Z') };
}


/** Explicitly synthetic untrusted import file, never a server-approved record. */
export function historyImportFixture() {
  const fixture = historyFixture();
  const history: Record<string, unknown> = { ...fixture.history.payload, observedAt: fixture.history.observed_at };
  const calendar: Record<string, unknown> = { ...fixture.calendar.payload, observedAt: fixture.calendar.observed_at };
  for (const key of ['schema', 'verification', 'verifiedAt', 'calendarId']) {
    Reflect.deleteProperty(history, key); Reflect.deleteProperty(calendar, key);
  }
  return { fixture, candidate: { schema: 'portfolio-history-review-v1', history, calendar } };
}

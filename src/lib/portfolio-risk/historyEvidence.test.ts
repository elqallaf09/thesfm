import { describe, expect, it } from 'vitest';
import { adaptVerifiedHistory, isHistoricalRiskSnapshot, MAX_HISTORY_POINTS } from './historyEvidence';

import { historyFixture } from '../../__tests__/fixtures/portfolioRiskHistory';

describe('verified historical NAV evidence adapter', () => {
  it('uses source NAV and end-period external flows, groups lots and includes cash', () => {
    const input = historyFixture(); const before = JSON.stringify(input);
    const result = adaptVerifiedHistory(input);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.code);
    expect(result.snapshot.metrics.observations).toBe(61);
    expect(result.snapshot.metrics.volatilityAnnualized).toBeCloseTo(0);
    expect(result.snapshot.concentration.largestWeight).toBeCloseTo(700 / 1610);
    expect(result.snapshot.evidence.periodsPerYear).toBe(365);
    expect(isHistoricalRiskSnapshot(result.snapshot)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('owner-a');
    expect(JSON.stringify(result)).not.toContain('test-statement-1');
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each(['history', 'calendar'] as const)('rejects a cross-account %s', which => {
    const input = historyFixture(); input[which].user_id = 'owner-b';
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_SCOPE_MISMATCH' });
  });
  it('does not trust an ordinary connector snapshot with a user-supplied approval claim', () => {
    const input = historyFixture(); input.history.payload.verification = 'user_connector_supplied';
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_UNVERIFIED_SOURCE' });
  });
  it.each(['history', 'calendar'] as const)('requires independently approved %s provenance and rights', which => {
    for (const field of ['verification', 'schema', 'sourceName', 'sourceReference', 'rights'] as const) {
      const input = historyFixture(); input[which].payload[field] = '';
      expect(adaptVerifiedHistory(input).ok).toBe(false);
    }
  });
  it('rejects a self-referential calendar and the same underlying evidence reference', () => {
    const input = historyFixture(); input.calendar.id = input.history.id;
    expect(adaptVerifiedHistory(input).ok).toBe(false);
    const other = historyFixture(); other.calendar.payload.sourceReference = other.history.payload.sourceReference;
    expect(adaptVerifiedHistory(other).ok).toBe(false);
  });
  it.each(['positions', 'cash', 'externalFlows', 'corporateActions', 'liabilities', 'shortPositions', 'fx'] as const)('requires complete explicit %s coverage', field => {
    const input = historyFixture(); input.history.payload.coverage[field] = 'unknown';
    expect(adaptVerifiedHistory(input).ok).toBe(false);
  });
  it('rejects intraday external flows rather than calling the approximation exact', () => {
    const input = historyFixture(); input.history.payload.flowTiming = 'intraday';
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_INCOMPLETE_COVERAGE' });
  });
  it.each([0, 252.5, 367, NaN, Infinity])('does not silently default invalid annualization %s', periods => {
    const input = historyFixture(); input.calendar.payload.periodsPerYear = periods;
    expect(adaptVerifiedHistory(input).ok).toBe(false);
  });
  it.each(['', 'unknown/timezone'])('rejects an invalid calendar zone %s', zone => {
    const input = historyFixture(); input.calendar.payload.timeZone = zone;
    expect(adaptVerifiedHistory(input).ok).toBe(false);
  });
  it('rejects currency mismatch, missing FX provenance and future approvals', () => {
    const input = historyFixture(); input.expectedCurrency = 'USD'; expect(adaptVerifiedHistory(input).ok).toBe(false);
    const fx = historyFixture(); fx.history.payload.fxPolicy = ''; expect(adaptVerifiedHistory(fx).ok).toBe(false);
    const future = historyFixture(); future.history.payload.verifiedAt = '2099-01-01T00:00:00Z'; expect(adaptVerifiedHistory(future).ok).toBe(false);
  });
  it('rejects missing days, even if the caller removes a middle observation', () => {
    const input = historyFixture(); input.history.payload.points.splice(10, 1);
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_INCOMPLETE_DATES' });
  });
  it('rejects duplicate days, incorrect cutoffs and sparse arrays without throwing', () => {
    const input = historyFixture(); input.calendar.payload.sessions[5] = input.calendar.payload.sessions[4]; expect(adaptVerifiedHistory(input).ok).toBe(false);
    const cutoff = historyFixture(); cutoff.history.payload.points[4].at = '2025-01-05T13:00:00Z'; expect(adaptVerifiedHistory(cutoff).ok).toBe(false);
    const sparse = historyFixture(); delete sparse.history.payload.points[5]; expect(adaptVerifiedHistory(sparse).ok).toBe(false);
    const calendar = historyFixture(); delete calendar.calendar.payload.sessions[5]; expect(adaptVerifiedHistory(calendar).ok).toBe(false);
  });
  it('bounds processing and rejects short histories', () => {
    const input = historyFixture(); input.calendar.payload.sessions.length = MAX_HISTORY_POINTS + 1; expect(adaptVerifiedHistory(input).ok).toBe(false);
    const short = historyFixture(); short.calendar.payload.sessions.length = 60; short.history.payload.points.length = 60; expect(adaptVerifiedHistory(short).ok).toBe(false);
  });
  it.each([NaN, Infinity, -1, 0])('rejects invalid NAV %s', nav => {
    const input = historyFixture(); input.history.payload.points[5].nav = nav;
    expect(adaptVerifiedHistory(input).ok).toBe(false);
  });
  it('requires explicit flows and cash rather than replacing absent values with zero', () => {
    const input = historyFixture(); Reflect.deleteProperty(input.history.payload.points[5], 'netExternalFlow'); expect(adaptVerifiedHistory(input).ok).toBe(false);
    const cash = historyFixture(); Reflect.deleteProperty(cash.history.payload, 'endCashBase'); expect(adaptVerifiedHistory(cash).ok).toBe(false);
  });
  it('rejects missing, duplicate, extra and negative end positions', () => {
    const missing = historyFixture(); missing.history.payload.endPositions.pop(); expect(adaptVerifiedHistory(missing).ok).toBe(false);
    const duplicate = historyFixture(); duplicate.history.payload.endPositions[1].positionId = 'lot-a'; expect(adaptVerifiedHistory(duplicate).ok).toBe(false);
    const extra = historyFixture(); extra.expectedPositions.push({ id: 'new-position', assetId: 'uncovered' }); expect(adaptVerifiedHistory(extra).ok).toBe(false);
    const negative = historyFixture(); negative.history.payload.endPositions[0].valueBase = -300; expect(adaptVerifiedHistory(negative).ok).toBe(false);
  });
  it('rejects changed identities instead of treating repeated lots as diversification', () => {
    const input = historyFixture(); input.history.payload.endPositions[1].assetId = 'different-asset';
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_POSITION_IDENTITY_MISMATCH' });
  });
  it('reconciles the final positions plus cash to the reported final NAV', () => {
    const input = historyFixture(); input.history.payload.endCashBase = 411;
    expect(adaptVerifiedHistory(input)).toMatchObject({ ok: false, code: 'HISTORY_NAV_RECONCILIATION_FAILED' });
  });
  it('uses historical NAV, not current constant weights, for returns', () => {
    const input = historyFixture(); input.history.payload.points[20].nav += 25;
    const result = adaptVerifiedHistory(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.metrics.volatilityAnnualized).toBeGreaterThan(0);
  });
  it('rejects malformed responses at the browser boundary', () => {
    for (const value of [null, {}, [], { metrics: null }, { metrics: {} }]) expect(isHistoricalRiskSnapshot(value)).toBe(false);
    const result = adaptVerifiedHistory(historyFixture()); if (!result.ok) throw new Error(result.code);
    result.snapshot.metrics.historicalCvar95 = NaN; expect(isHistoricalRiskSnapshot(result.snapshot)).toBe(false);
  });
});

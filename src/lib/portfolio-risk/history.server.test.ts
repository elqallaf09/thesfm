import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { historyFixture } from '../../__tests__/fixtures/portfolioRiskHistory';
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), positions: vi.fn(), admin: vi.fn(), from: vi.fn(),
  results: [] as unknown[], queries: [] as Array<Record<string, ReturnType<typeof vi.fn>>>,
}));
vi.mock('server-only', () => ({}));
vi.mock('./service.server', () => ({ authorizeRiskRequest: mocks.auth }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/investments/canonicalPositions.server', () => ({
  loadCanonicalInvestmentPositions: mocks.positions, InvestmentCanonicalNotReadyError: class extends Error {},
}));
import { InvestmentCanonicalNotReadyError } from '@/lib/investments/canonicalPositions.server';
import { loadHistoricalRiskForRequest } from './history.server';

beforeEach(() => {
  vi.resetAllMocks(); mocks.queries.length = 0; mocks.results.length = 0;
  vi.spyOn(Date, 'now').mockReturnValue(historyFixture().now);
  mocks.auth.mockResolvedValue({ ok: true, userId: 'owner-a' });
  mocks.positions.mockResolvedValue({ positions: ['lot-a', 'lot-b', 'lot-c'].map(id => ({ id, asset: { type: 'STOCK', identifier: id === 'lot-c' ? 'asset-b' : 'asset-a' }, valuation: { baseCurrency: 'KWD' } })) });
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.from.mockImplementation(() => {
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: vi.fn() };
    for (const key of ['select', 'eq', 'order', 'limit'] as const) query[key].mockReturnValue(query);
    query.maybeSingle.mockResolvedValue(mocks.results.shift() ?? { data: null, error: null });
    mocks.queries.push(query); return query;
  });
});
afterEach(() => vi.restoreAllMocks());
const request = () => new Request('https://app.example/api/portfolio/risk/history?userId=owner-b');

describe('historical risk authenticated source reader', () => {
  it.each([401, 403, 404, 429, 503])('does not read financial storage on access status %s', async status => {
    mocks.auth.mockResolvedValue({ ok: false, status, code: 'ACCESS_DENIED', retryAfter: 12 });
    expect(await loadHistoricalRiskForRequest(request())).toEqual({ ok: false, status, code: 'ACCESS_DENIED', retryAfter: 12 });
    expect(mocks.positions).not.toHaveBeenCalled(); expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('uses the verified owner and reads no calendar when history is absent', async () => {
    expect(await loadHistoricalRiskForRequest(request())).toMatchObject({ ok: false, code: 'HISTORY_NOT_IMPORTED' });
    expect(mocks.positions).toHaveBeenCalledExactlyOnceWith('owner-a');
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith('sfm_integration_snapshots');
    expect(mocks.queries[0].eq).toHaveBeenCalledWith('user_id', 'owner-a');
    expect(mocks.queries[0].eq).toHaveBeenCalledWith('payload->>verification', 'server_verified_portfolio_history_v1');
    expect(mocks.queries[0].limit).toHaveBeenCalledWith(1);
  });
  it('loads the separately owner-filtered calendar and returns calculated history', async () => {
    const fixture = historyFixture(); mocks.results.push({ data: fixture.history }, { data: fixture.calendar });
    const result = await loadHistoricalRiskForRequest(request());
    expect(result.ok).toBe(true);
    expect(mocks.queries[1].eq).toHaveBeenCalledWith('user_id', 'owner-a');
    expect(mocks.queries[1].eq).toHaveBeenCalledWith('id', fixture.calendar.id);
    if (result.ok) expect(result.snapshot.metrics.observations).toBe(61);
  });
  it('does not use an unverified connector payload even if returned by a broken adapter', async () => {
    const fixture = historyFixture(); fixture.history.payload.verification = 'user_connector_supplied';
    mocks.results.push({ data: fixture.history }, { data: fixture.calendar });
    expect(await loadHistoricalRiskForRequest(request())).toMatchObject({ ok: false, code: 'HISTORY_UNVERIFIED_SOURCE' });
  });
  it('does not substitute a foreign-owner calendar or return an earlier approved batch after failure', async () => {
    const fixture = historyFixture(); fixture.calendar.user_id = 'owner-b';
    mocks.results.push({ data: fixture.history }, { data: fixture.calendar });
    expect(await loadHistoricalRiskForRequest(request())).toMatchObject({ ok: false, code: 'HISTORY_SCOPE_MISMATCH' });
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
  it('checks the canonical migration gate before reading source data', async () => {
    mocks.positions.mockRejectedValue(Object.create(InvestmentCanonicalNotReadyError.prototype));
    expect(await loadHistoricalRiskForRequest(request())).toMatchObject({ ok: false, code: 'CANONICAL_INVESTMENTS_NOT_READY', status: 503 });
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('does not leak a raw database failure', async () => {
    mocks.results.push({ error: { message: 'secret provider details' } });
    expect(await loadHistoricalRiskForRequest(request())).toEqual({ ok: false, code: 'HISTORY_DATA_UNAVAILABLE', status: 503 });
  });
  it('does not carry an owner between requests', async () => {
    await loadHistoricalRiskForRequest(request());
    mocks.auth.mockResolvedValue({ ok: true, userId: 'owner-b' });
    await loadHistoricalRiskForRequest(request());
    expect(mocks.positions.mock.calls).toEqual([['owner-a'], ['owner-b']]);
    expect(mocks.queries[1].eq).toHaveBeenCalledWith('user_id', 'owner-b');
  });
  it('fails closed for malformed calendar IDs or a missing referenced calendar', async () => {
    const fixture = historyFixture(); fixture.history.payload.calendarId = 'not-a-uuid'; mocks.results.push({ data: fixture.history });
    expect(await loadHistoricalRiskForRequest(request())).toMatchObject({ ok: false, code: 'HISTORY_INVALID_CALENDAR' });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
});

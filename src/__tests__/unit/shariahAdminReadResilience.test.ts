import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { authenticate, countRead } = vi.hoisted(() => ({ authenticate: vi.fn(), countRead: vi.fn() }));
vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess: authenticate, requireSuperAdminApiAccess: authenticate }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('@/lib/market/shariahAdminCatalog', () => ({ computeShariahCounts: countRead }));
import { GET } from '@/app/api/admin/shariah/route';
function db(options: { rowError?: boolean; diagnosticsError?: boolean } = {}) {
  const rowResult = { data: [{ symbol: 'JPM', shariah_status: 'non_compliant' }], error: options.rowError ? {} : null };
  const query = { select: () => query, eq: () => query, order: () => query, limit: () => query, or: () => query, abortSignal: () => query,
    then: (done: (value: unknown) => unknown) => Promise.resolve(rowResult).then(done) };
  const diagnostics = { select: () => diagnostics, order: () => diagnostics, limit: () => diagnostics, abortSignal: () => diagnostics,
    maybeSingle: () => options.diagnosticsError ? Promise.reject(new Error('transient')) : Promise.resolve({ data: { id: 'run', status: 'partial', result: { updated: 8, scanned: 9 } }, error: null }) };
  return { from: (table: string) => table === 'market_symbols' ? query : diagnostics };
}
beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  authenticate.mockResolvedValue({ ok: true, admin: db() });
  countRead.mockResolvedValue({ compliant: 0, non_compliant: 1, needs_review: 0, unclassified: 49 }); });
afterEach(() => { vi.restoreAllMocks(); });
const request = () => new NextRequest('https://www.the-sfm.com/api/admin/shariah');
describe('saved catalog survives metadata query failure', () => {
  it('does not turn failed aggregate counts into a whole-page 500', async () => {
    countRead.mockRejectedValue(new Error('SHARIAH_COUNTS_UNAVAILABLE'));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, counts: null, countsError: 'SHARIAH_COUNTS_UNAVAILABLE', items: [{ symbol: 'JPM' }] });
  });
  it('still serves rows and counters when only the run-ledger read fails', async () => {
    authenticate.mockResolvedValue({ ok: true, admin: db({ diagnosticsError: true }) });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, lastRun: null, diagnosticsError: 'REFRESH_DIAGNOSTICS_UNAVAILABLE', counts: { non_compliant: 1 } });
  });
  it('does not claim successful loading when the catalog itself is unavailable', async () => {
    authenticate.mockResolvedValue({ ok: true, admin: db({ rowError: true }) });
    const response = await GET(request()); expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, code: 'LOAD_FAILED' });
  });
  it('preserves authentication and no-store headers', async () => {
    authenticate.mockResolvedValue({ ok: false, status: 403, code: 'FORBIDDEN' });
    const response = await GET(request()); expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});

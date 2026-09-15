import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { authenticate, refresh, admin } = vi.hoisted(() => ({ authenticate: vi.fn(), refresh: vi.fn(), admin: {} }));
vi.mock('@/lib/server/adminAccess', () => ({ requireAdminApiAccess: authenticate, requireSuperAdminApiAccess: authenticate, createServerSupabaseAdmin: () => admin }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
vi.mock('@/lib/market/shariahSelfScreening', () => ({ refreshSfmShariahClassifications: refresh }));
import { GET, POST } from '@/app/api/market/shariah/refresh/route';
const url = 'https://www.the-sfm.com/api/market/shariah/refresh';
beforeEach(() => { authenticate.mockReset(); refresh.mockReset(); vi.stubEnv('CRON_SECRET', 'isolated-unit-test-secret'); refresh.mockResolvedValue({ ok: true, updated: 1 }); });
afterEach(() => { vi.unstubAllEnvs(); });
describe('refresh HTTP authentication and failure semantics', () => {
  it('denies unauthenticated GET and query-string secrets', async () => {
    expect((await GET(new NextRequest(`${url}?secret=isolated-unit-test-secret`))).status).toBe(401);
    expect(refresh).not.toHaveBeenCalled();
  });
  it('uses the real cron guard and default options with a valid header', async () => {
    const response = await GET(new NextRequest(url, { headers: { authorization: 'Bearer isolated-unit-test-secret' } }));
    expect(response.status).toBe(200); expect(refresh).toHaveBeenCalledWith(admin);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('returns a failure HTTP status rather than 207 when persistence failed', async () => {
    refresh.mockResolvedValue({ ok: false, updated: 0 });
    expect((await GET(new NextRequest(url, { headers: { authorization: 'Bearer isolated-unit-test-secret' } }))).status).toBe(500);
  });
  it('keeps partial stock errors explicit without returning a page-wide 500', async () => {
    refresh.mockResolvedValue({ ok: false, updated: 8, scanned: 9, fatal: false, hasMore: true, failed: [{ symbol: 'TSLA', reason: 'official_provider_fetch_failed' }] });
    const response = await GET(new NextRequest(url, { headers: { authorization: 'Bearer isolated-unit-test-secret' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false, updated: 8, failed: [{ symbol: 'TSLA', reason: 'official_provider_fetch_failed' }] });
  });
  it('does not conceal a database failure even if some results were saved', async () => {
    refresh.mockResolvedValue({ ok: false, updated: 2, fatal: true });
    expect((await GET(new NextRequest(url, { headers: { authorization: 'Bearer isolated-unit-test-secret' } }))).status).toBe(500);
  });
  it('sets server-owned interactive budgets on authenticated POST', async () => {
    authenticate.mockResolvedValue({ ok: true, admin });
    expect((await POST(new NextRequest(url, { method: 'POST', body: JSON.stringify({ limit: 50 }) }))).status).toBe(200);
    expect(refresh).toHaveBeenCalledWith(admin, { limit: 50, interactive: true });
  });
  it('requires admin_dashboard permission for POST', async () => {
    authenticate.mockResolvedValue({ ok: false, code: 'FORBIDDEN', status: 403 });
    expect((await POST(new NextRequest(url, { method: 'POST', body: '{}' }))).status).toBe(403);
    expect(authenticate.mock.calls[0][1]).toBe('admin_dashboard'); expect(refresh).not.toHaveBeenCalled();
  });
  it('blocks cross-origin writes even with an authenticated admin', async () => {
    authenticate.mockResolvedValue({ ok: true, admin });
    expect((await POST(new NextRequest(url, { method: 'POST', headers: { origin: 'https://other.example' }, body: '{}' }))).status).toBe(403);
    expect(refresh).not.toHaveBeenCalled();
  });
  it('does not accept provider URLs or invalid batch sizes from clients', async () => {
    authenticate.mockResolvedValue({ ok: true, admin });
    for (const body of [{ limit: 0 }, { providerUrl: 'http://localhost' }, { limit: 1000 }]) {
      expect((await POST(new NextRequest(url, { method: 'POST', body: JSON.stringify(body) }))).status).toBe(400);
    }
    expect(refresh).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ inspect: vi.fn(), admin: vi.fn(), jar: vi.fn(), limit: vi.fn(), snapshot: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: mocks.jar }));
vi.mock('@/lib/server/authSession', () => ({ inspectSessionSecurity: mocks.inspect, bearerToken: (r: Request) => r.headers.get('authorization')?.replace('Bearer ', '') }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: mocks.admin }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: mocks.limit, getClientIp: () => 'test' }));
vi.mock('@/lib/server/markets-tv/snapshot', () => ({ loadTvSnapshot: mocks.snapshot }));
import { GET as account, POST as approve } from '@/app/api/tv/account/route';
import { GET as device, PATCH as settings } from '@/app/api/tv/device/route';
import { GET as snapshot } from '@/app/api/tv/snapshot/route';
import { GET as poll, POST as create } from '@/app/api/tv/pair/route';
import { tvBody } from '@/lib/server/markets-tv/http';
const origin = 'https://www.the-sfm.com';
const request = (path: string, method = 'GET', headers = {}, body?: string) => new Request(`${origin}/api/tv/${path}`, { method, headers, body });
beforeEach(() => {
  vi.clearAllMocks(); mocks.jar.mockResolvedValue({ get: () => undefined }); mocks.limit.mockReturnValue(null);
  mocks.admin.mockImplementation(() => { throw new Error('Database must not be reached'); });
});
describe('TV authorization boundary', () => {
  it('rejects guest device lists and approvals before storage access', async () => {
    expect((await account(request('account'))).status).toBe(401);
    expect((await approve(request('account', 'POST', { origin, 'content-type': 'application/json' }, '{"code":"ABCDEF123456"}'))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('rejects an authenticated session that still requires MFA', async () => {
    mocks.inspect.mockResolvedValue({ status: 'ok', userId: 'owner', mfaRequirement: 'totp' });
    expect((await account(request('account', 'GET', { authorization: 'Bearer session' }))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('rejects cross-origin and packaged-origin account approval before authenticating', async () => {
    for (const foreign of ['https://evil.example', 'null', 'https://appassets.androidplatform.net']) {
      expect((await approve(request('account', 'POST', { origin: foreign }, '{}'))).status).toBe(403);
    }
    expect(mocks.inspect).not.toHaveBeenCalled(); expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('rejects malformed or missing device tokens without falling back to user cookies', async () => {
    expect((await device(request('device'))).status).toBe(401);
    expect((await poll(request('pair', 'GET', { 'x-sfm-tv-token': 'ABCDEF123456' }))).status).toBe(401);
    expect((await snapshot(request('snapshot?group=watchlist'))).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled(); expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it('rejects foreign settings and pair creation', async () => {
    expect((await settings(request('device', 'PATCH', { origin: 'https://evil.example' }, '{}'))).status).toBe(403);
    expect((await create(request('pair', 'POST', { origin: 'https://evil.example' }, '{}'))).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('keeps public snapshots on bounded groups and private no-store responses', async () => {
    mocks.snapshot.mockResolvedValue({ quotes: [], total: 0, available: 0 });
    const response = await snapshot(request('snapshot?group=us&symbols=ATTACKER'));
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.snapshot).toHaveBeenCalledWith('us', []);
    expect((await snapshot(request('snapshot?group=invalid'))).status).toBe(400);
  });
  it('bounds streamed JSON bodies, including missing content-length', async () => {
    expect(await tvBody(request('pair', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ name: 'a'.repeat(9000) })))).toBeNull();
    expect(await tvBody(request('pair', 'POST', { 'content-type': 'application/json' }, '[1]'))).toBeNull();
    expect(await tvBody(request('pair', 'POST', { 'content-type': 'application/json' }, '{"name":"TV"}'))).toEqual({ name: 'TV' });
  });
});

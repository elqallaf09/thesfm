import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const inspect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/authSession', () => ({
  inspectSessionSecurity: inspect,
  bearerToken: (request: Request) => request.headers.get('authorization')?.replace(/^Bearer /, '') || null,
}));
import { GET } from '@/app/api/mobile/session/route';
const nativeGatePath = '../../../apps/expo-go/native/sessionGate';
const { assertNativeSessionSecurity } = await import(nativeGatePath);

beforeEach(() => { vi.restoreAllMocks(); inspect.mockReset(); });
it.each([
  [{ status: 'unauthenticated' }, 401],
  [{ status: 'unavailable' }, 503],
  [{ status: 'ok', mfaRequirement: 'totp' }, 403],
  [{ status: 'ok', mfaRequirement: 'email' }, 403],
  [{ status: 'ok', mfaRequirement: 'none' }, 200],
])('enforces the server MFA decision %j', async (state, status) => {
  inspect.mockResolvedValue(state);
  const response = await GET(new NextRequest('https://www.the-sfm.com/api/mobile/session', { headers: { Authorization: 'Bearer token' } }));
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect(inspect).toHaveBeenCalledWith('token');
});
it('requires a bearer even if a web cookie is present', async () => {
  expect((await GET(new NextRequest('https://www.the-sfm.com/api/mobile/session', { headers: { Cookie: 'sfm_access_token=token' } }))).status).toBe(401);
  expect(inspect).not.toHaveBeenCalled();
});
it.each([
  [401, { ok: false }, 'SESSION_EXPIRED'],
  [403, { code: 'MFA_REQUIRED' }, 'MFA_REQUIRED'],
  [503, { ok: false }, 'AUTH_UNAVAILABLE'],
  [200, { ok: false }, 'AUTH_UNAVAILABLE'],
])('native gate rejects status %s and invalid success payloads', async (status, body, error) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));
  await expect(assertNativeSessionSecurity('https://www.the-sfm.com', 'token')).rejects.toThrow(error);
});
it('does not follow redirects or cache a successful verification', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));
  await assertNativeSessionSecurity('https://www.the-sfm.com', 'token');
  expect(fetcher).toHaveBeenCalledWith('https://www.the-sfm.com/api/mobile/session', expect.objectContaining({
    headers: { Authorization: 'Bearer token' }, cache: 'no-store', redirect: 'error',
  }));
});

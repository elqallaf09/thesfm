import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { inspectSessionSecurity } from '@/lib/server/authSession';
import { signAuthPayload } from '@/lib/auth/sessionSecurity';
const token = `header.${Buffer.from(JSON.stringify({ sub: 'owner', aal: 'aal1', session_id: 'session' })).toString('base64url')}.test`;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetcher = vi.fn();
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-fixture');
  vi.stubEnv('AUTH_MFA_SECRET', 'fixture-secret'); vi.stubEnv('DATABASE_SERVICE_ROLE_KEY', 'server-fixture');
  fetcher.mockReset(); vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function setupProof(proof: unknown, proofStatus = 200) {
  fetcher.mockImplementation(async (url: string | URL) => {
    if (String(url).includes('/auth/v1/user')) return response({ id: 'owner', email: 'test@example.invalid', factors: [] });
    if (String(url).includes('/profiles?')) return response([{ email_2fa_enabled: true }]);
    return response(proof, proofStatus);
  });
}
it('accepts only database evidence bound to the currently verified session', async () => {
  setupProof([{ session_id: 'session' }]);
  expect(await inspectSessionSecurity(token)).toMatchObject({ status: 'ok', mfaRequirement: 'none' });
  const query = new URL(fetcher.mock.calls[2][0]);
  expect(query.searchParams.get('session_id')).toBe('eq.session'); expect(query.searchParams.get('user_id')).toBe('eq.owner');
  expect(fetcher.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${token}`);
});
it.each([{ proof: [] }, { proof: [{ session_id: 'other-session' }] }, { proof: [{}] }])('rejects absent or mismatched proof: $proof', async ({ proof }) => {
  setupProof(proof);
  expect(await inspectSessionSecurity(token)).toMatchObject({ status: 'ok', mfaRequirement: 'email' });
});
it('fails closed if database evidence cannot be checked', async () => {
  setupProof(null, 503);
  expect(await inspectSessionSecurity(token)).toMatchObject({ status: 'unavailable' });
});
it('adopts a valid existing web proof without extending its expiry', async () => {
  setupProof(null);
  const expiresAt = Math.floor(Date.now() / 1000) + 90;
  const proof = await signAuthPayload({ kind: 'email-proof', sub: 'owner', sessionId: 'session', expiresAt }, 'fixture-secret');
  expect(await inspectSessionSecurity(token, proof)).toMatchObject({ status: 'ok', mfaRequirement: 'none' });
  const write = fetcher.mock.calls.find(([, init]) => init.method === 'POST')!;
  expect(JSON.parse(write[1].body)).toMatchObject({ user_id: 'owner', session_id: 'session', expires_at: new Date(expiresAt * 1000).toISOString() });
});
it('does not adopt another user signed cookie', async () => {
  setupProof([]);
  const proof = await signAuthPayload({ kind: 'email-proof', sub: 'other-user', sessionId: 'session', expiresAt: Math.floor(Date.now() / 1000) + 90 }, 'fixture-secret');
  expect(await inspectSessionSecurity(token, proof)).toMatchObject({ mfaRequirement: 'email' });
  expect(fetcher.mock.calls.some(([, init]) => init.method === 'POST')).toBe(false);
});

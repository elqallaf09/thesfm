import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ inspect: vi.fn(), send: vi.fn(), verify: vi.fn(), record: vi.fn() }));
vi.mock('@/lib/server/authSession', () => ({ inspectSessionSecurity: mocks.inspect, bearerToken: (r: Request) => r.headers.get('authorization')?.replace('Bearer ', '') }));
vi.mock('@/lib/server/authGateway', () => ({ sendEmailOtp: mocks.send, verifyEmailOtp: mocks.verify }));
vi.mock('@/lib/server/emailMfaSessions', () => ({ recordEmailMfaSession: mocks.record }));
vi.mock('@/lib/server/rateLimiter', () => ({ rateLimitRequest: () => null }));
import { POST } from '@/app/api/auth/mfa/mobile-email/route';
const state = { status: 'ok', userId: 'owner-a', sessionId: 'session-a', email: 'test@example.invalid', mfaRequirement: 'email' };
afterEach(() => vi.unstubAllEnvs());
function request(body: object, token: string | null = 'first-factor') {
  return new NextRequest('https://www.the-sfm.com/api/auth/mfa/mobile-email', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv('AUTH_MFA_SECRET', 'synthetic-secret-for-test-only');
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.inspect.mockResolvedValue(state); mocks.send.mockResolvedValue({ status: 'ok' });
  mocks.verify.mockResolvedValue({ status: 'ok', accessToken: 'verified-access', refreshToken: 'verified-refresh', expiresIn: 3600 });
  mocks.record.mockResolvedValue(true);
});
async function challenge() { const response = await POST(request({ action: 'start' })); expect(response.status).toBe(200); return (await response.json()).challenge; }
it('requires a verified first-factor bearer before sending email', async () => {
  expect((await POST(request({ action: 'start' }, null))).status).toBe(401);
  expect(mocks.send).not.toHaveBeenCalled();
});
it('records the verified new session before returning credentials', async () => {
  const signed = await challenge();
  mocks.inspect.mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, sessionId: 'new-session' });
  const response = await POST(request({ action: 'verify', challenge: signed, code: '123456' }));
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
  expect(mocks.record).toHaveBeenCalledWith('owner-a', 'new-session', expect.any(Number));
  expect(await response.json()).toMatchObject({ access_token: 'verified-access' });
});
it.each([{ userId: 'other-owner' }, { sessionId: 'other-session' }, { email: 'other@example.invalid' }])('rejects cross-account/session challenge reuse: %j', async delta => {
  const signed = await challenge(); mocks.inspect.mockResolvedValue({ ...state, ...delta });
  expect((await POST(request({ action: 'verify', challenge: signed, code: '123456' }))).status).toBe(401);
  expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
});
it('does not let email verification satisfy a newly enrolled authenticator', async () => {
  const signed = await challenge();
  mocks.inspect.mockResolvedValueOnce(state).mockResolvedValueOnce({ ...state, mfaRequirement: 'totp' });
  expect((await POST(request({ action: 'verify', challenge: signed, code: '123456' }))).status).toBe(409);
  expect(mocks.record).not.toHaveBeenCalled();
});
it('does not issue a session when evidence recording fails', async () => {
  const signed = await challenge(); mocks.record.mockResolvedValue(false);
  const response = await POST(request({ action: 'verify', challenge: signed, code: '123456' }));
  expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('access_token');
});
it('rejects a tampered challenge without consuming an OTP', async () => {
  const signed = await challenge();
  expect((await POST(request({ action: 'verify', challenge: `x${signed}`, code: '123456' }))).status).toBe(401);
  expect(mocks.verify).not.toHaveBeenCalled();
});

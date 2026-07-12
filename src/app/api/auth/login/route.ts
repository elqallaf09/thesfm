import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  type EmailMfaChallengePayload,
  getMfaSigningSecret,
  signAuthPayload,
} from '@/lib/auth/sessionSecurity';
import { passwordGrant, normalizeIdentifier, sendEmailOtp } from '@/lib/server/authGateway';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';
import { clearAuthenticatedCookies, setAuthenticatedCookies, setEmailMfaChallengeCookie } from '@/lib/server/authCookies';
import { inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function limited(request: Request, identifier: string) {
  const ip = getClientIp(request);
  const identifierHash = createHash('sha256').update(identifier).digest('hex').slice(0, 24);
  return !checkRateLimit(ip, { max: 30, windowMs: 10 * 60_000, prefix: 'auth-login-ip' }) ||
    !checkRateLimit(`${ip}:${identifierHash}`, { max: 10, windowMs: 10 * 60_000, prefix: 'auth-login-account' });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { identifier?: unknown; password?: unknown } | null;
  const identifier = normalizeIdentifier(body?.identifier);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (identifier.length < 3 || password.length < 6 || password.length > 1024) {
    return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401);
  }
  if (limited(request, identifier)) {
    const response = json({ ok: false, code: 'RATE_LIMITED' }, 429);
    response.headers.set('Retry-After', '600');
    return response;
  }

  const grant = await passwordGrant(identifier, password);
  if (grant.status === 'invalid') return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401);
  if (grant.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);

  const security = await inspectSessionSecurity(grant.accessToken, null);
  if (security.status === 'unauthenticated') return json({ ok: false, code: 'INVALID_CREDENTIALS' }, 401);
  if (security.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);

  if (security.mfaRequirement === 'email') {
    const secret = getMfaSigningSecret();
    if (!secret || !security.email) return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);
    const sent = await sendEmailOtp(security.email);
    if (sent.status !== 'ok') return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);

    const now = Math.floor(Date.now() / 1000);
    const challenge: EmailMfaChallengePayload = {
      kind: 'email-challenge',
      sub: security.userId,
      email: security.email,
      issuedAt: now,
      expiresAt: now + 10 * 60,
    };
    const response = json({ ok: true, status: 'MFA_REQUIRED', mfaType: 'email' });
    clearAuthenticatedCookies(response);
    setEmailMfaChallengeCookie(response, await signAuthPayload(challenge, secret));
    return response;
  }

  if (security.mfaRequirement === 'totp') {
    const response = json({
      ok: true,
      status: 'MFA_REQUIRED',
      mfaType: 'totp',
      accessToken: grant.accessToken,
      refreshToken: grant.refreshToken,
    });
    clearAuthenticatedCookies(response);
    return response;
  }

  const response = json({
    ok: true,
    status: 'AUTHENTICATED',
    accessToken: grant.accessToken,
    refreshToken: grant.refreshToken,
  });
  setAuthenticatedCookies(response, grant.accessToken);
  return response;
}

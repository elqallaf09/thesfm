import { NextRequest, NextResponse } from 'next/server';
import {
  EMAIL_MFA_CHALLENGE_COOKIE,
  type EmailMfaChallengePayload,
  type EmailMfaProofPayload,
  getMfaSigningSecret,
  signAuthPayload,
  verifyAuthPayload,
} from '@/lib/auth/sessionSecurity';
import { verifyEmailOtp } from '@/lib/server/authGateway';
import {
  clearAuthenticatedCookies,
  clearEmailMfaChallengeCookie,
  setAuthenticatedCookies,
  setEmailMfaProofCookie,
} from '@/lib/server/authCookies';
import { inspectSessionSecurity } from '@/lib/server/authSession';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 8, windowMs: 10 * 60_000, prefix: 'email-mfa-verify' });
  if (limited) return limited;
  const body = await request.json().catch(() => null) as { code?: unknown } | null;
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) return json({ ok: false, code: 'INVALID_CODE' }, 400);

  const secret = getMfaSigningSecret();
  if (!secret) return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);
  const challenge = await verifyAuthPayload<EmailMfaChallengePayload>(
    request.cookies.get(EMAIL_MFA_CHALLENGE_COOKIE)?.value,
    secret,
  );
  if (challenge?.kind !== 'email-challenge') return json({ ok: false, code: 'CHALLENGE_EXPIRED' }, 401);

  const verified = await verifyEmailOtp(challenge.email, code);
  if (verified.status === 'invalid') return json({ ok: false, code: 'INVALID_CODE' }, 401);
  if (verified.status === 'unavailable') return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);

  const security = await inspectSessionSecurity(verified.accessToken, null);
  if (security.status === 'unauthenticated') return json({ ok: false, code: 'INVALID_CODE' }, 401);
  if (security.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);
  if (security.userId !== challenge.sub || security.email !== challenge.email) {
    return json({ ok: false, code: 'INVALID_CODE' }, 401);
  }

  if (security.mfaRequirement === 'totp') {
    const response = json({
      ok: true,
      status: 'MFA_REQUIRED',
      mfaType: 'totp',
      accessToken: verified.accessToken,
      refreshToken: verified.refreshToken,
    });
    clearAuthenticatedCookies(response);
    return response;
  }

  const response = json({
    ok: true,
    status: 'AUTHENTICATED',
    accessToken: verified.accessToken,
    refreshToken: verified.refreshToken,
  });
  setAuthenticatedCookies(response, verified.accessToken);
  if (security.mfaRequirement === 'email') {
    if (!security.sessionId) return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 12 * 60 * 60;
    const proof: EmailMfaProofPayload = {
      kind: 'email-proof',
      sub: security.userId,
      sessionId: security.sessionId,
      issuedAt: now,
      expiresAt: now + maxAge,
    };
    setEmailMfaProofCookie(response, await signAuthPayload(proof, secret), maxAge);
  }
  clearEmailMfaChallengeCookie(response);
  return response;
}

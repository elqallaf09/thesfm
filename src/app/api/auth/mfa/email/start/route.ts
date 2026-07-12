import { NextRequest, NextResponse } from 'next/server';
import {
  EMAIL_MFA_CHALLENGE_COOKIE,
  type EmailMfaChallengePayload,
  getMfaSigningSecret,
  signAuthPayload,
  verifyAuthPayload,
} from '@/lib/auth/sessionSecurity';
import { sendEmailOtp } from '@/lib/server/authGateway';
import { setEmailMfaChallengeCookie } from '@/lib/server/authCookies';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 5, windowMs: 10 * 60_000, prefix: 'email-mfa-start' });
  if (limited) return limited;
  const secret = getMfaSigningSecret();
  if (!secret) return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);

  let challenge = await verifyAuthPayload<EmailMfaChallengePayload>(
    request.cookies.get(EMAIL_MFA_CHALLENGE_COOKIE)?.value,
    secret,
  );
  if (challenge?.kind !== 'email-challenge') challenge = null;

  if (!challenge) {
    const token = bearerToken(request);
    if (!token) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
    const security = await inspectSessionSecurity(token, null);
    if (security.status === 'unauthenticated') return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
    if (security.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);
    if (security.mfaRequirement !== 'email' || !security.email) {
      return json({ ok: false, code: security.mfaRequirement === 'totp' ? 'TOTP_REQUIRED' : 'MFA_NOT_REQUIRED' }, 409);
    }
    const now = Math.floor(Date.now() / 1000);
    challenge = {
      kind: 'email-challenge',
      sub: security.userId,
      email: security.email,
      issuedAt: now,
      expiresAt: now + 10 * 60,
    };
  }

  const sent = await sendEmailOtp(challenge.email);
  if (sent.status !== 'ok') return json({ ok: false, code: 'MFA_UNAVAILABLE' }, 503);
  const now = Math.floor(Date.now() / 1000);
  const refreshed: EmailMfaChallengePayload = { ...challenge, issuedAt: now, expiresAt: now + 10 * 60 };
  const response = json({ ok: true });
  setEmailMfaChallengeCookie(response, await signAuthPayload(refreshed, secret));
  return response;
}

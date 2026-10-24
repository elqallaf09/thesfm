import { NextRequest, NextResponse } from 'next/server';
import { getMfaSigningSecret, signAuthPayload, verifyAuthPayload } from '@/lib/auth/sessionSecurity';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/server/authGateway';
import { recordEmailMfaSession } from '@/lib/server/emailMfaSessions';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
type Challenge = { kind: 'mobile-email-challenge'; sub: string; sessionId: string; email: string; issuedAt: number; expiresAt: number };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function POST(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 8, windowMs: 10 * 60_000, prefix: 'mobile-email-mfa' });
  if (limited) return limited;
  const token = bearerToken(request);
  if (!token) return json({ code: 'UNAUTHORIZED' }, 401);
  const security = await inspectSessionSecurity(token);
  if (security.status === 'unauthenticated') return json({ code: 'UNAUTHORIZED' }, 401);
  if (security.status === 'unavailable') return json({ code: 'AUTH_UNAVAILABLE' }, 503);
  if (security.mfaRequirement !== 'email' || !security.email || !security.sessionId) return json({ code: 'EMAIL_MFA_NOT_AVAILABLE' }, 409);
  const secret = getMfaSigningSecret();
  if (!secret) return json({ code: 'MFA_UNAVAILABLE' }, 503);
  const body = await request.json().catch(() => null) as { action?: unknown; challenge?: unknown; code?: unknown } | null;
  const now = Math.floor(Date.now() / 1000);
  if (body?.action === 'start') {
    if ((await sendEmailOtp(security.email)).status !== 'ok') return json({ code: 'MFA_UNAVAILABLE' }, 503);
    const challenge: Challenge = { kind: 'mobile-email-challenge', sub: security.userId, sessionId: security.sessionId, email: security.email, issuedAt: now, expiresAt: now + 600 };
    return json({ challenge: await signAuthPayload(challenge, secret) });
  }
  if (body?.action !== 'verify' || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code) || typeof body.challenge !== 'string') return json({ code: 'INVALID_CODE' }, 400);
  const challenge = await verifyAuthPayload<Challenge>(body.challenge, secret);
  if (challenge?.kind !== 'mobile-email-challenge' || challenge.sub !== security.userId || challenge.sessionId !== security.sessionId || challenge.email !== security.email) return json({ code: 'CHALLENGE_EXPIRED' }, 401);
  const verified = await verifyEmailOtp(challenge.email, body.code);
  if (verified.status !== 'ok') return json({ code: verified.status === 'invalid' ? 'INVALID_CODE' : 'MFA_UNAVAILABLE' }, verified.status === 'invalid' ? 400 : 503);
  const next = await inspectSessionSecurity(verified.accessToken);
  if (next.status !== 'ok' || next.userId !== challenge.sub || next.email !== challenge.email || !next.sessionId) return json({ code: 'MFA_UNAVAILABLE' }, 503);
  // Email OTP must never satisfy an enrolled authenticator requirement.
  if (next.mfaRequirement === 'totp') return json({ code: 'TOTP_REQUIRED' }, 409);
  if (!await recordEmailMfaSession(next.userId, next.sessionId, now + 12 * 3600)) return json({ code: 'MFA_UNAVAILABLE' }, 503);
  return json({ access_token: verified.accessToken, refresh_token: verified.refreshToken, expires_in: verified.expiresIn });
}

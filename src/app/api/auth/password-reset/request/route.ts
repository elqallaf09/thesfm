import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeIdentifier, requestPasswordRecovery, resolveIdentifierEmail } from '@/lib/server/authGateway';
import { checkRateLimit, getClientIp } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function resetOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
        return url.origin;
      }
    } catch {
      // Fall through to a trusted origin, never the caller-controlled Host header in production.
    }
  }
  if (process.env.NODE_ENV === 'production') return 'https://www.the-sfm.com';
  // In development, NextRequest already exposes the active dev-server origin.
  // Production never reaches this branch, so caller-controlled hosts cannot
  // influence recovery links sent by the deployed application.
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { identifier?: unknown } | null;
  const identifier = normalizeIdentifier(body?.identifier);
  if (identifier.length < 3) return json({ ok: false, code: 'INVALID_REQUEST' }, 400);

  const ip = getClientIp(request);
  const fingerprint = createHash('sha256').update(identifier).digest('hex').slice(0, 24);
  const allowed = checkRateLimit(ip, { max: 12, windowMs: 60 * 60_000, prefix: 'password-reset-ip' }) &&
    checkRateLimit(`${ip}:${fingerprint}`, { max: 4, windowMs: 60 * 60_000, prefix: 'password-reset-account' });
  if (!allowed) {
    const response = json({ ok: false, code: 'RATE_LIMITED' }, 429);
    response.headers.set('Retry-After', '3600');
    return response;
  }

  const resolved = await resolveIdentifierEmail(identifier);
  if (resolved.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);
  const email = resolved.status === 'ok'
    ? resolved.email
    : `missing-${createHash('sha256').update(identifier).digest('hex').slice(0, 32)}@invalid.local`;
  const recovery = await requestPasswordRecovery(email, `${resetOrigin(request)}/reset-password`);
  if (recovery.status === 'unavailable') {
    console.warn('[auth] Password recovery provider was unavailable');
  }

  return json({ ok: true, code: 'RESET_REQUEST_ACCEPTED' }, 202);
}

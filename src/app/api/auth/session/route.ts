import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { clearAuthenticatedCookies, setAuthenticatedCookies } from '@/lib/server/authCookies';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';

function json(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
  const security = await inspectSessionSecurity(token, request.cookies.get(EMAIL_MFA_PROOF_COOKIE)?.value);
  if (security.status === 'unauthenticated') return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
  if (security.status === 'unavailable') return json({ ok: false, code: 'AUTH_UNAVAILABLE' }, 503);
  if (security.mfaRequirement !== 'none') {
    const response = json({ ok: false, code: 'MFA_REQUIRED', mfaType: security.mfaRequirement }, 403);
    clearAuthenticatedCookies(response);
    return response;
  }
  const response = json({ ok: true });
  setAuthenticatedCookies(response, token);
  return response;
}

export async function DELETE() {
  const response = json({ ok: true });
  clearAuthenticatedCookies(response);
  return response;
}

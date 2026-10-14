import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';
const respond = (code: string, status: number) => NextResponse.json({ ok: false, code }, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return respond('UNAUTHORIZED', 401);
  // Mobile does not accept a web email-proof cookie as a substitute for its
  // own challenge flow. The server validates the token and enrolled factors.
  const result = await inspectSessionSecurity(token);
  if (result.status === 'unauthenticated') return respond('UNAUTHORIZED', 401);
  if (result.status === 'unavailable') return respond('AUTH_UNAVAILABLE', 503);
  if (result.mfaRequirement !== 'none') return respond('MFA_REQUIRED', 403);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}

import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';
const respond = (code: string, status: number) => NextResponse.json({ ok: false, code }, {
  status, headers: { 'Cache-Control': 'private, no-store' },
});

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) return respond('UNAUTHORIZED', 401);
  // No client-provided assurance claim: the server checks enrolled factors and
  // any server-recorded, session-bound email challenge completion.
  const result = await inspectSessionSecurity(token);
  if (result.status === 'unauthenticated') return respond('UNAUTHORIZED', 401);
  if (result.status === 'unavailable') return respond('AUTH_UNAVAILABLE', 503);
  if (result.mfaRequirement !== 'none') return NextResponse.json({ ok: false, code: 'MFA_REQUIRED', mfaType: result.mfaRequirement }, {
    status: 403, headers: { 'Cache-Control': 'private, no-store' },
  });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}

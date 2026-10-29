import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const MOBILE_PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
export function mobileResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: MOBILE_PRIVATE_HEADERS });
}

/** A user-scoped Data API client: mutations never run with an administrative key. */
export async function mobileAccess(request: Request) {
  const token = bearerToken(request);
  if (!token) return { response: mobileResponse({ ok: false, code: 'UNAUTHORIZED' }, 401) };
  const security = await inspectSessionSecurity(token);
  if (security.status !== 'ok') {
    const unavailable = security.status === 'unavailable';
    return { response: mobileResponse({ ok: false, code: unavailable ? 'AUTH_UNAVAILABLE' : 'UNAUTHORIZED' }, unavailable ? 503 : 401) };
  }
  if (security.mfaRequirement !== 'none') {
    return { response: mobileResponse({ ok: false, code: 'MFA_REQUIRED', mfaType: security.mfaRequirement }, 403) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { response: mobileResponse({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, 503) };
  return {
    userId: security.userId,
    email: security.email,
    client: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    }),
  };
}

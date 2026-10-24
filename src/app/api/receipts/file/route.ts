import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, EMAIL_MFA_PROOF_COOKIE } from '@/lib/auth/sessionSecurity';
import { isFinancialAttachmentBucket, isFinancialAttachmentPath } from '@/lib/financialAttachments';
import { bearerToken, inspectSessionSecurity } from '@/lib/server/authSession';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization', 'Referrer-Policy': 'no-referrer' };
const failure = (code: string, status: number) => NextResponse.json({ ok: false, code }, { status, headers });

export async function GET(request: NextRequest) {
  const token = bearerToken(request) || request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  if (!token) return failure('UNAUTHORIZED', 401);
  const security = await inspectSessionSecurity(token, request.cookies.get(EMAIL_MFA_PROOF_COOKIE)?.value);
  if (security.status === 'unauthenticated') return failure('UNAUTHORIZED', 401);
  if (security.status === 'unavailable') return failure('AUTH_UNAVAILABLE', 503);
  if (security.mfaRequirement !== 'none') return failure('MFA_REQUIRED', 403);

  const bucket = request.nextUrl.searchParams.get('bucket');
  const path = request.nextUrl.searchParams.get('path') || '';
  if (!isFinancialAttachmentBucket(bucket) || !isFinancialAttachmentPath(path)) return failure('INVALID_ATTACHMENT', 400);
  if (path.split('/')[0] !== security.userId) return failure('FORBIDDEN', 403);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return failure('STORAGE_UNAVAILABLE', 503);
  try {
    // The verified user's token enforces storage RLS as a second boundary.
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${security.token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return failure('ATTACHMENT_UNAVAILABLE', 404);
    const signed = new URL(data.signedUrl);
    if (signed.origin !== new URL(url).origin || !signed.pathname.startsWith(`/storage/v1/object/sign/${bucket}/`)) {
      return failure('STORAGE_UNAVAILABLE', 503);
    }
    return NextResponse.redirect(signed, { status: 307, headers });
  } catch { return failure('STORAGE_UNAVAILABLE', 503); }
}

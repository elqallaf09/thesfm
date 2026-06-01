import { NextResponse } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);

  if (!email || !email.includes('@')) {
    return NextResponse.json({ exists: false, error: 'invalid_email' }, { status: 400 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[password-reset] Cannot verify user existence: service role is not configured');
    }
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  try {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[password-reset] Supabase user lookup failed', { email, message: error.message });
        }
        return NextResponse.json({ error: 'user_lookup_failed' }, { status: 502 });
      }

      const users = data.users ?? [];
      const exists = users.some(user => normalizeEmail(user.email) === email);
      if (exists) return NextResponse.json({ exists: true });
      if (users.length < 1000) break;
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[password-reset] Unexpected user lookup error', {
        email,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json({ error: 'user_lookup_failed' }, { status: 502 });
  }
}

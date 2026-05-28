import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isEmail } from '@/lib/authSecurity';

export const runtime = 'nodejs';

type ResolveUsernameResponse =
  | { success: true; exists: boolean; id?: string; username?: string; email?: string }
  | { success: false; code: 'invalid_username' | 'resolver_unavailable' | 'lookup_failed' };

function json(body: ResolveUsernameResponse, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

export async function POST(request: Request) {
  let username = '';
  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  } catch {
    return json({ success: false, code: 'invalid_username' }, { status: 400 });
  }

  if (!username || isEmail(username) || username.length < 3 || username.length > 80) {
    return json({ success: false, code: 'invalid_username' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.DATABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'resolver_unavailable' });
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await admin
      .from('profiles')
      .select('id, username, email')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();

    if (error) return json({ success: false, code: 'lookup_failed' });
    if (!data) return json({ success: true, exists: false });

    const email = typeof data.email === 'string' && isEmail(data.email) ? data.email.trim().toLowerCase() : undefined;
    return json({
      success: true,
      exists: true,
      id: data.id,
      username: data.username,
      ...(email ? { email } : {}),
    });
  } catch {
    return json({ success: false, code: 'lookup_failed' });
  }
}

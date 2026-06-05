import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

async function currentUser(request: NextRequest) {
  const header = request.headers.get('authorization');
  const bearerToken = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('sfm_access_token')?.value ?? '';
  return getUserFromBearerToken(bearerToken || cookieToken);
}

export async function GET(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return json({ ok: false, eligible: false, code: 'AUTH_REQUIRED' }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, eligible: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { data, error } = await admin
    .from('user_subscriptions')
    .select('id,status,plan,billing_interval,current_period_end')
    .eq('user_id', user.id)
    .eq('plan', 'company')
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.warn('[company-listings] eligibility check failed', { code: error.code, message: error.message });
    return json({ ok: true, eligible: false, code: 'PAYMENT_REQUIRED' });
  }

  return json({ ok: true, eligible: Boolean(data?.length), code: data?.length ? null : 'PAYMENT_REQUIRED' });
}

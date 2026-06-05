import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createServerSupabaseAdmin,
  getUserFromBearerToken,
  isAdminAccessCodeConfigured,
  isAdminEmail,
  verifyAdminSessionToken,
} from '@/lib/server/adminAccess';
import { normalizeCompanyStatus } from '@/lib/companyListings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = 'id,user_id,company_name,category,country,city,short_description,website_url,email,phone,status,is_featured,created_at,updated_at,approved_at';

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

async function requireAdmin(request: NextRequest) {
  const user = await currentUser(request);
  if (!user || !isAdminEmail(user.email)) return null;
  if (isAdminAccessCodeConfigured()) {
    const cookieStore = await cookies();
    if (!verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, user)) return 'code_required' as const;
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user === 'code_required') return json({ ok: false, code: 'ADMIN_CODE_REQUIRED' }, { status: 428 });
  if (!user) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { data, error } = await admin
    .from('company_listings')
    .select(SELECT_COLUMNS)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[company-listings] admin load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }

  return json({ ok: true, items: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin(request);
  if (user === 'code_required') return json({ ok: false, code: 'ADMIN_CODE_REQUIRED' }, { status: 428 });
  if (!user) return json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });

  let payload: { id?: unknown; status?: unknown };
  try {
    payload = await request.json() as { id?: unknown; status?: unknown };
  } catch {
    return json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  const status = normalizeCompanyStatus(payload.status);
  if (!id || !status || status === 'pending_review') {
    return json({ ok: false, code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { error } = await admin
    .from('company_listings')
    .update({
      status,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[company-listings] admin update failed', { id, status, code: error.code, message: error.message });
    return json({ ok: false, code: 'UPDATE_FAILED' }, { status: 500 });
  }

  return json({ ok: true });
}

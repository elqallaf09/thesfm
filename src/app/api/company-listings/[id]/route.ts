import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken, isAdminEmail } from '@/lib/server/adminAccess';
import { COMPANY_LISTING_SELECT_COLUMNS, normalizeCompanyListing } from '@/lib/server/companyListingHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = COMPANY_LISTING_SELECT_COLUMNS;

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

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const { data, error } = await admin
    .from('company_listings')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[company-listings] detail failed', { id, code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }
  if (!data) return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

  const user = await currentUser(request);
  const row = data as { status?: string; user_id?: string | null };
  const isOwner = Boolean(user?.id && row.user_id === user.id);
  const isAdmin = isAdminEmail(user?.email);
  if (row.status !== 'approved' && !isOwner && !isAdmin) {
    return json({ ok: false, code: 'ACCESS_DENIED' }, { status: 403 });
  }

  return json({
    ok: true,
    item: normalizeCompanyListing(data as Record<string, unknown>),
    viewer: { isOwner, isAdmin, canReview: isAdmin },
  });
}

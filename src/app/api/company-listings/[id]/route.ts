import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getAdminAccessForUser, getUserFromBearerToken, hasAdminPermission } from '@/lib/server/adminAccess';
import {
  COMPANY_LISTING_SELECT_COLUMNS,
  PUBLIC_COMPANY_LISTING_SELECT_COLUMNS,
  normalizeCompanyListing,
  normalizePublicCompanyListing,
} from '@/lib/server/companyListingHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = COMPANY_LISTING_SELECT_COLUMNS;
const PUBLIC_SELECT_COLUMNS = PUBLIC_COMPANY_LISTING_SELECT_COLUMNS;

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
  if (!admin) {
    return json({
      ok: false,
      code: 'SERVICE_NOT_CONFIGURED',
      viewer: { isOwner: false, isAdmin: false, canReview: false },
    });
  }

  const user = await currentUser(request);
  const access = await getAdminAccessForUser(user, admin);
  const isAdmin = hasAdminPermission(access, 'company_reviews');

  if (isAdmin) {
    const { data, error } = await admin
      .from('company_listings')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[company-listings] privileged detail failed', { id, code: error.code, message: error.message });
      return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
    }
    if (!data) return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    return json({
      ok: true,
      item: normalizeCompanyListing(data as Record<string, unknown>),
      viewer: { isOwner: Boolean(user?.id && data.user_id === user.id), isAdmin: true, canReview: true },
    });
  }

  if (user?.id) {
    const { data: ownership, error: ownershipError } = await admin
      .from('company_listings')
      .select('id,user_id,status')
      .eq('id', id)
      .maybeSingle();

    if (ownershipError) {
      console.error('[company-listings] ownership check failed', { id, code: ownershipError.code, message: ownershipError.message });
      return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
    }
    if (!ownership) return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

    if (ownership.user_id === user.id) {
      const { data, error } = await admin
        .from('company_listings')
        .select(SELECT_COLUMNS)
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[company-listings] owner detail failed', { id, code: error.code, message: error.message });
        return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
      }
      if (!data) return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
      return json({
        ok: true,
        item: normalizeCompanyListing(data as Record<string, unknown>),
        viewer: { isOwner: true, isAdmin: false, canReview: false },
      });
    }

    if (ownership.status !== 'approved') {
      return json({ ok: false, code: 'ACCESS_DENIED' }, { status: 403 });
    }
  }

  const { data, error } = await admin
    .from('company_listings')
    .select(PUBLIC_SELECT_COLUMNS)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    console.error('[company-listings] public detail failed', { id, code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED' }, { status: 500 });
  }
  if (!data) return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

  return json({
    ok: true,
    item: normalizePublicCompanyListing(data as Record<string, unknown>),
    viewer: { isOwner: false, isAdmin: false, canReview: false },
  });
}

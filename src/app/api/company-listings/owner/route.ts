import { NextRequest } from 'next/server';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import {
  COMPANY_LISTING_SELECT_COLUMNS,
  getCompanyRequestUser,
  normalizeCompanyListing,
} from '@/lib/server/companyListingHelpers';
import { NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  const user = await getCompanyRequestUser(request);
  if (!user) return json({ ok: false, code: 'AUTH_REQUIRED', items: [] }, { status: 401 });

  const admin = createServerSupabaseAdmin();
  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', items: [] }, { status: 503 });

  const { data, error } = await admin
    .from('company_listings')
    .select(COMPANY_LISTING_SELECT_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[company-listings/owner] load failed', { code: error.code, message: error.message });
    return json({ ok: false, code: 'LOAD_FAILED', items: [] }, { status: 500 });
  }

  return json({
    ok: true,
    items: (data ?? []).map(row => normalizeCompanyListing(row as Record<string, unknown>)),
  });
}

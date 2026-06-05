import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseAdmin, getUserFromBearerToken } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SELECT_COLUMNS = 'id,user_id,company_name,category,country,city,short_description,long_description,website_url,email,phone,whatsapp,linkedin_url,twitter_url,instagram_url,founded_year,license_number,regulator_name,services,logo_url,cover_image_url,status,is_featured,created_at,updated_at,approved_at';

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
  if (row.status !== 'approved' && row.user_id !== user?.id) {
    return json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
  }

  return json({ ok: true, item: data });
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromBearerToken, isAdminEmail, createServerSupabaseAdmin } from '@/lib/server/adminAccess';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sfm_access_token')?.value;
  const user = await getUserFromBearerToken(token);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { companyId, status, adminNotes } = body;

  const VALID_STATUSES = ['approved', 'rejected', 'needs_changes', 'inactive', 'pending_review'];
  if (!companyId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createServerSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
  const { error } = await supabase
    .from('company_listings')
    .update({
      status,
      admin_notes: adminNotes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.email,
      // If approved, also set approved_at
      ...(status === 'approved' ? { approved_at: new Date().toISOString() } : {}),
    })
    .eq('id', companyId);

  if (error) {
    console.error('[AdminCompanies] update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

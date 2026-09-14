import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { refreshSfmShariahClassifications } from '@/lib/market/shariahSelfScreening';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { createAdminApiRoute } from '@/lib/server/adminApiRoute';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// ADMIN_API_POLICY_EXCEPTION: cron-or-admin-shariah-refresh

const schema = z.object({ limit: z.number().int().min(1).max(100).optional(), force: z.boolean().optional(), symbolId: z.string().uuid().optional() }).strict();
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401, headers });
  const admin = createServerSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503, headers });
  try {
    const result = await refreshSfmShariahClassifications(admin);
    return NextResponse.json(result, { status: result.ok ? 200 : 500, headers });
  } catch { return NextResponse.json({ ok: false, code: 'REFRESH_UNAVAILABLE' }, { status: 503, headers }); }
}

export const POST = createAdminApiRoute({ permission: 'admin_dashboard', rateLimit: { max: 4, windowMs: 60_000, prefix: 'admin-shariah-refresh' } }, async ({ request, auth, json }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, code: 'INVALID_ORIGIN' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, code: 'INVALID_REFRESH_OPTIONS' }, { status: 400 });
  const result = await refreshSfmShariahClassifications(auth.admin, parsed.data);
  return json(result, { status: result.ok ? 200 : 500 });
});

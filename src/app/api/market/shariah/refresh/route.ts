import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { refreshSfmShariahClassifications } from '@/lib/market/shariahSelfScreening';
import { createServerSupabaseAdmin, requireAdminApiAccess } from '@/lib/server/adminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// ADMIN_API_POLICY_EXCEPTION: cron-or-admin-shariah-refresh

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

function cleanLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(1, Math.trunc(parsed)));
}

async function run(request: NextRequest, options: { cronOnly: boolean }) {
  const cronAllowed = isCronAuthorized(request);
  let admin = createServerSupabaseAdmin();

  if (options.cronOnly && !cronAllowed) {
    return json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!cronAllowed) {
    const auth = await requireAdminApiAccess(request);
    if (!auth.ok) return json({ ok: false, code: auth.code }, { status: auth.status });
    admin = auth.admin;
  }

  if (!admin) return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });

  const body = request.method === 'POST'
    ? await request.json().catch(() => ({})) as Record<string, unknown>
    : {};
  const url = new URL(request.url);
  const result = await refreshSfmShariahClassifications(admin, {
    limit: cleanLimit(body.limit ?? url.searchParams.get('limit')),
    force: body.force === true || url.searchParams.get('force') === '1',
  });

  return json({
    ...result,
    source: 'sfm-self-hosted-screening',
    paidShariahProviderRequired: false,
  }, { status: result.ok ? 200 : 207 });
}

export async function GET(request: NextRequest) {
  return run(request, { cronOnly: true });
}

export async function POST(request: NextRequest) {
  return run(request, { cronOnly: false });
}

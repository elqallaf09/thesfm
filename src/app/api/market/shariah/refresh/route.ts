import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/auth/accessPolicy';
import { refreshShariahClassifications } from '@/lib/market/shariahAutoRefresh';
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
  const result = await refreshShariahClassifications(admin, {
    limit: cleanLimit(body.limit ?? new URL(request.url).searchParams.get('limit')),
    force: body.force === true || new URL(request.url).searchParams.get('force') === '1',
  });

  return json({
    ...result,
    source: result.external > 0 ? 'external-provider' : 'internal-screening',
  }, { status: result.ok ? 200 : 207 });
}

export async function GET(request: NextRequest) {
  return run(request, { cronOnly: true });
}

export async function POST(request: NextRequest) {
  return run(request, { cronOnly: false });
}

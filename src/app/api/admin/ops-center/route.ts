import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { getOperationsCenterState } from '@/lib/admin/opsCenter/aggregateOperationsCenter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function adminJson(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Pragma: 'no-cache',
      Vary: 'Cookie, Authorization',
    },
  });
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard');
  if (!auth.ok) return adminJson({ ok: false, code: auth.code }, auth.status);

  const url = new URL(request.url);
  const forceFresh = url.searchParams.get('forceFresh') === '1';
  const state = await getOperationsCenterState({ forceFresh });

  return adminJson({ ok: true, generatedAt: state.generatedAt, state });
}

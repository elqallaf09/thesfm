import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminApiAccess } from '@/lib/server/adminAccess';
import { getReceiptProviderStatus } from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdminApiAccess(request, 'admin_dashboard').catch(() => null);
  if (!auth) {
    return NextResponse.json({ ok: false, code: 'ADMIN_AUTH_CHECK_FAILED' }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.code }, {
      status: auth.status,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  return NextResponse.json(getReceiptProviderStatus(), {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}

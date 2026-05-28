import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getReceiptProviderStatus } from '@/lib/server/receiptProviderConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowed(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return true;
  return request.cookies.get('sfm_auth')?.value === 'true';
}

export async function GET(request: NextRequest) {
  if (!isAllowed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(getReceiptProviderStatus(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

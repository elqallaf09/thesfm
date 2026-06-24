import { NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { getTraderStatus } from '@/lib/trader/scannerService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  return NextResponse.json(getTraderStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

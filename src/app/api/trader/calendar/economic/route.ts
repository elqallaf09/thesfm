import { NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { buildTraderCalendarQuery, getTraderCalendar } from '@/lib/trader/providers/providerStatus';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const url = new URL(request.url);
  const query = buildTraderCalendarQuery(url.searchParams);
  const result = await getTraderCalendar('economic', query);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

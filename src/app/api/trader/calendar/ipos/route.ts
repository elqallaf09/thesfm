import { NextResponse } from 'next/server';
import { buildTraderCalendarQuery, getTraderCalendar } from '@/lib/trader/providers/providerStatus';
import { createTraderCalendarRoutePayload } from '@/lib/trader/providers/calendarRoutePayload';
import { shortText } from '@/lib/providers/shared';

export const dynamic = 'force-dynamic';

function normalizeRange(value: string | null): 'today' | '7' | '30' | '90' | 'all' {
  if (value === 'today' || value === '7' || value === '30' || value === '90' || value === 'all') {
    return value;
  }
  return '30';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = buildTraderCalendarQuery(url.searchParams);
  query.range = normalizeRange(url.searchParams.get('range'));

  const result = await getTraderCalendar('ipos', query);
  const count = result.resultCount ?? 0;
  const payload = createTraderCalendarRoutePayload('ipos', result);

  const configured = Boolean(process.env.FMP_API_KEY);
  console.info('[trader-calendar] request', {
    provider: result.provider || null,
    endpoint: result.provider === 'fmp' ? 'https://financialmodelingprep.com/stable/ipos-calendar' : 'ipos-calendar',
    configured,
    statusCode: result.providerStatusCode ?? null,
    status: payload.status,
    resultCount: count,
    errorMessage: result.failureReason ? shortText(result.failureReason, 260) : null,
  });

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

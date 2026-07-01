import { NextResponse } from 'next/server';
import { buildTraderCalendarQuery, getTraderCalendar } from '@/lib/trader/providers/providerStatus';
import { shortText } from '@/lib/providers/shared';

export const dynamic = 'force-dynamic';

type CalendarRouteStatus = 'connected' | 'missing_provider' | 'provider_error' | 'not_entitled' | 'empty';

function normalizeRange(value: string | null): 'today' | '7' | '30' | '90' | 'all' {
  if (value === 'today' || value === '7' || value === '30' || value === '90' || value === 'all') {
    return value;
  }
  return '30';
}

function mapRouteStatus(status: string, count: number): CalendarRouteStatus {
  if (status === 'not_configured') return 'missing_provider';
  if (status === 'not_entitled') return 'not_entitled';
  if (status === 'success') return count > 0 ? 'connected' : 'empty';
  if (
    status === 'provider_error'
    || status === 'unauthorized'
    || status === 'forbidden'
    || status === 'rate_limited'
    || status === 'invalid_request'
  ) {
    return 'provider_error';
  }
  return 'provider_error';
}

function providerDisplayName(provider: 'fmp' | 'finnhub' | 'tradingeconomics' | null): 'FMP' | 'Finnhub' | 'Trading Economics' | null {
  if (provider === 'fmp') return 'FMP';
  if (provider === 'finnhub') return 'Finnhub';
  if (provider === 'tradingeconomics') return 'Trading Economics';
  return null;
}

function legacyStatusFromRouteStatus(status: CalendarRouteStatus) {
  if (status === 'connected' || status === 'empty') return status === 'connected' ? 'success' : 'empty';
  if (status === 'missing_provider') return 'not_configured';
  return 'provider_error';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = buildTraderCalendarQuery(url.searchParams);
  query.range = normalizeRange(url.searchParams.get('range'));

  const result = await getTraderCalendar('ipos', query);
  const count = result.resultCount ?? 0;
  const status = mapRouteStatus(result.status, count);

  const configured = Boolean(process.env.FMP_API_KEY);
  const routeReason = result.failureReason ?? result.messageCode ?? (count === 0 ? 'calendar_no_events' : null);
  const loaded = count > 0
    ? [{ provider: result.provider, reason: 'calendar_events_loaded', count }]
    : [];
  const failed = result.failureReason
    ? [{ provider: result.provider, reason: result.failureReason, status: result.status }]
    : [];
  const skipped = count === 0 && !result.failureReason
    ? [{ provider: result.provider, reason: result.messageCode ?? 'calendar_no_events' }]
    : [];
  console.info('[trader-calendar] request', {
    provider: result.provider || null,
    endpoint: result.provider === 'fmp' ? 'https://financialmodelingprep.com/stable/ipos-calendar' : 'ipos-calendar',
    configured,
    statusCode: result.providerStatusCode ?? null,
    status,
    resultCount: count,
    errorMessage: result.failureReason ? shortText(result.failureReason, 260) : null,
  });

  return NextResponse.json({
    ok: true,
    provider: providerDisplayName(result.provider),
    range: Number(query.range === 'all' ? 0 : query.range) || 30,
    results: result.data,
    count,
    status,
    error: result.failureReason ?? null,
    loaded,
    failed,
    skipped,
    providerId: result.provider,
    reason: routeReason,
    data: result.data,
    resultCount: count,
    lastUpdated: result.lastUpdated,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    messageCode: result.messageCode,
    legacyStatus: legacyStatusFromRouteStatus(status),
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

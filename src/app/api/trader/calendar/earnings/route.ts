import { NextResponse } from 'next/server';
import { buildTraderCalendarQuery, getTraderCalendar } from '@/lib/trader/providers/providerStatus';
import type { TraderCalendarProvider } from '@/lib/trader/providers/types';
import { shortText } from '@/lib/providers/shared';

export const dynamic = 'force-dynamic';

type CalendarRouteStatus = 'connected' | 'missing_provider' | 'provider_error' | 'not_entitled' | 'rate_limited' | 'empty';

function mapRouteStatus(status: string, count: number): CalendarRouteStatus {
  if (status === 'not_configured') return 'missing_provider';
  if (status === 'not_entitled') return 'not_entitled';
  if (status === 'rate_limited') return 'rate_limited';
  if (status === 'success') return count > 0 ? 'connected' : 'empty';
  if (
    status === 'provider_error'
    || status === 'unauthorized'
    || status === 'forbidden'
    || status === 'invalid_request'
  ) {
    return 'provider_error';
  }
  return 'provider_error';
}

function normalizeRange(value: string | null): 'today' | '7' | '30' | '90' | 'all' {
  if (value === 'today' || value === '7' || value === '30' || value === '90' || value === 'all') {
    return value;
  }
  return '30';
}

function providerDisplayName(provider: TraderCalendarProvider | null): 'FMP' | 'Finnhub' | 'Trading Economics' | null {
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
  const nextRange = normalizeRange(url.searchParams.get('range'));
  query.range = nextRange;

  const result = await getTraderCalendar('earnings', query);
  const count = result.resultCount ?? 0;
  const status = mapRouteStatus(result.status, count);
  const endpoint = result.provider === 'fmp'
    ? 'https://financialmodelingprep.com/stable/earnings-calendar'
    : result.provider === 'finnhub'
      ? 'https://finnhub.io/api/v1/calendar/earnings'
      : 'earnings-calendar';

  const configured = Boolean(process.env.FMP_API_KEY || process.env.FINNHUB_API_KEY);
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
    endpoint,
    configured,
    statusCode: result.providerStatusCode ?? null,
    status,
    resultCount: count,
    errorMessage: result.failureReason ? shortText(result.failureReason, 260) : null,
  });

  const payload = {
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
    cached: result.cached,
    stale: result.stale,
    messageCode: result.messageCode,
    legacyStatus: legacyStatusFromRouteStatus(status),
  };

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createMarketFeatureDiagnostic } from '@/lib/market/featureDiagnostics';
import { addUtcDays, formatIsoDate, validIsoDate, type ProviderApiResponse } from '@/lib/providers/shared';
import { getEconomicCalendar } from '@/lib/providers/economic-calendar';
import type { EconomicCalendarEvent, EconomicCalendarQuery } from '@/lib/providers/economic-calendar/types';

export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 31;
const SUCCESS_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};
const ERROR_HEADERS = {
  'Cache-Control': 'private, no-store',
};

function safeCode(messageCode: string | null, fallback: string) {
  return (messageCode || fallback).toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
}

function providerDisplayName(provider: ProviderApiResponse<EconomicCalendarEvent[]>['provider']) {
  if (provider === 'finnhub') return 'Finnhub';
  if (provider === 'tradingeconomics') return 'Trading Economics';
  if (provider === 'fmp') return 'Financial Modeling Prep';
  return null;
}

function parseDateRange(searchParams: URLSearchParams) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = formatIsoDate(today);
  const defaultTo = formatIsoDate(addUtcDays(today, 7));
  const from = searchParams.get('from')?.trim() || defaultFrom;
  const to = searchParams.get('to')?.trim() || defaultTo;

  if (!validIsoDate(from) || !validIsoDate(to)) {
    return { error: 'provider_invalid_request' as const };
  }

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (toDate.getTime() < fromDate.getTime()) {
    return { error: 'provider_invalid_request' as const };
  }

  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    return { error: 'provider_invalid_request' as const };
  }

  return { from, to };
}

function safeAlpha(value: string | null, maxLength: number) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  return /^[A-Za-z\s.-]+$/.test(text) ? text.slice(0, maxLength) : null;
}

function safeCurrency(value: string | null) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : null;
}

function safeTimezone(value: string | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: text });
    return text;
  } catch {
    return null;
  }
}

function safeImpact(value: string | null): EconomicCalendarQuery['impact'] | 'invalid' {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  if (text === 'high' || text === 'medium' || text === 'low') return text;
  return 'invalid';
}

function toUiEvent(event: EconomicCalendarEvent) {
  const providerLabel = providerDisplayName(event.provider);
  const sourceLabel = event.source && providerLabel && event.source.toLowerCase() !== providerLabel.toLowerCase()
    ? `${event.source} / ${providerLabel}`
    : event.source ?? providerLabel ?? event.provider;
  return {
    ...event,
    eventName: event.title,
    event: event.title,
    name: event.title,
    dateTime: event.dateTimeUtc,
    time: event.dateTimeUtc,
    datetime: event.dateTimeUtc,
    eventTime: event.dateTimeUtc,
    source: sourceLabel,
    providerName: providerLabel ?? event.provider,
  };
}

function jsonResponse(
  result: ProviderApiResponse<EconomicCalendarEvent[]>,
  status = 200,
) {
  const items = result.data.map(toUiEvent);
  const code = result.status === 'success'
    ? result.messageCode ? safeCode(result.messageCode, 'CALENDAR_NO_EVENTS') : null
    : safeCode(result.messageCode, result.status);
  const diagnostic = createMarketFeatureDiagnostic({
    feature: 'economic_calendar',
    provider: providerDisplayName(result.provider) ?? result.provider,
    providerStatus: result.status,
    data: items,
    lastUpdated: result.lastSuccessfulUpdate,
  });

  return NextResponse.json({
    ...diagnostic,
    providerId: result.provider,
    data: items,
    items,
    events: items,
    cached: result.cached,
    stale: result.stale,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    updated_at: result.lastSuccessfulUpdate,
    messageCode: result.messageCode,
    code,
    success: diagnostic.ok,
    source: providerDisplayName(result.provider) ?? result.provider,
    providerStatus: diagnostic.status,
    legacyStatus: result.status,
  }, {
    status,
    headers: result.status === 'success' ? SUCCESS_HEADERS : ERROR_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const range = parseDateRange(searchParams);
  if ('error' in range) {
    return jsonResponse({
      status: 'invalid_request',
      provider: null,
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: range.error ?? 'provider_invalid_request',
    }, 400);
  }

  const impact = safeImpact(searchParams.get('impact'));
  if (impact === 'invalid') {
    return jsonResponse({
      status: 'invalid_request',
      provider: null,
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: 'provider_invalid_request',
    }, 400);
  }

  const query: EconomicCalendarQuery = {
    from: range.from,
    to: range.to,
    country: safeAlpha(searchParams.get('country'), 80),
    currency: safeCurrency(searchParams.get('currency')),
    impact,
    timezone: safeTimezone(searchParams.get('timezone')),
    force: searchParams.has('refresh'),
  };

  const result = await getEconomicCalendar(query);
  return jsonResponse(result);
}

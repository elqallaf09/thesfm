import { rateLimitRequest } from '@/lib/server/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';
import { addUtcDays, formatIsoDate, validIsoDate, type ProviderApiResponse } from '@/lib/providers/shared';
import { getStockCategoryConfig } from '@/lib/market/stockCategoryConfigs';
import {
  getDividendCalendar,
  getDividendCalendarProviderStatus,
} from '@/lib/providers/dividend-calendar';
import type { DividendCalendarEvent, DividendCalendarQuery } from '@/lib/providers/dividend-calendar/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
};
const ERROR_HEADERS = {
  'Cache-Control': 'private, no-store',
};

type CalendarRange = '30' | '90' | 'all';

function safeCode(messageCode: string | null, fallback: string) {
  return (messageCode || fallback).toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
}

function safeToken(value: string | null, maxLength = 80) {
  const text = String(value ?? '').trim();
  if (!text || text.toLowerCase() === 'all') return null;
  return /^[\p{L}\p{N}\s._:&-]+$/u.test(text) ? text.slice(0, maxLength) : null;
}

function parseRange(searchParams: URLSearchParams) {
  const explicitFrom = searchParams.get('from')?.trim();
  const explicitTo = searchParams.get('to')?.trim();
  if (explicitFrom || explicitTo) {
    if (!explicitFrom || !explicitTo || !validIsoDate(explicitFrom) || !validIsoDate(explicitTo)) {
      return { error: 'provider_invalid_request' as const };
    }
    return { from: explicitFrom, to: explicitTo, range: 'all' as CalendarRange };
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const range = searchParams.get('range') === '30' || searchParams.get('range') === 'all'
    ? searchParams.get('range') as CalendarRange
    : '90';

  if (range === 'all') {
    return {
      from: formatIsoDate(addUtcDays(today, -365)),
      to: formatIsoDate(addUtcDays(today, 365)),
      range,
    };
  }

  return {
    from: formatIsoDate(today),
    to: formatIsoDate(addUtcDays(today, Number(range))),
    range,
  };
}

function filterEvents(
  events: DividendCalendarEvent[],
  filters: { market: string | null; symbol: string | null; type: string | null },
) {
  const market = filters.market?.toLowerCase() ?? null;
  const symbol = filters.symbol?.toUpperCase() ?? null;
  const type = filters.type?.toLowerCase() ?? null;
  return events.filter(event => {
    if (market && event.market.toLowerCase() !== market) return false;
    if (symbol && event.symbol.toUpperCase() !== symbol) return false;
    if (type && event.type?.toLowerCase() !== type) return false;
    return true;
  });
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function toUiEvent(event: DividendCalendarEvent) {
  const date = event.exDividendDate ?? event.paymentDate ?? event.recordDate ?? event.declarationDate;
  return {
    ...event,
    name: event.companyName,
    annualDividend: event.dividendAmount,
    date,
    dateTime: date,
    eventDate: date,
    statusBadge: event.status,
  };
}

function jsonResponse(
  result: ProviderApiResponse<DividendCalendarEvent[]>,
  filteredEvents: DividendCalendarEvent[],
  rawEventCount: number,
  filters: { market: string | null; symbol: string | null; type: string | null },
  range: { from: string; to: string; range: CalendarRange },
  status = 200,
) {
  const providerStatus = getDividendCalendarProviderStatus();
  const items = filteredEvents.map(toUiEvent);
  const hasData = items.length > 0;
  const ok = result.status === 'success' || hasData;
  const code = result.status === 'success'
    ? result.messageCode ? safeCode(result.messageCode, 'DIVIDEND_CALENDAR_NO_EVENTS') : null
    : safeCode(result.messageCode, result.status);

  return NextResponse.json({
    status: result.status,
    provider: result.provider,
    providerStatus,
    configured: providerStatus.configured,
    data: items,
    items,
    events: items,
    rawEventCount,
    filteredEventCount: items.length,
    cached: result.cached,
    stale: result.stale,
    lastSuccessfulUpdate: result.lastSuccessfulUpdate,
    updated_at: result.lastSuccessfulUpdate,
    messageCode: result.messageCode,
    code,
    ok,
    success: result.status === 'success',
    source: result.provider,
    request: {
      from: range.from,
      to: range.to,
      range: range.range,
      filters,
    },
    availableFilters: {
      markets: uniqueSorted(result.data.map(event => event.market)),
      symbols: uniqueSorted(result.data.map(event => event.symbol)),
      types: uniqueSorted(result.data.map(event => event.type)),
    },
  }, {
    status,
    headers: result.status === 'success' ? SUCCESS_HEADERS : ERROR_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  const limited = rateLimitRequest(request, { max: 60, prefix: 'dividend-calendar' });
  if (limited) return limited;

  const searchParams = request.nextUrl.searchParams;
  const range = parseRange(searchParams);
  if ('error' in range) {
    const invalidResult: ProviderApiResponse<DividendCalendarEvent[]> = {
      status: 'invalid_request',
      provider: null,
      data: [],
      cached: false,
      stale: false,
      lastSuccessfulUpdate: null,
      messageCode: range.error ?? null,
    };
    return jsonResponse(invalidResult, [], 0, { market: null, symbol: null, type: null }, {
      from: '',
      to: '',
      range: '90',
    }, 400);
  }

  const config = getStockCategoryConfig('dividend');
  const watchlist = config?.watchlist.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    market: 'US',
    currency: 'USD',
  })) ?? [];
  const filters = {
    market: safeToken(searchParams.get('market')),
    symbol: safeToken(searchParams.get('symbol'), 30)?.toUpperCase() ?? null,
    type: safeToken(searchParams.get('type'), 60)?.toLowerCase() ?? null,
  };

  const query: DividendCalendarQuery = {
    from: range.from,
    to: range.to,
    symbols: watchlist,
    force: searchParams.has('refresh'),
  };

  const result = await getDividendCalendar(query);
  const filteredEvents = filterEvents(result.data, filters);

  console.info('[dividend-calendar] request diagnostics', {
    provider: result.provider,
    configured: getDividendCalendarProviderStatus().configured,
    from: range.from,
    to: range.to,
    rawEventCount: result.data.length,
    filteredEventCount: filteredEvents.length,
    providerError: result.status === 'success' ? null : result.status,
  });

  return jsonResponse(result, filteredEvents, result.data.length, filters, range);
}

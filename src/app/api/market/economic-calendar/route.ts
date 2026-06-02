import { NextResponse } from 'next/server';

export const revalidate = 900;

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
};
const REQUEST_TIMEOUT_MS = 7000;

type NormalizedImpact = 'high' | 'medium' | 'low';

type NormalizedEconomicEvent = {
  id: string;
  event: string;
  country: string;
  currency: string | null;
  impact: NormalizedImpact | null;
  time: string | null;
  previous: string | number | null;
  forecast: string | number | null;
  actual: string | number | null;
  source: 'finnhub';
};

const COUNTRY_CURRENCY: Record<string, string> = {
  US: 'USD',
  USA: 'USD',
  EU: 'EUR',
  EZ: 'EUR',
  EMU: 'EUR',
  GB: 'GBP',
  UK: 'GBP',
  JP: 'JPY',
  CN: 'CNY',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calendarRange() {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);
  return { from: formatDate(from), to: formatDate(to) };
}

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeImpact(value: unknown): NormalizedImpact | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === '3' || raw.includes('high')) return 'high';
  if (raw === '2' || raw.includes('medium') || raw.includes('moderate')) return 'medium';
  if (raw === '1' || raw.includes('low')) return 'low';
  return null;
}

function normalizeTime(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const date = new Date(value < 10000000000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;
  const assumedUtc = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const date = new Date(assumedUtc);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
}

function valueOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  return text || null;
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function inferCurrency(country: string, event: Record<string, unknown>) {
  const explicitCurrency = clean(event.currency ?? event.ccy ?? event.symbol).toUpperCase();
  if (explicitCurrency) return explicitCurrency;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? null;
}

function normalizeFinnhubEvent(event: Record<string, unknown>, index: number): NormalizedEconomicEvent | null {
  const name = clean(event.event ?? event.name ?? event.title);
  if (!name) return null;
  const country = clean(event.country ?? event.region).toUpperCase();
  const time = normalizeTime(event.time ?? event.datetime ?? event.date);
  const id = safeId(['finnhub', time ?? '', country, name, String(index)].join('-')) || `finnhub-${index}`;

  return {
    id,
    event: name,
    country: country || 'Global',
    currency: inferCurrency(country, event),
    impact: normalizeImpact(event.impact ?? event.importance ?? event.level),
    time,
    previous: valueOrNull(event.previous ?? event.prev),
    forecast: valueOrNull(event.forecast ?? event.estimate ?? event.consensus),
    actual: valueOrNull(event.actual ?? event.value),
    source: 'finnhub',
  };
}

function unavailableResponse(code: string) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    events: [],
    updated_at: null,
  }, { status: 200, headers: cacheHeaders });
}

export async function GET() {
  const apiKey = clean(process.env.ECONOMIC_CALENDAR_API_KEY) || clean(process.env.FINNHUB_API_KEY);
  const configuredProvider = clean(process.env.ECONOMIC_CALENDAR_PROVIDER).toLowerCase();
  const provider = configuredProvider || (apiKey ? 'finnhub' : '');

  if (!provider || !apiKey) {
    return unavailableResponse('ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED');
  }

  if (provider !== 'finnhub') {
    return unavailableResponse('ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED');
  }

  try {
    const { from, to } = calendarRange();
    const url = new URL('https://finnhub.io/api/v1/calendar/economic');
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('token', apiKey);

    const response = await fetch(url, {
      next: { revalidate },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
        console.warn('[economic-calendar] Finnhub request failed', { status: response.status, from, to });
      }
      return unavailableResponse('ECONOMIC_CALENDAR_PROVIDER_ERROR');
    }

    const payload = await response.json().catch(() => ({})) as {
      economicCalendar?: Record<string, unknown>[];
      events?: Record<string, unknown>[];
      data?: Record<string, unknown>[];
    };
    const rawEvents = Array.isArray(payload.economicCalendar)
      ? payload.economicCalendar
      : Array.isArray(payload.events)
        ? payload.events
        : Array.isArray(payload.data)
          ? payload.data
          : [];
    const events = rawEvents
      .map(normalizeFinnhubEvent)
      .filter((event): event is NormalizedEconomicEvent => Boolean(event));

    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
      console.info('[economic-calendar] Finnhub normalized events', { count: events.length, from, to });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      provider: 'finnhub',
      source: 'finnhub',
      events,
      updated_at: new Date().toISOString(),
    }, { status: 200, headers: cacheHeaders });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true') {
      console.warn('[economic-calendar] provider error', error instanceof Error ? error.message : error);
    }
    return unavailableResponse(isTimeoutError(error) ? 'MARKET_DATA_TIMEOUT' : 'ECONOMIC_CALENDAR_PROVIDER_ERROR');
  }
}

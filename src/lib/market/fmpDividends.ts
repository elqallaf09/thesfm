import { cleanEnv } from '@/lib/market/providerConfig';
import { addUtcDays, formatIsoDate, type ProviderApiStatus } from '@/lib/providers/shared';
import type { DividendCalendarEvent } from '@/lib/providers/dividend-calendar/types';

const FMP_TIMEOUT_MS = 9000;
const FMP_CALENDAR_STABLE_ENDPOINT = 'https://financialmodelingprep.com/stable/dividends-calendar';
const FMP_CALENDAR_LEGACY_ENDPOINT = 'https://financialmodelingprep.com/api/v3/stock_dividend_calendar';
const FMP_COMPANY_STABLE_ENDPOINT = 'https://financialmodelingprep.com/stable/dividends';
const FMP_COMPANY_LEGACY_ENDPOINT = 'https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend';

type FmpRawRecord = Record<string, unknown>;

export type FmpDividendDiagnostics = {
  fmpConfigured: boolean;
  endpoint: string | null;
  responseStatus: number | null;
  rawResultCount: number;
  normalizedResultCount: number;
  status: ProviderApiStatus | 'empty';
  errorMessage: string | null;
  lastUpdated: string;
  attempts: Array<{
    endpoint: string;
    responseStatus: number | null;
    rawResultCount: number;
    normalizedResultCount: number;
    status: ProviderApiStatus | 'empty';
    errorMessage: string | null;
  }>;
};

export type FmpDividendEvent = DividendCalendarEvent & {
  date: string | null;
};

export type FmpDividendResult = {
  events: FmpDividendEvent[];
  diagnostics: FmpDividendDiagnostics;
};

export type FmpSymbolDividendResult = FmpDividendResult & {
  selectedEvent: FmpDividendEvent | null;
  selectedKind: 'upcoming' | 'latestHistorical' | null;
};

function fmpKey() {
  return cleanEnv(process.env.FMP_API_KEY);
}

function baseDiagnostics(partial?: Partial<FmpDividendDiagnostics>): FmpDividendDiagnostics {
  return {
    fmpConfigured: Boolean(fmpKey()),
    endpoint: null,
    responseStatus: null,
    rawResultCount: 0,
    normalizedResultCount: 0,
    status: Boolean(fmpKey()) ? 'empty' : 'not_configured',
    errorMessage: null,
    lastUpdated: new Date().toISOString(),
    attempts: [],
    ...partial,
  };
}

function endpointLabel(url: URL) {
  return `${url.origin}${url.pathname}`;
}

function shortText(value: unknown, maxLength = 180) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
}

function stringOrNull(value: unknown) {
  const text = shortText(value, 120);
  return text || null;
}

function numberOrNull(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[%,$]/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateOnlyOrNull(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!text || text === '0000-00-00') return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function inferMarket(symbol: string) {
  if (symbol.endsWith('.KW')) return 'KW';
  if (symbol.includes('.')) return symbol.split('.').pop()?.toUpperCase() || 'US';
  return 'US';
}

function currencyForMarket(market: string, rawCurrency: unknown) {
  const currency = stringOrNull(rawCurrency)?.toUpperCase();
  if (currency) return currency;
  if (market === 'KW') return 'KWD';
  return 'USD';
}

function eventId(symbol: string, date: string | null, amount: number | null, index: number) {
  return [
    'fmp',
    symbol.toLowerCase().replace(/[^a-z0-9.]+/g, '-'),
    date ?? 'unknown-date',
    amount ?? 'unknown-amount',
    index,
  ].join(':');
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  return shortText(
    record['Error Message']
      ?? record['Error']
      ?? record.error
      ?? record.message
      ?? record.detail
      ?? record.note
      ?? '',
    220,
  ) || null;
}

function statusFromHttp(status: number): ProviderApiStatus {
  if (status === 401) return 'unauthorized';
  if (status === 402) return 'not_entitled';
  if (status === 403) return 'forbidden';
  if (status === 429) return 'rate_limited';
  return 'provider_error';
}

function statusFromMessage(message: string | null): ProviderApiStatus | null {
  const lower = (message ?? '').toLowerCase();
  if (!lower) return null;
  if (lower.includes('rate') || lower.includes('limit')) return 'rate_limited';
  if (lower.includes('plan') || lower.includes('subscription') || lower.includes('entitled')) return 'not_entitled';
  if (lower.includes('invalid') || lower.includes('apikey') || lower.includes('api key') || lower.includes('unauthorized')) return 'unauthorized';
  if (lower.includes('forbidden')) return 'forbidden';
  return 'provider_error';
}

function extractRecords(payload: unknown): FmpRawRecord[] {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === 'object') as FmpRawRecord[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['historical', 'data', 'dividends', 'results']) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as FmpRawRecord[];
  }
  return [];
}

function sortEvents(events: FmpDividendEvent[]) {
  return events.slice().sort((a, b) => {
    const left = a.exDividendDate ?? a.paymentDate ?? a.recordDate ?? a.declarationDate ?? a.date ?? '9999-12-31';
    const right = b.exDividendDate ?? b.paymentDate ?? b.recordDate ?? b.declarationDate ?? b.date ?? '9999-12-31';
    return left.localeCompare(right) || a.symbol.localeCompare(b.symbol);
  });
}

function dedupeEvents(events: FmpDividendEvent[]) {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = [
      event.symbol,
      event.exDividendDate,
      event.paymentDate,
      event.recordDate,
      event.declarationDate,
      event.dividendAmount,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeFmpDividendEvent(raw: unknown, index = 0): FmpDividendEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as FmpRawRecord;
  const symbol = shortText(record.symbol ?? record.ticker, 32).toUpperCase();
  if (!symbol) return null;

  const exDividendDate = dateOnlyOrNull(record.exDividendDate ?? record.date ?? record.exDate);
  const paymentDate = dateOnlyOrNull(record.paymentDate ?? record.payDate);
  const recordDate = dateOnlyOrNull(record.recordDate);
  const declarationDate = dateOnlyOrNull(record.declarationDate ?? record.declaredDate);
  const date = exDividendDate ?? dateOnlyOrNull(record.date) ?? paymentDate ?? recordDate ?? declarationDate;
  if (!date && !exDividendDate && !paymentDate && !recordDate && !declarationDate) return null;

  const market = stringOrNull(record.exchange ?? record.market) ?? inferMarket(symbol);
  const amount = numberOrNull(record.dividend)
    ?? numberOrNull(record.adjDividend)
    ?? numberOrNull(record.amount)
    ?? numberOrNull(record.adjustedAmount);
  const type = stringOrNull(record.type ?? record.dividendType ?? record.label) ?? 'cash';

  return {
    id: eventId(symbol, date, amount, index),
    symbol,
    companyName: stringOrNull(record.companyName ?? record.name) ?? symbol,
    market,
    currency: currencyForMarket(market, record.currency),
    dividendAmount: amount,
    dividendYield: numberOrNull(record.dividendYield ?? record.yield),
    exDividendDate,
    recordDate,
    paymentDate,
    declarationDate,
    type,
    source: 'FMP',
    provider: 'fmp',
    status: declarationDate ? 'announced' : 'scheduled',
    date,
  };
}

async function fetchFmpEndpoint(url: URL, force = false): Promise<{ payload: unknown; diagnostics: FmpDividendDiagnostics['attempts'][number] }> {
  const endpoint = endpointLabel(url);
  try {
    const response = await fetch(url, {
      cache: force ? 'no-store' : undefined,
      next: force ? undefined : { revalidate: 1800 },
      signal: AbortSignal.timeout(FMP_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    const errorMessage = extractErrorMessage(payload);
    const messageStatus = statusFromMessage(errorMessage);
    const rawResultCount = extractRecords(payload).length;
    const httpStatus = response.ok ? null : statusFromHttp(response.status);
    const status = httpStatus ?? messageStatus ?? (rawResultCount > 0 ? 'success' : 'empty');

    return {
      payload,
      diagnostics: {
        endpoint,
        responseStatus: response.status,
        rawResultCount,
        normalizedResultCount: 0,
        status,
        errorMessage: status === 'success' || status === 'empty' ? null : errorMessage ?? `fmp_http_${response.status}`,
      },
    };
  } catch (error) {
    return {
      payload: null,
      diagnostics: {
        endpoint,
        responseStatus: null,
        rawResultCount: 0,
        normalizedResultCount: 0,
        status: 'provider_error',
        errorMessage: error instanceof Error ? error.message : 'fmp_network_error',
      },
    };
  }
}

function finalizeDiagnostics(
  attempts: FmpDividendDiagnostics['attempts'],
  events: FmpDividendEvent[],
): FmpDividendDiagnostics {
  const selected = attempts.find(attempt => attempt.status === 'success' && attempt.normalizedResultCount > 0)
    ?? attempts.find(attempt => attempt.status === 'empty')
    ?? attempts[attempts.length - 1]
    ?? null;
  return baseDiagnostics({
    endpoint: selected?.endpoint ?? null,
    responseStatus: selected?.responseStatus ?? null,
    rawResultCount: selected?.rawResultCount ?? 0,
    normalizedResultCount: events.length,
    status: selected?.status ?? (events.length ? 'success' : 'empty'),
    errorMessage: selected?.errorMessage ?? null,
    attempts,
  });
}

function logDiagnostics(scope: string, diagnostics: FmpDividendDiagnostics) {
  console.info(`[fmp-dividends] ${scope}`, {
    fmpConfigured: diagnostics.fmpConfigured,
    endpoint: diagnostics.endpoint,
    responseStatus: diagnostics.responseStatus,
    rawResultCount: diagnostics.rawResultCount,
    normalizedResultCount: diagnostics.normalizedResultCount,
    status: diagnostics.status,
    errorMessage: diagnostics.errorMessage,
  });
}

function shouldTryNextFmpEndpoint(attempt: FmpDividendDiagnostics['attempts'][number]) {
  return attempt.normalizedResultCount === 0
    && ['success', 'empty', 'provider_error'].includes(attempt.status);
}

export async function getFmpDividendCalendar({
  from,
  to,
  force = false,
}: {
  from: string;
  to: string;
  force?: boolean;
}): Promise<FmpDividendResult> {
  const apiKey = fmpKey();
  if (!apiKey) {
    const diagnostics = baseDiagnostics();
    logDiagnostics('calendar', diagnostics);
    return { events: [], diagnostics };
  }

  const urls = [
    new URL(FMP_CALENDAR_STABLE_ENDPOINT),
    new URL(FMP_CALENDAR_LEGACY_ENDPOINT),
  ];
  urls.forEach(url => {
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('apikey', apiKey);
  });

  const attempts: FmpDividendDiagnostics['attempts'] = [];
  let events: FmpDividendEvent[] = [];

  for (const url of urls) {
    const result = await fetchFmpEndpoint(url, force);
    const records = extractRecords(result.payload);
    const normalized = dedupeEvents(records
      .map((record, index) => normalizeFmpDividendEvent(record, index))
      .filter((event): event is FmpDividendEvent => Boolean(event)));
    const attempt = {
      ...result.diagnostics,
      rawResultCount: records.length,
      normalizedResultCount: normalized.length,
      status: result.diagnostics.status === 'empty' && normalized.length > 0 ? 'success' as const : result.diagnostics.status,
    };
    attempts.push(attempt);
    if (!shouldTryNextFmpEndpoint(attempt)) {
      events = normalized;
      break;
    }
  }

  events = sortEvents(dedupeEvents(events));
  const diagnostics = finalizeDiagnostics(attempts, events);
  logDiagnostics('calendar', diagnostics);
  return { events, diagnostics };
}

function selectSymbolEvent(events: FmpDividendEvent[]): { selectedEvent: FmpDividendEvent | null; selectedKind: 'upcoming' | 'latestHistorical' | null } {
  const today = formatIsoDate(new Date());
  const sorted = sortEvents(events);
  const upcoming = sorted.find(event => {
    const date = event.exDividendDate ?? event.paymentDate ?? event.recordDate ?? event.declarationDate ?? event.date;
    return Boolean(date && date >= today);
  });
  if (upcoming) return { selectedEvent: upcoming, selectedKind: 'upcoming' };

  const latestHistorical = sorted
    .filter(event => Boolean(event.exDividendDate ?? event.paymentDate ?? event.recordDate ?? event.declarationDate ?? event.date))
    .sort((a, b) => {
      const left = a.exDividendDate ?? a.paymentDate ?? a.recordDate ?? a.declarationDate ?? a.date ?? '';
      const right = b.exDividendDate ?? b.paymentDate ?? b.recordDate ?? b.declarationDate ?? b.date ?? '';
      return right.localeCompare(left);
    })[0] ?? null;
  return { selectedEvent: latestHistorical, selectedKind: latestHistorical ? 'latestHistorical' : null };
}

export async function getFmpDividendsForSymbol(symbol: string): Promise<FmpSymbolDividendResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const apiKey = fmpKey();
  if (!apiKey || !cleanSymbol) {
    const diagnostics = baseDiagnostics({ status: apiKey ? 'invalid_request' : 'not_configured' });
    logDiagnostics(`symbol:${cleanSymbol || 'missing'}`, diagnostics);
    return { events: [], selectedEvent: null, selectedKind: null, diagnostics };
  }

  const stableUrl = new URL(FMP_COMPANY_STABLE_ENDPOINT);
  stableUrl.searchParams.set('symbol', cleanSymbol);
  stableUrl.searchParams.set('apikey', apiKey);

  const legacyUrl = new URL(`${FMP_COMPANY_LEGACY_ENDPOINT}/${encodeURIComponent(cleanSymbol)}`);
  legacyUrl.searchParams.set('apikey', apiKey);

  const attempts: FmpDividendDiagnostics['attempts'] = [];
  let events: FmpDividendEvent[] = [];

  for (const url of [stableUrl, legacyUrl]) {
    const result = await fetchFmpEndpoint(url);
    const records = extractRecords(result.payload);
    const normalized = dedupeEvents(records
      .map((record, index) => normalizeFmpDividendEvent({ ...record, symbol: record.symbol ?? cleanSymbol }, index))
      .filter((event): event is FmpDividendEvent => Boolean(event))
      .filter(event => event.symbol.toUpperCase() === cleanSymbol));
    const attempt = {
      ...result.diagnostics,
      rawResultCount: records.length,
      normalizedResultCount: normalized.length,
      status: result.diagnostics.status === 'empty' && normalized.length > 0 ? 'success' as const : result.diagnostics.status,
    };
    attempts.push(attempt);
    if (!shouldTryNextFmpEndpoint(attempt)) {
      events = normalized;
      break;
    }
  }

  events = sortEvents(dedupeEvents(events));
  const diagnostics = finalizeDiagnostics(attempts, events);
  const selected = selectSymbolEvent(events);
  logDiagnostics(`symbol:${cleanSymbol}`, diagnostics);
  return { events, ...selected, diagnostics };
}

export function defaultFmpCalendarRange(days = 30) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return {
    from: formatIsoDate(today),
    to: formatIsoDate(addUtcDays(today, days)),
  };
}

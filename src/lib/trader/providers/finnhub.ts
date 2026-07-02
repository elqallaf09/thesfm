import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  ProviderError,
  shortText,
  stableId,
} from '@/lib/providers/shared';
import type {
  TraderCalendarQuery,
  TraderDividendEvent,
  TraderEarningsEvent,
  TraderEconomicEvent,
} from './types';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const FINNHUB_TIMEOUT_MS = 9000;

type ProviderRecord = Record<string, unknown>;

type NumberField = {
  value: number | null;
  present: boolean;
};

function hasProviderValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return false;
    return !/^(?:--|—|n\/a|na|null|none|undefined)$/i.test(text);
  }
  return true;
}

function textOrNull(value: unknown, maxLength = 180) {
  const text = shortText(value, maxLength);
  return text || null;
}

function numberOrNull(value: unknown) {
  if (!hasProviderValue(value)) return null;
  const parsed = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberField(...values: unknown[]): NumberField {
  for (const value of values) {
    if (!hasProviderValue(value)) continue;
    return {
      value: numberOrNull(value),
      present: true,
    };
  }
  return { value: null, present: false };
}

function positiveNumberField(...values: unknown[]): NumberField {
  const field = numberField(...values);
  return field.value !== null && field.value > 0 ? field : { ...field, value: null };
}

function scalarOrNull(value: unknown): string | number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.trim() || null;
  return null;
}

function dateOnlyOrNull(value: unknown) {
  const text = shortText(value, 60);
  if (!text) return null;
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function isTodayOrFuture(reportDate: string) {
  const today = new Date();
  const todayIso = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  return reportDate >= todayIso;
}

function normalizeActualEps(field: NumberField, reportDate: string) {
  if (!field.present || field.value === null) return null;
  if (field.value === 0 && isTodayOrFuture(reportDate)) return null;
  return field.value;
}

function deriveEpsSurprise(actual: number | null, estimate: number | null, explicit: number | null) {
  if (explicit !== null) return explicit;
  if (actual === null || estimate === null) return null;
  return Number((actual - estimate).toFixed(6));
}

function dateTimeOrNull(value: unknown) {
  const text = shortText(value, 80);
  if (!text) return null;
  const normalized = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(text) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(text)
    ? `${text.replace(' ', 'T')}Z`
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractProviderMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const record = payload as ProviderRecord;
  return shortText(record.error ?? record.message ?? record.s ?? '', 320);
}

function providerErrorFor(statusCode: number, message: string) {
  const lower = message.toLowerCase();
  if (statusCode === 429 || /rate|limit|quota/.test(lower)) {
    return new ProviderError('rate_limited', 'provider_rate_limited', statusCode, message);
  }
  if (statusCode === 401 || /invalid|token|api key|unauthori[sz]ed/.test(lower)) {
    return new ProviderError('unauthorized', 'provider_access_denied', statusCode, message);
  }
  if (statusCode === 403 || /forbidden|plan|subscription|entitlement/.test(lower)) {
    return new ProviderError('not_entitled', 'provider_access_denied', statusCode, message);
  }
  const status = mapHttpProviderStatus(statusCode);
  return new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', statusCode, message);
}

async function fetchFinnhubPayload(path: string, apiKey: string, query: TraderCalendarQuery, extra?: Record<string, string>) {
  const url = new URL(`${FINNHUB_BASE}/${path}`);
  url.searchParams.set('from', query.from);
  url.searchParams.set('to', query.to);
  url.searchParams.set('token', apiKey);
  Object.entries(extra ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });

  let response: Response;
  try {
    response = await fetch(url, {
      cache: query.force ? 'no-store' : undefined,
      next: query.force ? undefined : { revalidate: 3600 },
      signal: AbortSignal.timeout(FINNHUB_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? shortText(error.message || error.name, 220) : 'network_error';
    throw new ProviderError('provider_error', 'provider_temporarily_unavailable', undefined, message);
  }

  const payload = await response.json().catch(() => null);
  const message = extractProviderMessage(payload);
  if (!response.ok) throw providerErrorFor(response.status, message || `finnhub_http_${response.status}`);
  if (message && /error|invalid|limit|token|subscription/i.test(message)) {
    throw providerErrorFor(response.status, message);
  }
  return payload;
}

function recordsFromPayload(payload: unknown, key: string): ProviderRecord[] {
  if (Array.isArray(payload)) return payload.filter(item => item && typeof item === 'object') as ProviderRecord[];
  if (!payload || typeof payload !== 'object') return [];
  const value = (payload as ProviderRecord)[key];
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as ProviderRecord[] : [];
}

export async function fetchFinnhubEarningsCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderEarningsEvent[]> {
  const payload = await fetchFinnhubPayload('calendar/earnings', apiKey, query);
  const events: TraderEarningsEvent[] = [];
  recordsFromPayload(payload, 'earningsCalendar').forEach((record, index) => {
    const symbol = shortText(record.symbol, 40).toUpperCase();
    const reportDate = dateOnlyOrNull(record.date);
    if (!symbol || !reportDate) return;
    const epsEstimate = numberField(record.epsEstimate, record.estimatedEPS).value;
    const epsActual = normalizeActualEps(numberField(record.epsActual, record.actualEPS), reportDate);
    const revenueActual = positiveNumberField(record.revenue, record.revenueActual, record.actualRevenue).value;
    const revenueEstimate = positiveNumberField(record.revenueEstimate, record.estimatedRevenue).value;
    const epsSurprise = deriveEpsSurprise(
      epsActual,
      epsEstimate,
      numberField(record.epsSurprise, record.surprise, record.surpriseAmount).value,
    );
    if (epsActual === null && epsEstimate === null && revenueActual === null && revenueEstimate === null) return;
    events.push({
      id: stableId(['finnhub-earnings', symbol, reportDate, index].join('-'), `finnhub-earnings-${index}`),
      symbol,
      companyName: textOrNull(record.companyName ?? record.name, 180) ?? symbol,
      reportDate,
      fiscalDateEnding: dateOnlyOrNull(record.period),
      epsEstimate,
      epsActual,
      epsSurprise,
      revenueActual,
      revenueEstimate,
      time: textOrNull(record.hour, 40),
      source: 'Finnhub',
      provider: 'finnhub',
    });
  });
  return events;
}

export async function fetchFinnhubDividendsCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderDividendEvent[]> {
  const symbols = query.symbols?.length ? query.symbols : [];
  if (symbols.length === 0) return [];
  const settled = await Promise.allSettled(symbols.map(symbol => fetchFinnhubPayload('stock/dividend', apiKey, query, { symbol })));
  const events: TraderDividendEvent[] = [];
  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const fallbackSymbol = symbols[index] ?? '';
    recordsFromPayload(result.value, 'data')
      .concat(Array.isArray(result.value) ? result.value as ProviderRecord[] : [])
      .forEach((record, recordIndex) => {
        const symbol = shortText(record.symbol ?? fallbackSymbol, 40).toUpperCase();
        const exDividendDate = dateOnlyOrNull(record.date);
        const paymentDate = dateOnlyOrNull(record.payDate);
        const recordDate = dateOnlyOrNull(record.recordDate);
        const declarationDate = dateOnlyOrNull(record.declarationDate);
        if (!symbol || (!exDividendDate && !paymentDate && !recordDate && !declarationDate)) return;
        events.push({
          id: stableId(['finnhub-dividend', symbol, exDividendDate ?? paymentDate ?? recordIndex].join('-'), `finnhub-dividend-${index}-${recordIndex}`),
          symbol,
          companyName: symbol,
          declarationDate,
          exDividendDate,
          recordDate,
          paymentDate,
          dividendAmount: numberOrNull(record.amount ?? record.adjustedAmount),
          dividendYield: null,
          currency: textOrNull(record.currency, 16)?.toUpperCase() ?? null,
          source: 'Finnhub',
          provider: 'finnhub',
        });
      });
  });
  if (events.length === 0 && settled.length > 0 && settled.every(result => result.status === 'rejected')) {
    const firstRejected = settled.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (firstRejected?.reason instanceof ProviderError) throw firstRejected.reason;
    throw new ProviderError('provider_error', 'provider_temporarily_unavailable');
  }
  return events;
}

export async function fetchFinnhubEconomicCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderEconomicEvent[]> {
  const payload = await fetchFinnhubPayload('calendar/economic', apiKey, query);
  const events: TraderEconomicEvent[] = [];
  recordsFromPayload(payload, 'economicCalendar').forEach((record, index) => {
    const dateTime = dateTimeOrNull(record.time ?? record.date);
    const title = textOrNull(record.event, 220);
    if (!dateTime || !title) return;
    events.push({
      id: stableId(['finnhub-economic', title, dateTime, index].join('-'), `finnhub-economic-${index}`),
      dateTimeUtc: dateTime,
      country: textOrNull(record.country, 80),
      currency: textOrNull(record.currency, 16)?.toUpperCase() ?? null,
      event: title,
      impact: 'unknown',
      previous: scalarOrNull(record.prev),
      forecast: scalarOrNull(record.forecast),
      actual: scalarOrNull(record.actual),
      source: 'Finnhub',
      provider: 'finnhub',
    });
  });
  return events;
}

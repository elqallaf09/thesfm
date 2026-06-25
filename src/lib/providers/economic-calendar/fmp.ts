import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  normalizeTitle,
  ProviderError,
  shortText,
  stableId,
} from '../shared';
import type { EconomicCalendarEvent, EconomicCalendarProvider, EconomicCalendarQuery } from './types';

const FMP_TIMEOUT_MS = 9000;

type FmpEconomicCalendarRecord = Record<string, unknown>;

function valueOrNull(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text || text === '-') return null;
  return text;
}

function textOrNull(value: unknown): string | null {
  const text = shortText(value, 80);
  return text || null;
}

function normalizeImpact(value: unknown): EconomicCalendarEvent['impact'] {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw === '3' || raw.includes('high')) return 'high';
  if (raw === '2' || raw.includes('medium') || raw.includes('moderate')) return 'medium';
  if (raw === '1' || raw.includes('low')) return 'low';
  return 'unknown';
}

function normalizeUtcDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const date = new Date(value < 10000000000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstText(record: FmpEconomicCalendarRecord, keys: string[]) {
  for (const key of keys) {
    const text = shortText(record[key], 240);
    if (text) return text;
  }
  return '';
}

export function normalizeFmpEconomicEvent(record: FmpEconomicCalendarRecord, index: number): EconomicCalendarEvent | null {
  const title = firstText(record, ['event', 'title', 'name']);
  if (!title) return null;
  const dateTimeUtc = normalizeUtcDateTime(record.date ?? record.datetime ?? record.time);
  if (!dateTimeUtc) return null;
  const country = firstText(record, ['country', 'region']) || null;
  const currency = firstText(record, ['currency', 'ccy', 'symbol'])?.toUpperCase() || null;
  const impact = normalizeImpact(record.impact ?? record.importance ?? record.level);
  const source = firstText(record, ['source']) || 'Financial Modeling Prep';
  const providerId = firstText(record, ['id', 'eventId', 'event_id']);
  const id = stableId(providerId || ['fmp', dateTimeUtc, country ?? '', currency ?? '', title].join('-'), `fmp-economic-event-${index}`);

  return {
    id,
    title,
    country,
    currency,
    dateTimeUtc,
    impact,
    actual: valueOrNull(record.actual ?? record.value),
    forecast: valueOrNull(record.forecast ?? record.estimate ?? record.consensus),
    previous: valueOrNull(record.previous ?? record.prev),
    unit: textOrNull(record.unit ?? record.unitName),
    source,
    provider: 'fmp',
  };
}

export function dedupeEconomicEvents(events: EconomicCalendarEvent[]) {
  const seen = new Set<string>();
  const result: EconomicCalendarEvent[] = [];
  for (const event of events) {
    const key = event.id || [
      event.provider,
      event.dateTimeUtc,
      event.country ?? '',
      event.currency ?? '',
      normalizeTitle(event.title),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

function matchesFilters(event: EconomicCalendarEvent, query: EconomicCalendarQuery) {
  if (query.country && event.country?.toLowerCase() !== query.country.toLowerCase()) return false;
  if (query.currency && event.currency?.toUpperCase() !== query.currency.toUpperCase()) return false;
  if (query.impact && event.impact !== query.impact) return false;
  return true;
}

export function createFmpCalendarProvider(apiKey: string): EconomicCalendarProvider {
  return {
    provider: 'fmp',
    async getEvents(query) {
      const url = new URL('https://financialmodelingprep.com/stable/economic-calendar');
      url.searchParams.set('from', query.from);
      url.searchParams.set('to', query.to);
      url.searchParams.set('apikey', apiKey);

      const response = await fetch(url, {
        cache: query.force ? 'no-store' : undefined,
        next: query.force ? undefined : { revalidate: 600 },
        signal: AbortSignal.timeout(FMP_TIMEOUT_MS),
      });

      if (!response.ok) {
        const status = mapHttpProviderStatus(response.status);
        throw new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', response.status);
      }

      const payload = await response.json().catch(() => []);
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const errorText = String(
          (payload as Record<string, unknown>)['Error Message']
            ?? (payload as Record<string, unknown>).error
            ?? (payload as Record<string, unknown>).message
            ?? '',
        ).toLowerCase();
        if (errorText.includes('limit')) {
          throw new ProviderError('rate_limited', 'provider_rate_limited');
        }
        if (errorText.includes('invalid') || errorText.includes('apikey') || errorText.includes('api key') || errorText.includes('unauthorized')) {
          throw new ProviderError('unauthorized', 'provider_access_denied');
        }
      }
      const records = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>).data)
          ? (payload as { data: FmpEconomicCalendarRecord[] }).data
          : [];

      return dedupeEconomicEvents(
        records
          .map((record, index) => normalizeFmpEconomicEvent(record, index))
          .filter((event): event is EconomicCalendarEvent => Boolean(event))
          .filter(event => matchesFilters(event, query)),
      ).sort((a, b) => new Date(a.dateTimeUtc).getTime() - new Date(b.dateTimeUtc).getTime());
    },
  };
}

import {
  normalizeTitle,
  ProviderError,
  shortText,
  stableId,
} from '../shared';
import type { EconomicCalendarEvent, EconomicCalendarProvider, EconomicCalendarQuery } from './types';

const FINNHUB_CALENDAR_TIMEOUT_MS = 9000;

type FinnhubEconomicRecord = Record<string, unknown>;

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
};

function valueOrNull(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  return text && text !== '-' ? text : null;
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
  const assumedUtc = /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const date = new Date(assumedUtc);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function safeProviderMessage(response: Response) {
  const text = await response.text().catch(() => '');
  return text
    .replace(/\s+/g, ' ')
    .replace(/token=[^&\s]+/gi, 'token=[redacted]')
    .trim()
    .slice(0, 300);
}

export function normalizeFinnhubEconomicEvent(record: FinnhubEconomicRecord, index: number): EconomicCalendarEvent | null {
  const title = shortText(record.event ?? record.name ?? record.title, 240);
  if (!title) return null;
  const dateTimeUtc = normalizeUtcDateTime(record.time ?? record.datetime ?? record.date);
  if (!dateTimeUtc) return null;
  const country = shortText(record.country ?? record.region, 80).toUpperCase() || null;
  const currency = shortText(record.currency ?? record.ccy ?? record.symbol, 20).toUpperCase()
    || (country ? COUNTRY_CURRENCY[country] : null)
    || null;
  const id = stableId(shortText(record.id, 80) || ['finnhub', dateTimeUtc, country ?? '', title].join('-'), `finnhub-economic-event-${index}`);

  return {
    id,
    title,
    country,
    currency,
    dateTimeUtc,
    impact: normalizeImpact(record.impact ?? record.importance ?? record.level),
    actual: valueOrNull(record.actual ?? record.value),
    forecast: valueOrNull(record.forecast ?? record.estimate ?? record.consensus),
    previous: valueOrNull(record.previous ?? record.prev),
    unit: valueOrNull(record.unit) as string | null,
    source: 'Finnhub',
    provider: 'finnhub',
  };
}

function dedupe(events: EconomicCalendarEvent[]) {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = event.id || [event.dateTimeUtc, event.country ?? '', normalizeTitle(event.title)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesFilters(event: EconomicCalendarEvent, query: EconomicCalendarQuery) {
  if (query.country && event.country?.toLowerCase() !== query.country.toLowerCase()) return false;
  if (query.currency && event.currency?.toUpperCase() !== query.currency.toUpperCase()) return false;
  if (query.impact && event.impact !== query.impact) return false;
  return true;
}

export function createFinnhubCalendarProvider(apiKey: string): EconomicCalendarProvider {
  return {
    provider: 'finnhub',
    async getEvents(query) {
      const url = new URL('https://finnhub.io/api/v1/calendar/economic');
      url.searchParams.set('from', query.from);
      url.searchParams.set('to', query.to);
      url.searchParams.set('token', apiKey);

      const response = await fetch(url, {
        cache: query.force ? 'no-store' : undefined,
        next: query.force ? undefined : { revalidate: 600 },
        signal: AbortSignal.timeout(FINNHUB_CALENDAR_TIMEOUT_MS),
      });

      if (!response.ok) {
        const status = response.status === 429 ? 'rate_limited' : 'provider_error';
        const messageCode = status === 'rate_limited'
          ? 'provider_rate_limited'
          : 'provider_temporarily_unavailable';
        throw new ProviderError(status, messageCode, response.status, await safeProviderMessage(response));
      }

      const payload = await response.json().catch(() => ({}));
      const records = Array.isArray((payload as Record<string, unknown>).economicCalendar)
        ? (payload as { economicCalendar: FinnhubEconomicRecord[] }).economicCalendar
        : Array.isArray((payload as Record<string, unknown>).events)
          ? (payload as { events: FinnhubEconomicRecord[] }).events
          : Array.isArray((payload as Record<string, unknown>).data)
            ? (payload as { data: FinnhubEconomicRecord[] }).data
            : [];

      return dedupe(
        records
          .map((record, index) => normalizeFinnhubEconomicEvent(record, index))
          .filter((event): event is EconomicCalendarEvent => Boolean(event))
          .filter(event => matchesFilters(event, query)),
      ).sort((a, b) => new Date(a.dateTimeUtc).getTime() - new Date(b.dateTimeUtc).getTime());
    },
  };
}

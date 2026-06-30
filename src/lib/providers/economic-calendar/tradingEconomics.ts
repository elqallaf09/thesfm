import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  normalizeTitle,
  ProviderError,
  shortText,
  stableId,
} from '../shared';
import { logEconomicCalendarProviderRequest } from './diagnostics';
import type { EconomicCalendarEvent, EconomicCalendarProvider, EconomicCalendarQuery } from './types';

const TRADING_ECONOMICS_TIMEOUT_MS = 9000;
const DEFAULT_TRADING_ECONOMICS_BASE_URL = 'https://api.tradingeconomics.com';

type TradingEconomicsRecord = Record<string, unknown>;

const COUNTRY_CURRENCY: Record<string, string> = {
  australia: 'AUD',
  canada: 'CAD',
  china: 'CNY',
  eurozone: 'EUR',
  france: 'EUR',
  germany: 'EUR',
  japan: 'JPY',
  kuwait: 'KWD',
  newzealand: 'NZD',
  switzerland: 'CHF',
  unitedkingdom: 'GBP',
  unitedstates: 'USD',
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  au: ['australia'],
  australia: ['australia'],
  ca: ['canada'],
  canada: ['canada'],
  cn: ['china'],
  china: ['china'],
  eu: ['eurozone', 'euro area', 'european union'],
  eurozone: ['eurozone', 'euro area', 'european union'],
  gb: ['united kingdom', 'uk', 'great britain'],
  uk: ['united kingdom', 'uk', 'great britain'],
  unitedkingdom: ['united kingdom', 'uk', 'great britain'],
  jp: ['japan'],
  japan: ['japan'],
  kw: ['kuwait'],
  kuwait: ['kuwait'],
  nz: ['new zealand'],
  newzealand: ['new zealand'],
  us: ['united states', 'usa', 'united states of america'],
  usa: ['united states', 'usa', 'united states of america'],
  unitedstates: ['united states', 'usa', 'united states of america'],
};

function compactKey(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function valueOrNull(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text || text === '-') return null;
  return text;
}

function firstValue(record: TradingEconomicsRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return null;
}

function normalizeImpact(value: unknown): EconomicCalendarEvent['impact'] {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';
  if (raw === '3' || raw.includes('high')) return 'high';
  if (raw === '2' || raw.includes('medium') || raw.includes('moderate')) return 'medium';
  if (raw === '1' || raw.includes('low')) return 'low';
  return 'unknown';
}

function impactToImportance(value: EconomicCalendarQuery['impact']) {
  if (value === 'high') return '3';
  if (value === 'medium') return '2';
  if (value === 'low') return '1';
  return null;
}

function normalizeUtcDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const date = new Date(value < 10000000000 ? value * 1000 : value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const assumedUtc = /\d{4}-\d{2}-\d{2}T?\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)
    ? `${raw.replace(' ', 'T')}Z`
    : raw;
  const date = new Date(assumedUtc);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function tradingEconomicsBaseUrl() {
  const configured = String(process.env.TRADING_ECONOMICS_BASE_URL ?? '').trim() || DEFAULT_TRADING_ECONOMICS_BASE_URL;
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : DEFAULT_TRADING_ECONOMICS_BASE_URL;
  } catch {
    return DEFAULT_TRADING_ECONOMICS_BASE_URL;
  }
}

function safeProviderMessageFromText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([?&]c=)[^&\s]+/gi, '$1[redacted]')
    .trim()
    .slice(0, 300);
}

function extractProviderMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const record = Array.isArray(payload) ? null : payload as Record<string, unknown>;
  if (!record) return '';
  return shortText(
    record.error
      ?? record.message
      ?? record.Message
      ?? record['Error Message']
      ?? record.status
      ?? '',
    300,
  );
}

function parseJsonPayload(text: string) {
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function isEntitlementError(status: number, message: string) {
  const text = message.toLowerCase();
  return status === 403
    || /\b(access|license|licence|permission|plan|subscription|entitlement|premium|not included)\b/.test(text);
}

function isAuthorizationError(status: number, message: string) {
  const text = message.toLowerCase();
  return status === 401 || /\b(unauthori[sz]ed|forbidden|invalid\s+(api\s+)?key|api\s+key)\b/.test(text);
}

function isRateLimitError(status: number, message: string) {
  return status === 429 || /rate\s*limit|too many requests|quota/i.test(message);
}

function safeNetworkErrorMessage(error: unknown) {
  if (error instanceof Error) return shortText(error.message || error.name, 200) || error.name;
  return 'network_error';
}

function countryMatches(eventCountry: string | null, queryCountry: string) {
  if (!eventCountry) return false;
  const eventKey = compactKey(eventCountry);
  const queryKey = compactKey(queryCountry);
  if (eventKey === queryKey) return true;
  return (COUNTRY_ALIASES[queryKey] ?? []).some(alias => compactKey(alias) === eventKey);
}

function matchesFilters(event: EconomicCalendarEvent, query: EconomicCalendarQuery) {
  if (query.country && !countryMatches(event.country, query.country)) return false;
  if (query.currency && event.currency?.toUpperCase() !== query.currency.toUpperCase()) return false;
  if (query.impact && event.impact !== query.impact) return false;
  return true;
}

function dedupe(events: EconomicCalendarEvent[]) {
  const seen = new Set<string>();
  return events.filter(event => {
    const key = event.id || [
      event.provider,
      event.dateTimeUtc,
      event.country ?? '',
      event.currency ?? '',
      normalizeTitle(event.title),
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeTradingEconomicsEvent(record: TradingEconomicsRecord, index: number): EconomicCalendarEvent | null {
  const title = shortText(firstValue(record, ['Event', 'event', 'Category', 'category', 'title', 'name']), 240);
  if (!title) return null;
  const dateTimeUtc = normalizeUtcDateTime(firstValue(record, ['Date', 'date', 'datetime', 'time']));
  if (!dateTimeUtc) return null;
  const country = shortText(firstValue(record, ['Country', 'country']), 80) || null;
  const currency = shortText(firstValue(record, ['Currency', 'currency', 'Ccy', 'ccy']), 20).toUpperCase()
    || (country ? COUNTRY_CURRENCY[compactKey(country)] : null)
    || null;
  const providerId = shortText(firstValue(record, ['CalendarId', 'CalendarID', 'calendarId', 'id']), 80);
  const source = shortText(firstValue(record, ['Source', 'source']), 120) || 'Trading Economics';
  const id = stableId(providerId || ['tradingeconomics', dateTimeUtc, country ?? '', title].join('-'), `trading-economics-event-${index}`);

  return {
    id,
    title,
    country,
    currency,
    dateTimeUtc,
    impact: normalizeImpact(firstValue(record, ['Importance', 'importance', 'impact'])),
    actual: valueOrNull(firstValue(record, ['Actual', 'ActualValue', 'actual', 'value'])),
    forecast: valueOrNull(firstValue(record, ['Forecast', 'ForecastValue', 'TEForecast', 'forecast', 'estimate', 'consensus'])),
    previous: valueOrNull(firstValue(record, ['Previous', 'PreviousValue', 'previous', 'prev'])),
    unit: valueOrNull(firstValue(record, ['Unit', 'unit'])) as string | null,
    source,
    provider: 'tradingeconomics',
  };
}

export function createTradingEconomicsCalendarProvider(apiKey: string): EconomicCalendarProvider {
  return {
    provider: 'tradingeconomics',
    async getEvents(query) {
      const baseUrl = tradingEconomicsBaseUrl();
      const url = new URL(`/calendar/country/All/${query.from}/${query.to}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
      url.searchParams.set('c', apiKey);
      url.searchParams.set('f', 'json');
      const importance = impactToImportance(query.impact);
      if (importance) url.searchParams.set('importance', importance);

      let response: Response;
      try {
        response = await fetch(url, {
          cache: query.force ? 'no-store' : undefined,
          next: query.force ? undefined : { revalidate: 600 },
          signal: AbortSignal.timeout(TRADING_ECONOMICS_TIMEOUT_MS),
        });
      } catch (error) {
        const providerMessage = safeNetworkErrorMessage(error);
        logEconomicCalendarProviderRequest({
          provider: 'tradingeconomics',
          requestStatus: 'network_error',
          responseStatusCode: null,
          providerErrorMessage: providerMessage,
          eventsReturned: 0,
        });
        throw new ProviderError('provider_error', 'provider_temporarily_unavailable', undefined, providerMessage);
      }

      const text = await response.text().catch(() => '');
      const payload = parseJsonPayload(text);
      const extractedProviderMessage = extractProviderMessage(payload);
      const providerMessage = extractedProviderMessage || (!response.ok ? safeProviderMessageFromText(text) : '');
      const records = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as Record<string, unknown>).data)
          ? (payload as { data: TradingEconomicsRecord[] }).data
          : [];
      const events = dedupe(
        records
          .map((record, index) => normalizeTradingEconomicsEvent(record as TradingEconomicsRecord, index))
          .filter((event): event is EconomicCalendarEvent => Boolean(event))
          .filter(event => matchesFilters(event, query)),
      ).sort((a, b) => new Date(a.dateTimeUtc).getTime() - new Date(b.dateTimeUtc).getTime());
      const requestStatus = isRateLimitError(response.status, providerMessage)
        ? 'rate_limited'
        : isEntitlementError(response.status, providerMessage) || isAuthorizationError(response.status, providerMessage)
          ? 'access_denied'
          : !response.ok
            ? 'http_error'
            : events.length === 0
              ? 'empty_result'
              : 'success';

      logEconomicCalendarProviderRequest({
        provider: 'tradingeconomics',
        requestStatus,
        responseStatusCode: response.status,
        providerErrorMessage: providerMessage,
        eventsReturned: events.length,
      });

      if (!response.ok || isEntitlementError(response.status, providerMessage) || isAuthorizationError(response.status, providerMessage) || isRateLimitError(response.status, providerMessage)) {
        if (isRateLimitError(response.status, providerMessage)) {
          throw new ProviderError('rate_limited', 'provider_rate_limited', response.status, providerMessage);
        }
        if (isEntitlementError(response.status, providerMessage)) {
          throw new ProviderError('not_entitled', 'provider_access_denied', response.status, providerMessage);
        }
        if (isAuthorizationError(response.status, providerMessage)) {
          throw new ProviderError('forbidden', 'provider_access_denied', response.status, providerMessage);
        }
        const status = mapHttpProviderStatus(response.status);
        throw new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', response.status, providerMessage);
      }

      if (events.length === 0) {
        throw new ProviderError('provider_error', 'calendar_no_events', response.status, providerMessage || 'empty_result');
      }

      return events;
    },
  };
}

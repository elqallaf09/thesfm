import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  ProviderError,
  shortText,
  stableId,
} from '@/lib/providers/shared';
import { createFmpCalendarProvider } from '@/lib/providers/economic-calendar/fmp';
import { fmpQueuedFetch } from './fmpRuntime';
import type {
  TraderCalendarQuery,
  TraderDividendEvent,
  TraderEarningsEvent,
  TraderEconomicEvent,
  TraderIpoEvent,
} from './types';

const FMP_TIMEOUT_MS = 9000;
const FMP_STABLE_BASE = 'https://financialmodelingprep.com/stable';

type ProviderRecord = Record<string, unknown>;

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textOrNull(value: unknown, maxLength = 180): string | null {
  const text = shortText(value, maxLength);
  return text || null;
}

function dateOnlyOrNull(value: unknown): string | null {
  const text = shortText(value, 40);
  if (!text) return null;
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function sanitizeProviderMessage(message: string) {
  return message
    .replace(/\s+/g, ' ')
    .replace(/([?&]apikey=)[^&\s]+/gi, '$1[redacted]')
    .trim()
    .slice(0, 320);
}

function extractProviderMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const record = payload as ProviderRecord;
  return shortText(
    record.error
      ?? record.message
      ?? record.Message
      ?? record['Error Message']
      ?? record.status
      ?? '',
    320,
  );
}

function parseJsonPayload(text: string): unknown {
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function providerErrorFor(statusCode: number, message: string) {
  const text = message.toLowerCase();
  if (statusCode === 429 || /rate\s*limit|too many requests|quota|limit/.test(text)) {
    return new ProviderError('rate_limited', 'provider_rate_limited', statusCode, message);
  }
  if (statusCode === 401 || /invalid\s+(api\s+)?key|apikey|api\s+key|unauthori[sz]ed/.test(text)) {
    return new ProviderError('unauthorized', 'provider_access_denied', statusCode, message);
  }
  if (statusCode === 403 || /\b(access|license|licence|permission|plan|subscription|entitlement|premium|not included)\b/.test(text)) {
    return new ProviderError('not_entitled', 'provider_access_denied', statusCode, message);
  }
  const status = mapHttpProviderStatus(statusCode);
  return new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', statusCode, message);
}

async function fetchFmpRecords(
  endpoint: string,
  apiKey: string,
  query: TraderCalendarQuery,
  fallbackEndpoint?: string,
): Promise<ProviderRecord[]> {
  const run = async (target: string) => {
    const url = new URL(target.startsWith('http') ? target : `${FMP_STABLE_BASE}/${target}`);
    url.searchParams.set('from', query.from);
    url.searchParams.set('to', query.to);
    url.searchParams.set('apikey', apiKey);

    let response: Response;
    try {
      response = await fmpQueuedFetch(url, {
        cache: query.force ? 'no-store' : undefined,
        next: query.force ? undefined : { revalidate: 3600 },
        signal: AbortSignal.timeout(FMP_TIMEOUT_MS),
        headers: { accept: 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? shortText(error.message || error.name, 220) : 'network_error';
      throw new ProviderError('provider_error', 'provider_temporarily_unavailable', undefined, message);
    }

    const text = await response.text().catch(() => '');
    const payload = parseJsonPayload(text);
    const message = extractProviderMessage(payload) || (!response.ok ? sanitizeProviderMessage(text) : '');
    if (!response.ok) throw providerErrorFor(response.status, message);

    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage) throw providerErrorFor(response.status, lowerMessage);
      const data = (payload as ProviderRecord).data;
      return Array.isArray(data) ? data as ProviderRecord[] : [];
    }
    return Array.isArray(payload) ? payload as ProviderRecord[] : [];
  };

  try {
    return await run(endpoint);
  } catch (error) {
    if (fallbackEndpoint && error instanceof ProviderError && error.providerStatus === 404) {
      return run(fallbackEndpoint);
    }
    throw error;
  }
}

export async function fetchFmpEarningsCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderEarningsEvent[]> {
  const records = await fetchFmpRecords(
    'earnings-calendar',
    apiKey,
    query,
    'https://financialmodelingprep.com/api/v3/earning_calendar',
  );

  return records
    .map((record, index): TraderEarningsEvent | null => {
      const symbol = shortText(record.symbol ?? record.ticker, 40).toUpperCase();
      const reportDate = dateOnlyOrNull(record.date ?? record.reportDate ?? record.earningDate);
      if (!symbol || !reportDate) return null;
      const companyName = textOrNull(record.companyName ?? record.name, 180) ?? symbol;
      return {
        id: stableId(['fmp-earnings', symbol, reportDate, index].join('-'), `fmp-earnings-${index}`),
        symbol,
        companyName,
        reportDate,
        fiscalDateEnding: dateOnlyOrNull(record.fiscalDateEnding ?? record.fiscalDate ?? record.periodEnding),
        epsEstimate: numberOrNull(record.epsEstimated ?? record.epsEstimate ?? record.estimatedEPS),
        epsActual: numberOrNull(record.eps ?? record.epsActual ?? record.actualEPS),
        revenueEstimate: numberOrNull(record.revenueEstimated ?? record.revenueEstimate ?? record.estimatedRevenue),
        time: textOrNull(record.time ?? record.hour, 40),
        source: 'Financial Modeling Prep',
        provider: 'fmp' as const,
      };
    })
    .filter((event): event is TraderEarningsEvent => Boolean(event))
    .sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate)));
}

export async function fetchFmpDividendsCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderDividendEvent[]> {
  const records = await fetchFmpRecords(
    'dividends-calendar',
    apiKey,
    query,
    'https://financialmodelingprep.com/api/v3/stock_dividend_calendar',
  );

  return records
    .map((record, index): TraderDividendEvent | null => {
      const symbol = shortText(record.symbol ?? record.ticker, 40).toUpperCase();
      const exDividendDate = dateOnlyOrNull(record.date ?? record.exDividendDate ?? record.exDate);
      const paymentDate = dateOnlyOrNull(record.paymentDate ?? record.payDate);
      const recordDate = dateOnlyOrNull(record.recordDate);
      const declarationDate = dateOnlyOrNull(record.declarationDate ?? record.declaredDate);
      if (!symbol || (!exDividendDate && !paymentDate && !recordDate && !declarationDate)) return null;
      return {
        id: stableId(['fmp-dividend', symbol, exDividendDate ?? paymentDate ?? recordDate ?? declarationDate ?? '', index].join('-'), `fmp-dividend-${index}`),
        symbol,
        companyName: textOrNull(record.companyName ?? record.name, 180) ?? symbol,
        declarationDate,
        exDividendDate,
        recordDate,
        paymentDate,
        dividendAmount: numberOrNull(record.dividend ?? record.amount ?? record.adjDividend ?? record.adjustedAmount),
        dividendYield: numberOrNull(record.dividendYield ?? record.yield),
        currency: textOrNull(record.currency, 16)?.toUpperCase() ?? null,
        source: 'Financial Modeling Prep',
        provider: 'fmp' as const,
      };
    })
    .filter((event): event is TraderDividendEvent => Boolean(event))
    .sort((a, b) => String(a.exDividendDate ?? a.paymentDate ?? '').localeCompare(String(b.exDividendDate ?? b.paymentDate ?? '')));
}

export async function fetchFmpIpoCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderIpoEvent[]> {
  const records = await fetchFmpRecords(
    'ipos-calendar',
    apiKey,
    query,
    'https://financialmodelingprep.com/api/v3/ipo_calendar',
  );

  return records
    .map((record, index): TraderIpoEvent | null => {
      const ipoDate = dateOnlyOrNull(record.date ?? record.ipoDate ?? record.pricedDate);
      const companyName = textOrNull(record.companyName ?? record.name, 220);
      if (!ipoDate || !companyName) return null;
      const low = numberOrNull(record.priceRangeLow ?? record.priceLow);
      const high = numberOrNull(record.priceRangeHigh ?? record.priceHigh);
      const directPriceRange = textOrNull(record.priceRange ?? record.price, 80);
      const priceRange = directPriceRange ?? (low !== null && high !== null ? `${low} - ${high}` : null);
      return {
        id: stableId(['fmp-ipo', record.symbol ?? companyName, ipoDate, index].join('-'), `fmp-ipo-${index}`),
        companyName,
        symbol: textOrNull(record.symbol ?? record.ticker, 40)?.toUpperCase() ?? null,
        exchange: textOrNull(record.exchange ?? record.exchangeShortName, 80),
        ipoDate,
        priceRange,
        shares: numberOrNull(record.shares ?? record.numberOfShares),
        marketCap: numberOrNull(record.marketCap ?? record.marketCapitalization ?? record.totalSharesValue),
        status: textOrNull(record.status ?? record.actions, 80),
        source: 'Financial Modeling Prep',
        provider: 'fmp' as const,
      };
    })
    .filter((event): event is TraderIpoEvent => Boolean(event))
    .sort((a, b) => String(a.ipoDate).localeCompare(String(b.ipoDate)));
}

export async function fetchFmpEconomicCalendar(apiKey: string, query: TraderCalendarQuery): Promise<TraderEconomicEvent[]> {
  try {
    const provider = createFmpCalendarProvider(apiKey);
    const events = await provider.getEvents(query);
    return events.map((event): TraderEconomicEvent => ({
      id: event.id,
      dateTimeUtc: event.dateTimeUtc,
      country: event.country,
      currency: event.currency,
      event: event.title,
      impact: event.impact,
      previous: event.previous,
      forecast: event.forecast,
      actual: event.actual,
      source: event.source ?? 'Financial Modeling Prep',
      provider: 'fmp',
    }));
  } catch (error) {
    if (error instanceof ProviderError && error.messageCode === 'calendar_no_events') return [];
    throw error;
  }
}

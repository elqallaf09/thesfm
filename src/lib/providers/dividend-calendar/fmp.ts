import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  ProviderError,
  shortText,
} from '../shared';
import type { DividendCalendarEvent, DividendCalendarProvider, DividendCalendarQuery } from './types';
import {
  createDividendEventId,
  currencyForMarket,
  dateOnlyOrNull,
  dedupeDividendEvents,
  inferDividendMarket,
  numberOrNull,
  sortDividendEvents,
} from './utils';

const FMP_DIVIDEND_TIMEOUT_MS = 9000;

type FmpDividendRecord = Record<string, unknown>;

function normalizeFmpDividendEvent(record: FmpDividendRecord, index: number): DividendCalendarEvent | null {
  const symbol = shortText(record.symbol ?? record.ticker, 30).toUpperCase();
  if (!symbol) return null;

  const exDividendDate = dateOnlyOrNull(record.date ?? record.exDividendDate ?? record.exDate);
  const paymentDate = dateOnlyOrNull(record.paymentDate ?? record.payDate);
  const recordDate = dateOnlyOrNull(record.recordDate);
  const declarationDate = dateOnlyOrNull(record.declarationDate ?? record.declaredDate);
  if (!exDividendDate && !paymentDate && !recordDate && !declarationDate) return null;

  const market = inferDividendMarket(symbol, record, null);
  const amount = numberOrNull(record.dividend) ?? numberOrNull(record.amount) ?? numberOrNull(record.adjDividend) ?? numberOrNull(record.adjustedAmount);
  const type = shortText(record.type ?? record.dividendType ?? record.label, 80) || 'cash';

  return {
    id: createDividendEventId('fmp', symbol, exDividendDate ?? paymentDate, amount, type, index),
    symbol,
    companyName: shortText(record.companyName ?? record.name, 160) || symbol,
    market,
    currency: currencyForMarket(market, record.currency),
    dividendAmount: amount,
    dividendYield: numberOrNull(record.dividendYield) ?? numberOrNull(record.yield),
    exDividendDate,
    recordDate,
    paymentDate,
    declarationDate,
    type,
    source: 'Financial Modeling Prep',
    provider: 'fmp',
    status: declarationDate ? 'announced' : 'scheduled',
  };
}

async function fetchFmpPayload(url: URL, query: DividendCalendarQuery) {
  const response = await fetch(url, {
    cache: query.force ? 'no-store' : undefined,
    next: query.force ? undefined : { revalidate: 1800 },
    signal: AbortSignal.timeout(FMP_DIVIDEND_TIMEOUT_MS),
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
    if (errorText.includes('limit')) throw new ProviderError('rate_limited', 'provider_rate_limited');
    if (errorText.includes('invalid') || errorText.includes('apikey') || errorText.includes('api key') || errorText.includes('unauthorized')) {
      throw new ProviderError('unauthorized', 'provider_access_denied');
    }
  }

  return payload;
}

export function createFmpDividendCalendarProvider(apiKey: string): DividendCalendarProvider {
  return {
    provider: 'fmp',
    async getEvents(query) {
      const stableUrl = new URL('https://financialmodelingprep.com/stable/dividends-calendar');
      stableUrl.searchParams.set('from', query.from);
      stableUrl.searchParams.set('to', query.to);
      stableUrl.searchParams.set('apikey', apiKey);

      let payload: unknown;
      try {
        payload = await fetchFmpPayload(stableUrl, query);
      } catch (error) {
        if (!(error instanceof ProviderError) || error.providerStatus !== 404) throw error;
        const legacyUrl = new URL('https://financialmodelingprep.com/api/v3/stock_dividend_calendar');
        legacyUrl.searchParams.set('from', query.from);
        legacyUrl.searchParams.set('to', query.to);
        legacyUrl.searchParams.set('apikey', apiKey);
        payload = await fetchFmpPayload(legacyUrl, query);
      }

      const records = Array.isArray(payload)
        ? payload as FmpDividendRecord[]
        : Array.isArray((payload as Record<string, unknown>)?.data)
          ? (payload as { data: FmpDividendRecord[] }).data
          : [];

      return sortDividendEvents(dedupeDividendEvents(
        records
          .map((record, index) => normalizeFmpDividendEvent(record, index))
          .filter((event): event is DividendCalendarEvent => Boolean(event)),
      ));
    },
  };
}

export { normalizeFmpDividendEvent };

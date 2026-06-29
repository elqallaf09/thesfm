import {
  mapHttpProviderStatus,
  messageCodeForStatus,
  ProviderError,
  shortText,
} from '../shared';
import type { DividendCalendarEvent, DividendCalendarProvider, DividendCalendarQuery, DividendCalendarStock } from './types';
import {
  createDividendEventId,
  currencyForMarket,
  dateOnlyOrNull,
  dedupeDividendEvents,
  inferDividendMarket,
  numberOrNull,
  sortDividendEvents,
} from './utils';

const FINNHUB_DIVIDEND_TIMEOUT_MS = 9000;

type FinnhubDividendRecord = Record<string, unknown>;

async function safeProviderMessage(response: Response) {
  const text = await response.text().catch(() => '');
  return text
    .replace(/\s+/g, ' ')
    .replace(/token=[^&\s]+/gi, 'token=[redacted]')
    .trim()
    .slice(0, 300);
}

function normalizeFinnhubDividendEvent(
  record: FinnhubDividendRecord,
  index: number,
  stock: DividendCalendarStock,
): DividendCalendarEvent | null {
  const symbol = shortText(record.symbol, 30).toUpperCase() || stock.symbol.toUpperCase();
  if (!symbol) return null;
  const exDividendDate = dateOnlyOrNull(record.date ?? record.exDate ?? record.exDividendDate);
  const paymentDate = dateOnlyOrNull(record.payDate ?? record.paymentDate);
  const recordDate = dateOnlyOrNull(record.recordDate);
  const declarationDate = dateOnlyOrNull(record.declarationDate ?? record.declaredDate);
  if (!exDividendDate && !paymentDate && !recordDate && !declarationDate) return null;

  const market = inferDividendMarket(symbol, record, stock);
  const amount = numberOrNull(record.amount) ?? numberOrNull(record.adjustedAmount);
  const type = shortText(record.type ?? record.dividendType ?? record.frequency, 80) || 'cash';

  return {
    id: createDividendEventId('finnhub', symbol, exDividendDate ?? paymentDate, amount, type, index),
    symbol,
    companyName: shortText(record.companyName ?? record.name, 160) || stock.name || symbol,
    market,
    currency: currencyForMarket(market, record.currency ?? stock.currency),
    dividendAmount: amount,
    dividendYield: stock.dividendYield ?? numberOrNull(record.dividendYield) ?? numberOrNull(record.yield),
    exDividendDate,
    recordDate,
    paymentDate,
    declarationDate,
    type,
    source: 'Finnhub',
    provider: 'finnhub',
    status: declarationDate ? 'announced' : 'scheduled',
  };
}

async function fetchSymbolDividends(apiKey: string, query: DividendCalendarQuery, stock: DividendCalendarStock) {
  const symbol = stock.symbol.trim().toUpperCase();
  const url = new URL('https://finnhub.io/api/v1/stock/dividend');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('from', query.from);
  url.searchParams.set('to', query.to);
  url.searchParams.set('token', apiKey);

  const response = await fetch(url, {
    cache: query.force ? 'no-store' : undefined,
    next: query.force ? undefined : { revalidate: 1800 },
    signal: AbortSignal.timeout(FINNHUB_DIVIDEND_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    const status = mapHttpProviderStatus(response.status);
    throw new ProviderError(status, messageCodeForStatus(status) ?? 'provider_temporarily_unavailable', response.status, await safeProviderMessage(response));
  }

  const payload = await response.json().catch(() => []);
  const records = Array.isArray(payload)
    ? payload as FinnhubDividendRecord[]
    : Array.isArray((payload as Record<string, unknown>)?.data)
      ? (payload as { data: FinnhubDividendRecord[] }).data
      : [];

  return records
    .map((record, index) => normalizeFinnhubDividendEvent(record, index, stock))
    .filter((event): event is DividendCalendarEvent => Boolean(event));
}

export function createFinnhubDividendCalendarProvider(apiKey: string): DividendCalendarProvider {
  return {
    provider: 'finnhub',
    async getEvents(query) {
      const symbols = (query.symbols ?? [])
        .filter(stock => stock.symbol?.trim())
        .map(stock => ({ ...stock, symbol: stock.symbol.trim().toUpperCase() }));

      if (symbols.length === 0) return [];

      const settled = await Promise.allSettled(symbols.map(stock => fetchSymbolDividends(apiKey, query, stock)));
      const failures = settled.filter(result => result.status === 'rejected');
      const events = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);

      if (events.length === 0 && failures.length === settled.length) {
        const reason = failures[0]?.status === 'rejected' ? failures[0].reason : null;
        if (reason instanceof ProviderError) throw reason;
        throw new ProviderError('provider_error', 'provider_temporarily_unavailable');
      }

      if (failures.length > 0 && (process.env.NODE_ENV !== 'production' || process.env.DEBUG_MARKET_DATA === 'true')) {
        console.warn('[dividend-calendar] partial Finnhub symbol failures', {
          provider: 'finnhub',
          failedSymbols: failures.length,
          requestedSymbols: symbols.length,
        });
      }

      return sortDividendEvents(dedupeDividendEvents(events));
    },
  };
}

export { normalizeFinnhubDividendEvent };

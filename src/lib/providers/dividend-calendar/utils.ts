import { normalizeTitle, shortText, stableId } from '../shared';
import type { DividendCalendarEvent, DividendCalendarProviderName, DividendCalendarStock } from './types';

export const MARKET_CURRENCY: Record<string, string> = {
  US: 'USD',
  Kuwait: 'KWD',
  Saudi: 'SAR',
  UAE: 'AED',
  Qatar: 'QAR',
  Bahrain: 'BHD',
  Oman: 'OMR',
};

const SUFFIX_MARKETS: Array<[RegExp, keyof typeof MARKET_CURRENCY]> = [
  [/\.(KW|KSE)$/i, 'Kuwait'],
  [/\.(SA|SR)$/i, 'Saudi'],
  [/\.(AE|DU|AD)$/i, 'UAE'],
  [/\.(QA|QSE)$/i, 'Qatar'],
  [/\.(BH|BHB)$/i, 'Bahrain'],
  [/\.(OM|MSM)$/i, 'Oman'],
];

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function unwrapRaw(value: unknown) {
  const wrapped = objectOrNull(value);
  return wrapped && 'raw' in wrapped ? wrapped.raw : value;
}

export function numberOrNull(value: unknown) {
  const unwrapped = unwrapRaw(value);
  if (typeof unwrapped === 'number') return Number.isFinite(unwrapped) ? unwrapped : null;
  if (typeof unwrapped === 'string') {
    const parsed = Number(unwrapped.replace(/[%,$]/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function dateOnlyOrNull(value: unknown) {
  const unwrapped = unwrapRaw(value);
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped) && unwrapped > 0) {
    const date = new Date(unwrapped < 10000000000 ? unwrapped * 1000 : unwrapped);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  if (typeof unwrapped !== 'string') return null;
  const raw = unwrapped.trim();
  if (!raw || raw === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

export function inferDividendMarket(symbol: string, record?: Record<string, unknown>, stock?: DividendCalendarStock | null) {
  const configured = shortText(stock?.market, 40);
  if (configured && MARKET_CURRENCY[configured]) return configured;

  const currency = shortText(record?.currency ?? stock?.currency, 10).toUpperCase();
  const marketFromCurrency = Object.entries(MARKET_CURRENCY).find(([, itemCurrency]) => itemCurrency === currency)?.[0];
  if (marketFromCurrency) return marketFromCurrency;

  const rawSymbol = String(symbol || '').trim().toUpperCase();
  const exchange = shortText(record?.exchange ?? record?.exchangeShortName ?? record?.stockExchange ?? record?.market ?? record?.country, 80).toLowerCase();
  for (const [pattern, market] of SUFFIX_MARKETS) {
    if (pattern.test(rawSymbol)) return market;
  }
  if (/kuwait|bourse kuwait|kse/.test(exchange)) return 'Kuwait';
  if (/saudi|tadawul|sase/.test(exchange)) return 'Saudi';
  if (/dubai|abu dhabi|dfm|adx|uae/.test(exchange)) return 'UAE';
  if (/qatar|qse/.test(exchange)) return 'Qatar';
  if (/bahrain|bse/.test(exchange)) return 'Bahrain';
  if (/oman|muscat|msm/.test(exchange)) return 'Oman';
  return 'US';
}

export function currencyForMarket(market: string, fallback?: unknown) {
  const mapped = MARKET_CURRENCY[market];
  if (mapped) return mapped;
  const text = shortText(fallback, 10).toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : 'USD';
}

export function eventSortDate(event: Pick<DividendCalendarEvent, 'exDividendDate' | 'paymentDate' | 'recordDate' | 'declarationDate'>) {
  return event.exDividendDate ?? event.paymentDate ?? event.recordDate ?? event.declarationDate ?? '';
}

export function createDividendEventId(
  provider: DividendCalendarProviderName,
  symbol: string,
  date: string | null,
  amount: number | null,
  type: string | null,
  index: number,
) {
  return stableId([provider, symbol, date ?? '', amount ?? '', type ?? 'dividend'].join('-'), `${provider}-dividend-event-${index}`);
}

export function dedupeDividendEvents(events: DividendCalendarEvent[]) {
  const seen = new Set<string>();
  const result: DividendCalendarEvent[] = [];
  for (const event of events) {
    const key = [
      event.provider,
      event.symbol.toUpperCase(),
      event.exDividendDate ?? '',
      event.paymentDate ?? '',
      event.dividendAmount ?? '',
      normalizeTitle(event.type ?? 'dividend'),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

export function sortDividendEvents(events: DividendCalendarEvent[]) {
  return [...events].sort((a, b) => eventSortDate(a).localeCompare(eventSortDate(b)) || a.symbol.localeCompare(b.symbol));
}

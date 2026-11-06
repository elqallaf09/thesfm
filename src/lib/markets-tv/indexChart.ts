import type { YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import { quoteStatus } from './quotes';
import type { TvQuote } from './types';

const INDEX_CURRENCIES = { '^GSPC': 'USD', '^GDAXI': 'EUR', '^NDX': 'USD' } as const;
export type TvExternalIndex = keyof typeof INDEX_CURRENCIES;
export function isTvExternalIndex(symbol: string): symbol is TvExternalIndex {
  return Object.hasOwn(INDEX_CURRENCIES, symbol);
}

/** A verified external cash index, never an ETF alias or an SFM-owned quote. */
export function verifiedTvIndex(symbol: TvExternalIndex, data: YahooHistoryResult, now = Date.now()) {
  if (!data.success || data.providerSymbol !== symbol) return null;
  const snapshot = data.quoteSnapshot;
  if (!snapshot || snapshot.symbol !== symbol || snapshot.assetType !== 'INDEX'
    || snapshot.currency !== INDEX_CURRENCIES[symbol] || data.currency !== snapshot.currency) return null;
  const observed = Date.parse(snapshot.marketTime || '');
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > 10 * 86_400_000
    || snapshot.price === null || !Number.isFinite(snapshot.price) || snapshot.price <= 0) return null;
  const previous = snapshot.previousClose;
  const quote: TvQuote = {
    symbol, name: snapshot.name || symbol, nameAr: snapshot.name || symbol, currency: null,
    price: snapshot.price, changePercent: previous !== null && Number.isFinite(previous) && previous > 0
      ? (snapshot.price - previous) / previous * 100 : null,
    source: 'Yahoo Finance', observedAt: snapshot.marketTime, receivedAt: data.retrievedAt || null,
    exchange: snapshot.exchange, country: symbol === '^GDAXI' ? 'DE' : 'US',
    delayType: 'delayed', changeBasis: 'session', status: 'delayed',
  };
  quote.status = quoteStatus(quote, now);
  return { quote, history: data.history };
}

/** Yahoo bars already carry UTC instants; select the latest New York session. */
export function tvIndexSessionPoints(history: { date: string; close: number }[], now = Date.now()) {
  const clock = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
  const points = new Map<string, { at: string; price: number; day: string }>();
  for (const row of history.slice(0, 3000)) {
    const at = Date.parse(row.date);
    if (!Number.isFinite(at) || at > now || now - at > 10 * 86_400_000
      || !Number.isFinite(row.close) || row.close <= 0) continue;
    const parts = Object.fromEntries(clock.formatToParts(at).map(p => [p.type, p.value]));
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    if (minutes < 570 || minutes > 960 || ['Sat', 'Sun'].includes(parts.weekday)) continue;
    const iso = new Date(at).toISOString();
    points.set(iso, { at: iso, price: row.close, day: `${parts.year}-${parts.month}-${parts.day}` });
  }
  const sorted = [...points.values()].sort((a, b) => a.at.localeCompare(b.at));
  const sessionDate = sorted.at(-1)?.day || null;
  return { sessionDate, points: sorted.filter(p => p.day === sessionDate).map(({ at, price }) => ({ at, price })) };
}

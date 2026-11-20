import type { YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import { quoteStatus } from './quotes';
import type { TvQuote } from './types';

import { INDEX_CURRENCIES, type TvExternalIndex } from './indexIdentity';
export { isTvExternalIndex, type TvExternalIndex } from './indexIdentity';

const INDEX_COUNTRIES: Record<keyof typeof INDEX_CURRENCIES, string> = {
  '^GSPC': 'US', '^GDAXI': 'DE', '^NDX': 'US', '^DJI': 'US', '^FTSE': 'GB', '^N225': 'JP',
  '^FCHI': 'FR', '^STOXX50E': 'EU', '^IBEX': 'ES', 'FTSEMIB.MI': 'IT', '^AEX': 'NL', '^SSMI': 'CH', '^RUT': 'US', '^GSPTSE': 'CA', '^HSI': 'HK', '000001.SS': 'CN', '^KS11': 'KR', '^TWII': 'TW', '^BSESN': 'IN', '^NSEI': 'IN', '^AXJO': 'AU', '^STI': 'SG', '^TASI.SR': 'SA',
};
// An index's last value can land a few minutes after its official close
// (closing auctions); Yahoo's session clock may sit just after that value.
const CLOSE_TOLERANCE_MS = 15 * 60_000;

/** The session is over only when Yahoo's own regular-session clock proves it:
 * now is past the close and the value is from the close, or the next session
 * has not opened yet and the value predates it. Unknown session → not claimed. */
export function tvIndexSessionClosed(session: { start: number; end: number } | undefined, observed: number, now = Date.now()) {
  if (!session || !Number.isFinite(session.start) || !Number.isFinite(session.end) || session.end <= session.start) return false;
  if (now >= session.end) return observed >= session.end - CLOSE_TOLERANCE_MS;
  return now < session.start && observed < session.start;
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
  const closed = tvIndexSessionClosed(snapshot.regularSession, observed, now);
  const quote: TvQuote = {
    symbol, name: snapshot.name || symbol, nameAr: snapshot.name || symbol, currency: null,
    price: snapshot.price, changePercent: previous !== null && Number.isFinite(previous) && previous > 0
      ? (snapshot.price - previous) / previous * 100 : null,
    source: 'Yahoo Finance', observedAt: snapshot.marketTime, receivedAt: data.retrievedAt || null,
    exchange: snapshot.exchange, country: INDEX_COUNTRIES[symbol],
    observation: { precision: 'instant', marketOpen: closed ? false : null },
    delayType: 'delayed', changeBasis: 'session', status: closed ? 'closed' : 'delayed',
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

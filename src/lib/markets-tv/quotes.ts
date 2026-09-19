import type { WatchlistRow } from '@/lib/trader/watchlistEngine';
import type { TvQuote } from './types';
export function quoteStatus(quote: Pick<TvQuote, 'price' | 'observedAt' | 'status'>, now = Date.now()): TvQuote['status'] {
  if (quote.price === null || !Number.isFinite(quote.price) || quote.price <= 0) return 'unavailable';
  const observed = quote.observedAt ? Date.parse(quote.observedAt) : NaN;
  if (!Number.isFinite(observed) || observed > now + 60_000) return 'unknown_time';
  if (now - observed > 15 * 60_000 || quote.status === 'stale') return 'stale';
  return quote.status;
}
export function toTvQuote(row: WatchlistRow, nameAr?: string, now = Date.now()): TvQuote {
  const valid = row.available === true && typeof row.price === 'number' && Number.isFinite(row.price)
    && row.price > 0 && typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency) && Boolean(row.source);
  const quote: TvQuote = {
    symbol: row.requestedSymbol, name: row.name || row.requestedSymbol, nameAr: nameAr || row.name || row.requestedSymbol,
    price: valid ? row.price! : null, currency: valid ? row.currency! : null,
    changePercent: valid && typeof row.changePercent === 'number' && Number.isFinite(row.changePercent) ? row.changePercent : null,
    source: row.provider || row.source || null, observedAt: row.engine.asOf, receivedAt: row.engine.fetchedAt,
    exchange: row.exchange || null, country: row.country || null,
    status: ['stale', 'last_known'].includes(row.engine.quoteStatus) ? 'stale' : row.delayed ? 'delayed' : 'available',
  };
  quote.status = quoteStatus(quote, now);
  return quote;
}
export function tvMovers(quotes: TvQuote[], now = Date.now()) {
  const eligible = quotes.filter(q => ['available', 'delayed'].includes(quoteStatus(q, now)) && q.changePercent !== null);
  return {
    gainers: eligible.filter(q => q.changePercent! > 0).sort((a, b) => b.changePercent! - a.changePercent!).slice(0, 3),
    losers: eligible.filter(q => q.changePercent! < 0).sort((a, b) => a.changePercent! - b.changePercent!).slice(0, 3),
  };
}
export function safeTvUrl(value: string): string | null {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvQuote } from './types';
export function quoteStatus(quote: Pick<TvQuote, 'price' | 'observedAt' | 'status' | 'observation' | 'delayType' | 'issue'>, now = Date.now()): TvQuote['status'] {
  if (quote.price === null || !Number.isFinite(quote.price) || quote.price <= 0) return 'unavailable';
  const observed = quote.observedAt ? Date.parse(quote.observedAt) : NaN;
  if (!Number.isFinite(observed) || observed > now + 60_000) return 'unknown_time';
  if (quote.issue || quote.status === 'stale') return 'stale';
  // These are explicitly dated observations, not claims that a market is open
  // or streaming. A weekend/holiday close must not fail an intraday timeout.
  if (quote.status === 'reference' || quote.status === 'closed') return now - observed > 7 * 86400000 ? 'stale' : quote.status;
  if (quote.observation?.marketOpen === false || quote.delayType === 'eod') return now - observed > 7 * 86400000 ? 'stale' : 'closed';
  if (quote.observation?.precision === 'date') return now - observed > 7 * 86400000 ? 'stale' : 'reference';
  const limit = quote.status === 'available' ? 15 * 60_000 : 45 * 60_000;
  if (now - observed > limit) return 'stale';
  // A recent timestamp (including a legacy saved snapshot) is not evidence
  // of a realtime entitlement. Only an explicit source contract can say live.
  if (quote.delayType !== 'realtime' && quote.status === 'available') {
    return quote.delayType === 'delayed' ? 'delayed' : 'unknown_delay';
  }
  return quote.status;
}
export function toTvQuote(symbol: string, row: SfmMarketQuote | null, nameAr?: string, now = Date.now()): TvQuote {
  const validUnit = row?.assetType === 'index' || typeof row?.currency === 'string'
    && (row.assetType === 'crypto' ? /^[A-Z0-9]{2,12}$/ : /^[A-Z]{3}$/).test(row.currency);
  const valid = row?.quality.state !== 'unavailable' && typeof row?.price === 'number' && Number.isFinite(row.price)
    && row.price > 0 && validUnit && Boolean(row.provenance.upstreamProvider);
  const evidence = row?.provenance;
  const closing = evidence?.observation?.marketOpen === false || evidence?.delayType === 'eod';
  const referenceOnly = evidence?.observation?.precision === 'date';
  const quote: TvQuote = {
    symbol, name: row?.name || symbol, nameAr: nameAr || row?.name || symbol,
    price: valid ? row!.price : null, currency: valid ? row!.currency : null,
    changePercent: valid && typeof row?.changePercent === 'number' && Number.isFinite(row.changePercent) ? row.changePercent : null,
    source: evidence?.upstreamProviderName || evidence?.upstreamProvider || null,
    observedAt: evidence?.observation?.precision === 'unknown' ? null : evidence?.observedAt || null,
    receivedAt: evidence?.receivedAt || null, exchange: row?.exchange || null, country: row?.country || null,
    observation: evidence?.observation, delayType: evidence?.delayType ?? null, changeBasis: referenceOnly && !closing ? 'reference' : 'session',
    status: closing ? 'closed' : referenceOnly ? 'reference' : row?.quality.state === 'stale' ? 'stale'
      : evidence?.delayType === 'realtime' ? 'available' : evidence?.delayType === 'delayed' ? 'delayed' : 'unknown_delay',
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

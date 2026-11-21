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

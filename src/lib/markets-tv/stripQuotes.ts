import type { TvQuote, TvSnapshot } from './types';
const identity = (q: TvQuote) => `${q.exchange || ''}:${q.symbol}:${q.currency || ''}`;
/** Never erase a proven quote on transient failure, or move its source clock forward. */
export function mergeStripSnapshot(previous: TvSnapshot | null, next: TvSnapshot): TvSnapshot {
  const saved = new Map(previous?.quotes.map(q => [identity(q), q]) || []);
  const quotes = next.quotes.map(q => {
    const old = saved.get(identity(q));
    if (!old || old.price === null) return q;
    if (q.price === null) return { ...old, status: 'stale' as const };
    if (old.observedAt && (!q.observedAt || Date.parse(q.observedAt) < Date.parse(old.observedAt))) return old;
    return q;
  });
  return { ...next, quotes, available: quotes.filter(q => q.price !== null).length };
}

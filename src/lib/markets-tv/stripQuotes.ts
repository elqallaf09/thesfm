import type { TvQuote, TvSnapshot } from './types';
import { hasTvPrice } from './coverage';
const identity = (q: TvQuote) => `${q.exchange || ''}:${q.symbol}:${q.currency || ''}`;
/** Never erase a proven quote on transient failure, or move its source clock forward. */
export function mergeStripSnapshot(previous: TvSnapshot | null, next: TvSnapshot): TvSnapshot {
  const sameView = previous?.group === next.group && previous?.market === next.market && previous?.scene === next.scene;
  const saved = new Map(sameView ? [...previous.quotes, ...(previous.summary || [])].map(q => [identity(q), q]) : []);
  const merge = (q: TvQuote) => {
    let old = saved.get(identity(q));
    // An owned symbol can fail before its metadata is available. Reuse only
    // one previously verified listing in this exact view, and only when the
    // failure supplied no contradictory identity. Keep the old tuple intact.
    if (!old && q.price === null && q.issue && q.issue !== 'identity_mismatch') {
      const candidates = [...saved.values()].filter(value => value.symbol === q.symbol);
      const candidate = candidates.length === 1 ? candidates[0] : undefined;
      if (candidate && (!q.currency || q.currency === candidate.currency) && (!q.exchange || q.exchange === candidate.exchange)) old = candidate;
    }
    if (!old || !hasTvPrice(old)) return q;
    if (!hasTvPrice(q)) return { ...old, status: 'stale' as const, issue: q.issue || 'provider_unavailable' as const, retryAt: q.retryAt };
    const before = old.observedAt ? Date.parse(old.observedAt) : NaN;
    const after = q.observedAt ? Date.parse(q.observedAt) : NaN;
    if (Number.isFinite(before) && (!Number.isFinite(after) || after < before || after > Date.now() + 60_000)) return old;
    return q;
  };
  const quotes = next.quotes.map(merge);
  return { ...next, quotes, ...(next.summary ? { summary: next.summary.map(merge) } : {}), available: quotes.filter(hasTvPrice).length };
}

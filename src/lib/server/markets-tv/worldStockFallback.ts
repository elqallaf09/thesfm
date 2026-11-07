import 'server-only';
import { TV_WORLD_STOCKS, TV_WORLD_STOCK_COLUMNS, tvWorldStockIdentity, verifiedTvWorldStockQuote } from '@/lib/markets-tv/worldStockQuote';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

type Batch = { payload: unknown; receivedAt: string };
let cached: Batch | null = null;
let expires = 0;
let pending: Promise<Batch | null> | null = null;
const usable = (quote: TvQuote | null): quote is TvQuote => quote !== null && quote.price !== null
  && !quote.issue && !['unavailable', 'stale', 'unknown_time'].includes(quoteStatus(quote));

async function readBatch(): Promise<Batch | null> {
  if (expires > Date.now()) return cached;
  if (pending) return pending;
  pending = (async () => {
    let ttl = 30_000;
    try {
      const response = await fetch('https://scanner.tradingview.com/global/scan', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ symbols: { tickers: TV_WORLD_STOCKS.map(bank => `${bank.exchange}:${bank.ticker}`), query: { types: [] } },
          columns: TV_WORLD_STOCK_COLUMNS, range: [0, TV_WORLD_STOCKS.length] }),
        // The snapshot keeps its existing UI deadline. A cold upstream read
        // may finish later under Next after(), warming the verified cache.
        cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 429 || response.status === 503) {
        const retry = response.headers.get('retry-after');
        const wait = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry || '') - Date.now();
        ttl = Math.max(response.status === 429 ? 60_000 : 30_000, Number.isFinite(wait) ? wait : 0);
      }
      if (!response.ok) return cached = null;
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return cached = null;
      const receivedAt = new Date().toISOString();
      // Validate before sharing/caching. A malformed/empty response only gets a
      // short negative TTL; one invalid listing must not discard healthy ones.
      const verified = TV_WORLD_STOCKS.some(bank => verifiedTvWorldStockQuote({ ...bank, name: bank.ticker }, payload, receivedAt));
      if (!verified) return cached = null;
      ttl = 300_000;
      return cached = { payload, receivedAt };
    } catch { return cached = null; }
    finally { expires = Date.now() + ttl; }
  })().finally(() => { pending = null; });
  return pending;
}

/** One bounded, shared request for the six world-scene listings.
 * Independent of Yahoo/Twelve Data cooldowns; existing verified quote caching
 * retains dated observations on refresh failure without relabelling them fresh. */
export async function withTvWorldStockFallback(asset: TvAsset, primary: Promise<TvQuote>): Promise<TvQuote> {
  if (!tvWorldStockIdentity(asset)) return primary;
  let latest: TvQuote | null = null;
  const original = primary.then(quote => { latest = quote; return quote; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const early = await Promise.race([original, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 500); })]);
  clearTimeout(timer);
  if (usable(early)) return early;
  const data = await readBatch();
  if (usable(latest)) return latest;
  return data && verifiedTvWorldStockQuote(asset, data.payload, data.receivedAt) || original;
}

import 'server-only';
import { fetchYahooHistory, type YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import { tvRegionalIdentity, verifiedTvRegionalQuote } from '@/lib/markets-tv/regionalQuote';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

const pending = new Map<string, Promise<YahooHistoryResult | null>>();
let blockedUntil = 0;
let active = 0;
const waiting: Array<() => void> = [];
const usable = (quote: TvQuote | null): quote is TvQuote => quote !== null && quote.price !== null
  && !quote.issue && !['unavailable', 'stale', 'unknown_time'].includes(quoteStatus(quote));

async function read(symbol: string): Promise<YahooHistoryResult | null> {
  if (blockedUntil > Date.now()) return null;
  if (active >= 2) {
    if (waiting.length >= 24) return null;
    await new Promise<void>(resolve => waiting.push(resolve));
  } else active++;
  try {
    if (blockedUntil > Date.now()) return null;
    const data = await fetchYahooHistory(symbol, 'stock', '5d', '1d', false, 3500);
    if (!data.success && data.unavailableReason === 'provider_http_429') blockedUntil = Date.now() + Math.max(60_000, data.retryAfterMs || 0);
    return data;
  } finally { const next = waiting.shift(); if (next) next(); else active--; }
}

/** The existing listing cache retains only verified observations. This layer
 * shares in-flight reads and honours a provider-wide Retry-After on failure. */
export async function withTvRegionalFallback(asset: TvAsset, primary: Promise<TvQuote>): Promise<TvQuote> {
  const identity = tvRegionalIdentity(asset);
  if (!identity || blockedUntil > Date.now()) return primary;
  let latest: TvQuote | null = null;
  const original = primary.then(quote => { latest = quote; return quote; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const early = await Promise.race([original, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 500); })]);
  clearTimeout(timer);
  if (usable(early)) return early;
  if (blockedUntil > Date.now()) return original;
  let work = pending.get(identity.symbol);
  if (!work) {
    work = read(identity.symbol)
      .finally(() => pending.delete(identity.symbol));
    pending.set(identity.symbol, work);
  }
  const data = await work;
  if (usable(latest)) return latest;
  return data && verifiedTvRegionalQuote(asset, data) || original;
}

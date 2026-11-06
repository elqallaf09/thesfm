import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { isTvExternalIndex, verifiedTvIndex } from '@/lib/markets-tv/indexChart';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';

const cooldowns = new Map<string, number>();
const pending = new Map<string, ReturnType<typeof read>>();
const read = unstable_cache(async (symbol: string) => {
  if (!isTvExternalIndex(symbol) || (cooldowns.get(symbol) || 0) > Date.now()) return null;
  const data = await fetchYahooHistory(symbol, 'index', '1d', '5m', false, 3500);
  if (!data.success) {
    if (data.retryAfterMs !== undefined) cooldowns.set(symbol, Date.now() + Math.max(60_000, data.retryAfterMs));
    return null;
  }
  cooldowns.delete(symbol);
  return verifiedTvIndex(symbol, data);
}, ['tv-external-cash-index-v1'], { revalidate: 120 });

export async function loadTvExternalIndex(symbol: string) {
  if (!isTvExternalIndex(symbol)) return null;
  let work = pending.get(symbol);
  if (!work) { work = read(symbol).catch(() => null).finally(() => pending.delete(symbol)); pending.set(symbol, work); }
  return work;
}

/** A bounded primary-source head start keeps fallback inside the TV deadline. */
export async function withTvIndexFallback(symbol: string, primary: Promise<TvQuote>): Promise<TvQuote> {
  if (!isTvExternalIndex(symbol)) return primary;
  let latest: TvQuote | null = null;
  const original = primary.then(quote => { latest = quote; return quote; });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const early = await Promise.race([original, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 1500); })]);
  clearTimeout(timer);
  const usable = (quote: TvQuote | null): quote is TvQuote => quote !== null && quote.price !== null
    && !['unavailable', 'stale', 'unknown_time'].includes(quoteStatus(quote));
  if (usable(early)) return early;
  const external = await loadTvExternalIndex(symbol);
  if (usable(latest)) return latest;
  if (external) return { ...external.quote, status: quoteStatus(external.quote) };
  return original;
}

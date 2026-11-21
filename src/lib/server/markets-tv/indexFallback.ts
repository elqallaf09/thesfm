import 'server-only';
import { unstable_cache } from 'next/cache';
import { fetchYahooHistory } from '@/lib/market/fetchYahooHistory';
import { isTvExternalIndex, verifiedTvIndex } from '@/lib/markets-tv/indexChart';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';

const cooldowns = new Map<string, number>();
const pending = new Map<string, Promise<ReturnType<typeof verifiedTvIndex>>>();
class NoIndexEvidence extends Error {}
// Only verified evidence is shared. A miss throws, so the shared cache never
// stores "no price" for two minutes (or, with a failing refresh, for good):
// the next viewer asks again, still bounded by the per-symbol cooldown.
const read = unstable_cache(async (symbol: string) => {
  if (!isTvExternalIndex(symbol) || (cooldowns.get(symbol) || 0) > Date.now()) throw new NoIndexEvidence();
  const data = await fetchYahooHistory(symbol, 'index', '1d', '5m', false, 3500);
  if (!data.success) {
    if (data.retryAfterMs !== undefined) cooldowns.set(symbol, Date.now() + Math.max(60_000, data.retryAfterMs));
    throw new NoIndexEvidence();
  }
  cooldowns.delete(symbol);
  const verified = verifiedTvIndex(symbol, data);
  if (!verified) {
    const s = data.quoteSnapshot;
    console.warn('[markets-tv] TV_INDEX_EVIDENCE_REJECTED', { symbol, providerSymbol: data.providerSymbol, currency: data.currency,
      snapshot: s ? { symbol: s.symbol, assetType: s.assetType, currency: s.currency, price: s.price, marketTime: s.marketTime } : null });
    throw new NoIndexEvidence();
  }
  return verified;
}, ['tv-external-cash-index-v2'], { revalidate: 120 });

export async function loadTvExternalIndex(symbol: string) {
  if (!isTvExternalIndex(symbol)) return null;
  let work = pending.get(symbol);
  if (!work) { work = read(symbol).catch(() => null).finally(() => pending.delete(symbol)); pending.set(symbol, work); }
  return work;
}

/** The verified external cash index alone, for indices asked here first. */
export async function tvIndexAlternative(symbol: string): Promise<TvQuote | null> {
  const external = await loadTvExternalIndex(symbol);
  if (!external) return null;
  const quote = { ...external.quote, status: quoteStatus(external.quote) };
  return quote.price !== null && !['unavailable', 'stale', 'unknown_time'].includes(quote.status) ? quote : null;
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

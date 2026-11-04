import 'server-only';
import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { quoteStatus } from '@/lib/markets-tv/quotes';
import type { TvQuote } from '@/lib/markets-tv/types';

class UnavailableQuote extends Error {
  declare readonly quote: TvQuote;
  constructor(quote: TvQuote) {
    super('TV_QUOTE_UNAVAILABLE');
    Object.defineProperty(this, 'quote', { value: quote, enumerable: false });
  }
}

/** Cache verified observations per listing, shared across scenes and instances.
 * Throwing on refresh failure lets Next retain the last successful observation.
 * An empty cold result is returned to its caller, never saved over a good price.
 */
export async function cachedTvQuote(identity: string, load: () => Promise<TvQuote>, revalidate = 300): Promise<TvQuote> {
  const read = unstable_cache(async () => {
    const quote = await load();
    if (quote.price === null || !Number.isFinite(quote.price) || quote.price <= 0 || !quote.source || quote.issue || quoteStatus(quote) === 'unknown_time') {
      throw new UnavailableQuote(quote);
    }
    return { quote, verifiedAt: Date.now() };
  }, ['tv-verified-quote-v1', createHash('sha256').update(identity).digest('hex')], { revalidate });
  try {
    const { quote, verifiedAt } = await read();
    // Cached observations keep both original clocks and are never called live
    // merely because the snapshot containing them was generated just now.
    const retained = Date.now() - verifiedAt > (revalidate + 15) * 1000;
    return { ...quote, status: quoteStatus({ ...quote, ...(retained ? { status: 'stale' as const } : {}) }) };
  } catch (error) {
    if (error instanceof UnavailableQuote) return error.quote;
    throw error;
  }
}

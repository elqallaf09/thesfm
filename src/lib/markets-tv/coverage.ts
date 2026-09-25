import { quoteStatus } from './quotes';
import type { TvQuote } from './types';

export const hasTvPrice = (quote: TvQuote) => typeof quote.price === 'number' && Number.isFinite(quote.price)
  && quote.price > 0 && Boolean(quote.source);

/** Counts only the loaded page, never extrapolates price entitlement to a directory. */
export function tvStripCoverage(quotes: TvQuote[], now: number) {
  const counts = { loaded: quotes.length, priced: 0, recent: 0, stale: 0, reference: 0, unknown: 0 };
  for (const quote of quotes) {
    if (!hasTvPrice(quote)) continue;
    counts.priced++;
    const status = quoteStatus(quote, now);
    if (status === 'available' || status === 'delayed') counts.recent++;
    else if (status === 'stale') counts.stale++;
    else if (status === 'reference') counts.reference++;
    else counts.unknown++;
  }
  return counts;
}

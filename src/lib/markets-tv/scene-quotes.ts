import type { TvQuote, TvSnapshot } from './types';
import { quoteStatus } from './quote-status';
import { tvSceneHasPrice } from './scene-display';

export function tvSceneQuoteKey(quote: TvQuote) {
  return `${quote.exchange || ''}:${quote.symbol}:${quote.currency || ''}`;
}

function uniqueQuotes(quotes: TvQuote[]) {
  return Array.from(new Map(quotes.map(quote => [tvSceneQuoteKey(quote), quote])).values());
}

/** Keep source coverage intact; apply display limits only to priced instruments. */
export function tvSceneQuotes(snapshot: TvSnapshot | null, overview: boolean, watchlist: boolean) {
  const all = uniqueQuotes([...(snapshot?.summary ?? []), ...(snapshot?.quotes ?? [])]);
  const priced = all.filter(tvSceneHasPrice);
  // A short or partially available watchlist belongs in one list, not split
  // between a few summary cards and an empty price table.
  if (watchlist && priced.length <= 6) return { all, summaries: [], rows: priced, tickerQuotes: priced };
  const summaries = uniqueQuotes(snapshot?.summary ?? all).filter(tvSceneHasPrice).slice(0, overview ? 6 : 4);
  const summaryKeys = new Set(summaries.map(tvSceneQuoteKey));
  const rows = uniqueQuotes(snapshot?.quotes ?? []).filter(quote => tvSceneHasPrice(quote)
    && !summaryKeys.has(tvSceneQuoteKey(quote))).slice(0, 6);
  return { all, summaries, rows, tickerQuotes: priced };
}

/** Retained, unknown and reference-only changes never become a current map. */
export function tvSceneHasComparableChange(quote: TvQuote, now: number) {
  return tvSceneHasPrice(quote) && quote.changePercent !== null && Number.isFinite(quote.changePercent)
    && ['session', '24h'].includes(quote.changeBasis || '')
    && ['available', 'delayed', 'closed'].includes(quoteStatus(quote, now));
}

import { briefMetrics } from '../../../src/lib/markets-tv/obsidian';
import type { TvQuote } from '../../../src/lib/markets-tv/types';
import type { Quote, Snapshot } from './api';

const statuses: readonly TvQuote['status'][] = ['available', 'delayed', 'closed', 'stale', 'reference', 'unknown_time', 'unknown_delay', 'unavailable'];
const issues: readonly NonNullable<TvQuote['issue']>[] = ['provider_unavailable', 'timeout', 'identity_mismatch', 'rate_limited', 'access_denied', 'not_configured', 'invalid_quote'];
const bases: readonly NonNullable<TvQuote['changeBasis']>[] = ['session', '24h', 'reference'];
function member<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find(candidate => candidate === value);
}

/** Keep source observation evidence intact when using the shared brief contract. */
export function nativeBriefQuote(quote: Quote): TvQuote {
  return {
    symbol: quote.symbol, listingKey: quote.listingKey, displaySymbol: quote.displaySymbol,
    name: quote.name, nameAr: quote.nameAr, currency: quote.currency, price: quote.price,
    changePercent: quote.changePercent, source: quote.source, observedAt: quote.observedAt,
    receivedAt: quote.receivedAt ?? null, exchange: quote.exchange ?? null, country: quote.country ?? null,
    status: member(quote.status, statuses) ?? 'unknown_delay', observation: quote.observation,
    delayType: quote.delayType, retryAt: quote.retryAt, changeBasis: member(quote.changeBasis, bases),
    // An unfamiliar provider failure must not turn a cached change into a current ranking.
    issue: member(quote.issue, issues) ?? (quote.issue ? 'provider_unavailable' : undefined),
  };
}

export type NativeBriefView = 'highlights' | 'prices' | 'leaders';
export const NATIVE_BRIEF_PAGE_SIZE = 2;

export function nativeBriefPage(snapshot: Snapshot | null, requested: NativeBriefView, cursor: number, now: number) {
  const stats = briefMetrics([...(snapshot?.summary ?? []), ...(snapshot?.quotes ?? [])].map(nativeBriefQuote), now);
  const pricesOnly = stats.comparable === 0 && stats.available > 0;
  const savedOnly = pricesOnly && stats.recent === 0;
  const view = pricesOnly ? 'prices' : requested === 'leaders' && !stats.leaders.length ? 'highlights' : requested;
  // Put the strongest move in each direction together before showing lower ranks.
  const highlights = Array.from({ length: Math.max(stats.gainers.length, stats.losers.length) }, (_, index) =>
    [stats.gainers[index], stats.losers[index]].filter((quote): quote is TvQuote => Boolean(quote))).flat();
  const rows = view === 'prices' ? stats.saved : view === 'leaders' ? stats.leaders : highlights;
  const pages = Math.max(1, Math.ceil(rows.length / NATIVE_BRIEF_PAGE_SIZE));
  const page = Number.isFinite(cursor) ? ((Math.trunc(cursor) % pages) + pages) % pages : 0;
  return { stats, view, pricesOnly, savedOnly, page, pages,
    rows: rows.slice(page * NATIVE_BRIEF_PAGE_SIZE, (page + 1) * NATIVE_BRIEF_PAGE_SIZE) };
}

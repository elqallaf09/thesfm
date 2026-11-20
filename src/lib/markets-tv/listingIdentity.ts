/** A ticker identifies a listing only together with its exchange. */
export function tvListingKey(asset: { symbol: string; region?: string; exchange?: string | null }): string {
  return `${asset.region || asset.exchange || 'global'}:${asset.symbol}`;
}

export function validTvListingKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_]{1,32}:[A-Za-z0-9.&^=/:_-]{1,64}$/.test(value);
}
import type { TvInstrument } from './selections';
import type { TvQuote } from './types';


/** Use the same venue-aware match for visible rows and their coverage count. */
export function createTvListingQuoteLookup(items: readonly TvInstrument[], quotes: readonly TvQuote[]) {
  const byListing = new Map<string, TvQuote | undefined>();
  const bySymbol = new Map<string, TvQuote | undefined>();
  for (const quote of quotes) {
    if (quote.listingKey) byListing.set(quote.listingKey, byListing.has(quote.listingKey) ? undefined : quote);
    bySymbol.set(quote.symbol, bySymbol.has(quote.symbol) ? undefined : quote);
  }
  const itemCounts = new Map<string, number>();
  for (const item of items) itemCounts.set(item.symbol, (itemCounts.get(item.symbol) || 0) + 1);
  return (item: TvInstrument): TvQuote | undefined => {
    if (item.listingKey && byListing.has(item.listingKey)) return byListing.get(item.listingKey);
    const quote = itemCounts.get(item.symbol) === 1 ? bySymbol.get(item.symbol) : undefined;
    if (!quote || item.listingKey && quote.listingKey || item.region && quote.exchange && item.region !== quote.exchange) return undefined;
    return quote;
  };
}

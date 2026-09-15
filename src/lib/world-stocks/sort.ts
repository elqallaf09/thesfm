import type { WorldStock } from './types';

export type WorldStockSort = 'name' | 'symbol' | 'change_desc' | 'change_asc';

/**
 * Client-side sort over the currently-loaded page only -- never a
 * server-side re-sort of the full result set. Gainers/losers sorting is
 * restricted to stocks whose quote has actually been fetched
 * (quoteStatus === 'available'); a stock with no fetched quote has no real
 * changePercent to rank by and is pushed to the end rather than treated as
 * a fabricated 0% change.
 */
export function sortWorldStocks(items: WorldStock[], sort: WorldStockSort, locale: string): WorldStock[] {
  const sorted = [...items];
  if (sort === 'symbol') {
    sorted.sort((a, b) => a.canonicalSymbol.localeCompare(b.canonicalSymbol));
  } else if (sort === 'change_desc' || sort === 'change_asc') {
    sorted.sort((a, b) => {
      const aValue = a.quoteStatus === 'available' ? a.changePercent : null;
      const bValue = b.quoteStatus === 'available' ? b.changePercent : null;
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      return sort === 'change_desc' ? bValue - aValue : aValue - bValue;
    });
  } else {
    sorted.sort((a, b) => a.displayName.localeCompare(b.displayName, locale) || a.canonicalSymbol.localeCompare(b.canonicalSymbol));
  }
  return sorted;
}

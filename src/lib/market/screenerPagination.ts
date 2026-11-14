/** Provider-independent, fail-closed pagination. No credentials or network access. */
export type ScreenerRecord = Record<string, unknown>;
export type ListingIdentity = {
  symbol: string;
  exchange: string;
  primaryExchange: string | null;
  requestedExchange: string;
};
const code = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : '';
export const listingKey = (row: { exchange: string; symbol: string }) => JSON.stringify([row.exchange, row.symbol]);

export function listingIdentity(row: ScreenerRecord, requestedExchange: string): ListingIdentity {
  const symbol = code(row.symbol);
  // The request filter is never evidence of the returned listing's exchange.
  const exchange = code(row.exchangeShortName) || code(row.exchange);
  if (!symbol || !exchange) throw new Error('screener_missing_listing_identity');
  return { symbol, exchange, requestedExchange: code(requestedExchange), primaryExchange: code(row.primaryExchange) || null };
}

export async function collectScreenerPages(
  fetchPage: (params: { page: number; limit: number; includeAllShareClasses: boolean }) => Promise<unknown>,
  options: { exchange: string; pageSize?: number; maxPages?: number; includeAllShareClasses?: boolean },
) {
  const limit = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 30;
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(maxPages) || maxPages < 2) throw new Error('screener_invalid_paging');
  const rows: Array<ScreenerRecord & ListingIdentity> = [];
  const seen = new Set<string>();
  const pageCounts: number[] = [];
  let shortPage = false;
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await fetchPage({ page, limit, includeAllShareClasses: options.includeAllShareClasses ?? false });
    if (!Array.isArray(payload)) throw new Error('screener_invalid_page');
    pageCounts.push(payload.length);
    if (payload.length > limit) throw new Error('screener_page_limit_ignored');
    if (payload.length === 0) {
      rows.sort((a, b) => listingKey(a).localeCompare(listingKey(b), 'en'));
      return { rows, pageCounts };
    }
    // Probe after a short page: accepting it as EOF can silently omit later rows.
    if (shortPage) throw new Error('screener_short_nonterminal_page');
    for (const raw of payload) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('screener_invalid_row');
      const identity = listingIdentity(raw, options.exchange);
      const key = listingKey(identity);
      if (seen.has(key)) throw new Error('screener_duplicate_listing');
      seen.add(key);
      rows.push({ ...raw, ...identity });
    }
    shortPage = payload.length < limit;
  }
  throw new Error('screener_page_cap_reached');
}

export function assertSameListings(a: Array<{ exchange: string; symbol: string }>, b: Array<{ exchange: string; symbol: string }>) {
  const first = new Set(a.map(listingKey));
  const second = new Set(b.map(listingKey));
  if (first.size !== a.length || second.size !== b.length || first.size !== second.size || [...first].some(key => !second.has(key))) {
    throw new Error('screener_listing_set_changed');
  }
}

/** Symbol-only quote/statement providers cannot disambiguate two listing venues. */
export function uniqueSymbolListings(rows: Array<{ symbol: string }>) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.symbol, (counts.get(row.symbol) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count === 1).map(([symbol]) => symbol));
}

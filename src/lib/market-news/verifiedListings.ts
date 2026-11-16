import records from '@/data/market-listings/verified-us-listings.json';
import type { SpecialQuote } from './specialQuotes';

// A disclosed product window, not an assertion that 90 days is universal.
export const NEW_LISTING_WINDOW_DAYS = 90;
export const LISTING_REVIEW_MAX_DAYS = 30;
const DAY = 86_400_000;
export type VerifiedListing = {
  symbol: string; name: string; exchange: string; cik: string;
  securityType: string; listingType: string; firstTradeDate: string;
  evidence: string; sourceUrl: string; sourceLabel: string; sourceSection: string;
  verifiedAt: string; reviewAfter: string;
};
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}
export function safeListingSource(row: VerifiedListing) {
  try {
    const url = new URL(row.sourceUrl);
    return /^\d{1,10}$/.test(row.cik) && url.protocol === 'https:' && url.hostname === 'www.sec.gov'
      && !url.port && !url.username && !url.password && !url.search && !url.hash
      && url.pathname.startsWith(`/Archives/edgar/data/${row.cik}/`)
      && /^\/Archives\/edgar\/data\/\d+\/\d{18}\/[a-zA-Z0-9_.-]+\.htm$/.test(url.pathname);
  } catch { return false; }
}
export function eligibleListings(now = Date.now(), input: readonly VerifiedListing[] = records) {
  const today = Math.floor(now / DAY) * DAY;
  const valid = input.filter(row => {
    const first = day(row.firstTradeDate), verified = day(row.verifiedAt), review = day(row.reviewAfter);
    return /^[A-Z][A-Z0-9.-]{0,9}$/.test(row.symbol) && row.name.trim().length > 0
      && ['NASDAQ', 'NYSE', 'NYSE_AMERICAN'].includes(row.exchange)
      && row.securityType === 'common-stock' && row.evidence === 'completed-first-trade'
      && ['ipo', 'new-us-listing', 'business-combination', 'direct-listing'].includes(row.listingType)
      && safeListingSource(row) && first <= verified && verified <= today && first >= today - NEW_LISTING_WINDOW_DAYS * DAY
      && review > today && review <= verified + LISTING_REVIEW_MAX_DAYS * DAY;
  });
  // A reused/ambiguous symbol must not inherit another issuer's evidence.
  const identities = new Map<string, Set<string>>();
  for (const row of valid) {
    const set = identities.get(row.symbol) ?? new Set<string>();
    set.add(`${row.exchange}:${row.cik}:${row.firstTradeDate}`);
    identities.set(row.symbol, set);
  }
  const seen = new Set<string>();
  return valid.filter(row => {
    if (identities.get(row.symbol)?.size !== 1 || seen.has(row.symbol)) return false;
    seen.add(row.symbol); return true;
  }).sort((a, b) => b.firstTradeDate.localeCompare(a.firstTradeDate)).slice(0, 18);
}
export function listingTickerItems(listings: VerifiedListing[], quotes: Map<string, SpecialQuote>, now = Date.now()) {
  return listings.flatMap(row => {
    const quote = quotes.get(row.symbol);
    const observed = Date.parse(quote?.asOf ?? '');
    const venue = row.exchange === 'NASDAQ' ? ['NCM', 'NGM', 'NMS'] : row.exchange === 'NYSE' ? ['NYQ'] : ['ASE'];
    const identity = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!quote?.available || quote.symbol !== row.symbol || quote.currency !== 'USD' || quote.assetType !== 'EQUITY'
      || !venue.includes(quote.exchange ?? '') || identity(quote.name ?? '') !== identity(row.name)
      || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0
      || !Number.isFinite(observed) || observed > now + 60_000 || observed < now - 4 * DAY || observed < day(row.firstTradeDate)) return [];
    return [{ symbol: row.symbol, name: row.name, assetType: 'stock' as const, currency: 'USD',
      price: quote.price, changePercent: quote.changePercent, available: true, source: quote.source,
      asOf: quote.asOf, delayed: quote.delayed, meta: `${row.exchange} · ${row.firstTradeDate}`,
      firstTradeDate: row.firstTradeDate, listingSourceUrl: row.sourceUrl }];
  });
}

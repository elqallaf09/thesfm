import 'server-only';
import { fetchSpecialQuotes } from './specialQuotes';
import { eligibleListings, listingTickerItems, NEW_LISTING_WINDOW_DAYS } from './verifiedListings';

export async function newListingTicker() {
  const listings = eligibleListings();
  // Default off: public EDGAR reuse permission does not license market quotes.
  const quotesPermitted = process.env.NEW_LISTING_QUOTES_RIGHTS_CONFIRMED === 'true';
  const quotes = quotesPermitted ? await fetchSpecialQuotes(listings.map(row => row.symbol)) : new Map();
  return {
    success: true, topic: 'new-stocks', tickerItems: listingTickerItems(listings, quotes), listings,
    quoteStatus: quotesPermitted ? 'provider-dependent' : 'rights-unverified',
    listingCoverage: { partial: true, mode: 'reviewed-filings', windowDays: NEW_LISTING_WINDOW_DAYS },
  };
}

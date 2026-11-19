import 'server-only';
import { getBundledUsSymbolCatalog } from '@/lib/server/usSymbolCatalog';
import type { SfmMarketQuote } from '@/lib/sfm-market/types';
import type { TvAsset } from './catalog';

const VENUES: Record<string, readonly string[]> = {
  NASDAQ: ['NASDAQ', 'XNAS', 'NMS', 'NGM', 'NCM', 'NASDAQ GLOBAL SELECT MARKET', 'NASDAQ GLOBAL MARKET', 'NASDAQ CAPITAL MARKET'],
  NYSE: ['NYSE', 'XNYS', 'NYQ', 'NEW YORK STOCK EXCHANGE'],
  'NYSE AMERICAN': ['NYSE AMERICAN', 'AMEX', 'NYSE MKT', 'XASE', 'ASE'],
  'NYSE ARCA': ['NYSE ARCA', 'ARCA', 'ARCX', 'PCX'],
  'CBOE BZX': ['CBOE BZX', 'BATS', 'BZX', 'BATS BZX'],
  IEX: ['IEX', 'IEXG'],
};
const key = (value: string | null | undefined) => value?.trim().toUpperCase() || '';
const venue = (value: string | null | undefined) => Object.keys(VENUES).find(exchange => VENUES[exchange].includes(key(value)));

function agreesWithUsListing(asset: TvAsset, quote: SfmMarketQuote, exchange?: string) {
  if ([asset.country, quote.country].some(value => Boolean(value) && key(value) !== 'US')
    || asset.currency && key(asset.currency) !== 'USD') return false;
  const supplied = [asset.exchange, asset.mic, quote.exchange, asset.region, quote.market].filter(value => key(value) && key(value) !== 'US');
  const venues = supplied.map(venue);
  return venues.every(Boolean) && new Set([...venues, ...(exchange ? [exchange] : [])]).size <= 1;
}

/** A symbol-only owned list can recover its US identity only after a matching
 * Finnhub stock quote. The local catalog supplies listing metadata, never prices
 * or market state; explicit conflicting country, venue or currency wins. */
export async function verifiedFinnhubUsListing(asset: TvAsset, quote: SfmMarketQuote) {
  if (quote.provenance.upstreamProvider !== 'finnhub' || !['stock', 'etf'].includes(quote.assetType)
    || asset.assetType && asset.assetType !== 'stock' || quote.quality.state === 'unavailable'
    || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0
    || key(quote.currency) !== 'USD' || key(quote.symbol) !== key(asset.symbol)) return null;
  // Explicit catalog/selection identities already have a US market or venue.
  // New listings need not wait for the bundled directory to be updated.
  const explicitUs = key(asset.country) === 'US' || key(asset.region) === 'US' || venue(asset.exchange) || venue(asset.mic);
  if (explicitUs) {
    // Retain the class-share and explicit .US spellings already accepted by
    // tvQuoteIdentityMatches; this is not a new symbol/catalog alias lookup.
    const listingSymbol = (value: string | null | undefined) => key(value).replace(/\.US$/, '').replace(/\./g, '-');
    if (listingSymbol(quote.provenance.providerSymbol) !== listingSymbol(asset.providerSymbol || asset.symbol) || !agreesWithUsListing(asset, quote)) return null;
    return { name: asset.name, exchange: venue(asset.exchange) || venue(asset.mic) || venue(quote.exchange) || 'US', country: 'US' as const };
  }
  const catalog = await getBundledUsSymbolCatalog();
  const listing = catalog.bySymbol.get(key(asset.symbol));
  if (!listing || key(listing.symbol) !== key(asset.symbol) || listing.country !== 'US'
    || listing.currency !== 'USD' || !['stock', 'etf'].includes(listing.assetType || '')) return null;
  const providerSymbol = key(listing.providerSymbol || listing.symbol);
  if (key(quote.provenance.providerSymbol) !== providerSymbol
    || asset.providerSymbol && key(asset.providerSymbol) !== providerSymbol) return null;
  const exchange = venue(listing.exchange);
  if (!exchange || !agreesWithUsListing(asset, quote, exchange)) return null;
  return { name: listing.name?.trim() || asset.symbol, exchange, country: 'US' as const };
}

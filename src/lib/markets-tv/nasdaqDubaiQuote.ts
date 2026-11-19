import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { TvQuote } from './types';

// Exact Nasdaq Dubai listings. Identical tickers on US/other venues are not substitutes.
export const TV_NASDAQ_DUBAI_LISTINGS = [
  { symbol: 'DEPA', ticker: 'DEPA', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'AED', country: 'AE', isin: 'AEDFXA0NFP81', type: 'stock' },
  { symbol: 'DEPACLA', ticker: 'DEPACLA', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'AED', country: 'AE', isin: 'AEDFXA20E018', type: 'stock' },
  { symbol: 'ENBDREIT', ticker: 'ENBDREIT', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'USD', country: 'AE', isin: 'AEDFXA1CN004', type: 'stock' },
  { symbol: 'REIT', ticker: 'REIT', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'USD', country: 'AE', isin: 'AEDFXA1XE5D7', type: 'stock' },
  { symbol: 'HIK', ticker: 'HIK', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'USD', country: 'AE', isin: 'US4312882081', type: 'dr' },
  { symbol: 'NDAQ', ticker: 'NDAQ', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'USD', country: 'AE', isin: 'US6311031081', type: 'stock' },
  { symbol: 'ABTC', ticker: 'ABTC', exchange: 'NASDAQDUBAI', mic: 'DIFX', region: 'NASDAQ_DUBAI', currency: 'USD', country: 'AE', isin: 'CH0454664001', type: 'fund' },
] as const;
export const TV_NASDAQ_DUBAI_COLUMNS = ['name', 'description', 'exchange', 'type', 'currency', 'close', 'change', 'update_time', 'isin', 'update_mode', 'current_session'];

export function tvNasdaqDubaiIdentity(asset: TvAsset) {
  if (asset.assetType && asset.assetType !== 'stock') return null;
  if (asset.region !== 'NASDAQ_DUBAI' && asset.mic !== 'DIFX') return null;
  if (asset.region && asset.region !== 'NASDAQ_DUBAI' || asset.mic && asset.mic !== 'DIFX'
    || asset.exchange && !['NASDAQ_DUBAI', 'NASDAQDUBAI', 'DIFX'].includes(asset.exchange)
    || asset.country && asset.country !== 'AE') return null;
  return TV_NASDAQ_DUBAI_LISTINGS.find(listing => asset.symbol === listing.symbol
    && asset.currency === listing.currency && (!asset.providerSymbol || asset.providerSymbol === listing.ticker)) || null;
}

/** Verify price identity without turning a scanner refresh into a trade clock. */
export function verifiedTvNasdaqDubaiQuote(asset: TvAsset, payload: unknown, receivedAt: string, now = Date.now()): TvQuote | null {
  const listing = tvNasdaqDubaiIdentity(asset);
  if (!listing || !Number.isFinite(now) || !Number.isFinite(Date.parse(receivedAt))
    || Date.parse(receivedAt) > now + 60_000
    || !payload || typeof payload !== 'object' || !('data' in payload) || !Array.isArray(payload.data)) return null;
  const rows = payload.data.filter((row: unknown) => row && typeof row === 'object'
    && 's' in row && row.s === `${listing.exchange}:${listing.ticker}`);
  if (rows.length !== 1 || !Array.isArray(rows[0].d) || rows[0].d.length !== TV_NASDAQ_DUBAI_COLUMNS.length) return null;
  const [ticker, , exchange, type, currency, price, , timestamp, isin] = rows[0].d as unknown[];
  if (ticker !== listing.ticker || exchange !== listing.exchange || type !== listing.type
    || currency !== listing.currency || isin !== listing.isin) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0
    || typeof timestamp !== 'number' || !Number.isSafeInteger(timestamp)) return null;
  const feedUpdatedAt = timestamp * 1000;
  if (!Number.isFinite(feedUpdatedAt) || feedUpdatedAt > now + 60_000 || now - feedUpdatedAt > 7 * 86_400_000) return null;
  // update_time only bounds the age of this provider response. It does not prove
  // when an illiquid security last traded, nor the period of its reported change.
  return {
    symbol: asset.symbol, displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price, currency: listing.currency, changePercent: null,
    source: 'TradingView', observedAt: null, receivedAt,
    exchange: asset.exchange || listing.region, country: listing.country,
    observation: { precision: 'unknown', marketOpen: null }, delayType: null, status: 'unknown_time',
  };
}

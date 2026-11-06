import type { YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { TvQuote } from './types';
import { quoteStatus } from './quotes';

/** These are listing identities, not interchangeable company-name aliases. */
export function tvRegionalIdentity(asset: TvAsset) {
  const symbol = asset.symbol.toUpperCase();
  const listing = asset.mic || asset.region || asset.exchange;
  if (/^[A-Z0-9][A-Z0-9.-]*\.KW$/.test(symbol) && ['XKUW', 'BOURSA_KUWAIT', 'TD_XKUW'].includes(listing || '')) {
    return { symbol, exchange: 'KUW', currency: 'KWD', sourceCurrencies: ['KWF', 'KWD'] };
  }
  if (/^\d{4}\.SR$/.test(symbol) && ['XSAU', 'TADAWUL', 'TD_XSAU'].includes(listing || '')) {
    return { symbol, exchange: 'SAU', currency: 'SAR', sourceCurrencies: ['SAR'] };
  }
  if (/^[A-Z][A-Z0-9]{1,11}\.QA$/.test(symbol) && ['DSMD', 'QSE', 'TD_DSMD'].includes(listing || '')) {
    return { symbol, exchange: 'DOH', currency: 'QAR', sourceCurrencies: ['QAR'] };
  }
  if (/^[A-Z][A-Z0-9-]*\.(DU|AE)$/.test(symbol) && ['XDFM', 'DFM', 'TD_XDFM'].includes(listing || '')) {
    return { symbol: symbol.replace(/\.DU$/, '.AE'), exchange: 'DFM', currency: 'AED', sourceCurrencies: ['AED'] };
  }
  return null;
}

export function verifiedTvRegionalQuote(asset: TvAsset, data: YahooHistoryResult, now = Date.now()): TvQuote | null {
  const identity = tvRegionalIdentity(asset);
  if (!identity || !data.success || data.providerSymbol !== identity.symbol || asset.currency && asset.currency !== identity.currency) return null;
  const snapshot = data.quoteSnapshot;
  if (!snapshot || snapshot.symbol !== identity.symbol || snapshot.exchangeCode !== identity.exchange
    || snapshot.assetType !== 'EQUITY' || !snapshot.currency || !identity.sourceCurrencies.includes(snapshot.currency)) return null;
  const observed = Date.parse(snapshot.marketTime || '');
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > 7 * 86_400_000
    || snapshot.price === null || !Number.isFinite(snapshot.price) || snapshot.price <= 0) return null;
  // Yahoo's Kuwait feed explicitly denominates its values in KWF (fils).
  // Convert only that declared unit; a KWD response is already in dinars.
  const divisor = snapshot.currency === 'KWF' ? 1000 : 1;
  const previous = snapshot.previousClose;
  const changePercent = previous !== null && previous > 0 ? (snapshot.price - previous) / previous * 100 : null;
  const closed = snapshot.regularSession && now >= snapshot.regularSession.end && observed >= snapshot.regularSession.end;
  const quote: TvQuote = {
    symbol: asset.symbol, displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price: snapshot.price / divisor, currency: identity.currency,
    changePercent: changePercent !== null && Number.isFinite(changePercent) && Math.abs(changePercent) < 200 ? changePercent : null,
    source: 'Yahoo Finance', observedAt: snapshot.marketTime, receivedAt: data.retrievedAt || null,
    exchange: asset.exchange || asset.region || identity.exchange, country: asset.country || null,
    observation: { precision: 'instant', marketOpen: closed ? false : null },
    delayType: 'delayed', changeBasis: 'session', status: closed ? 'closed' : 'delayed',
  };
  return { ...quote, status: quoteStatus(quote, now) };
}

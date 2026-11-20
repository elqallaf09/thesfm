import type { YahooHistoryResult } from '@/lib/market/fetchYahooHistory';
import type { TvAsset } from '@/lib/server/markets-tv/catalog';
import type { TvQuote } from './types';
import { quoteStatus } from './quotes';
import { directoryYahooListing } from './directoryYahooListing';

const DAY_MS = 86_400_000;
// The official DFM bulletin of 19 Nov 2026 still lists these securities, with
// last trades on 6 Nov, 9 Nov and 7 May respectively:
// https://service.dfm.ae/Bulletins
// Retain their verified Yahoo trade clocks as old observations, never the
// current date of a carried daily bar or a scanner's feed update_time.
const DFM_LAST_KNOWN = new Set(['EIBANK.AE', 'IFA.AE', 'NAHO.AE']);
function canRetainDfmLastKnown(asset: TvAsset, symbol: string): boolean {
  if (!DFM_LAST_KNOWN.has(symbol) || asset.currency !== 'AED' || asset.country && asset.country !== 'AE') return false;
  if (asset.mic && asset.mic !== 'XDFM') return false;
  if ([asset.region, asset.exchange].some(value => value && !['DFM', 'XDFM', 'TD_XDFM'].includes(value))) return false;
  return !asset.providerSymbol || [asset.symbol, symbol, symbol.slice(0, -3)].includes(asset.providerSymbol);
}

/** These are listing identities, not interchangeable company-name aliases. */
export function tvRegionalIdentity(asset: TvAsset) {
  if (asset.assetType && asset.assetType !== 'stock') return null;
  const symbol = asset.symbol.toUpperCase();
  const listing = asset.mic || asset.region || asset.exchange;
  if (/^\d{6}\.SS$/.test(symbol) && ['XSHG', 'SSE', 'TD_XSHG'].includes(listing || '')) {
    return { symbol, exchange: 'SHH', currency: 'CNY', sourceCurrencies: ['CNY'] };
  }
  if (/^\d{6}\.SZ$/.test(symbol) && ['XSHE', 'SZSE', 'TD_XSHE'].includes(listing || '')) {
    return { symbol, exchange: 'SHZ', currency: 'CNY', sourceCurrencies: ['CNY'] };
  }
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
  return directoryYahooListing(asset);
}

export function verifiedTvRegionalQuote(asset: TvAsset, data: YahooHistoryResult, now = Date.now()): TvQuote | null {
  const identity = tvRegionalIdentity(asset);
  if (!identity || !data.success || data.providerSymbol !== identity.symbol || asset.currency && asset.currency !== identity.currency) return null;
  const snapshot = data.quoteSnapshot;
  if (!snapshot || snapshot.symbol !== identity.symbol || snapshot.exchangeCode !== identity.exchange
    || snapshot.assetType !== 'EQUITY' || !snapshot.currency || !identity.sourceCurrencies.includes(snapshot.currency)) return null;
  const observed = Date.parse(snapshot.marketTime || '');
  const retainKnown = identity.exchange === 'DFM' && canRetainDfmLastKnown(asset, identity.symbol);
  if (!Number.isFinite(observed) || observed > now + 60_000 || now - observed > (retainKnown ? 366 : 7) * DAY_MS
    || snapshot.price === null || !Number.isFinite(snapshot.price) || snapshot.price <= 0) return null;
  const retained = now - observed > 7 * DAY_MS;
  // Yahoo's Kuwait feed explicitly denominates its values in KWF (fils).
  // Convert only that declared unit; a KWD response is already in dinars.
  const kuwaitFils = identity.currency === 'KWD' && snapshot.currency === 'KWF';
  const londonPence = identity.exchange === 'LSE' && identity.currency === 'GBP' && ['GBp', 'GBX'].includes(snapshot.currency);
  const divisor = kuwaitFils ? 1000 : londonPence ? 100 : 1;
  const previous = snapshot.previousClose;
  const changePercent = previous !== null && previous > 0 ? (snapshot.price - previous) / previous * 100 : null;
  const closed = snapshot.regularSession && now >= snapshot.regularSession.end && observed >= snapshot.regularSession.end;
  const quote: TvQuote = {
    symbol: asset.symbol, displaySymbol: asset.displaySymbol, name: asset.name, nameAr: asset.nameAr || asset.name,
    price: snapshot.price / divisor, currency: identity.currency,
    changePercent: !retained && changePercent !== null && Number.isFinite(changePercent) && Math.abs(changePercent) < 200 ? changePercent : null,
    source: 'Yahoo Finance', observedAt: snapshot.marketTime, receivedAt: data.retrievedAt || null,
    exchange: asset.exchange || asset.region || identity.exchange, country: asset.country || null,
    observation: { precision: 'instant', marketOpen: closed ? false : null },
    delayType: 'delayed', changeBasis: retained ? 'reference' : 'session', status: retained ? 'stale' : closed ? 'closed' : 'delayed',
  };
  return { ...quote, status: quoteStatus(quote, now) };
}

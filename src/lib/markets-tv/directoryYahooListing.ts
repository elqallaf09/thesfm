import type { TvAsset } from '@/lib/server/markets-tv/catalog';

// Yahoo's exchange suffixes identify individual listings. The chart response
// must independently confirm its exchange code, instrument type and units.
// https://help.yahoo.com/kb/finance/SLN2310.html
const venues: Record<string, [suffix: string, exchange: string, country: string]> = {
  XETR: ['DE', 'GER', 'DE'], XFRA: ['F', 'FRA', 'DE'], XDUS: ['DU', 'DUS', 'DE'],
  XHAM: ['HM', 'HAM', 'DE'], XHAN: ['HA', 'HAN', 'DE'], XMUN: ['MU', 'MUN', 'DE'],
  XSTU: ['SG', 'STU', 'DE'], XWAR: ['WA', 'WSE', 'PL'], XLON: ['L', 'LSE', 'GB'],
  XNSE: ['NS', 'NSI', 'IN'], XTAI: ['TW', 'TAI', 'TW'], XJPX: ['T', 'JPX', 'JP'],
  XASX: ['AX', 'ASX', 'AU'], CXAC: ['XA', 'CXA', 'AU'],
};

export function directoryYahooListing(asset: TvAsset) {
  const mic = asset.region?.match(/^TD_([A-Z0-9]{4})$/)?.[1];
  if (!mic || !Object.hasOwn(venues, mic) || !asset.currency || asset.assetType && asset.assetType !== 'stock') return null;
  const [suffix, exchange, country] = venues[mic];
  if (asset.mic && asset.mic !== mic || asset.exchange && asset.exchange !== asset.region && asset.exchange !== mic
    || asset.country && asset.country !== country) return null;
  const local = asset.symbol.toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{0,31}$/.test(local) || asset.providerSymbol && asset.providerSymbol.toUpperCase() !== local) return null;
  const currency = asset.currency;
  // Keep London pounds and pence distinct even though both codes look like GBP.
  const sourceCurrencies = mic === 'XLON' && (currency === 'GBP' || currency === 'GBp')
    ? currency === 'GBP' ? ['GBP', 'GBp', 'GBX'] : ['GBp', 'GBX'] : [currency];
  return { symbol: `${local}.${suffix}`, exchange, currency, sourceCurrencies };
}

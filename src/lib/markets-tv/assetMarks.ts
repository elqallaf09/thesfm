/** These compact index identifiers stay readable without an image connection. */
export const tvIndexMarks = new Map([
  ['^GSPC', { label: 'S&P', number: '500', image: 's-and-p-500' }],
  ['^DJI', { label: 'DOW', number: '30', image: 'dow-30' }],
  ['^NDX', { label: 'NDX', number: '100', image: 'nasdaq-100' }],
  ['^FTSE', { label: 'FTSE', number: '100', image: 'ftse-100-index' }],
  ['^GDAXI', { label: 'DAX', number: '40', image: 'dax' }],
  ['^N225', { label: 'NIKKEI', number: '225', image: 'nikkei-225' }],
]);

// The directory supplies both local tickers and provider-qualified symbols.
const shanghaiLogos = new Map([
  ['600370', 'https://s3-symbol-logo.tradingview.com/jiangsu-sanfame-polyester-material-coltd--big.svg'],
  ['603359', 'https://s3-symbol-logo.tradingview.com/dongzhu-ecological-environment-prot--big.svg'],
  ['600053', 'https://www.jdcapital.com/website/images/logo.jpg'],
  ['603378', 'https://s3-symbol-logo.tradingview.com/asia-cuanon-technology--big.svg'],
]);

// TradingView's issuer artwork is identified by the exchange listing, never by a bare ticker.
const gulfLogos: Record<string, Record<string, string>> = {
  XKUW: { ACICO: 'acico-industries', AAYANRE: 'aayan-real-estate-co-kscp', ALFTAQA: 'action-energy-company-kscc', ATC: 'advanced-technology' },
  XDFM: { AIRARABIA: 'air-arabia', AJMANBANK: 'ajman-bank', ALANSARI: 'al-ansari-financia', ALFIRDOUS: 'al-firdous-holding' },
  DIFX: { DEPA: 'depa-plc', DEPACLA: 'depa-plc', REIT: 'emirates-reit-ceic-plc', ENBDREIT: 'enbd-reit-ceic-plc' },
};
const gulfVenues = new Map([
  ['BOURSA_KUWAIT', 'XKUW'], ['KSE', 'XKUW'], ['KUW', 'XKUW'], ['XKUW', 'XKUW'], ['TD_XKUW', 'XKUW'],
  ['DFM', 'XDFM'], ['XDFM', 'XDFM'], ['TD_XDFM', 'XDFM'],
  ['NASDAQ_DUBAI', 'DIFX'], ['NASDAQDUBAI', 'DIFX'], ['DIFX', 'DIFX'],
]);
const shanghai = new Set(['SSE', 'XSHG', 'TD_XSHG', 'SHH']);
const india = new Set(['NSE', 'XNSE', 'TD_XNSE', 'NSI']);
const us = new Set(['US', 'BATS', 'BZX', 'CBOE', 'CBOE BZX', 'BTS', 'CBOE BZX EXCHANGE', 'BATS GLOBAL MARKETS']);

/** Preserve the venue on numeric and international tickers, including bare directory rows. */
export function tvListingMark(symbol: string, exchange: string | null) {
  const venue = exchange?.toUpperCase() ?? '';
  const ticker = symbol.toUpperCase();
  const gulf = gulfVenues.get(venue);
  if (gulf) {
    const local = gulf === 'XKUW' ? ticker.replace(/\.KW$/, '') : gulf === 'XDFM' ? ticker.replace(/\.AE$/, '') : ticker;
    const slug = Object.hasOwn(gulfLogos[gulf], local) ? gulfLogos[gulf][local] : undefined;
    if (slug) return { file: null, urls: [`https://s3-symbol-logo.tradingview.com/${slug}--big.svg`] };
    // An unqualified cross-market request can show a different issuer (e.g. REIT).
    if (gulf === 'DIFX') return { file: null, urls: [] };
  }
  let qualified: string;
  let issuerLogo: string | undefined;
  if (shanghai.has(venue) && /^\d{6}(?:\.SS)?$/.test(ticker)) {
    const local = ticker.replace(/\.SS$/, '');
    qualified = local + '.SS';
    issuerLogo = shanghaiLogos.get(local);
  } else if (india.has(venue) && /^[A-Z0-9&-]+(?:\.NS)?$/.test(ticker)) {
    const local = ticker.replace(/\.NS$/, '');
    qualified = local + '.NS';
    if (local === 'GANESHHOU') return { file: 'ganeshhousing.svg', urls: [] };
  } else if (ticker === 'SVIX' && us.has(venue)) {
    return { file: 'svix.png', urls: [] };
  } else {
    return null;
  }
  const logo = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(qualified)}.png`;
  return { file: null, urls: issuerLogo ? [issuerLogo, logo] : [logo] };
}

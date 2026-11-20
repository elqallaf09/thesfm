import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import type { TvGroup } from './types';
const strips: Record<Exclude<TvGroup, 'world' | 'europe' | 'watchlist'>, string[]> = {
  global: ['global_indices'], us: ['us_nasdaq', 'us_nyse'],
  gulf: ['kuwait_boursa', 'saudi_tadawul', 'uae_dfm', 'uae_adx', 'qatar_qse', 'bahrain_bourse', 'oman_msx'],
  asia: ['japan_tse', 'china_sse', 'china_szse', 'hongkong_hkex', 'india_nse', 'southkorea_krx'],
  crypto: ['crypto'], forex: ['forex'], commodities: ['commodities'],
};
export function tvAssets(group: TvGroup) {
  if (group === 'watchlist' || group === 'world') return [];
  if (group === 'europe') return ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L', 'NOVO-B.CO', 'AZN.L', 'HSBA.L', 'SIE.DE', 'AIR.PA', 'SAN.MC', 'ENEL.MI']
    .map(symbol => ({ symbol, name: symbol, nameAr: symbol }));
  const selected = strips[group];
  return GLOBAL_MARKET_STRIPS.filter(strip => selected.includes(strip.id))
    .flatMap(strip => strip.items.slice(0, selected.length > 2 ? 2 : 12)).slice(0, 24);
}

/** More indices for the TV only; each one has a verified external identity in indexChart. */
const TV_EXTRA_INDICES = [
  { symbol: '^FCHI', name: 'CAC 40', nameAr: 'كاك 40' },
  { symbol: '^STOXX50E', name: 'Euro Stoxx 50', nameAr: 'يورو ستوكس 50' },
  { symbol: '^IBEX', name: 'IBEX 35', nameAr: 'إيبكس 35' },
  { symbol: 'FTSEMIB.MI', name: 'FTSE MIB', nameAr: 'فوتسي إم آي بي' },
  { symbol: '^AEX', name: 'AEX', nameAr: 'إيه إي إكس' },
  { symbol: '^SSMI', name: 'SMI', nameAr: 'إس إم آي' },
  { symbol: '^RUT', name: 'Russell 2000', nameAr: 'راسل 2000' },
  { symbol: '^GSPTSE', name: 'S&P/TSX', nameAr: 'إس آند بي/تي إس إكس' },
  { symbol: '^HSI', name: 'Hang Seng', nameAr: 'هانغ سنغ' },
  { symbol: '000001.SS', name: 'SSE Composite', nameAr: 'شنغهاي المركب' },
  { symbol: '^KS11', name: 'KOSPI', nameAr: 'كوسبي' },
  { symbol: '^TWII', name: 'TAIEX', nameAr: 'تايكس' },
  { symbol: '^BSESN', name: 'Sensex', nameAr: 'سنسكس' },
  { symbol: '^NSEI', name: 'Nifty 50', nameAr: 'نيفتي 50' },
  { symbol: '^AXJO', name: 'ASX 200', nameAr: 'إيه إس إكس 200' },
  { symbol: '^STI', name: 'Straits Times', nameAr: 'ستريتس تايمز' },
  { symbol: '^TASI.SR', name: 'TASI', nameAr: 'تاسي' },
];
/** Indices added for the TV ask Yahoo first: they have no verified Twelve Data
 * identity, so the primary chain would only spend shared credits on them. */
export function isTvExtraIndex(symbol: string) {
  return TV_EXTRA_INDICES.some(index => index.symbol === symbol);
}
/** Configured instrument feeds; complete equity directories are loaded on the server. */
export function tvAssetsAll(group: TvGroup) {
  if (group === 'watchlist' || group === 'world') return [];
  if (group === 'europe') return ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L', 'NOVO-B.CO', 'AZN.L', 'HSBA.L', 'SIE.DE', 'AIR.PA', 'SAN.MC', 'ENEL.MI']
    .map(symbol => ({ symbol, name: symbol, nameAr: symbol }));
  const selected = strips[group];
  const items = GLOBAL_MARKET_STRIPS.filter(strip => selected.includes(strip.id)).flatMap(strip => strip.items);
  return group === 'global' ? [...items, ...TV_EXTRA_INDICES] : items;
}
export const TV_MAP_POINTS = [
  { group: 'us', x: 20, y: 34, label: 'New York', zone: 'America/New_York' },
  { group: 'europe', x: 48, y: 25, label: 'London', zone: 'Europe/London' },
  { group: 'gulf', x: 60, y: 44, label: 'Kuwait', zone: 'Asia/Kuwait' },
  { group: 'asia', x: 84, y: 39, label: 'Tokyo', zone: 'Asia/Tokyo' },
] as const;

import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import type { TvGroup } from './types';
const strips: Record<Exclude<TvGroup, 'europe' | 'watchlist'>, string[]> = {
  global: ['global_indices'], us: ['us_nasdaq', 'us_nyse'],
  gulf: ['kuwait_boursa', 'saudi_tadawul', 'uae_dfm', 'uae_adx', 'qatar_qse', 'bahrain_bourse', 'oman_msx'],
  asia: ['japan_tse', 'china_sse', 'china_szse', 'hongkong_hkex', 'india_nse', 'southkorea_krx'],
  crypto: ['crypto'], forex: ['forex'], commodities: ['commodities'],
};
export function tvAssets(group: TvGroup) {
  if (group === 'watchlist') return [];
  if (group === 'europe') return ['ASML.AS', 'SAP.DE', 'NESN.SW', 'MC.PA', 'SHEL.L', 'NOVO-B.CO', 'AZN.L', 'HSBA.L', 'SIE.DE', 'AIR.PA', 'SAN.MC', 'ENEL.MI']
    .map(symbol => ({ symbol, name: symbol, nameAr: symbol }));
  const selected = strips[group];
  return GLOBAL_MARKET_STRIPS.filter(strip => selected.includes(strip.id))
    .flatMap(strip => strip.items.slice(0, selected.length > 2 ? 2 : 12)).slice(0, 24);
}
export const TV_MAP_POINTS = [
  { group: 'us', x: 20, y: 34, label: 'New York', zone: 'America/New_York' },
  { group: 'europe', x: 48, y: 25, label: 'London', zone: 'Europe/London' },
  { group: 'gulf', x: 60, y: 44, label: 'Kuwait', zone: 'Asia/Kuwait' },
  { group: 'asia', x: 84, y: 39, label: 'Tokyo', zone: 'Asia/Tokyo' },
] as const;

import 'server-only';
import { GLOBAL_MARKET_STRIPS, inferStripCurrency } from '@/lib/market/globalMarketStrips';
import type { TvGroup, TvScene } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';

/** Reuse configured identities, never prices. Viewing mode does not download
 * the worldwide directory or select arbitrary alphabetical listings. */
const LISTINGS: Record<string, { region: string; mic?: string }> = {
  kuwait_boursa: { region: 'BOURSA_KUWAIT', mic: 'XKUW' },
  saudi_tadawul: { region: 'TADAWUL', mic: 'XSAU' },
  uae_dfm: { region: 'DFM', mic: 'XDFM' },
  uae_adx: { region: 'ADX', mic: 'XADS' },
  qatar_qse: { region: 'QSE', mic: 'DSMD' },
  bahrain_bourse: { region: 'BAHRAIN_BOURSE', mic: 'XBAH' },
  oman_msx: { region: 'MUSCAT', mic: 'XMUS' },
  us_nasdaq: { region: 'US' }, us_nyse: { region: 'US' },
  japan_tse: { region: 'TD_XTKS', mic: 'XTKS' },
  hongkong_hkex: { region: 'TD_XHKG', mic: 'XHKG' },
};
function configured(id: string, count: number): TvAsset[] {
  const strip = GLOBAL_MARKET_STRIPS.find(item => item.id === id);
  if (!strip) return [];
  const listing = LISTINGS[id];
  return strip.items.slice(0, count).map(item => ({ ...item, ...listing,
    exchange: strip.exchangeCode || listing?.region, country: strip.countryCode,
    currency: inferStripCurrency(item.symbol), assetType: strip.kind === 'equity' ? 'stock' : strip.kind,
    ...(listing?.mic ? { providerSymbol: item.symbol.replace(/\.[A-Z]{1,2}$/, '') } : {}),
  }));
}

const EUROPE: TvAsset[] = [
  { symbol: 'ASML.AS', name: 'ASML', nameAr: 'إيه إس إم إل', region: 'TD_XAMS', mic: 'XAMS', providerSymbol: 'ASML', currency: 'EUR', country: 'NL', assetType: 'stock' },
  { symbol: 'SAP.DE', name: 'SAP', nameAr: 'إس إيه بي', region: 'TD_XETR', mic: 'XETR', providerSymbol: 'SAP', currency: 'EUR', country: 'DE', assetType: 'stock' },
  { symbol: 'NESN.SW', name: 'Nestlé', nameAr: 'نستله', region: 'TD_XSWX', mic: 'XSWX', providerSymbol: 'NESN', currency: 'CHF', country: 'CH', assetType: 'stock' },
];
const CRYPTO = ['BTC', 'ETH', 'SOL'].map(base => ({ symbol: `${base}/USDT`, name: `${base}/USDT`,
  region: 'BINANCE', currency: 'USDT', baseCurrency: base, providerSymbol: `${base}USDT`, assetType: 'crypto' as const }));
const FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY'].map(symbol => ({ symbol, name: symbol,
  region: 'FOREX', currency: symbol.split('/')[1], baseCurrency: symbol.split('/')[0], assetType: 'forex' as const }));

export const TV_SCENE_GROUP: Record<TvScene, TvGroup> = {
  overview: 'global', gulf: 'gulf', world: 'world', assets: 'commodities', watchlist: 'watchlist',
};
export function tvSceneAssets(scene: TvScene, ownedSymbols: string[] = []): { summary: TvAsset[]; rows: TvAsset[] } {
  if (scene === 'watchlist') {
    const selected = [...new Set(ownedSymbols)].slice(0, 10).map(symbol => ({ symbol, name: symbol }));
    return { summary: selected.slice(0, 4), rows: selected.slice(4) };
  }
  if (scene === 'gulf') return { summary: configured('kuwait_boursa', 4),
    rows: ['saudi_tadawul', 'uae_dfm', 'uae_adx', 'qatar_qse', 'bahrain_bourse', 'oman_msx'].flatMap(id => configured(id, 1)) };
  if (scene === 'world') return { summary: configured('global_indices', 6).filter(item => ['^GSPC', '^FTSE', '^GDAXI', '^N225'].includes(item.symbol)),
    rows: [...EUROPE, ...configured('japan_tse', 2), ...configured('hongkong_hkex', 1)] };
  if (scene === 'assets') return { summary: configured('commodities', 4), rows: [...CRYPTO, ...FOREX] };
  return { summary: [...configured('global_indices', 3), CRYPTO[0]], rows: configured('us_nasdaq', 6) };
}

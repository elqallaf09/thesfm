import { TV_COMMODITIES } from '@/lib/markets-tv/commodityQuote';
import 'server-only';
import { GLOBAL_MARKET_STRIPS, inferStripCurrency } from '@/lib/market/globalMarketStrips';
import type { TvGroup, TvScene } from '@/lib/markets-tv/types';
import type { TvAsset } from './catalog';
import { tvWatchlistAssets } from './watchlistAssets';

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
/** More listings for the TV only, each checked on Yahoo (symbol, exchange,
 * currency and name) on 20 Nov 2026. Shared site strips stay unchanged. */
const TV_EXTRA_ITEMS: Record<string, { symbol: string; name: string; nameAr: string }[]> = {
  saudi_tadawul: [
    { symbol: '2280.SR', name: 'Almarai', nameAr: 'المراعي' },
    { symbol: '1150.SR', name: 'Alinma Bank', nameAr: 'مصرف الإنماء' },
    { symbol: '1010.SR', name: 'Riyad Bank', nameAr: 'بنك الرياض' },
    { symbol: '1060.SR', name: 'Saudi Awwal Bank', nameAr: 'البنك السعودي الأول' },
    { symbol: '1140.SR', name: 'Bank Albilad', nameAr: 'بنك البلاد' },
    { symbol: '2082.SR', name: 'ACWA Power', nameAr: 'أكوا باور' },
    { symbol: '2020.SR', name: 'SABIC Agri-Nutrients', nameAr: 'سابك للمغذيات الزراعية' },
    { symbol: '5110.SR', name: 'Saudi Electricity', nameAr: 'الكهرباء السعودية' },
    { symbol: '4013.SR', name: 'Dr. Sulaiman Al Habib', nameAr: 'د. سليمان الحبيب' },
    { symbol: '2050.SR', name: 'Savola Group', nameAr: 'مجموعة صافولا' },
    { symbol: '4190.SR', name: 'Jarir', nameAr: 'جرير' },
    { symbol: '7020.SR', name: 'Mobily', nameAr: 'موبايلي' },
    { symbol: '1050.SR', name: 'Banque Saudi Fransi', nameAr: 'البنك السعودي الفرنسي' },
    { symbol: '8010.SR', name: 'Tawuniya', nameAr: 'التعاونية' },
    { symbol: '2310.SR', name: 'Sipchem', nameAr: 'سبكيم' },
    { symbol: '4280.SR', name: 'Kingdom Holding', nameAr: 'المملكة القابضة' },
  ],
  qatar_qse: [
    { symbol: 'MARK.QA', name: 'Al Rayan Bank', nameAr: 'مصرف الريان' },
    { symbol: 'CBQK.QA', name: 'Commercial Bank', nameAr: 'البنك التجاري' },
    { symbol: 'DHBK.QA', name: 'Doha Bank', nameAr: 'بنك الدوحة' },
    { symbol: 'QGTS.QA', name: 'Nakilat', nameAr: 'ناقلات' },
    { symbol: 'MPHC.QA', name: 'Mesaieed Petrochemical', nameAr: 'مسيعيد للبتروكيماويات' },
    { symbol: 'QEWS.QA', name: 'Nebras Energy', nameAr: 'نبراس للطاقة' },
    { symbol: 'ERES.QA', name: 'Ezdan Holding', nameAr: 'إزدان القابضة' },
    { symbol: 'BRES.QA', name: 'Barwa Real Estate', nameAr: 'بروة العقارية' },
    { symbol: 'QIIK.QA', name: 'Qatar International Islamic Bank', nameAr: 'بنك قطر الدولي الإسلامي' },
    { symbol: 'QNNS.QA', name: 'Milaha', nameAr: 'الملاحة' },
    { symbol: 'QAMC.QA', name: 'Qatar Aluminium', nameAr: 'قطر لصناعة الألمنيوم' },
    { symbol: 'UDCD.QA', name: 'United Development', nameAr: 'المتحدة للتنمية' },
    { symbol: 'VFQS.QA', name: 'Vodafone Qatar', nameAr: 'فودافون قطر' },
    { symbol: 'GISS.QA', name: 'Gulf International Services', nameAr: 'الخليج الدولية للخدمات' },
  ],
};
function configured(id: string, count: number): TvAsset[] {
  const strip = GLOBAL_MARKET_STRIPS.find(item => item.id === id);
  if (!strip) return [];
  const listing = LISTINGS[id];
  return [...strip.items, ...(TV_EXTRA_ITEMS[id] ?? [])].slice(0, count).map(item => ({ ...item, ...listing,
    exchange: strip.exchangeCode || listing?.region, country: strip.countryCode,
    currency: inferStripCurrency(item.symbol), assetType: strip.kind === 'equity' ? 'stock' : strip.kind,
    ...(listing?.mic ? { providerSymbol: item.symbol.replace(/\.[A-Z]{1,2}$/, '') } : {}),
  }));
}

const EUROPE: TvAsset[] = [
  { symbol: 'ASML.AS', name: 'ASML', nameAr: 'إيه إس إم إل', region: 'TD_XAMS', mic: 'XAMS', providerSymbol: 'ASML', currency: 'EUR', country: 'NL', assetType: 'stock' },
  { symbol: 'SAP.DE', name: 'SAP', nameAr: 'إس إيه بي', region: 'TD_XETR', mic: 'XETR', providerSymbol: 'SAP', currency: 'EUR', country: 'DE', assetType: 'stock' },
  { symbol: 'NESN.SW', name: 'Nestlé', nameAr: 'نستله', region: 'TD_XSWX', mic: 'XSWX', providerSymbol: 'NESN', currency: 'CHF', country: 'CH', assetType: 'stock' },
  { symbol: 'MC.PA', name: 'LVMH', nameAr: 'إل في إم إتش', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'MC', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'TTE.PA', name: 'TotalEnergies', nameAr: 'توتال إنرجيز', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'TTE', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'OR.PA', name: "L'Oréal", nameAr: 'لوريال', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'OR', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'AIR.PA', name: 'Airbus', nameAr: 'إيرباص', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'AIR', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'SAN.PA', name: 'Sanofi', nameAr: 'سانوفي', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'SAN', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'BNP.PA', name: 'BNP Paribas', nameAr: 'بي إن بي باريبا', region: 'TD_XPAR', mic: 'XPAR', providerSymbol: 'BNP', currency: 'EUR', country: 'FR', assetType: 'stock' },
  { symbol: 'INGA.AS', name: 'ING Group', nameAr: 'مجموعة آي إن جي', region: 'TD_XAMS', mic: 'XAMS', providerSymbol: 'INGA', currency: 'EUR', country: 'NL', assetType: 'stock' },
  { symbol: 'SIE.DE', name: 'Siemens', nameAr: 'سيمنس', region: 'TD_XETR', mic: 'XETR', providerSymbol: 'SIE', currency: 'EUR', country: 'DE', assetType: 'stock' },
  { symbol: 'ALV.DE', name: 'Allianz', nameAr: 'أليانز', region: 'TD_XETR', mic: 'XETR', providerSymbol: 'ALV', currency: 'EUR', country: 'DE', assetType: 'stock' },
  { symbol: 'DTE.DE', name: 'Deutsche Telekom', nameAr: 'دويتشه تليكوم', region: 'TD_XETR', mic: 'XETR', providerSymbol: 'DTE', currency: 'EUR', country: 'DE', assetType: 'stock' },
  { symbol: 'SAN.MC', name: 'Banco Santander', nameAr: 'بنك سانتاندير', region: 'TD_XMAD', mic: 'XMAD', providerSymbol: 'SAN', currency: 'EUR', country: 'ES', assetType: 'stock' },
  { symbol: 'ITX.MC', name: 'Inditex', nameAr: 'إنديتكس', region: 'TD_XMAD', mic: 'XMAD', providerSymbol: 'ITX', currency: 'EUR', country: 'ES', assetType: 'stock' },
  { symbol: 'ENEL.MI', name: 'Enel', nameAr: 'إينل', region: 'TD_XMIL', mic: 'XMIL', providerSymbol: 'ENEL', currency: 'EUR', country: 'IT', assetType: 'stock' },
  { symbol: 'ISP.MI', name: 'Intesa Sanpaolo', nameAr: 'إنتيسا سان باولو', region: 'TD_XMIL', mic: 'XMIL', providerSymbol: 'ISP', currency: 'EUR', country: 'IT', assetType: 'stock' },
  { symbol: 'NOVO-B.CO', name: 'Novo Nordisk', nameAr: 'نوفو نورديسك', region: 'TD_XCSE', mic: 'XCSE', providerSymbol: 'NOVO_B', currency: 'DKK', country: 'DK', assetType: 'stock' },
  { symbol: 'NOVN.SW', name: 'Novartis', nameAr: 'نوفارتيس', region: 'TD_XSWX', mic: 'XSWX', providerSymbol: 'NOVN', currency: 'CHF', country: 'CH', assetType: 'stock' },
  { symbol: 'UBSG.SW', name: 'UBS Group', nameAr: 'مجموعة يو بي إس', region: 'TD_XSWX', mic: 'XSWX', providerSymbol: 'UBSG', currency: 'CHF', country: 'CH', assetType: 'stock' },
];
/** A labelled configured sample when an exchange directory is unavailable.
 * Reuse the exact qualified listings used by the scenes; never guess symbols. */
export function tvConfiguredMarketAssets(market: string): TvAsset[] {
  if (market === 'europe') return EUROPE;
  const ids: Record<string,string> = { BOURSA_KUWAIT:'kuwait_boursa', TADAWUL:'saudi_tadawul', TD_XSAU:'saudi_tadawul',
    DFM:'uae_dfm', ADX:'uae_adx', TD_XADS:'uae_adx', QSE:'qatar_qse', TD_DSMD:'qatar_qse',
    BAHRAIN_BOURSE:'bahrain_bourse', TD_XBAH:'bahrain_bourse', MUSCAT:'oman_msx', TD_XMUS:'oman_msx' };
  return ids[market] ? configured(ids[market], 40) : [];
}
const CRYPTO = ['BTC', 'ETH', 'SOL'].map(base => ({ symbol: `${base}/USDT`, name: `${base}/USDT`,
  region: 'BINANCE', currency: 'USDT', baseCurrency: base, providerSymbol: `${base}USDT`, assetType: 'crypto' as const }));
const FOREX = ['EUR/USD', 'GBP/USD', 'USD/JPY'].map(symbol => ({ symbol, name: symbol,
  region: 'FOREX', currency: symbol.split('/')[1], baseCurrency: symbol.split('/')[0], assetType: 'forex' as const }));

export const TV_SCENE_GROUP: Record<TvScene, TvGroup> = {
  overview: 'global', gulf: 'gulf', world: 'world', assets: 'commodities', watchlist: 'watchlist',
};
export function tvSceneAssets(scene: TvScene, ownedSymbols: string[] = []): { summary: TvAsset[]; rows: TvAsset[] } {
  if (scene === 'watchlist') {
    const selected = tvWatchlistAssets(ownedSymbols).slice(0, 10);
    return { summary: selected.slice(0, 4), rows: selected.slice(4) };
  }
  if (scene === 'gulf') return { summary: configured('kuwait_boursa', 4),
    rows: ['saudi_tadawul', 'uae_dfm', 'uae_adx', 'qatar_qse', 'bahrain_bourse', 'oman_msx'].flatMap(id => configured(id, 1)) };
  if (scene === 'world') return { summary: configured('global_indices', 6).filter(item => ['^GSPC', '^FTSE', '^GDAXI', '^N225'].includes(item.symbol)),
    // The broadcast scene keeps its fixed layout; the Europe market lists every listing.
    rows: [...EUROPE.slice(0, 3), ...configured('japan_tse', 2), ...configured('hongkong_hkex', 1)] };
  if (scene === 'assets') return { summary: TV_COMMODITIES.slice(0, 4).map(item=>({...item,assetType:'commodity' as const,country:'US'})), rows: [...CRYPTO, ...FOREX] };
  return { summary: configured('global_indices', 6), rows: [] };
}

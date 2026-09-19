import 'server-only';
import { searchWorldStocks } from '@/lib/world-stocks/search';
import { tvAssetsAll } from '@/lib/markets-tv/catalog';
import { TV_GROUPS, type TvGroup, type TvMarket } from '@/lib/markets-tv/types';
import { MARKET_EXCHANGE_OPTIONS } from '@/lib/market/marketExchangeOptions';
import { tvText } from '@/lib/markets-tv/i18n';
import type { WorldStock } from '@/lib/world-stocks/types';
export type TvAsset = { symbol: string; name: string; nameAr?: string; region?: string; currency?: string | null; country?: string | null };
const GULF = new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM']);
const EUROPE = new Set(['GB','DE','FR','CH','NL','BE','ES','IT','PT','AT','DK','SE','NO','FI','IE','PL','GR','TR','CZ','HU','RO']);
const ASIA = new Set(['CN','JP','HK','KR','IN','TW','SG','TH','MY','ID','PH','VN','PK','BD']);
export function tvCountryGroup(country: string | null): TvGroup {
  return country === 'US' ? 'us' : GULF.has(country || '') ? 'gulf' : EUROPE.has(country || '') ? 'europe' : ASIA.has(country || '') ? 'asia' : 'world';
}
let pending: Promise<Awaited<ReturnType<typeof searchWorldStocks>>> | null = null, expires = 0;
async function universe() {
  if (!pending || expires < Date.now()) {
    expires = Date.now() + 300000;
    pending = searchWorldStocks({ query: '', region: null, assetType: null, page: 1, pageSize: 1_000_000, locale: 'en' }).catch(error => { pending = null; throw error; });
  }
  return pending;
}
function stockAsset(stock: WorldStock): TvAsset {
  return { symbol: stock.providerSymbol, name: stock.displayName, region: stock.region, currency: stock.currency, country: stock.countryCode };
}
export async function tvDirectoryAssets(group: TvGroup, market?: string): Promise<TvAsset[]> {
  if (['global','crypto','forex','commodities'].includes(group)) return tvAssetsAll(group);
  const data = await universe();
  const rows = data.results.filter(stock => (!market || stock.region === market) && (group === 'world' || tvCountryGroup(stock.countryCode) === group));
  return rows.map(stockAsset);
}
export async function tvMarkets(): Promise<TvMarket[]> {
  const data = await universe();
  const counts = new Map<string, number>();
  for (const row of data.results) counts.set(row.region, (counts.get(row.region) || 0) + 1);
  const markets: TvMarket[] = data.markets.map(m => ({ id: m.id, group: tvCountryGroup(m.countryCode), labelAr: m.labelAr, labelEn: m.labelEn, labelFr: m.labelFr, count: counts.get(m.id) || 0, status: m.status }));
  const connected = new Set(markets.map(m => m.id));
  const aliases: Record<string, string> = { TADAWUL: 'TD_XSAU', ADX: 'TD_XADS', QSE: 'TD_DSMD', BAHRAIN_BOURSE: 'TD_XBAH', MUSCAT: 'TD_XMUS' };
  for (const option of MARKET_EXCHANGE_OPTIONS.filter(m => m.coverage === 'requires_sync')) {
    if (!connected.has(aliases[option.id])) markets.push({ id: option.id, group: 'gulf', labelAr: option.labelAr, labelEn: option.labelEn, labelFr: option.labelEn, count: 0, status: 'unavailable' });
  }
  if (!markets.some(m => m.group === 'europe')) markets.push({ id: 'europe', group: 'europe', labelAr: tvText('ar','europe'), labelEn: tvText('en','europe'), labelFr: tvText('fr','europe'), count: 0, status: 'unavailable' });
  for (const group of TV_GROUPS.filter(g => ['global','crypto','forex','commodities'].includes(g))) markets.push({ id: group, group, labelAr: tvText('ar', group), labelEn: tvText('en', group), labelFr: tvText('fr', group), count: tvAssetsAll(group).length, status: 'selected' });
  return markets;
}

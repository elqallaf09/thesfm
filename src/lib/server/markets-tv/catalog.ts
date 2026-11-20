import 'server-only';
import { searchWorldStocks, type WorldStockSearchResult } from '@/lib/world-stocks/search';
import { providerDirectoryRevision } from '@/lib/world-stocks/providerDirectory';
import { tvAssetsAll } from '@/lib/markets-tv/catalog';
import { TV_GROUPS, type TvGroup, type TvMarket } from '@/lib/markets-tv/types';
import { MARKET_EXCHANGE_OPTIONS } from '@/lib/market/marketExchangeOptions';
import { tvText } from '@/lib/markets-tv/i18n';
import { TV_COMMODITIES } from '@/lib/markets-tv/commodityQuote';
import type { WorldStock } from '@/lib/world-stocks/types';
import { isSupportedWorldStockRegion } from '@/lib/world-stocks/regions';
import { tvInstrumentAssets } from './instruments';
import { tvStockAssets } from './stockDirectory';
import { localizeTvAsset } from './names';
import { tvConfiguredMarketAssets } from './sceneCatalog';
import type { TvDirectoryCoverage } from '@/lib/markets-tv/selections';
import { TV_WORLD_SESSIONS } from '@/lib/markets-tv/worldSessions';
export type TvAsset = { symbol: string; displaySymbol?: string; name: string; nameAr?: string; region?: string; exchange?: string; currency?: string | null; country?: string | null; mic?: string; providerSymbol?: string; baseCurrency?: string; assetType?: 'stock' | 'index' | 'commodity' | 'crypto' | 'forex' };
export type TvDirectory = { assets: TvAsset[]; coverage: TvDirectoryCoverage; asOf: string | null; retryAfterMs?: number };
const GULF = new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM']);
const EUROPE = new Set(['GB','DE','FR','CH','NL','BE','ES','IT','PT','AT','DK','SE','NO','FI','IE','PL','GR','TR','CZ','HU','RO','EE','LV','LT','IS','RU',
  'AL','AD','BY','BA','BG','HR','CY','LU','MT','MD','MC','ME','MK','SM','RS','SK','SI','UA','LI','XK','VA']);
const ASIA = new Set(['CN','JP','HK','KR','IN','TW','SG','TH','MY','ID','PH','VN','PK','BD']);
const EXCHANGE_NAMES = new Map(TV_WORLD_SESSIONS.map(session => [session.id, session.names]));
export function tvCountryGroup(country: string | null): TvGroup {
  return country === 'US' ? 'us' : GULF.has(country || '') ? 'gulf' : EUROPE.has(country || '') ? 'europe' : ASIA.has(country || '') ? 'asia' : 'world';
}
let pending: Promise<WorldStockSearchResult> | null = null, saved: WorldStockSearchResult | null = null, expires = 0, revision = -1;
// This is a TV selection rule; the shared provider directory remains unchanged.
const visibleTvCountry = (country: string | null | undefined) => !/^(?:IL|ISR|Israel|إسرائيل|اسرائيل)$/iu.test(country?.trim() || '');
async function universe() {
  const currentRevision = providerDirectoryRevision();
  if (saved && expires > Date.now() && revision === currentRevision) return saved;
  if (!pending) {
    pending = searchWorldStocks({ query: '', region: null, assetType: null, page: 1, pageSize: 1_000_000, locale: 'en' }).then(data => {
      const results = data.results.filter(stock => visibleTvCountry(stock.countryCode));
      const visible = { ...data, results, totalCount: results.length, markets: data.markets.filter(market => visibleTvCountry(market.countryCode)) };
      saved = visible;
      // A budget-limited response is provisional. A completed background
      // refresh also changes the revision, immediately invalidating this copy.
      expires = Date.now() + (data.directoryStatus === 'pending' || data.directoryStatus === 'unavailable' ? 5000 : 300000);
      revision = currentRevision;
      return visible;
    }).finally(() => { pending = null; });
  }
  return pending;
}
function stockAsset(stock: WorldStock): TvAsset {
  return localizeTvAsset({ symbol: stock.providerSymbol, name: stock.displayName, region: stock.region, exchange: stock.exchangeCode,
    ...(/^TD_[A-Z0-9]{4}$/.test(stock.region) ? { mic: stock.region.slice(3), providerSymbol: stock.providerSymbol } : {}),
    currency: stock.currency, country: stock.countryCode, assetType: 'stock' });
}
const commodityAssets = (): TvAsset[] => TV_COMMODITIES.map(asset => ({ ...asset, assetType:'commodity', country:'US' }));
function directoryState(data: WorldStockSearchResult): Pick<TvDirectory, 'coverage' | 'asOf' | 'retryAfterMs'> {
  const provisional = data.directoryStatus === 'pending' || data.directoryStatus === 'unavailable';
  return { coverage: data.directoryStatus === 'snapshot' ? 'snapshot' : provisional ? 'partial' : 'directory',
    asOf: data.directoryAsOf ?? null, ...(provisional ? { retryAfterMs: data.directoryStatus === 'pending' ? 5000 : 30000 } : {}) };
}
function configuredDirectory(market: string, pending = false): TvDirectory {
  const assets = tvConfiguredMarketAssets(market).map(localizeTvAsset);
  return { assets, coverage: assets.length ? 'selected' : pending ? 'pending' : 'unavailable', asOf: null, retryAfterMs: pending ? 5000 : 30000 };
}
export async function tvDirectory(group: TvGroup, market?: string): Promise<TvDirectory> {
  if (group === 'crypto' || group === 'forex') return { assets: await tvInstrumentAssets(group), coverage: 'directory', asOf: null };
  if (group === 'commodities') return { assets: commodityAssets(), coverage: 'selected', asOf: null };
  if (group === 'global') return { assets: tvAssetsAll(group), coverage: 'selected', asOf: null };
  // Europe is an aggregate of verified exchange listings, never an alias for
  // the three names used by the compact viewing scene.
  if (market === 'europe' || group === 'europe' && !market) {
    const data = await universe();
    const rows = data.results.filter(stock => tvCountryGroup(stock.countryCode) === 'europe');
    return rows.length ? { assets: rows.map(stockAsset), ...directoryState(data) }
      : configuredDirectory('europe', data.directoryStatus === 'pending');
  }
  if (market) {
    const fallback = tvConfiguredMarketAssets(market);
    if (fallback.length && !isSupportedWorldStockRegion(market)) return configuredDirectory(market);
    try {
      // Use the same verified directory for aggregate and individual European
      // markets; browsing a different exchange must not refetch every symbol.
      if (market.startsWith('TD_')) {
        const data = await universe();
        const rows = data.results.filter(stock => stock.region === market);
        if (rows.length) return { assets: rows.map(stockAsset), ...directoryState(data) };
      }
      const assets = (await tvStockAssets(market)).filter(asset => visibleTvCountry(asset.country));
      return assets.length ? { assets: assets.map(localizeTvAsset), coverage: 'directory', asOf: null } : configuredDirectory(market);
    } catch (error) { if (fallback.length) return configuredDirectory(market); throw error; }
  }
  const data = await universe();
  const rows = data.results.filter(stock => group === 'world' || tvCountryGroup(stock.countryCode) === group);
  return { assets: rows.map(stockAsset), ...directoryState(data) };
}
export async function tvDirectoryAssets(group: TvGroup, market?: string): Promise<TvAsset[]> {
  return (await tvDirectory(group, market)).assets;
}
function equityMarkets(data: WorldStockSearchResult): TvMarket[] {
  const counts = new Map<string, number>();
  for (const row of data.results) counts.set(row.region, (counts.get(row.region) || 0) + 1);
  const markets: TvMarket[] = data.markets.map(m => {
    const group = tvCountryGroup(m.countryCode);
    const names = group === 'europe' && m.id.startsWith('TD_') ? EXCHANGE_NAMES.get(m.id.slice(3)) : undefined;
    return { id: m.id, group, labelAr: names?.[0] || m.labelAr, labelEn: names?.[1] || m.labelEn, labelFr: names?.[2] || m.labelFr,
      count: counts.get(m.id) || 0, status: m.status };
  });
  const connected = new Set(markets.map(m => m.id));
  const aliases: Record<string, string> = { TADAWUL: 'TD_XSAU', ADX: 'TD_XADS', QSE: 'TD_DSMD', BAHRAIN_BOURSE: 'TD_XBAH', MUSCAT: 'TD_XMUS' };
  for (const option of MARKET_EXCHANGE_OPTIONS.filter(m => m.coverage === 'requires_sync')) {
    if (!connected.has(aliases[option.id])) markets.push({ id: option.id, group: 'gulf', labelAr: option.labelAr, labelEn: option.labelEn, labelFr: option.labelEn, count: 0, status: 'unavailable' });
  }
  const europeanCount = data.results.filter(stock => tvCountryGroup(stock.countryCode) === 'europe').length;
  markets.push({ id: 'europe', group: 'europe', labelAr: tvText('ar','europe'), labelEn: tvText('en','europe'), labelFr: tvText('fr','europe'),
    count: europeanCount, status: europeanCount ? directoryState(data).coverage : 'unavailable' });
  return markets.map(market => {
    if (market.count > 0) return market;
    const fallback = tvConfiguredMarketAssets(market.id);
    return fallback.length ? { ...market, count:fallback.length, status:'selected' } : market;
  });
}
export async function tvMarketCatalog() {
  // Persist successful source data below this layer, not a derived catalog
  // which could freeze a pending response or hide the inner source cache.
  const [data, crypto, forex] = await Promise.all([
    universe(),
    tvInstrumentAssets('crypto').catch(() => []), tvInstrumentAssets('forex').catch(() => []),
  ]);
  const result = equityMarkets(data);
  for (const group of TV_GROUPS.filter(g => ['global','crypto','forex','commodities'].includes(g))) {
    const directory = group === 'crypto' || group === 'forex';
    const assets = group === 'crypto' ? crypto : group === 'forex' ? forex : group === 'commodities' ? commodityAssets() : tvAssetsAll(group);
    result.push({ id: group, group, labelAr: tvText('ar', group), labelEn: tvText('en', group), labelFr: tvText('fr', group), count: assets.length, status: assets.length ? directory ? 'directory' : 'selected' : 'unavailable' });
  }
  return { markets: result, ...directoryState(data) };
}
export async function tvMarkets(): Promise<TvMarket[]> {
  return (await tvMarketCatalog()).markets;
}

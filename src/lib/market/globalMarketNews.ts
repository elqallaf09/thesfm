import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripConfig,
  type GlobalMarketStripId,
  type GlobalMarketStripKind,
} from '@/lib/market/globalMarketStrips';

export type MarketNewsMetadata = {
  symbols?: string[];
  exchangeCodes?: string[];
  countries?: string[];
  marketCodes?: string[];
  assetTypes?: string[];
};

export type MarketNewsRegion = 'gulf' | 'arab' | 'middle_east' | 'china_hongkong' | 'asia' | 'north_america' | 'global';

const REGION_COUNTRIES: Record<Exclude<MarketNewsRegion, 'global'>, Set<string>> = {
  gulf: new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM']),
  arab: new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM', 'EG', 'JO', 'MA']),
  middle_east: new Set(['KW', 'SA', 'AE', 'QA', 'BH', 'OM', 'EG', 'JO']),
  china_hongkong: new Set(['CN', 'HK']),
  asia: new Set(['CN', 'HK', 'JP', 'IN', 'KR']),
  north_america: new Set(['US', 'CA']),
};

export function parseMarketNewsRegions(values: string[]): MarketNewsRegion[] {
  const allowed = new Set<MarketNewsRegion>(['gulf', 'arab', 'middle_east', 'china_hongkong', 'asia', 'north_america', 'global']);
  const regions = [...new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean))] as MarketNewsRegion[];
  if (regions.some(region => !allowed.has(region))) throw new Error('invalid_news_region');
  return regions;
}

export function storyMatchesNewsRegions(story: MarketNewsMetadata, regions: MarketNewsRegion[]) {
  if (regions.length === 0 || regions.includes('global')) return true;
  const countries = normalized(story.countries);
  return regions.some(region => region !== 'global' && [...countries].some(country => REGION_COUNTRIES[region].has(country)));
}

export function sourceRegionForCountries(values: string[] | undefined): MarketNewsRegion | null {
  const countries = normalized(values);
  if ([...countries].some(country => REGION_COUNTRIES.gulf.has(country))) return 'gulf';
  if ([...countries].some(country => REGION_COUNTRIES.arab.has(country))) return 'arab';
  if ([...countries].some(country => REGION_COUNTRIES.china_hongkong.has(country))) return 'china_hongkong';
  if ([...countries].some(country => REGION_COUNTRIES.asia.has(country))) return 'asia';
  if ([...countries].some(country => REGION_COUNTRIES.north_america.has(country))) return 'north_america';
  return null;
}

const STRIP_BY_ID = new Map(GLOBAL_MARKET_STRIPS.map(strip => [strip.id, strip]));

function assetTypeFor(kind: GlobalMarketStripKind) {
  return kind === 'equity' ? 'stock' : kind;
}

function normalized(values: string[] | undefined) {
  return new Set((values ?? []).map(value => value.trim().toUpperCase()).filter(Boolean));
}

export function parseMarketNewsIds(values: string[]): GlobalMarketStripId[] {
  const ids = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  if (ids.length > 4 || ids.some(id => !STRIP_BY_ID.has(id as GlobalMarketStripId))) {
    throw new Error('invalid_market_ids');
  }
  return ids as GlobalMarketStripId[];
}

export function marketNewsProfile(id: GlobalMarketStripId): GlobalMarketStripConfig | null {
  return STRIP_BY_ID.get(id) ?? null;
}

export function matchingMarketIds(story: MarketNewsMetadata, ids: GlobalMarketStripId[]): GlobalMarketStripId[] {
  const symbols = normalized(story.symbols);
  const exchanges = normalized(story.exchangeCodes);
  const countries = normalized(story.countries);
  const markets = normalized(story.marketCodes);
  const assetTypes = normalized(story.assetTypes);

  return ids.filter(id => {
    const strip = STRIP_BY_ID.get(id);
    if (!strip) return false;
    if (strip.items.some(item => symbols.has(item.symbol.toUpperCase()))) return true;
    if (strip.exchangeCode && exchanges.has(strip.exchangeCode.toUpperCase())) return true;
    if (strip.countryCode && countries.has(strip.countryCode.toUpperCase())) return true;
    if (markets.has(strip.id.toUpperCase())) return true;
    return !strip.countryCode && assetTypes.has(assetTypeFor(strip.kind).toUpperCase());
  });
}

export function storyMatchesSelectedMarkets(story: MarketNewsMetadata, ids: GlobalMarketStripId[]) {
  return ids.length === 0 || matchingMarketIds(story, ids).length > 0;
}

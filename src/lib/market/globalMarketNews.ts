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

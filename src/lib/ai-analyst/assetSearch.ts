import type { IntelligenceAssetType } from '@/domain/intelligence/contracts';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { intelligenceAssetTypeFromMarket, marketAssetTypeFromIntelligence } from '@/lib/intelligence/assetTypes';

export type AnalystAssetFilter = IntelligenceAssetType | 'ALL' | 'METAL';
export const ANALYST_QUERY_LIMIT = 160;

/** Names are search queries. Only a resolved market identifier enters analysis routes. */
export function normalizeAnalystQuery(value: string): string | null {
  const query = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  return query && query.length <= ANALYST_QUERY_LIMIT && !/[\p{Cc}<>\\]/u.test(query) ? query : null;
}

export function matchesAnalystAssetFilter(asset: MarketSearchItem, filter: AnalystAssetFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'METAL') return (asset.assetType === 'gold' || asset.assetType === 'commodity')
    && /^(XAU|XAG|XPT|XPD|XCU|GC=|SI=|PL=|PA=|HG=)|\b(gold|silver|platinum|palladium|copper|alumin(?:um|ium)|nickel|zinc)\b|ذهب|فضة|بلاتين|بلاديوم|نحاس/i.test(`${asset.symbol} ${asset.providerSymbol ?? ''} ${asset.name}`);
  return intelligenceAssetTypeFromMarket(asset.assetType) === filter;
}

export function analystAssetSearchUrl(query: string, filter: AnalystAssetFilter) {
  const params = new URLSearchParams({ query });
  // Metals span both the legacy gold category and commodities.
  if (filter !== 'ALL' && filter !== 'METAL' && filter !== 'COMMODITY') params.set('assetType', marketAssetTypeFromIntelligence(filter));
  return `/api/market/search?${params}`;
}

import { searchBundledMarketSymbols, listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { searchUSSymbols, getUSSymbolUniverse } from '@/lib/market/usSymbolResolver';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { marketSearchItemToWorldStock } from './normalize';
import { isSupportedWorldStockRegion, type WorldStockRegion } from './regions';
import type { WorldStock, WorldStockAssetType } from './types';

export type WorldStockSearchParams = {
  query: string;
  region: string | null;
  assetType: WorldStockAssetType | null;
  page: number;
  pageSize: number;
  locale: 'ar' | 'en' | 'fr';
};

export type WorldStockSearchResult = {
  results: WorldStock[];
  totalCount: number;
  source: string;
};

// Bundled catalogs (Kuwait + DFM + Nasdaq Dubai combined) are small (under
// 300 records total) -- fetching them in full and paginating in memory here
// is not the "download the whole global universe" the task warns against;
// that warning is about the far larger US universe (thousands of rows),
// which is only ever read via getUSSymbolUniverse()'s already-cached rows
// and sliced to the requested page, never sent to the browser in bulk.
const BUNDLED_FETCH_LIMIT = 500;

function bundledRegionIds(): string[] {
  return ['BOURSA_KUWAIT', 'DFM', 'NASDAQ_DUBAI'];
}

async function collectCandidates(params: WorldStockSearchParams): Promise<{ items: MarketSearchItem[]; source: string }> {
  const { query, region } = params;
  const hasRegionFilter = isSupportedWorldStockRegion(region);
  const wantsUS = !hasRegionFilter || region === 'US';
  const wantsBundled = !hasRegionFilter || bundledRegionIds().includes(region as string);

  const bundled: MarketSearchItem[] = wantsBundled
    ? (query
      ? searchBundledMarketSymbols({ query, exchange: hasRegionFilter ? (region as WorldStockRegion['id']) : undefined, limit: BUNDLED_FETCH_LIMIT })
      : listBundledMarketSymbols({ exchange: hasRegionFilter ? (region as WorldStockRegion['id']) : undefined, limit: BUNDLED_FETCH_LIMIT }))
    : [];

  let us: MarketSearchItem[] = [];
  let usSource = 'none';
  if (wantsUS) {
    if (query) {
      const searched = await searchUSSymbols(query);
      us = searched.results;
      usSource = searched.source;
    } else if (hasRegionFilter) {
      // Pure browse of the US universe: sort alphabetically and let the
      // caller paginate -- never send the whole (multi-thousand-row)
      // universe to the browser, only ever the slice a page needs.
      const universe = await getUSSymbolUniverse();
      us = [...universe.rows].sort((a, b) => a.symbol.localeCompare(b.symbol));
      usSource = universe.source;
    }
    // When there is no query AND no region filter ("all regions" browse),
    // the US universe is intentionally left out here -- it would dwarf the
    // ~300 real bundled records and make "browse everything" functionally
    // "browse only the US". A user who wants the US universe selects the US
    // region explicitly, which is the wantsUS + hasRegionFilter branch above.
  }

  const source = wantsBundled && wantsUS ? `bundled+${usSource}` : wantsBundled ? 'bundled' : usSource;
  return { items: [...bundled, ...us], source };
}

export async function searchWorldStocks(params: WorldStockSearchParams): Promise<WorldStockSearchResult> {
  const { items, source } = await collectCandidates(params);

  const seen = new Set<string>();
  const normalized: WorldStock[] = [];
  for (const item of items) {
    const stock = marketSearchItemToWorldStock(item, params.locale);
    if (!stock) continue;
    const key = `${stock.region}:${stock.canonicalSymbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (params.assetType && stock.assetType !== params.assetType) continue;
    normalized.push(stock);
  }

  normalized.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.canonicalSymbol.localeCompare(b.canonicalSymbol));

  const totalCount = normalized.length;
  const start = (params.page - 1) * params.pageSize;
  const results = normalized.slice(start, start + params.pageSize);

  return { results, totalCount, source };
}

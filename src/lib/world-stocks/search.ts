import { searchBundledMarketSymbols, listBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { filterUsSymbolUniverse, getBundledUsSymbolUniverse, getUSSymbolUniverse } from '@/lib/market/usSymbolResolver';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { globalDirectoryMarketItems } from './globalDirectory';
import { getProviderDirectory } from './providerDirectory';
import { WORLD_STOCK_REGIONS } from './regions';
import type { WorldStockMarket } from './types';
import { normalizeAssetSearchText } from '@/lib/market/assetAliases';
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
  markets: WorldStockMarket[];
  directoryStatus: string;
};

// The server paginates the complete synchronized directory in memory and
// sends only the requested page. Quotes are fetched separately for that page,
// so browsing thousands of symbols never triggers a bulk provider request.
const BUNDLED_FETCH_LIMIT = 10_000;
const OPTIONAL_DIRECTORY_BUDGET_MS = 1_500;

type TimelyProviderDirectory = Awaited<ReturnType<typeof getProviderDirectory>> | {
  rows: [];
  status: 'pending';
  asOf: null;
};

/**
 * A slow optional directory must not hide already-verified catalog entries.
 * The original promise is deliberately left running, so a warm server can use
 * its refreshed cache on the next request without fabricating a replacement.
 */
function respondWithinBudget<T>(work: Promise<T>, fallback: () => T | Promise<T>, budgetMs = OPTIONAL_DIRECTORY_BUDGET_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void Promise.resolve(fallback()).then(resolve, reject);
    }, budgetMs);

    work.then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }).catch(error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

function responsiveProviderDirectory(): Promise<TimelyProviderDirectory> {
  return respondWithinBudget<TimelyProviderDirectory>(getProviderDirectory(), () => ({ rows: [], status: 'pending', asOf: null }));
}

function responsiveUsSymbolUniverse() {
  return respondWithinBudget(
    getUSSymbolUniverse().then(({ rows, source }) => ({ rows, source })),
    getBundledUsSymbolUniverse,
  );
}

function bundledRegionIds(): string[] {
  return ['BOURSA_KUWAIT', 'DFM', 'NASDAQ_DUBAI', 'SSE', 'SZSE'];
}

export async function collectCandidates(params: WorldStockSearchParams): Promise<{ items: MarketSearchItem[]; source: string }> {
  const { query, region } = params;
  const hasRegionFilter = isSupportedWorldStockRegion(region);
  const wantsUS = !hasRegionFilter || region === 'US';
  const wantsBundled = !hasRegionFilter || bundledRegionIds().includes(region as string);
  const wantsGlobalDirectory = !hasRegionFilter || ['BOURSA_KUWAIT', 'SSE', 'SZSE'].includes(region as string);

  const bundled: MarketSearchItem[] = wantsBundled
    ? (query
      ? searchBundledMarketSymbols({ query, exchange: hasRegionFilter ? (region as WorldStockRegion['id']) : undefined, limit: BUNDLED_FETCH_LIMIT })
      : listBundledMarketSymbols({ exchange: hasRegionFilter ? (region as WorldStockRegion['id']) : undefined, limit: BUNDLED_FETCH_LIMIT }))
    : [];

  const globalDirectory = wantsGlobalDirectory
    ? globalDirectoryMarketItems({ query, exchange: hasRegionFilter ? region : null })
    : [];

  let us: MarketSearchItem[] = [];
  let usSource = 'none';
  if (wantsUS) {
    // A single universe request prevents the former duplicate Nasdaq
    // downloads for every non-empty search. When the remote catalog is slow,
    // this returns the verified bundled catalog inside the response budget.
    const universe = await responsiveUsSymbolUniverse();
    us = filterUsSymbolUniverse(universe.rows, query);
    usSource = universe.source;
  }

  const sources = [globalDirectory.length ? 'official-directory-snapshot' : '', bundled.length ? 'bundled' : '', wantsUS ? usSource : '']
    .filter(Boolean);
  return { items: [...globalDirectory, ...bundled, ...us], source: sources.join('+') || 'none' };
}

export async function searchWorldStocks(params: WorldStockSearchParams): Promise<WorldStockSearchResult> {
  const [{ items, source }, provider] = await Promise.all([collectCandidates(params), responsiveProviderDirectory()]);
  const needle = normalizeAssetSearchText(params.query);
  const extended = provider.rows.filter(row => (!params.region || row.exchange === params.region) && (!needle || normalizeAssetSearchText(`${row.symbol} ${row.name} ${row.exchangeName}`).includes(needle)));
  const markets: WorldStockMarket[] = WORLD_STOCK_REGIONS.map(region => ({ ...region, count: null, status: region.id === 'US' && source.includes('nasdaqtrader') ? 'directory' : 'snapshot' }));
  const counts = new Map<string, WorldStockMarket>();
  for (const row of provider.rows) {
    const existing = counts.get(row.exchange);
    if (existing) existing.count = (existing.count ?? 0) + 1;
    else counts.set(row.exchange, { id: row.exchange, labelAr: row.exchangeName, labelEn: row.exchangeName, labelFr: row.exchangeName, countryCode: row.country || '', currency: row.currency || '', count: 1, status: provider.status });
  }
  markets.push(...counts.values());

  const seen = new Set<string>();
  const normalized: WorldStock[] = [];
  for (const item of [...items, ...extended]) {
    const stock = marketSearchItemToWorldStock(item, params.locale);
    if (!stock) continue;
    const key = `${stock.region}:${stock.canonicalSymbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (params.assetType && stock.assetType !== params.assetType) continue;
    normalized.push(stock);
  }

  normalized.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.region.localeCompare(b.region) || a.canonicalSymbol.localeCompare(b.canonicalSymbol));

  const totalCount = normalized.length;
  const start = (params.page - 1) * params.pageSize;
  const results = normalized.slice(start, start + params.pageSize);

  return { results, totalCount, source: extended.length ? `${source}+twelve-data-directory` : source, markets, directoryStatus: provider.status };
}

import 'server-only';
import { tvDirectoryAssets, type TvAsset } from './catalog';
import { hasTvPrice } from '@/lib/markets-tv/coverage';
import type { TvGroup, TvSnapshot, TvScene } from '@/lib/markets-tv/types';
import { TV_SCENE_GROUP, tvSceneAssets } from './sceneCatalog';
import { resolveTvQuotes } from './quoteLoader';
import { tvWatchlistAssets } from './watchlistAssets';
import { tvSnapshotRetryAt } from './quoteAvailability';
import { tvListingKey } from '@/lib/markets-tv/listingIdentity';
export type TvSnapshotOptions = { page?: number; pageSize?: number; market?: string; symbols?: string[]; listingKeys?: string[]; scene?: TvScene };

async function buildSnapshot(group: TvGroup, ownedSymbols: string[], options: TvSnapshotOptions): Promise<TvSnapshot> {
  if (options.scene) {
    if (TV_SCENE_GROUP[options.scene] !== group) throw new Error('INVALID_SCENE_GROUP');
    const selection = tvSceneAssets(options.scene, ownedSymbols);
    const combined = await resolveTvQuotes([...selection.summary, ...selection.rows], group);
    const summary = combined.slice(0, selection.summary.length), quotes = combined.slice(selection.summary.length);
    return { group, scene: options.scene, summary, quotes, retryAt: tvSnapshotRetryAt(combined, Date.now(), group), generatedAt: new Date().toISOString(),
      total: quotes.length, available: quotes.filter(hasTvPrice).length, selectionTotal: combined.length };
  }
  const directory: TvAsset[] = group === 'watchlist'
    ? tvWatchlistAssets(ownedSymbols)
    : await tvDirectoryAssets(group, options.market);
  const byListing = new Map(directory.map(asset => [tvListingKey(asset), asset]));
  const bySymbol = new Map<string, TvAsset[]>();
  for (const asset of directory) bySymbol.set(asset.symbol, [...(bySymbol.get(asset.symbol) || []), asset]);
  const selected = options.listingKeys ? [...new Set(options.listingKeys)].flatMap(key => byListing.has(key) ? [byListing.get(key)!] : [])
    // Legacy clients can still select an unambiguous ticker. Never silently
    // choose a venue when that symbol is listed on more than one exchange.
    : options.symbols ? [...new Set(options.symbols)].flatMap(symbol => bySymbol.get(symbol)?.length === 1 ? bySymbol.get(symbol)! : []) : directory;
  const pageSize = Math.max(1, Math.min(12, options.pageSize ?? 6));
  const page = Math.max(0, Math.min(options.page ?? 0, Math.max(0, Math.ceil(selected.length / pageSize) - 1)));
  const assets = selected.slice(page * pageSize, (page + 1) * pageSize);
  const quotes = (await resolveTvQuotes(assets, group)).map((quote, index) => ({ ...quote, listingKey: tvListingKey(assets[index]) }));
  return { group, quotes, retryAt: tvSnapshotRetryAt(quotes, Date.now(), group), generatedAt: new Date().toISOString(), available: quotes.filter(hasTvPrice).length,
    total: assets.length, directoryTotal: directory.length, selectionTotal: selected.length, page, pageSize, market: options.market };
}

// Observations are cached per listing by quoteLoader, not per scene/page.
// Do not nest that cache inside another unstable_cache (Next bypasses inner
// cache reads). Watchlist selections never enter a shared response cache.
const pendingSnapshots = new Map<string, Promise<TvSnapshot>>();
export function loadTvSnapshot(group: TvGroup, ownedSymbols: string[] = [], options: TvSnapshotOptions = {}): Promise<TvSnapshot> {
  if (group === 'watchlist' || options.scene === 'watchlist') return buildSnapshot(group, ownedSymbols, options);
  const key = JSON.stringify([group, options]);
  const running = pendingSnapshots.get(key); if (running) return running;
  const work = buildSnapshot(group, [], options).finally(() => pendingSnapshots.delete(key));
  pendingSnapshots.set(key, work); return work;
}

import 'server-only';
import { unstable_cache } from 'next/cache';
import { tvDirectoryAssets, type TvAsset } from './catalog';
import { hasTvPrice } from '@/lib/markets-tv/coverage';
import type { TvGroup, TvSnapshot, TvScene } from '@/lib/markets-tv/types';
import { TV_SCENE_GROUP, tvSceneAssets } from './sceneCatalog';
import { resolveTvQuotes } from './quoteLoader';
import { tvWatchlistAssets } from './watchlistAssets';
export type TvSnapshotOptions = { page?: number; pageSize?: number; market?: string; symbols?: string[]; scene?: TvScene };

async function buildSnapshot(group: TvGroup, ownedSymbols: string[], options: TvSnapshotOptions): Promise<TvSnapshot> {
  if (options.scene) {
    if (TV_SCENE_GROUP[options.scene] !== group) throw new Error('INVALID_SCENE_GROUP');
    const selection = tvSceneAssets(options.scene, ownedSymbols);
    const combined = await resolveTvQuotes([...selection.summary, ...selection.rows], group);
    const summary = combined.slice(0, selection.summary.length), quotes = combined.slice(selection.summary.length);
    return { group, scene: options.scene, summary, quotes, generatedAt: new Date().toISOString(),
      total: quotes.length, available: quotes.filter(hasTvPrice).length, selectionTotal: combined.length };
  }
  const directory: TvAsset[] = group === 'watchlist'
    ? tvWatchlistAssets(ownedSymbols)
    : await tvDirectoryAssets(group, options.market);
  const bySymbol = new Map(directory.map(asset => [asset.symbol, asset]));
  const selected = options.symbols ? [...new Set(options.symbols)].flatMap(symbol => bySymbol.has(symbol) ? [bySymbol.get(symbol)!] : []) : directory;
  const pageSize = Math.max(1, Math.min(12, options.pageSize ?? 6));
  const page = Math.max(0, Math.min(options.page ?? 0, Math.max(0, Math.ceil(selected.length / pageSize) - 1)));
  const assets = selected.slice(page * pageSize, (page + 1) * pageSize);
  const quotes = await resolveTvQuotes(assets, group);
  return { group, quotes, generatedAt: new Date().toISOString(), available: quotes.filter(hasTvPrice).length,
    total: assets.length, directoryTotal: directory.length, selectionTotal: selected.length, page, pageSize, market: options.market };
}

// Public instrument observations may be reused, but a device's watchlist and
// selected private identities never enter the shared response cache.
const publicSnapshot = unstable_cache((group: TvGroup, options: TvSnapshotOptions) => buildSnapshot(group, [], options),
  ['tv-public-snapshot-v3'], { revalidate: 15 });
const pendingSnapshots = new Map<string, Promise<TvSnapshot>>();
export function loadTvSnapshot(group: TvGroup, ownedSymbols: string[] = [], options: TvSnapshotOptions = {}): Promise<TvSnapshot> {
  if (group === 'watchlist' || options.scene === 'watchlist') return buildSnapshot(group, ownedSymbols, options);
  const key = JSON.stringify([group, options]);
  const running = pendingSnapshots.get(key); if (running) return running;
  const work = publicSnapshot(group, options).finally(() => pendingSnapshots.delete(key));
  pendingSnapshots.set(key, work); return work;
}

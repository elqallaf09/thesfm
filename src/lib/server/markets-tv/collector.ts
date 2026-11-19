import 'server-only';
import { hasTvPrice } from '@/lib/markets-tv/coverage';
import type { TvGroup } from '@/lib/markets-tv/types';
import { tvDirectoryAssets, type TvAsset } from './catalog';
import { resolveTvQuotes } from './quoteLoader';

/* THE SFM as the provider: one scheduled pass fetches each core instrument
 * once, through the same verified chain the screens use, so every TV reads
 * the shared cache and the owned store instead of each spending quota. */

/** Forex majors first; the full directory is still served on demand. */
const FOREX_CORE = 12;
const BATCH = 12;
const BUDGET_MS = 45_000;

export type TvCollectResult = { group: TvGroup; requested: number; priced: number; sources: Record<string, number> };

async function coreAssets(group: TvGroup): Promise<TvAsset[]> {
  const assets = await tvDirectoryAssets(group).catch(() => [] as TvAsset[]);
  return group === 'forex' ? assets.slice(0, FOREX_CORE) : assets;
}

export async function collectTvCore(groups: TvGroup[] = ['global', 'commodities', 'forex'], deadline = Date.now() + BUDGET_MS): Promise<TvCollectResult[]> {
  const results: TvCollectResult[] = [];
  for (const group of groups) {
    const assets = await coreAssets(group);
    const result: TvCollectResult = { group, requested: assets.length, priced: 0, sources: {} };
    for (let start = 0; start < assets.length && Date.now() < deadline; start += BATCH) {
      const quotes = await resolveTvQuotes(assets.slice(start, start + BATCH), group);
      for (const quote of quotes) {
        if (!hasTvPrice(quote)) continue;
        result.priced += 1;
        const source = quote.source || 'unknown';
        result.sources[source] = (result.sources[source] || 0) + 1;
      }
    }
    results.push(result);
  }
  return results;
}

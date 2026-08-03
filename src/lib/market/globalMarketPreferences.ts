import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripId,
} from '@/lib/market/globalMarketStrips';

export const GLOBAL_MARKETS_PREFERENCE_KEY = 'sfm.globalMarkets.selectedStrips.v1';
export const GLOBAL_MARKETS_SELECTION_SIZE = 4;

export const DEFAULT_GLOBAL_MARKET_STRIPS: GlobalMarketStripId[] = [
  'us_nasdaq',
  'us_nyse',
  'forex',
  'global_indices',
];

const AVAILABLE_IDS = new Set(
  GLOBAL_MARKET_STRIPS.filter(strip => strip.items.length > 0).map(strip => strip.id),
);

export function normalizeSelectedMarketIds(value: unknown): GlobalMarketStripId[] {
  if (!Array.isArray(value)) return [...DEFAULT_GLOBAL_MARKET_STRIPS];

  const normalized: GlobalMarketStripId[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !AVAILABLE_IDS.has(candidate as GlobalMarketStripId)) continue;
    const id = candidate as GlobalMarketStripId;
    if (!normalized.includes(id)) normalized.push(id);
    if (normalized.length === GLOBAL_MARKETS_SELECTION_SIZE) break;
  }

  for (const fallback of DEFAULT_GLOBAL_MARKET_STRIPS) {
    if (normalized.length === GLOBAL_MARKETS_SELECTION_SIZE) break;
    if (AVAILABLE_IDS.has(fallback) && !normalized.includes(fallback)) normalized.push(fallback);
  }

  return normalized;
}

export function addSelectedMarket(
  selected: GlobalMarketStripId[],
  id: GlobalMarketStripId,
): GlobalMarketStripId[] {
  if (selected.includes(id) || selected.length >= GLOBAL_MARKETS_SELECTION_SIZE || !AVAILABLE_IDS.has(id)) {
    return selected;
  }
  return [...selected, id];
}

export function replaceSelectedMarket(
  selected: GlobalMarketStripId[],
  previousId: GlobalMarketStripId,
  nextId: GlobalMarketStripId,
): GlobalMarketStripId[] {
  if (!AVAILABLE_IDS.has(nextId) || selected.includes(nextId)) return selected;
  return selected.map(id => id === previousId ? nextId : id);
}

export function reorderSelectedMarket(
  selected: GlobalMarketStripId[],
  fromIndex: number,
  toIndex: number,
): GlobalMarketStripId[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= selected.length || toIndex >= selected.length) {
    return selected;
  }
  const reordered = [...selected];
  const [item] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, item);
  return reordered;
}

import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripId,
} from '@/lib/market/globalMarketStrips';

const MARKET_STRIP_BY_ID = new Map(GLOBAL_MARKET_STRIPS.map(strip => [strip.id, strip]));
const MAX_SELECTED_STRIPS = 4;

export function parseRequestedStripIds(url: URL): GlobalMarketStripId[] {
  const candidates = url.searchParams.getAll('ids').flatMap(value => value.split(','));
  const normalized = [...new Set(candidates.map(value => value.trim()).filter(Boolean))];
  if (normalized.length < 1 || normalized.length > MAX_SELECTED_STRIPS) {
    throw new Error('invalid_strip_count');
  }
  if (normalized.some(id => !MARKET_STRIP_BY_ID.has(id as GlobalMarketStripId))) {
    throw new Error('unknown_strip_id');
  }
  if (normalized.some(id => MARKET_STRIP_BY_ID.get(id as GlobalMarketStripId)?.items.length === 0)) {
    throw new Error('strip_coverage_unavailable');
  }
  return normalized as GlobalMarketStripId[];
}

export function symbolsForSelectedStrips(ids: GlobalMarketStripId[]): string[] {
  return [...new Set(ids.flatMap(id => MARKET_STRIP_BY_ID.get(id)?.items.map(item => item.symbol) ?? []))];
}

export function selectedStripSucceeded(id: GlobalMarketStripId, availableSymbols: Set<string>) {
  return (MARKET_STRIP_BY_ID.get(id)?.items ?? []).some(item => availableSymbols.has(item.symbol));
}

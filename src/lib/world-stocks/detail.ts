import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { searchUSSymbols } from '@/lib/market/usSymbolResolver';
import { marketSearchItemToWorldStock } from './normalize';
import { isSupportedWorldStockRegion } from './regions';
import type { WorldStock } from './types';

/**
 * Exact-symbol lookup (not the fuzzy/ranked search in search.ts) for the
 * detail route. Requires a region because canonical symbols are only
 * unique within a given exchange -- the same ticker text can exist on more
 * than one supported market.
 */
export async function getWorldStockDetail(canonicalSymbol: string, region: string, locale: 'ar' | 'en' | 'fr'): Promise<WorldStock | null> {
  if (!isSupportedWorldStockRegion(region)) return null;
  const symbol = canonicalSymbol.trim().toUpperCase();
  if (!symbol) return null;

  const candidates = region === 'US'
    ? (await searchUSSymbols(symbol)).results
    : searchBundledMarketSymbols({ query: symbol, exchange: region, limit: 50 });

  const exactMatch = candidates.find(item => String(item.symbol ?? '').toUpperCase() === symbol);
  if (!exactMatch) return null;

  return marketSearchItemToWorldStock(exactMatch, locale);
}

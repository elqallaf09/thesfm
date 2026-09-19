import 'server-only';
import { watchlistEngine } from '@/lib/trader/watchlistEngine';
import { tvAssets } from '@/lib/markets-tv/catalog';
import { toTvQuote } from '@/lib/markets-tv/quotes';
import type { TvGroup, TvSnapshot } from '@/lib/markets-tv/types';
// Prices reuse the canonical engine's persistent public-quote cache. No account
// data enters this shared cache. Public requests cannot supply arbitrary symbols.
export async function loadTvSnapshot(group: TvGroup, ownedSymbols: string[] = []): Promise<TvSnapshot> {
  const assets = tvAssets(group);
  const symbols = group === 'watchlist' ? ownedSymbols.slice(0, 50) : assets.map(a => a.symbol);
  const rows = await watchlistEngine.load(symbols, 'quotes');
  const quotes = rows.map(row => toTvQuote(row, assets.find(a => a.symbol === row.requestedSymbol)?.nameAr));
  return { group, quotes, generatedAt: new Date().toISOString(), available: quotes.filter(q => q.price !== null).length, total: symbols.length };
}

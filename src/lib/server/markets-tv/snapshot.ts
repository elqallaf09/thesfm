import 'server-only';
import { getSfmMarketQuote } from '@/lib/sfm-market/engine';
import { tvAssets } from '@/lib/markets-tv/catalog';
import { toTvQuote } from '@/lib/markets-tv/quotes';
import type { TvGroup, TvSnapshot } from '@/lib/markets-tv/types';
// The owned SFM contract preserves source evidence and excludes prohibited
// fallback providers. Its provider cache contains public quotes, never owners.
export async function loadTvSnapshot(group: TvGroup, ownedSymbols: string[] = []): Promise<TvSnapshot> {
  const assets = tvAssets(group);
  const symbols = Array.from(new Set(group === 'watchlist' ? ownedSymbols.slice(0, 50) : assets.map(a => a.symbol)));
  const quotes = symbols.map(symbol => toTvQuote(symbol, null, assets.find(a => a.symbol === symbol)?.nameAr));
  const deadline = Date.now() + 40_000;
  let cursor = 0;
  async function worker() {
    while (cursor < symbols.length && Date.now() < deadline) {
      const index = cursor++;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const row = await Promise.race([
          getSfmMarketQuote(symbols[index]).catch(() => null),
          new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), Math.min(12_000, deadline - Date.now())); }),
        ]);
        quotes[index] = toTvQuote(symbols[index], row, assets.find(a => a.symbol === symbols[index])?.nameAr);
      } finally { if (timer) clearTimeout(timer); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, symbols.length) }, () => worker()));
  return { group, quotes, generatedAt: new Date().toISOString(), available: quotes.filter(q => q.price !== null).length, total: symbols.length };
}

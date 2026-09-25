import 'server-only';
import { unstable_cache } from 'next/cache';
import { parseProviderDirectory, providerRegion } from '@/lib/world-stocks/providerDirectory';
import { collectCandidates } from '@/lib/world-stocks/search';
import { marketSearchItemToWorldStock } from '@/lib/world-stocks/normalize';
import type { TvAsset } from './catalog';

const providerMarket = unstable_cache(async (region: string) => {
  if (!providerRegion(region)) return [];
  const params = new URLSearchParams({ mic_code: region.slice(3), type: 'Common Stock' });
  const response = await fetch(`https://api.twelvedata.com/stocks?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE');
  const rows = parseProviderDirectory(await response.json()).filter(r => r.exchange === region);
  if (!rows.length) throw new Error('DIRECTORY_UNAVAILABLE');
  return rows;
}, ['tv-exchange-directory-v1'], { revalidate: 86400 });
export async function tvStockAssets(region: string): Promise<TvAsset[]> {
  if (providerRegion(region)) {
    return (await providerMarket(region)).map(r => ({ symbol: r.providerSymbol!, name: r.name, region, currency: r.currency, country: r.country, mic: r.mic }))
      .sort((a,b) => a.name.localeCompare(b.name) || a.symbol.localeCompare(b.symbol));
  }
  const { items } = await collectCandidates({ region, query: '', page: 1, pageSize: 1_000_000, assetType: null, locale: 'en' });
  const rows = new Map<string, TvAsset>();
  for (const item of items) {
    const row = marketSearchItemToWorldStock(item, 'en');
    if (!row || row.region !== region) continue;
    const key = `${row.region}:${row.canonicalSymbol}`;
    if (!rows.has(key)) rows.set(key, { symbol: row.providerSymbol, name: row.displayName, nameAr: marketSearchItemToWorldStock(item, 'ar')?.displayName, region, currency: row.currency, country: row.countryCode });
  }
  return [...rows.values()].sort((a,b) => a.name.localeCompare(b.name) || a.symbol.localeCompare(b.symbol));
}

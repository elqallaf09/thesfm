import 'server-only';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { unstable_cache } from 'next/cache';
import { parseProviderDirectory, providerRegion } from '@/lib/world-stocks/providerDirectory';
import { collectCandidates } from '@/lib/world-stocks/search';
import { marketSearchItemToWorldStock } from '@/lib/world-stocks/normalize';
import type { TvAsset } from './catalog';

const MAX_DIRECTORY_BYTES = 32 * 1024 * 1024;
const MAX_CACHE_BYTES = 1_900_000; // Leave room below Next's 2 MiB item limit.
const MAX_LISTINGS = 100_000;
const zip = promisify(gzip), unzip = promisify(gunzip);
type CachedExchange = { version: 1; region: string; count: number; data: string };

async function readDirectory(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_DIRECTORY_BYTES) throw new Error('DIRECTORY_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('EMPTY_DIRECTORY');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_DIRECTORY_BYTES) { await reader.cancel(); throw new Error('DIRECTORY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
}

const providerMarket = unstable_cache(async (region: string) => {
  if (!providerRegion(region)) throw new Error('INVALID_DIRECTORY_REGION');
  const params = new URLSearchParams({ mic_code: region.slice(3), type: 'Common Stock' });
  const response = await fetch(`https://api.twelvedata.com/stocks?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('DIRECTORY_UNAVAILABLE');
  const rows = parseProviderDirectory(await readDirectory(response)).filter(r => r.exchange === region);
  if (!rows.length) throw new Error('DIRECTORY_UNAVAILABLE');
  if (rows.length > MAX_LISTINGS) throw new Error('DIRECTORY_TOO_LARGE');
  // Only verified metadata enters the cache. Compact tuples avoid repeating
  // region, MIC and provider-source strings for thousands of exchange rows.
  const serialized = Buffer.from(JSON.stringify(rows.map(row => [row.providerSymbol, row.name, row.currency, row.country])));
  if (serialized.byteLength > MAX_DIRECTORY_BYTES) throw new Error('DIRECTORY_TOO_LARGE');
  const compressed = await zip(serialized);
  const entry: CachedExchange = { version: 1, region, count: rows.length, data: compressed.toString('base64') };
  if (Buffer.byteLength(JSON.stringify(entry)) > MAX_CACHE_BYTES) throw new Error('DIRECTORY_CACHE_TOO_LARGE');
  // A rejected refresh throws rather than caching an empty replacement, so
  // Next can retain the last successful compressed exchange directory.
  return entry;
}, ['tv-exchange-directory-v2'], { revalidate: 86400 });

async function restoreExchange(entry: CachedExchange, region: string): Promise<TvAsset[]> {
  if (!entry || entry.version !== 1 || entry.region !== region || !Number.isInteger(entry.count) || entry.count < 1 || entry.count > MAX_LISTINGS
    || typeof entry.data !== 'string' || !entry.data.length || entry.data.length > MAX_CACHE_BYTES
    || entry.data.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(entry.data)) throw new Error('INVALID_DIRECTORY_CACHE');
  const decoded = await unzip(Buffer.from(entry.data, 'base64'), { maxOutputLength: MAX_DIRECTORY_BYTES });
  const rows: unknown = JSON.parse(decoded.toString('utf8'));
  if (!Array.isArray(rows) || rows.length !== entry.count) throw new Error('INVALID_DIRECTORY_CACHE');
  const seen = new Set<string>();
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== 4) throw new Error('INVALID_DIRECTORY_CACHE');
    const [symbol, name, currency, country] = row;
    if (typeof symbol !== 'string' || !/^[A-Z0-9][A-Z0-9.&/_-]{0,31}$/i.test(symbol) || seen.has(symbol.toUpperCase())
      || typeof name !== 'string' || !name.trim() || name.length > 1024
      || typeof currency !== 'string' || currency !== 'GBp' && !/^[A-Z]{3}$/.test(currency)
      || typeof country !== 'string' || !country.trim() || country.length > 128) throw new Error('INVALID_DIRECTORY_CACHE');
    seen.add(symbol.toUpperCase());
    return { symbol, name, region, currency, country, mic: region.slice(3) };
  });
}
export async function tvStockAssets(region: string): Promise<TvAsset[]> {
  if (providerRegion(region)) {
    return (await restoreExchange(await providerMarket(region), region))
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

import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cache = vi.hoisted(() => ({ stored: new Map<string, unknown>(), writes: [] as unknown[], override: undefined as unknown }));
vi.mock('next/cache', () => ({ unstable_cache: (load: (region: string) => Promise<unknown>) => async (region: string) => {
  if (cache.override !== undefined) return cache.override;
  try {
    const entry = await load(region);
    // Model the platform limit and its retained-last-success behavior when a
    // revalidation throws. Returning an empty value would replace good data.
    if (Buffer.byteLength(JSON.stringify(entry)) > 2 * 1024 * 1024) throw new Error('NEXT_CACHE_ITEM_TOO_LARGE');
    cache.stored.set(region, entry); cache.writes.push(entry);
    return entry;
  } catch (error) {
    if (cache.stored.has(region)) return cache.stored.get(region);
    throw error;
  }
} }));
vi.mock('@/lib/world-stocks/search', () => ({ collectCandidates: vi.fn() }));
import { tvStockAssets } from '@/lib/server/markets-tv/stockDirectory';

const listing = (symbol = 'QA0', changes: Record<string, unknown> = {}) => ({
  symbol, name: `Verified issuer ${symbol}`, currency: 'EUR', country: 'Germany',
  mic_code: 'XSTU', exchange: 'Stuttgart', type: 'Common Stock', ...changes,
});
const response = (rows: unknown[]) => new Response(JSON.stringify({ status: 'ok', data: rows }));

beforeEach(() => { cache.stored.clear(); cache.writes = []; cache.override = undefined; });
afterEach(() => vi.unstubAllGlobals());

describe('compressed exchange directory cache', () => {
  it('restores a directory larger than the Next cache limit without caching the raw rows', async () => {
    const rows = Array.from({ length: 20000 }, (_, index) => listing(`QA${index}`, { name: `Issuer ${index} ${'Verified company '.repeat(12)}` }));
    const tuples = rows.map(row => [row.symbol, row.name, row.currency, row.country]);
    expect(Buffer.byteLength(JSON.stringify(tuples))).toBeGreaterThan(2 * 1024 * 1024);
    vi.stubGlobal('fetch', vi.fn(async () => response(rows)));
    const assets = await tvStockAssets('TD_XSTU');
    expect(assets).toHaveLength(20000);
    expect(assets.find(row => row.symbol === 'QA19999')).toMatchObject({ mic: 'XSTU', region: 'TD_XSTU', currency: 'EUR', country: 'DE' });
    expect(cache.writes).toHaveLength(1);
    expect(cache.writes[0]).toMatchObject({ version: 1, region: 'TD_XSTU', count: 20000, data: expect.any(String) });
    expect(Buffer.byteLength(JSON.stringify(cache.writes[0]))).toBeLessThan(1_900_000);
    expect(assets.every(row => !('price' in row))).toBe(true);
  });

  it('preserves the original pence denomination and excludes a foreign MIC', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([
      listing('PENCE', { mic_code: 'XLON', currency: 'GBp', country: 'United Kingdom', exchange: 'London' }), listing('FOREIGN'),
    ])));
    expect(await tvStockAssets('TD_XLON')).toMatchObject([{ symbol: 'PENCE', currency: 'GBp', country: 'GB', mic: 'XLON' }]);
  });

  it.each([
    () => new Response('failed source', { status: 503 }),
    () => response([]),
    () => new Response('malformed JSON'),
  ])('throws failed refreshes so the platform keeps its last good directory', async failed => {
    const fetch = vi.fn().mockResolvedValueOnce(response([listing()])).mockImplementation(failed);
    vi.stubGlobal('fetch', fetch);
    const initial = await tvStockAssets('TD_XSTU');
    expect(await tvStockAssets('TD_XSTU')).toEqual(initial);
    expect(cache.writes).toHaveLength(1);
  });

  it('rejects oversized streamed input before it reaches the cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(32 * 1024 * 1024 + 1))));
    await expect(tvStockAssets('TD_XSTU')).rejects.toThrow('DIRECTORY_TOO_LARGE');
    expect(cache.writes).toHaveLength(0);
  });

  it('rejects corrupted cached metadata and a compressed payload that exceeds the expansion bound', async () => {
    cache.override = { version: 1, region: 'TD_XSTU', count: 1,
      data: gzipSync(JSON.stringify([['QA0', 'Company', 'gbp', 'DE']])).toString('base64') };
    await expect(tvStockAssets('TD_XSTU')).rejects.toThrow('INVALID_DIRECTORY_CACHE');
    cache.override = { version: 1, region: 'TD_XSTU', count: 1,
      data: gzipSync(Buffer.alloc(32 * 1024 * 1024 + 1, 32)).toString('base64') };
    await expect(tvStockAssets('TD_XSTU')).rejects.toThrow();
  });
});

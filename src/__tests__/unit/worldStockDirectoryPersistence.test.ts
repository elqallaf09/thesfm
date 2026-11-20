import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { ProviderDirectory, ProviderListing } from '@/lib/world-stocks/providerDirectory';

const db = vi.hoisted(() => ({
  row: null as { payload: unknown; expires_at: string; updated_at?: string } | null,
  enabled: true,
  writes: vi.fn(),
  reads: vi.fn(),
}));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => db.enabled ? {
  from: () => ({
    select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: async () => {
      db.reads(); return { data: db.row, error: null };
    } }) }) }),
    upsert: (row: NonNullable<typeof db.row>) => ({ abortSignal: async () => {
      db.writes(row); db.row = row; return { error: null };
    } }),
  }),
} : null }));
import { readStoredProviderDirectory, saveStoredProviderDirectory } from '@/lib/server/worldStockDirectoryStore';

const now = Date.parse('2026-11-20T10:00:00Z');
const source = 'https://api.twelvedata.com/stocks?type=Common%20Stock';
const row = (overrides: Partial<ProviderListing> = {}): ProviderListing => ({
  symbol: 'DUAL', providerSymbol: 'DUAL', name: 'Verified European listing', exchange: 'TD_XLON',
  exchangeName: 'London', mic: 'XLON', currency: 'GBP', country: 'GB', assetType: 'stock', source, ...overrides,
});
const directory = (): ProviderDirectory => ({ rows: [row(), row({ exchange: 'TD_XPAR', mic: 'XPAR', exchangeName: 'Paris', currency: 'EUR', country: 'FR' })],
  status: 'directory', asOf: '2026-11-18T09:00:00Z' });

beforeEach(() => { db.row = null; db.enabled = true; vi.clearAllMocks(); });

describe('durable provider directory snapshots', () => {
  it('round-trips an atomic compressed directory with original time and separate listing identities', async () => {
    const original = directory();
    await saveStoredProviderDirectory(original, now);
    expect(db.writes).toHaveBeenCalledTimes(1);
    const stored = db.row?.payload as { encoding: string; asOf: string; data: string };
    expect(stored.encoding).toBe('gzip-base64');
    expect(JSON.parse(gunzipSync(Buffer.from(stored.data, 'base64')).toString())).toEqual(original.rows);
    expect(Date.parse(db.row!.expires_at)).toBe(Date.parse(original.asOf!) + 30 * 86_400_000);
    expect(await readStoredProviderDirectory(now)).toEqual({ ...original, status: 'snapshot' });
  });

  it('stores complete metadata larger than the Next data-cache item limit without truncating it', async () => {
    const rows = Array.from({ length: 6000 }, (_, index) => row({ symbol: `QA${index}`, providerSymbol: `QA${index}`, name: `Company ${index} ${'Long verified directory name '.repeat(16)}` }));
    expect(Buffer.byteLength(JSON.stringify(rows))).toBeGreaterThan(2 * 1024 * 1024);
    await saveStoredProviderDirectory({ ...directory(), rows }, now);
    const restored = await readStoredProviderDirectory(now);
    expect(restored?.rows).toHaveLength(6000);
    expect(restored?.rows.at(-1)?.symbol).toBe('QA5999');
  });

  it('preserves pence and pounds as distinct denominations through persistence', async () => {
    await saveStoredProviderDirectory({ ...directory(), rows: [row({ currency: 'GBp' })] }, now);
    expect((await readStoredProviderDirectory(now))?.rows[0].currency).toBe('GBp');
  });

  it('never overwrites a successful snapshot with empty, failed, or invalid rows', async () => {
    await saveStoredProviderDirectory(directory(), now);
    const previous = db.row;
    await saveStoredProviderDirectory({ rows: [], status: 'unavailable', asOf: null }, now);
    await saveStoredProviderDirectory({ ...directory(), status: 'snapshot' }, now);
    await saveStoredProviderDirectory({ ...directory(), rows: [] }, now);
    await saveStoredProviderDirectory({ ...directory(), rows: [row({ mic: 'XPAR' })] }, now);
    await saveStoredProviderDirectory({ ...directory(), rows: [row(), row()] }, now);
    expect(db.writes).toHaveBeenCalledTimes(1);
    expect(db.row).toBe(previous);
  });

  it.each([
    { version: 2 }, { encoding: 'raw' }, { source: 'unverified' }, { asOf: '2026-12-01T00:00:00Z' },
    { count: 250001 }, { count: 4 }, { data: 'not-base64' }, { data: 'YWJjZA==' },
    { data: gzipSync(JSON.stringify([row({ exchange: 'TD_XPAR' })])).toString('base64') },
  ])('rejects corrupted persisted metadata: %j', async overrides => {
    await saveStoredProviderDirectory(directory(), now);
    db.row!.payload = { ...db.row!.payload as object, ...overrides };
    expect(await readStoredProviderDirectory(now)).toBeNull();
  });

  it('rejects expired snapshots and gracefully handles an unconfigured store', async () => {
    await saveStoredProviderDirectory(directory(), now);
    db.row!.expires_at = new Date(now - 1).toISOString();
    expect(await readStoredProviderDirectory(now)).toBeNull();
    db.enabled = false;
    expect(await readStoredProviderDirectory(now)).toBeNull();
    await saveStoredProviderDirectory(directory(), now);
    expect(db.writes).toHaveBeenCalledTimes(1);
  });
});

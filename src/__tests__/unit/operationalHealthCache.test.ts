import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistMonotonicOperationalRecords, type OperationalHealthCacheEntry } from '@/lib/server/operationalHealthCache';

function cacheDatabase() {
  const rows = new Map<string, OperationalHealthCacheEntry>();
  const insertedOptions = vi.fn();
  const admin = {
    from: (table: string) => {
      expect(table).toBe('trader_cache');
      let inserts: OperationalHealthCacheEntry[] | null = null;
      let updates: Omit<OperationalHealthCacheEntry, 'cache_key'> | null = null;
      let key = '';
      let ceiling = '';
      const query = {
        upsert: (entries: OperationalHealthCacheEntry[], options: unknown) => { inserts = entries; insertedOptions(options); return query; },
        update: (entry: Omit<OperationalHealthCacheEntry, 'cache_key'>) => { updates = entry; return query; },
        eq: (column: string, value: string) => { expect(column).toBe('cache_key'); key = value; return query; },
        lte: (column: string, value: string) => { expect(column).toBe('updated_at'); ceiling = value; return query; },
        abortSignal: async () => {
          if (inserts) for (const entry of inserts) if (!rows.has(entry.cache_key)) rows.set(entry.cache_key, { ...entry });
          if (updates) {
            const previous = rows.get(key);
            if (previous && Date.parse(previous.updated_at) <= Date.parse(ceiling)) rows.set(key, { cache_key: key, ...updates });
          }
          return { error: null };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { rows, admin, insertedOptions };
}

function record(key: string, seconds: number): OperationalHealthCacheEntry {
  const checkedAt = new Date(Date.UTC(2026, 9, 3, 10, 0, seconds)).toISOString();
  return { cache_key: key, payload: { checkedAt }, updated_at: checkedAt, expires_at: new Date(Date.parse(checkedAt) + 86_400_000).toISOString() };
}

describe('monotonic operational cache persistence', () => {
  it('does not let an older deferred callback replace the newer cross-instance observation', async () => {
    const { rows, admin, insertedOptions } = cacheDatabase();
    const newer = record('ai:success', 20);
    const older = record('ai:success', 10);
    // The newer request finishes its deferred write before a slower older callback.
    await persistMonotonicOperationalRecords(admin, [newer]);
    await persistMonotonicOperationalRecords(admin, [older]);
    expect(rows.get('ai:success')).toEqual(newer);
    expect(insertedOptions).toHaveBeenCalledWith({ onConflict: 'cache_key', ignoreDuplicates: true });
  });

  it('converges on the newest observation when two instances race on an empty cache key', async () => {
    const { rows, admin } = cacheDatabase();
    const older = record('ai:failure', 10);
    const newer = record('ai:failure', 20);
    await Promise.all([
      persistMonotonicOperationalRecords(admin, [older]),
      persistMonotonicOperationalRecords(admin, [newer]),
    ]);
    expect(rows.get('ai:failure')).toEqual(newer);
  });

  it('keeps different probe-success timestamps independent when snapshots arrive out of order', async () => {
    const { rows, admin } = cacheDatabase();
    await persistMonotonicOperationalRecords(admin, [record('inbox', 10), record('storage', 30)]);
    await persistMonotonicOperationalRecords(admin, [record('inbox', 20), record('storage', 15)]);
    expect(rows.get('inbox')).toEqual(record('inbox', 20));
    expect(rows.get('storage')).toEqual(record('storage', 30));
  });
});

import type { SfmLoadResult } from '@/lib/data/financeData';

type Row = Record<string, unknown>;
type TableResult = { data: Row[] | null; error: { message: string } | null };
export type DashboardQueryClient = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        limit(count: number): PromiseLike<TableResult>;
      };
    };
  };
};

/** One dashboard mount / authenticated owner / refresh, never a global user cache. */
export function createDashboardDataSource(db: DashboardQueryClient, userId: string | null) {
  const requests = new Map<string, Promise<TableResult>>();

  function loadTable(table: string, limit = 1000): Promise<TableResult> {
    if (!userId) return Promise.reject(new Error('UNAUTHENTICATED'));
    if (!Number.isInteger(limit) || limit < 1 || limit > 2000) {
      return Promise.reject(new Error('INVALID_QUERY_LIMIT'));
    }
    const key = JSON.stringify([table, limit]);
    const existing = requests.get(key);
    if (existing) return existing;
    // Start in a microtask so concurrent consumers share even synchronously
    // resolving clients. The owner is fixed by the provider, never by a caller.
    const request = Promise.resolve()
      .then(() => db.from(table).select('*').eq('user_id', userId).limit(limit))
      .then(result => {
        if (result.error) requests.delete(key);
        return result;
      }, error => {
        requests.delete(key);
        throw error;
      });
    requests.set(key, request);
    return request;
  }

  async function loadTables<K extends string>(tables: Array<{ key: K; table: string; limit?: number; userScoped?: boolean }>): Promise<SfmLoadResult<K>> {
    const records = {} as SfmLoadResult<K>['records'];
    const errors: SfmLoadResult<K>['errors'] = {};
    await Promise.all(tables.map(async item => {
      try {
        // Dashboard finance reads are always owner-scoped, including accidental
        // attempts to reuse this helper for public or administrative tables.
        if (item.userScoped === false) throw new Error('UNSCOPED_DASHBOARD_READ');
        const result = await loadTable(item.table, item.limit);
        if (result.error) throw result.error;
        records[item.key] = result.data ?? [];
      } catch (error) {
        records[item.key] = [];
        errors[item.key] = error && typeof error === 'object' && 'message' in error
          ? String(error.message) : 'Load error';
      }
    }));
    return { records, errors };
  }

  return { loadTable, loadTables };
}

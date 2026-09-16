import { describe, expect, it, vi } from 'vitest';
import { createDashboardDataSource } from '@/lib/dashboard/sharedDataSource';

function fixture() {
  const limit = vi.fn().mockResolvedValue({ data: [{ amount: 100, currency: 'KWD' }], error: null });
  const eq = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { db: { from }, from, select, eq, limit };
}

const tables = [{ key: 'income', table: 'monthly_income_sources' }] as const;

describe('dashboard owner-scoped shared reads', () => {
  it('shares one query between the executive page and both economic panels', async () => {
    const f = fixture();
    const scope = createDashboardDataSource(f.db, 'owner-a');
    const [page, home, twin] = await Promise.all([
      scope.loadTable('monthly_income_sources'),
      scope.loadTables([...tables]),
      scope.loadTables([...tables]),
    ]);
    expect(f.from).toHaveBeenCalledTimes(1);
    expect(f.select).toHaveBeenCalledWith('*');
    expect(f.eq).toHaveBeenCalledWith('user_id', 'owner-a');
    expect(page.data).toEqual(home.records.income);
    expect(home.records.income).toEqual(twin.records.income);
    expect(home.errors).toEqual({});
    await scope.loadTable('monthly_income_sources');
    expect(f.from).toHaveBeenCalledTimes(1);
  });

  it('does not mix user identities even with the same Supabase client', async () => {
    const f = fixture();
    await Promise.all([
      createDashboardDataSource(f.db, 'owner-a').loadTable('debts'),
      createDashboardDataSource(f.db, 'owner-b').loadTable('debts'),
    ]);
    expect(f.from).toHaveBeenCalledTimes(2);
    expect(f.eq.mock.calls).toEqual([['user_id', 'owner-a'], ['user_id', 'owner-b']]);
  });

  it('creates fresh reads on refresh or remount, never reviving an older pending request', async () => {
    const f = fixture();
    let finishOld: (result: { data: { amount: number }[]; error: null }) => void = () => undefined;
    f.limit.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const oldScope = createDashboardDataSource(f.db, 'owner-a');
    const old = oldScope.loadTable('debts');
    await Promise.resolve();
    const refreshed = createDashboardDataSource(f.db, 'owner-a');
    const fresh = await refreshed.loadTable('debts');
    finishOld({ data: [{ amount: 999 }], error: null });
    await old;
    expect((await refreshed.loadTable('debts')).data).toEqual(fresh.data);
    expect(f.from).toHaveBeenCalledTimes(2);
  });

  it('keeps distinct table and limit queries separate', async () => {
    const f = fixture();
    const scope = createDashboardDataSource(f.db, 'owner-a');
    await Promise.all([scope.loadTable('debts', 1000), scope.loadTable('debts', 50), scope.loadTable('savings_items')]);
    expect(f.from).toHaveBeenCalledTimes(3);
  });

  it('rejects anonymous reads before any database access', async () => {
    const f = fixture();
    await expect(createDashboardDataSource(f.db, null).loadTable('debts')).rejects.toThrow('UNAUTHENTICATED');
    expect(f.from).not.toHaveBeenCalled();
  });

  it('does not permit unscoped reads or invalid limits', async () => {
    const f = fixture();
    const scope = createDashboardDataSource(f.db, 'owner-a');
    const result = await scope.loadTables([{ key: 'debts', table: 'debts', userScoped: false }]);
    expect(result.errors.debts).toBe('UNSCOPED_DASHBOARD_READ');
    await expect(scope.loadTable('debts', 0)).rejects.toThrow('INVALID_QUERY_LIMIT');
    await expect(scope.loadTable('debts', 2001)).rejects.toThrow('INVALID_QUERY_LIMIT');
    expect(f.from).not.toHaveBeenCalled();
  });

  it('does not cache a failed query as a successful empty dataset', async () => {
    const f = fixture();
    f.limit.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    const scope = createDashboardDataSource(f.db, 'owner-a');
    const failed = await scope.loadTables([...tables]);
    expect(failed.errors.income).toBe('permission denied');
    expect(failed.records.income).toEqual([]);
    const retried = await scope.loadTables([...tables]);
    expect(retried.errors).toEqual({});
    expect(retried.records.income).toHaveLength(1);
    expect(f.from).toHaveBeenCalledTimes(2);
  });

  it('allows bounded caller-driven retry after a rejected transport', async () => {
    const f = fixture();
    f.limit.mockRejectedValueOnce(new Error('offline'));
    const scope = createDashboardDataSource(f.db, 'owner-a');
    await expect(scope.loadTable('debts')).rejects.toThrow('offline');
    await expect(scope.loadTable('debts')).resolves.toHaveProperty('error', null);
    expect(f.from).toHaveBeenCalledTimes(2);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseAdmin = vi.fn();

vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args),
}));

function buildQueryChain(overrides: {
  insertError?: { code: string } | null;
  selectData?: { payload: unknown; expires_at: string } | null;
  updateError?: { code: string } | null;
} = {}) {
  const calls: string[] = [];
  const chain = {
    insert: vi.fn(async () => {
      calls.push('insert');
      return { error: overrides.insertError ?? null };
    }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: overrides.selectData ?? null, error: null })),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  // update(...).eq(...) must resolve to { error }
  chain.update = vi.fn(() => ({
    eq: vi.fn(async () => {
      calls.push('update');
      return { error: overrides.updateError ?? null };
    }),
  })) as unknown as typeof chain.update;
  chain.delete = vi.fn(() => ({
    eq: vi.fn(async () => {
      calls.push('delete');
      return { error: null };
    }),
  })) as unknown as typeof chain.delete;
  return { chain, calls };
}

beforeEach(() => {
  vi.resetModules();
  createServerSupabaseAdmin.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('acquireScanLock', () => {
  it('acquires the lock immediately when no row exists', async () => {
    const { chain } = buildQueryChain({ insertError: null });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    const result = await acquireScanLock('scanner:lock:US', 'run-1', 60_000);
    expect(result).toEqual({ acquired: true });
  });

  it('reports already_running with the existing runId when a fresh lock is held', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const { chain } = buildQueryChain({
      insertError: { code: '23505' },
      selectData: { payload: { runId: 'run-holder', lockedAt: new Date().toISOString() }, expires_at: future },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    const result = await acquireScanLock('scanner:lock:US', 'run-2', 60_000);
    expect(result.acquired).toBe(false);
    if (!result.acquired) {
      expect(result.existing.runId).toBe('run-holder');
    }
  });

  it('steals a stale (expired) lock instead of blocking forever', async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const { chain, calls } = buildQueryChain({
      insertError: { code: '23505' },
      selectData: { payload: { runId: 'crashed-run', lockedAt: past }, expires_at: past },
      updateError: null,
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    const result = await acquireScanLock('scanner:lock:US', 'run-3', 60_000);
    expect(result).toEqual({ acquired: true });
    expect(calls).toContain('update');
  });

  it('fails open (acquires) when Supabase is not configured, so local/dev never deadlocks', async () => {
    createServerSupabaseAdmin.mockReturnValue(null);
    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    const result = await acquireScanLock('scanner:lock:US', 'run-4', 60_000);
    expect(result).toEqual({ acquired: true });
  });
});

describe('releaseScanLock', () => {
  it('deletes the lock row only when it still belongs to this run', async () => {
    const { chain, calls } = buildQueryChain({
      selectData: { payload: { runId: 'run-5', lockedAt: new Date().toISOString() }, expires_at: new Date().toISOString() },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { releaseScanLock } = await import('@/lib/trader/scannerLock');
    await releaseScanLock('scanner:lock:US', 'run-5');
    expect(calls).toContain('delete');
  });

  it('does not delete a lock row owned by a different run', async () => {
    const { chain, calls } = buildQueryChain({
      selectData: { payload: { runId: 'someone-else', lockedAt: new Date().toISOString() }, expires_at: new Date().toISOString() },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { releaseScanLock } = await import('@/lib/trader/scannerLock');
    await releaseScanLock('scanner:lock:US', 'run-5');
    expect(calls).not.toContain('delete');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseAdmin = vi.fn();

vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args),
}));

function buildQueryChain(overrides: {
  insertError?: { code: string } | null;
  selectData?: { payload: unknown; expires_at: string; updated_at?: string } | null;
  selectError?: { code: string } | null;
  updateError?: { code: string } | null;
  updateData?: Array<{ cache_key: string }>;
} = {}) {
  const calls: string[] = [];
  const chain: {
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  } = {
    insert: vi.fn(async () => {
      calls.push('insert');
      return { error: overrides.insertError ?? null };
    }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: overrides.selectData ?? null, error: overrides.selectError ?? null })),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  };
  const updateResult = {} as { eq: ReturnType<typeof vi.fn>; select: ReturnType<typeof vi.fn> };
  updateResult.eq = vi.fn(() => updateResult);
  updateResult.select = vi.fn(async () => {
      calls.push('update');
      return { data: overrides.updateData ?? [{ cache_key: 'scanner:lock:US' }], error: overrides.updateError ?? null };
    });
  chain.update = vi.fn(() => updateResult);
  const deleteResult = {} as { eq: ReturnType<typeof vi.fn>; then: (resolve: (value: { error: null }) => unknown) => Promise<unknown> };
  deleteResult.eq = vi.fn(() => deleteResult);
  deleteResult.then = (resolve: (value: { error: null }) => unknown) => {
      calls.push('delete');
      return Promise.resolve({ error: null }).then(resolve);
  };
  chain.delete = vi.fn(() => deleteResult);
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
    if (!result.acquired && !('unavailable' in result)) {
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

  it('does not acquire a stale lease when another instance changed it before the compare-and-set update', async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const { chain } = buildQueryChain({
      insertError: { code: '23505' },
      selectData: { payload: { runId: 'crashed-run', lockedAt: past }, expires_at: past },
      updateData: [],
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    const result = await acquireScanLock('scanner:lock:US', 'run-6', 60_000);
    expect(result.acquired).toBe(false);
  });

  it('reports an unavailable lock store instead of fabricating a competing holder', async () => {
    const { chain } = buildQueryChain({
      insertError: { code: 'network_error' },
      selectError: { code: 'network_error' },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { acquireScanLock } = await import('@/lib/trader/scannerLock');
    await expect(acquireScanLock('scanner:lock:US', 'run-7', 60_000)).resolves.toEqual({
      acquired: false,
      unavailable: true,
    });
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
      selectData: { payload: { runId: 'run-5', lockedAt: new Date().toISOString() }, expires_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { releaseScanLock } = await import('@/lib/trader/scannerLock');
    await releaseScanLock('scanner:lock:US', 'run-5');
    expect(calls).toContain('delete');
  });

  it('does not delete a lock row owned by a different run', async () => {
    const { chain, calls } = buildQueryChain({
      selectData: { payload: { runId: 'someone-else', lockedAt: new Date().toISOString() }, expires_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    });
    createServerSupabaseAdmin.mockReturnValue({ from: () => chain });

    const { releaseScanLock } = await import('@/lib/trader/scannerLock');
    await releaseScanLock('scanner:lock:US', 'run-5');
    expect(calls).not.toContain('delete');
  });
});

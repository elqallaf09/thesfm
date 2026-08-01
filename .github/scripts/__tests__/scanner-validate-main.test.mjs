// Integration-style tests for scanner-validate.mjs's main() orchestration:
// proves cleanup runs (and the fake DB ends up empty) both when every
// scenario passes and when one fails partway through, using a fake Supabase
// client (in-memory) and a scripted fetch queue standing in for the live
// server. This cannot prove the real HTTP/Postgres integration works — that
// is only proven by an actual workflow dispatch — but it does prove the
// script's own control flow (try/finally cleanup, error propagation) is
// correct, independent of the live environment.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => globalThis.__fakeAdmin),
}));

class FakeQueryBuilder {
  constructor(store, table) {
    this.store = store;
    this.table = table;
    this._op = null;
    this._filters = [];
    this._insertRows = null;
    this._single = false;
  }

  select() {
    if (!this._op) this._op = 'select';
    return this;
  }

  insert(rows) {
    this._op = 'insert';
    this._insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  delete() {
    this._op = 'delete';
    return this;
  }

  eq(column, value) {
    this._filters.push([column, value]);
    return this;
  }

  maybeSingle() {
    this._single = true;
    return this;
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }

  async _execute() {
    const rows = this.store.get(this.table) || [];
    if (this._op === 'insert') {
      for (const row of this._insertRows) {
        const clashes = rows.some((existing) =>
          this.table === 'trader_cache' ? existing.cache_key === row.cache_key : existing.id === row.id,
        );
        if (clashes) return { data: null, error: { message: 'duplicate key', code: '23505' } };
        rows.push({ ...row });
      }
      this.store.set(this.table, rows);
      return { data: this._insertRows, error: null };
    }
    if (this._op === 'delete') {
      const remaining = rows.filter((row) => !this._filters.every(([column, value]) => row[column] === value));
      this.store.set(this.table, remaining);
      return { data: null, error: null };
    }
    const matched = rows.filter((row) => this._filters.every(([column, value]) => row[column] === value));
    if (this._single) return { data: matched[0] ?? null, error: null };
    return { data: matched, error: null };
  }
}

class FakeAdmin {
  constructor() {
    this.store = new Map();
  }

  from(table) {
    return new FakeQueryBuilder(this.store, table);
  }
}

function jsonResponse(status, body) {
  return { status, text: async () => JSON.stringify(body) };
}

function setEnv() {
  process.env.CRON_SECRET = 'test-cron-secret-value';
  process.env.SUPABASE_BRANCH_URL = 'https://bbbbbbbbbbbbbbbbbbbb.supabase.co';
  process.env.SUPABASE_BRANCH_SERVICE_ROLE_KEY = 'test-service-role-key-value';
  process.env.GITHUB_RUN_ID = 'test-run-id';
  delete process.env.GITHUB_STEP_SUMMARY;
}

beforeEach(() => {
  globalThis.__fakeAdmin = new FakeAdmin();
  setEnv();
  vi.resetModules();
});

describe('main() cleanup guarantees', () => {
  it('cleans up all workflow-owned rows after every scenario passes', async () => {
    const admin = globalThis.__fakeAdmin;
    const calls = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url, hasAuth: Boolean(init?.headers?.Authorization) });
      if (!init?.headers?.Authorization) {
        return jsonResponse(403, { error: 'cron_secret_required' });
      }
      const callIndex = calls.filter((c) => c.hasAuth).length;
      if (callIndex === 1) {
        // B: authorized, partial with a cursor.
        admin.store.set('trader_cache', [
          { cache_key: 'scanner:cursor:US', payload: { offset: 5, cycleId: 'c1', cycleStartedAt: 'now', universeSize: 20 }, expires_at: new Date(Date.now() + 999999).toISOString() },
        ]);
        return jsonResponse(200, { ok: true, status: 'partial', runId: 'run-b', nextCursor: 5 });
      }
      if (callIndex === 2) {
        // C second run: resumes.
        return jsonResponse(200, { ok: true, status: 'completed', runId: 'run-c', nextCursor: null });
      }
      if (callIndex === 3) {
        // D: overlapping lock already seeded by the script itself.
        const lockRow = (admin.store.get('trader_cache') || []).find((r) => r.cache_key === 'scanner:lock:US');
        return jsonResponse(200, { ok: true, status: 'already_running', runId: lockRow.payload.runId, nextCursor: null });
      }
      // E: stale-lock recovery — the real route steals the stale lock, runs,
      // then releases it on completion. Simulate that release side effect.
      admin.store.set('trader_cache', (admin.store.get('trader_cache') || []).filter((r) => r.cache_key !== 'scanner:lock:US'));
      return jsonResponse(200, { ok: true, status: 'completed', runId: 'run-e', nextCursor: null });
    });

    const { main } = await import('../scanner-validate.mjs');
    await expect(main()).resolves.toBeUndefined();

    const cacheRows = admin.store.get('trader_cache') || [];
    expect(cacheRows).toEqual([]);
    const runRows = admin.store.get('trader_scan_runs') || [];
    expect(runRows).toEqual([]);
  });

  it('still cleans up workflow-owned rows and rethrows the original error when a scenario fails', async () => {
    const admin = globalThis.__fakeAdmin;
    globalThis.fetch = vi.fn(async (url, init) => {
      if (!init?.headers?.Authorization) {
        // Deliberately broken: unauthorized request reports ok:true, which
        // must fail assertUnauthorizedResponse.
        return jsonResponse(403, { ok: true, error: 'cron_secret_required' });
      }
      return jsonResponse(200, { ok: true, status: 'completed', runId: 'unused', nextCursor: null });
    });

    // Seed a stray lock row up front to prove cleanup removes it even
    // though the very first scenario throws before reaching D/E.
    admin.store.set('trader_cache', [
      { cache_key: 'scanner:lock:US', payload: { runId: 'leftover', lockedAt: new Date().toISOString() }, expires_at: new Date(Date.now() + 999999).toISOString() },
    ]);

    const { main } = await import('../scanner-validate.mjs');
    await expect(main()).rejects.toThrow(/must not report ok: true/);

    const cacheRows = admin.store.get('trader_cache') || [];
    expect(cacheRows).toEqual([]);
  });
});

describe('runCleanupOnly (workflow cleanup-job safety net)', () => {
  it('deletes any leftover lock/cursor rows and confirms zero remain', async () => {
    const admin = globalThis.__fakeAdmin;
    admin.store.set('trader_cache', [
      { cache_key: 'scanner:lock:US', payload: { runId: 'leftover', lockedAt: new Date().toISOString() }, expires_at: new Date(Date.now() + 999999).toISOString() },
      { cache_key: 'scanner:cursor:US', payload: { offset: 3 }, expires_at: new Date(Date.now() + 999999).toISOString() },
    ]);

    const { runCleanupOnly } = await import('../scanner-validate.mjs');
    await expect(runCleanupOnly()).resolves.toBeUndefined();

    expect(admin.store.get('trader_cache')).toEqual([]);
  });

  it('is a no-op that still succeeds when nothing was ever seeded', async () => {
    const { runCleanupOnly } = await import('../scanner-validate.mjs');
    await expect(runCleanupOnly()).resolves.toBeUndefined();
  });
});

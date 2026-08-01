import { describe, it, expect } from 'vitest';
import {
  buildLockPayload,
  assertUnauthorizedResponse,
  assertAuthorizedResponse,
  assertAlreadyRunning,
  assertSeededLockRow,
  assertCursorAdvancedOrCleared,
  assertResumedFromCursor,
  assertStaleLockRecovered,
  scanTextForSecrets,
  buildRowContext,
  ScannerValidationError,
} from '../scanner-validate.mjs';

// Minimal fake trader_cache admin client for exercising seedLockRow()'s own
// delete/insert/select-and-verify sequence in isolation, independent of the
// larger FakeAdmin used by scanner-validate-main.test.mjs for full main()
// orchestration tests.
function fakeAdminFor({ insertError = null, deleteError = null, selectError = null } = {}) {
  const store = new Map();
  return {
    from(table) {
      return {
        delete: () => ({
          eq: async () => ({ error: deleteError }),
        }),
        insert: async (row) => {
          if (!insertError) store.set(table, [...(store.get(table) || []), row]);
          return { error: insertError };
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (selectError) return { data: null, error: selectError };
              const rows = store.get(table) || [];
              return { data: rows[rows.length - 1] ?? null, error: null };
            },
          }),
        }),
      };
    },
  };
}

describe('buildLockPayload', () => {
  it('carries the given runId and lockedAt', () => {
    expect(buildLockPayload('run-1', '2026-01-01T00:00:00.000Z')).toEqual({ runId: 'run-1', lockedAt: '2026-01-01T00:00:00.000Z' });
  });
});

describe('assertUnauthorizedResponse', () => {
  it('accepts a 403 structured error and no ok:true', () => {
    expect(() => assertUnauthorizedResponse({ status: 403, body: { error: 'cron_secret_required' } })).not.toThrow();
  });

  it('accepts a 401 structured error', () => {
    expect(() => assertUnauthorizedResponse({ status: 401, body: { error: 'unauthenticated' } })).not.toThrow();
  });

  it('accepts the middleware\'s own shape (ok:false + code, no error field) — the real observed response for this cron path', () => {
    expect(() => assertUnauthorizedResponse({ status: 401, body: { ok: false, code: 'UNAUTHORIZED' } })).not.toThrow();
  });

  it('rejects a 200 status even with an error body', () => {
    expect(() => assertUnauthorizedResponse({ status: 200, body: { error: 'nope' } })).toThrow(ScannerValidationError);
  });

  it('rejects ok:true regardless of status code', () => {
    expect(() => assertUnauthorizedResponse({ status: 403, body: { ok: true, error: 'x' } })).toThrow(/must not report ok: true/);
  });

  it('rejects a missing structured error field', () => {
    expect(() => assertUnauthorizedResponse({ status: 403, body: {} })).toThrow(/structured JSON error/);
  });
});

describe('assertAuthorizedResponse', () => {
  it('accepts a 200 with a recognized status', () => {
    expect(() => assertAuthorizedResponse({ status: 200, body: { status: 'partial' } })).not.toThrow();
    expect(() => assertAuthorizedResponse({ status: 200, body: { status: 'completed' } })).not.toThrow();
    expect(() => assertAuthorizedResponse({ status: 200, body: { status: 'already_running' } })).not.toThrow();
    expect(() => assertAuthorizedResponse({ status: 200, body: { status: 'failed' } })).not.toThrow();
  });

  it('rejects a non-200 status', () => {
    expect(() => assertAuthorizedResponse({ status: 500, body: { status: 'partial' } })).toThrow(/expected HTTP 200/);
  });

  it('rejects a null/non-object body (e.g. HTML error page that failed JSON parse)', () => {
    expect(() => assertAuthorizedResponse({ status: 200, body: null })).toThrow(/possible raw exception/);
  });

  it('rejects an unrecognized status value', () => {
    expect(() => assertAuthorizedResponse({ status: 200, body: { status: 'bogus' } })).toThrow(/unrecognized status/);
  });
});

describe('assertAlreadyRunning', () => {
  it('accepts already_running with the matching seeded runId', () => {
    expect(() => assertAlreadyRunning({ status: 'already_running', runId: 'seed-1' }, 'seed-1')).not.toThrow();
  });

  it('rejects a different status', () => {
    expect(() => assertAlreadyRunning({ status: 'completed', runId: 'seed-1' }, 'seed-1')).toThrow(/Expected status already_running/);
  });

  it('rejects a mismatched runId', () => {
    expect(() => assertAlreadyRunning({ status: 'already_running', runId: 'other' }, 'seed-1')).toThrow(/did not match the seeded lock/);
  });
});

describe('assertCursorAdvancedOrCleared', () => {
  it('accepts a cursor that advanced past the starting offset', () => {
    expect(() => assertCursorAdvancedOrCleared(0, 6, { universeSize: 20, sliceProcessed: 6 })).not.toThrow();
  });

  it('accepts a cleared (null) cursor once the universe is exhausted', () => {
    expect(() => assertCursorAdvancedOrCleared(14, null, { universeSize: 20, sliceProcessed: 6 })).not.toThrow();
  });

  it('rejects a cursor that did not advance', () => {
    expect(() => assertCursorAdvancedOrCleared(0, 0, { universeSize: 20, sliceProcessed: 6 })).toThrow(/Expected cursor to advance/);
  });

  it('rejects a non-null cursor once the universe should be exhausted', () => {
    expect(() => assertCursorAdvancedOrCleared(14, 20, { universeSize: 20, sliceProcessed: 6 })).toThrow(/Expected cursor to clear/);
  });
});

describe('assertResumedFromCursor', () => {
  it('accepts a second run that starts exactly at the saved cursor', () => {
    expect(() => assertResumedFromCursor(6, 6)).not.toThrow();
  });

  it('rejects a second run that restarts from a different offset', () => {
    expect(() => assertResumedFromCursor(0, 6)).toThrow(/should resume from saved cursor/);
  });
});

describe('assertStaleLockRecovered', () => {
  it('accepts a fresh status with a new runId', () => {
    expect(() => assertStaleLockRecovered({ status: 'completed', runId: 'new-run' }, 'stale-run')).not.toThrow();
  });

  it('rejects already_running (means the stale lock was not recovered)', () => {
    expect(() => assertStaleLockRecovered({ status: 'already_running', runId: 'stale-run' }, 'stale-run')).toThrow(/was not recovered/);
  });

  it('rejects a run that reused the seeded stale runId', () => {
    expect(() => assertStaleLockRecovered({ status: 'completed', runId: 'stale-run' }, 'stale-run')).toThrow(/reused the seeded stale runId/);
  });
});

describe('scanTextForSecrets', () => {
  it('reports no leaks when secrets are absent from the text', () => {
    expect(scanTextForSecrets('{"authorized":"PASS"}', { CRON_SECRET: 'super-secret-value-123' })).toEqual([]);
  });

  it('reports the named secret when its literal value appears in the text', () => {
    expect(scanTextForSecrets('leaked super-secret-value-123 here', { CRON_SECRET: 'super-secret-value-123' })).toEqual(['CRON_SECRET']);
  });

  it('ignores short/falsy values to avoid false positives on trivial substrings', () => {
    expect(scanTextForSecrets('the word ok appears', { SHORT: 'ok' })).toEqual([]);
  });
});

// A live-run-adjacent review found the overlapping-lock scenario's seed
// step never verified the row it wrote actually landed as expected, so a
// silently broken seed could let the scenario "pass" without ever really
// exercising the lock path. These pin the corrected seedLockRow()/
// assertSeededLockRow() behavior.
describe('assertSeededLockRow (pure)', () => {
  const FUTURE = new Date(Date.now() + 60_000).toISOString();
  const PAST = new Date(Date.now() - 60_000).toISOString();
  const validRow = (expiresAt) => ({
    cache_key: 'scanner:lock:US',
    payload: { runId: 'run-1', lockedAt: new Date().toISOString() },
    expires_at: expiresAt,
  });

  it('passes for a correctly seeded fresh lock row', () => {
    expect(() => assertSeededLockRow(validRow(FUTURE), { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: true })).not.toThrow();
  });

  it('passes for a correctly seeded stale lock row', () => {
    expect(() => assertSeededLockRow(validRow(PAST), { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: false })).not.toThrow();
  });

  it('fails closed when the row could not be read back at all (missing seeded row)', () => {
    expect(() => assertSeededLockRow(null, { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: true }))
      .toThrow(/could not be read back/);
  });

  it('fails closed on a cache_key mismatch', () => {
    expect(() => assertSeededLockRow({ ...validRow(FUTURE), cache_key: 'scanner:lock:EU' }, { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: true }))
      .toThrow(/cache_key mismatch/);
  });

  it('fails closed on a wrong runId', () => {
    expect(() => assertSeededLockRow(validRow(FUTURE), { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'someone-else', expectFresh: true }))
      .toThrow(/runId mismatch/);
  });

  it('fails closed when the payload does not match the scanner lock contract', () => {
    const malformed = { ...validRow(FUTURE), payload: { runId: 'run-1' } };
    expect(() => assertSeededLockRow(malformed, { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: true }))
      .toThrow(/does not match the scanner lock contract/);
  });

  it('fails closed when a stale expiry is accidentally used in the fresh-lock scenario', () => {
    expect(() => assertSeededLockRow(validRow(PAST), { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: true }))
      .toThrow(/must be in the future/);
  });

  it('fails closed when a fresh expiry is used for a stale-lock scenario', () => {
    expect(() => assertSeededLockRow(validRow(FUTURE), { expectedCacheKey: 'scanner:lock:US', expectedRunId: 'run-1', expectFresh: false }))
      .toThrow(/must be in the past/);
  });
});

describe('seedLockRow (buildRowContext, mocked admin)', () => {
  it('fails closed when the delete step errors', async () => {
    const admin = fakeAdminFor({ deleteError: { message: 'delete boom', code: 'X1' } });
    const ctx = buildRowContext(admin, 'US');
    await expect(ctx.seedLockRow('run-1', new Date(Date.now() + 60_000).toISOString(), { expectFresh: true }))
      .rejects.toThrow(/Failed to clear the existing lock row/);
  });

  it('fails closed when the insert step errors', async () => {
    const admin = fakeAdminFor({ insertError: { message: 'insert boom', code: 'X2' } });
    const ctx = buildRowContext(admin, 'US');
    await expect(ctx.seedLockRow('run-1', new Date(Date.now() + 60_000).toISOString(), { expectFresh: true }))
      .rejects.toThrow(/Failed to insert the seeded lock row/);
  });

  it('fails closed when the read-back step errors', async () => {
    const admin = fakeAdminFor({ selectError: { message: 'select boom', code: 'X3' } });
    const ctx = buildRowContext(admin, 'US');
    await expect(ctx.seedLockRow('run-1', new Date(Date.now() + 60_000).toISOString(), { expectFresh: true }))
      .rejects.toThrow(/Failed to read back the seeded lock row/);
  });

  it('succeeds for a correctly written and verified fresh seed', async () => {
    const admin = fakeAdminFor();
    const ctx = buildRowContext(admin, 'US');
    await expect(ctx.seedLockRow('run-1', new Date(Date.now() + 60_000).toISOString(), { expectFresh: true })).resolves.toBeUndefined();
  });

  it('succeeds for a correctly written and verified stale seed', async () => {
    const admin = fakeAdminFor();
    const ctx = buildRowContext(admin, 'US');
    await expect(ctx.seedLockRow('run-1', new Date(Date.now() - 60_000).toISOString(), { expectFresh: false })).resolves.toBeUndefined();
  });
});

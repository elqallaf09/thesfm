#!/usr/bin/env node
// Live scanner validation matrix for Supabase Preview Validate.
//
// Exercises the real /api/trader/scanner/run route, running in production
// mode against an isolated Supabase Preview branch (never Production),
// covering: unauthorized rejection, authorized structured response, cursor
// persistence/resume, overlapping-run lock (already_running), stale-lock
// recovery, and a secret-leak audit. All lock/cursor seeding talks directly
// to the branch's trader_cache table via the Supabase service-role client —
// never through any test-only application code path.
//
// The pure/testable assertion and payload-building helpers are exported for
// unit testing with mocked inputs. main() is the live orchestration entry
// point and is only meaningfully exercised against a real running server and
// a real isolated Supabase branch (i.e. via an actual workflow dispatch).

import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

export const LOCK_KEY = (market) => `scanner:lock:${market}`;
export const CURSOR_KEY = (market) => `scanner:cursor:${market}`;

export function buildLockPayload(runId, lockedAtIso = new Date().toISOString()) {
  return { runId, lockedAt: lockedAtIso };
}

export function freshExpiryIso(now = Date.now(), aheadMs = 5 * 60 * 1000) {
  return new Date(now + aheadMs).toISOString();
}

export function staleExpiryIso(now = Date.now(), behindMs = 60 * 60 * 1000) {
  return new Date(now - behindMs).toISOString();
}

export class ScannerValidationError extends Error {}

// --- Response assertions (pure — operate on already-parsed status/body) ---

export function assertUnauthorizedResponse({ status, body }) {
  if (status !== 401 && status !== 403) {
    throw new ScannerValidationError(`Unauthorized request expected HTTP 401/403, got ${status}.`);
  }
  if (body?.ok === true) {
    throw new ScannerValidationError('Unauthorized request must not report ok: true.');
  }
  // A cron-protected API path can be rejected by either of two layers, each
  // with its own (both legitimate) structured-error shape: middleware's own
  // session check (`{ ok: false, code: 'UNAUTHORIZED' }`, before the route
  // handler ever runs) when no session and no cron auth is present, or the
  // route handler's own check (`{ error: 'cron_secret_required' }`) when
  // middleware let the request through. Accept either discriminator.
  const hasErrorField = typeof body?.error === 'string';
  const hasCodeField = typeof body?.code === 'string';
  if (!body || (!hasErrorField && !hasCodeField)) {
    throw new ScannerValidationError('Unauthorized request must return a structured JSON error body (an "error" or "code" string field).');
  }
}

const VALID_SCAN_STATUSES = new Set(['completed', 'partial', 'already_running', 'failed']);

export function assertAuthorizedResponse({ status, body }) {
  if (status !== 200) {
    throw new ScannerValidationError(`Authorized request expected HTTP 200, got ${status}.`);
  }
  if (!body || typeof body !== 'object') {
    throw new ScannerValidationError('Authorized request did not return a parsed JSON object (possible raw exception/HTML page).');
  }
  if (!VALID_SCAN_STATUSES.has(body.status)) {
    throw new ScannerValidationError(`Authorized request returned an unrecognized status: ${JSON.stringify(body.status)}.`);
  }
}

// Validates a trader_cache row read back immediately after seedLockRow()
// inserted it, before the row is trusted as the fresh/stale precondition
// for a validation scenario. Pure and unit-testable — takes the
// already-fetched row rather than querying itself.
export function assertSeededLockRow(row, { expectedCacheKey, expectedRunId, expectFresh }) {
  if (!row) {
    throw new ScannerValidationError(`Seeded lock row for ${expectedCacheKey} could not be read back immediately after insert (test setup).`);
  }
  if (row.cache_key !== expectedCacheKey) {
    throw new ScannerValidationError(`Seeded lock row cache_key mismatch: expected ${expectedCacheKey}, got ${row.cache_key}.`);
  }
  const payload = row.payload;
  const payloadIsValid = payload
    && typeof payload === 'object'
    && typeof payload.runId === 'string'
    && payload.runId.length > 0
    && typeof payload.lockedAt === 'string';
  if (!payloadIsValid) {
    throw new ScannerValidationError(`Seeded lock row payload does not match the scanner lock contract {runId, lockedAt}: ${JSON.stringify(payload)}.`);
  }
  if (payload.runId !== expectedRunId) {
    throw new ScannerValidationError(`Seeded lock row runId mismatch: expected ${expectedRunId}, got ${payload.runId}.`);
  }
  const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : NaN;
  const isFuture = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
  if (expectFresh && !isFuture) {
    throw new ScannerValidationError(`Seeded lock row expires_at must be in the future for a fresh-lock scenario, got ${row.expires_at}.`);
  }
  if (!expectFresh && isFuture) {
    throw new ScannerValidationError(`Seeded lock row expires_at must be in the past for a stale-lock scenario, got ${row.expires_at}.`);
  }
}

export function assertAlreadyRunning(body, expectedRunId) {
  if (body.status !== 'already_running') {
    throw new ScannerValidationError(`Expected status already_running while a fresh lock was held, got ${body.status}.`);
  }
  if (body.runId !== expectedRunId) {
    throw new ScannerValidationError(`already_running response runId ${body.runId} did not match the seeded lock's runId ${expectedRunId}.`);
  }
}

export function assertCursorAdvancedOrCleared(beforeOffset, afterCursor, { universeSize, sliceProcessed }) {
  const expectedIfExhausted = sliceProcessed >= universeSize - beforeOffset;
  if (expectedIfExhausted) {
    if (afterCursor !== null) {
      throw new ScannerValidationError(`Expected cursor to clear (null) once the bounded universe was exhausted, got ${afterCursor}.`);
    }
    return;
  }
  if (typeof afterCursor !== 'number' || afterCursor <= beforeOffset) {
    throw new ScannerValidationError(`Expected cursor to advance past ${beforeOffset}, got ${JSON.stringify(afterCursor)}.`);
  }
}

export function assertResumedFromCursor(secondRunOffset, savedCursor) {
  if (secondRunOffset !== savedCursor) {
    throw new ScannerValidationError(`Second run should resume from saved cursor ${savedCursor}, but started at ${secondRunOffset}.`);
  }
}

export function assertStaleLockRecovered(body, seededStaleRunId) {
  if (body.status === 'already_running') {
    throw new ScannerValidationError('Stale lock was not recovered — run reported already_running instead of proceeding.');
  }
  if (!VALID_SCAN_STATUSES.has(body.status) || body.status === 'already_running') {
    throw new ScannerValidationError(`Unexpected status after stale-lock recovery: ${body.status}.`);
  }
  if (body.runId === seededStaleRunId) {
    throw new ScannerValidationError('Run after stale-lock recovery reused the seeded stale runId instead of issuing a new one.');
  }
}

// Scans arbitrary text (workflow logs / summaries this script itself
// produced) for literal occurrences of known secret values. Never logs the
// secret values themselves — only which named secret leaked, if any.
export function scanTextForSecrets(text, namedSecrets) {
  const leaked = [];
  for (const [name, value] of Object.entries(namedSecrets)) {
    if (typeof value === 'string' && value.length >= 8 && text.includes(value)) {
      leaked.push(name);
    }
  }
  return leaked;
}

// --- Live orchestration (not unit-testable without a real server + branch) ---

// A live dispatch showed a misconfigured scanner run (unbounded slice, see
// the workflow's build-step comment) taking minutes to respond instead of
// failing fast — a bounded timeout here means a similar future problem
// surfaces as a clear timeout error instead of consuming the whole job's
// time budget in a silent hang.
const SCANNER_REQUEST_TIMEOUT_MS = 60_000;

async function jsonFetch(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(SCANNER_REQUEST_TIMEOUT_MS) });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Deliberately left as null — assertions below treat a non-JSON body as
    // a failure rather than throwing a parse error that masks the real one.
  }
  return { status: response.status, body, rawText: text };
}

async function runValidationScenarios(ctx) {
  const { admin, scanUrl, cronSecret, serviceRoleKey, runMarker, market, results, observedRunIds, deleteCacheRow, readCacheRow, seedLockRow } = ctx;

  // Clean slate: this is an isolated branch, but a reused one may carry
  // state from a prior dispatch against the same PR.
  await deleteCacheRow(LOCK_KEY(market));
  await deleteCacheRow(CURSOR_KEY(market));

  // --- A: unauthorized request ---
  {
    const before = await readCacheRow(LOCK_KEY(market));
    const { status, body } = await jsonFetch(scanUrl, { method: 'GET' });
    assertUnauthorizedResponse({ status, body });
    const after = await readCacheRow(LOCK_KEY(market));
    if (after !== null || before !== null) {
      throw new ScannerValidationError('Unauthorized request must not create or observe a lock row.');
    }
    results.unauthorized = 'PASS';
  }

  // --- B: authorized request ---
  let authorizedBody;
  {
    const { status, body } = await jsonFetch(scanUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assertAuthorizedResponse({ status, body });
    authorizedBody = body;
    if (body.runId) observedRunIds.add(body.runId);
    results.authorized = `PASS (status=${body.status})`;
  }

  // --- C: cursor persistence and resume ---
  {
    const cursorRow = await readCacheRow(CURSOR_KEY(market));
    if (authorizedBody.status !== 'already_running') {
      if (authorizedBody.nextCursor !== null && cursorRow === null) {
        throw new ScannerValidationError('Scan reported a nextCursor but no cursor row was persisted.');
      }
      results.cursorPersistence = cursorRow
        ? `PASS (persisted offset ${cursorRow.payload?.offset})`
        : 'PASS (universe exhausted in one pass; cursor cleared as expected)';

      const { status, body: secondBody } = await jsonFetch(scanUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      assertAuthorizedResponse({ status, body: secondBody });
      if (secondBody.runId) observedRunIds.add(secondBody.runId);
      if (cursorRow && typeof cursorRow.payload?.offset === 'number') {
        // The route does not expose "starting offset" directly; processed +
        // remaining from the first response bounds it, and the second run's
        // own persisted cursor (if any) must not restart at 0 when a
        // non-zero cursor was saved.
        const secondCursorRow = await readCacheRow(CURSOR_KEY(market));
        if (secondCursorRow && secondCursorRow.payload?.offset === 0 && cursorRow.payload.offset > 0) {
          throw new ScannerValidationError('Second run appears to have restarted from offset 0 instead of resuming.');
        }
      }
      results.cursorResume = 'PASS';
    } else {
      results.cursorPersistence = 'SKIPPED (first run reported already_running — unexpected on a freshly cleared branch)';
      results.cursorResume = 'SKIPPED';
    }
  }

  // --- D: overlapping lock ---
  {
    const seededRunId = `workflow-owned-overlap-${runMarker}`;
    await seedLockRow(seededRunId, freshExpiryIso(), { expectFresh: true });
    const { status, body } = await jsonFetch(scanUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assertAuthorizedResponse({ status, body });
    assertAlreadyRunning(body, seededRunId);

    // The already_running response alone doesn't prove the route left the
    // seeded lock untouched — confirm it's still owned by the seeded runId
    // before this scenario tears it down itself.
    const lockAfterResponse = await readCacheRow(LOCK_KEY(market));
    if (!lockAfterResponse || lockAfterResponse.payload?.runId !== seededRunId) {
      throw new ScannerValidationError(`Seeded overlap lock was not left owned by ${seededRunId} after the already_running response (test integrity check).`);
    }

    const { data: leakedRuns } = await admin.from('trader_scan_runs').select('id').eq('id', seededRunId);
    if (leakedRuns && leakedRuns.length > 0) {
      throw new ScannerValidationError('An already_running invocation unexpectedly persisted a scan run row.');
    }
    await deleteCacheRow(LOCK_KEY(market));
    results.overlappingLock = 'PASS';
  }

  // --- E: stale-lock recovery ---
  {
    const staleRunId = `workflow-owned-stale-${runMarker}`;
    await seedLockRow(staleRunId, staleExpiryIso(), { expectFresh: false });
    const { status, body } = await jsonFetch(scanUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assertAuthorizedResponse({ status, body });
    assertStaleLockRecovered(body, staleRunId);
    if (body.runId) observedRunIds.add(body.runId);
    const lockAfter = await readCacheRow(LOCK_KEY(market));
    if (lockAfter !== null) {
      throw new ScannerValidationError('Replacement lock was not released after the run completed.');
    }
    results.staleLockRecovery = 'PASS';
  }

  // --- F: failed-run cleanup — see docs/infra/supabase-preview-ci.md for
  // why this is validated via the existing deterministic unit tests
  // (scannerService.test.ts) rather than forced live over HTTP: this
  // codebase deliberately degrades gracefully on persistence errors rather
  // than aborting the run, so there is no safe, non-invasive way to force a
  // genuine uncaught failure through the real route without adding a
  // Production-accessible failure mode, which is explicitly out of scope.
  results.failedRunCleanup = 'UNVERIFIED_LIVE (see scannerService.test.ts "triggerScan failure recovery" — covered by the required Unit & Integration tests job)';

  // --- G: secret audit ---
  {
    const logText = JSON.stringify(results);
    const leaked = scanTextForSecrets(logText, { CRON_SECRET: cronSecret, SUPABASE_BRANCH_SERVICE_ROLE_KEY: serviceRoleKey });
    if (leaked.length > 0) {
      throw new ScannerValidationError(`Secret audit failed — leaked: ${leaked.join(', ')}.`);
    }
    results.secretAudit = 'PASS';
  }
}

// Runs unconditionally regardless of whether runValidationScenarios threw —
// this is what makes "cleanup must use if: always()" true at the script
// level, not just at the surrounding workflow-job level.
async function cleanupWorkflowOwnedRows({ admin, market, observedRunIds, deleteCacheRow, readCacheRow }) {
  await deleteCacheRow(LOCK_KEY(market));
  await deleteCacheRow(CURSOR_KEY(market));
  for (const runId of observedRunIds) {
    await admin.from('trader_scan_results').delete().eq('scan_run_id', runId);
    await admin.from('trader_scan_runs').delete().eq('id', runId);
  }
  const lockLeftover = await readCacheRow(LOCK_KEY(market));
  const cursorLeftover = await readCacheRow(CURSOR_KEY(market));
  if (lockLeftover !== null || cursorLeftover !== null) {
    throw new ScannerValidationError('Cleanup verification failed: a workflow-owned trader_cache row still exists after cleanup.');
  }
}

function writeSummary(results) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const lines = [
    '### Scanner validation matrix',
    '',
    '| Scenario | Result |',
    '| --- | --- |',
    ...Object.entries(results).map(([key, value]) => `| ${key} | ${value} |`),
    '',
  ].join('\n');
  console.log(lines);
  if (summaryPath) {
    appendFileSync(summaryPath, `${lines}\n`);
  }
}

// Standalone cleanup-only entry point, used by the workflow's dedicated
// cleanup job as a redundant safety net independent of whatever state the
// main validation run left things in (including a crash before its own
// internal cleanup ran). Reuses the exact same deletion + verification logic
// as the main run's cleanup, rather than a separate, untested implementation.
export async function runCleanupOnly() {
  const supabaseUrl = process.env.SUPABASE_BRANCH_URL;
  const serviceRoleKey = process.env.SUPABASE_BRANCH_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new ScannerValidationError('SUPABASE_BRANCH_URL / SUPABASE_BRANCH_SERVICE_ROLE_KEY are not set.');
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const ctx = buildRowContext(admin, 'US');
  await cleanupWorkflowOwnedRows({ ...ctx, observedRunIds: new Set() });
  console.log('Cleanup-only run: confirmed no workflow-owned trader_cache rows remain.');
}

export function buildRowContext(admin, market) {
  async function deleteCacheRow(key) {
    await admin.from('trader_cache').delete().eq('cache_key', key);
  }
  async function readCacheRow(key) {
    const { data } = await admin.from('trader_cache').select('payload, expires_at').eq('cache_key', key).maybeSingle();
    return data ?? null;
  }
  // Seeds a lock row and then reads it back before trusting it as a
  // scenario precondition — a live-run-adjacent review found the original
  // version never checked delete/insert/select errors and never confirmed
  // the row it just wrote was actually there, so a silently failed seed
  // could make a scenario "pass" without ever exercising the lock path it
  // claimed to test. expectFresh must be passed explicitly by every call
  // site so a fresh-lock scenario can never be accidentally seeded with a
  // stale (already-expired) expiry, or vice versa.
  async function seedLockRow(runId, expiresAtIso, { expectFresh }) {
    const key = LOCK_KEY(market);

    const del = await admin.from('trader_cache').delete().eq('cache_key', key);
    if (del.error) {
      throw new ScannerValidationError(`Failed to clear the existing lock row before seeding (test setup): ${del.error.message || del.error.code}.`);
    }

    const insert = await admin.from('trader_cache').insert({
      cache_key: key,
      payload: buildLockPayload(runId),
      expires_at: expiresAtIso,
      updated_at: new Date().toISOString(),
    });
    if (insert.error) {
      throw new ScannerValidationError(`Failed to insert the seeded lock row (test setup): ${insert.error.message || insert.error.code}.`);
    }

    const readBack = await admin.from('trader_cache').select('cache_key, payload, expires_at').eq('cache_key', key).maybeSingle();
    if (readBack.error) {
      throw new ScannerValidationError(`Failed to read back the seeded lock row (test setup): ${readBack.error.message || readBack.error.code}.`);
    }
    assertSeededLockRow(readBack.data, { expectedCacheKey: key, expectedRunId: runId, expectFresh });
  }
  return { admin, market, deleteCacheRow, readCacheRow, seedLockRow };
}

export async function main() {
  const baseUrl = process.env.SCANNER_BASE_URL || 'http://127.0.0.1:3100';
  const cronSecret = process.env.CRON_SECRET;
  const supabaseUrl = process.env.SUPABASE_BRANCH_URL;
  const serviceRoleKey = process.env.SUPABASE_BRANCH_SERVICE_ROLE_KEY;
  const runMarker = process.env.GITHUB_RUN_ID || 'local';
  const market = 'US';

  if (!cronSecret) throw new ScannerValidationError('CRON_SECRET is not set.');
  if (!supabaseUrl || !serviceRoleKey) throw new ScannerValidationError('SUPABASE_BRANCH_URL / SUPABASE_BRANCH_SERVICE_ROLE_KEY are not set.');

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const scanUrl = `${baseUrl}/api/trader/scanner/run`;
  const results = {};
  const observedRunIds = new Set();

  const ctx = { ...buildRowContext(admin, market), scanUrl, cronSecret, serviceRoleKey, runMarker, results, observedRunIds };

  let scenarioError = null;
  try {
    await runValidationScenarios(ctx);
  } catch (error) {
    scenarioError = error;
    results.failure = error instanceof Error ? error.message : String(error);
  }

  try {
    await cleanupWorkflowOwnedRows(ctx);
    results.cleanup = 'PASS';
  } catch (cleanupError) {
    results.cleanup = `FAIL — ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
    writeSummary(results);
    // Cleanup failure must make the workflow NO-GO even if every scenario
    // above passed.
    throw cleanupError;
  }

  writeSummary(results);
  if (scenarioError) throw scenarioError;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('scanner-validate.mjs');
if (invokedDirectly) {
  const entryPoint = process.argv.includes('--cleanup-only') ? runCleanupOnly : main;
  entryPoint().catch((error) => {
    console.error(`[scanner-validate] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
// Detects and safely repairs one specific, live-confirmed Supabase Preview
// branch defect: a freshly provisioned branch can record the baseline
// migration (00000000000000_create_base_public_schema.sql) as already
// applied in supabase_migrations.schema_migrations while the actual tables
// that migration creates (public.profiles and its twelve siblings) do not
// exist. `supabase db push` then trusts the bookkeeping, skips the
// baseline, and fails applying migration 001 against a schema that was
// never really seeded. See docs/infra/supabase-preview-ci.md ("Issue 2")
// for the original, purely local reproduction of this class of problem.
//
// Remediation history: `supabase db reset --linked` was tried first and
// worked functionally (it correctly answered its own confirmation prompt
// and began applying migrations), but was killed by a GitHub-hosted-runner
// SIGTERM ~20 seconds in, reproducibly, across multiple independent live
// dispatches with no concurrent run in the same concurrency group. Rather
// than keep retrying a command GitHub's own infrastructure kills, this
// materializes only the exact baseline migration file's SQL directly
// through the Supabase Management API's write-query endpoint — a single,
// fast, bounded write, gated behind the same branch-ownership assertions
// plus two baseline-specific ones. `supabase db reset` is not used
// anywhere in this file. `migration repair` is not used anywhere in this
// file — migration-history rows are never written to directly.

import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';

export const BASELINE_VERSION = '00000000000000';

// The thirteen tables public.profiles and its siblings created by
// 00000000000000_create_base_public_schema.sql — kept as a literal list
// here (not parsed from the SQL file) so this check has no dependency on
// that file's exact formatting ever changing.
export const BASELINE_TABLES = Object.freeze([
  'profiles',
  'expense_items',
  'investment_items',
  'financial_goals',
  'monthly_income_sources',
  'projects',
  'savings_items',
  'events',
  'financial_profiles',
  'holdings',
  'orders',
  'page_views',
  'savings',
]);

// The one function the baseline migration creates, with the exact
// properties it grants: SECURITY DEFINER, search_path pinned to public,
// EXECUTE granted only to service_role (revoked from public/anon/
// authenticated). Verified via pg_catalog, never information_schema — a
// live run showed information_schema.routines can omit a function that
// exists and was created successfully but that the Management API's
// read-only query role has no EXECUTE privilege on.
export const BASELINE_FUNCTION_SPECS = Object.freeze([
  Object.freeze({
    name: 'get_site_analytics',
    schema: 'public',
    argumentsSignature: '',
    resultType: 'json',
    searchPathConfig: 'search_path=public',
    executeGrantedTo: Object.freeze(['service_role']),
    executeRevokedFrom: Object.freeze(['anon', 'authenticated']),
  }),
]);

export class MigrationBaselineError extends Error {}

// --- Pure decision/parsing logic (unit-testable) ---

// General branch-ownership/identity safety gate, shared by any write this
// workflow ever performs against a workflow-created disposable branch.
export function assertSafeToWrite({ ref, productionRef, source, branchId, createdBranchId, persistent }) {
  if (!ref) throw new MigrationBaselineError('Resolved Preview ref is empty. Refusing to write.');
  if (!productionRef) throw new MigrationBaselineError('SUPABASE_PRODUCTION_REF is not set. Refusing to write without a way to prove the target is not Production.');
  if (ref === productionRef) throw new MigrationBaselineError(`Resolved ref ${ref} equals SUPABASE_PRODUCTION_REF. Refusing to write.`);
  if (source !== 'workflow_created') {
    throw new MigrationBaselineError(`Refusing to write to a branch with source "${source}" — this is only ever permitted for a branch this exact workflow run created (source "workflow_created"), never an externally-managed/reused branch.`);
  }
  if (!branchId || !createdBranchId || branchId !== createdBranchId) {
    throw new MigrationBaselineError('branch_id does not match the exact branch this workflow run created. Refusing to write.');
  }
  if (persistent !== false) {
    throw new MigrationBaselineError('Branch is not confirmed non-persistent/schema-only. Refusing to write.');
  }
}

// Baseline-specific safety gate: assertSafeToWrite plus the two additional
// conditions this class of write requires. A "partial" state (some but not
// all baseline objects exist) is deliberately never materialized — that
// needs a human to look, not an automated guess.
export function assertSafeToMaterializeBaseline({ ref, productionRef, source, branchId, createdBranchId, persistent, baselineState }) {
  assertSafeToWrite({ ref, productionRef, source, branchId, createdBranchId, persistent });
  if (baselineState === 'partial') {
    throw new MigrationBaselineError('Baseline schema is in a partial state (some but not all baseline objects exist). Refusing to materialize — this requires manual investigation, not automated repair.');
  }
  if (baselineState !== 'fully_missing') {
    throw new MigrationBaselineError(`Refusing to materialize the baseline: expected state "fully_missing" (recorded applied remotely, every baseline object absent), got "${baselineState}".`);
  }
}

// Parses `supabase migration list --linked` text-table output into
// structured rows. Header/separator lines (no backticks) are ignored by
// construction — the regex only matches genuine `version` | `version` |
// `version` data rows.
export function parseMigrationListTable(text) {
  const rowPattern = /^\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*$/;
  const rows = [];
  for (const line of text.split('\n')) {
    const match = line.match(rowPattern);
    if (!match) continue;
    const [, localCell, remoteCell] = match;
    const local = localCell.trim();
    const remote = remoteCell.trim();
    rows.push({
      version: local || remote || null,
      local: local.length > 0,
      remote: remote.length > 0,
    });
  }
  return rows;
}

// Classifies the baseline row against the live object-existence check:
//   - 'not_yet_applied' — baseline isn't recorded remotely yet; the normal
//     `db push` path applies it like any other pending migration.
//   - 'healthy'          — recorded applied, every baseline object exists.
//   - 'fully_missing'    — recorded applied, every baseline object is
//     absent — the live-confirmed defect this file exists to repair.
//   - 'partial'          — recorded applied, some but not all objects
//     exist — never automatically repaired.
export function classifyBaselineState(migrationRows, missingBaselineObjects) {
  const baselineRow = migrationRows.find((row) => row.version === BASELINE_VERSION);
  const recordedAppliedRemotely = Boolean(baselineRow?.remote);
  if (!recordedAppliedRemotely) return 'not_yet_applied';
  if (missingBaselineObjects.length === 0) return 'healthy';
  if (missingBaselineObjects.length === BASELINE_TABLES.length) return 'fully_missing';
  return 'partial';
}

export function localMigrationVersions(filenames) {
  return filenames
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.split('_')[0]);
}

export function verifyMigrationHistoryComplete(localVersions, migrationRows) {
  const remoteVersions = new Map();
  for (const row of migrationRows) {
    if (!row.remote || !row.version) continue;
    remoteVersions.set(row.version, (remoteVersions.get(row.version) ?? 0) + 1);
  }
  const missing = localVersions.filter((version) => !remoteVersions.has(version));
  if (missing.length > 0) {
    const sample = missing.slice(0, 5).join(', ');
    throw new MigrationBaselineError(`Migration history is missing ${missing.length} local version(s): ${sample}${missing.length > 5 ? ', ...' : ''}.`);
  }
  const duplicated = [...remoteVersions.entries()].filter(([, count]) => count > 1).map(([version]) => version);
  if (duplicated.length > 0) {
    throw new MigrationBaselineError(`Migration history contains duplicate remote entries: ${duplicated.join(', ')}.`);
  }
}

// Narrower check used immediately after materialization, before later
// migrations have been pushed: only the baseline row itself must appear
// applied exactly once — checking every local version here would be
// premature (001+ haven't run yet).
export function verifyBaselineRecordedOnce(migrationRows) {
  const baselineRows = migrationRows.filter((row) => row.version === BASELINE_VERSION && row.remote);
  if (baselineRows.length === 0) {
    throw new MigrationBaselineError('Baseline migration no longer appears as applied in migration history after materialization.');
  }
  if (baselineRows.length > 1) {
    throw new MigrationBaselineError('Baseline migration appears more than once in migration history after materialization.');
  }
}

export function functionIdentity(spec) {
  return `${spec.schema}.${spec.name}(${spec.argumentsSignature})`;
}

// proconfig comes back either as a JS array (["search_path=public"]) or as
// a Postgres array literal string ("{search_path=public}") depending on
// how the Management API serializes it — handle both.
function proconfigIncludes(proconfig, expected) {
  if (proconfig == null) return false;
  if (Array.isArray(proconfig)) return proconfig.includes(expected);
  if (typeof proconfig === 'string') {
    return proconfig
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((entry) => entry.trim())
      .includes(expected);
  }
  return false;
}

// Validates a pg_catalog.pg_proc/pg_namespace row set for one baseline
// function spec: exactly one match, SECURITY DEFINER, the expected
// search_path pin, and the expected result type. Pure and unit-testable —
// takes already-fetched rows rather than querying itself.
export function assertBaselineFunctionCatalogRow(spec, rows) {
  const identity = functionIdentity(spec);
  if (rows.length === 0) {
    throw new MigrationBaselineError(`Function ${identity} not found via pg_catalog (pg_proc/pg_namespace) after materialization.`);
  }
  if (rows.length > 1) {
    throw new MigrationBaselineError(`Found ${rows.length} pg_catalog matches for ${identity} — expected exactly one.`);
  }
  const [row] = rows;
  if (row.prosecdef !== true) {
    throw new MigrationBaselineError(`Function ${identity} is not SECURITY DEFINER (prosecdef=${row.prosecdef}).`);
  }
  if (!proconfigIncludes(row.proconfig, spec.searchPathConfig)) {
    throw new MigrationBaselineError(`Function ${identity} does not have "${spec.searchPathConfig}" in its configuration (proconfig=${JSON.stringify(row.proconfig)}).`);
  }
  if (row.result_type !== spec.resultType) {
    throw new MigrationBaselineError(`Function ${identity} returns "${row.result_type}", expected "${spec.resultType}".`);
  }
  return row;
}

// Validates EXECUTE privilege grants/revokes for one baseline function
// spec against a single has_function_privilege() result row. Pure and
// unit-testable.
export function assertBaselineFunctionPrivileges(spec, privilegeRow) {
  const identity = functionIdentity(spec);
  for (const role of spec.executeGrantedTo) {
    if (privilegeRow[`${role}_execute`] !== true) {
      throw new MigrationBaselineError(`Role "${role}" lacks EXECUTE on ${identity} after materialization.`);
    }
  }
  for (const role of spec.executeRevokedFrom) {
    if (privilegeRow[`${role}_execute`]) {
      throw new MigrationBaselineError(`Role "${role}" unexpectedly has EXECUTE on ${identity} after materialization — the baseline revokes this.`);
    }
  }
}

export function readLocalMigrationFilenames(migrationsDir) {
  return readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));
}

export function hashBaselineFile(sql) {
  return {
    sha256: createHash('sha256').update(sql, 'utf8').digest('hex'),
    bytes: Buffer.byteLength(sql, 'utf8'),
  };
}

// --- Management API (live, not unit-testable without a real branch) ---

const MANAGEMENT_API_BASE = process.env.SUPABASE_MANAGEMENT_API_BASE_URL || 'https://api.supabase.com';

class SupabaseQueryError extends Error {}

async function queryReadOnly(ref, sql, { accessToken, fetchImpl = fetch }) {
  const url = `${MANAGEMENT_API_BASE}/v1/projects/${ref}/database/query/read-only`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
  } catch (networkError) {
    throw new SupabaseQueryError(`Could not reach the Supabase Management API: ${networkError.message}`);
  }
  if (response.status !== 201) throw new SupabaseQueryError(`Read-only query returned HTTP ${response.status}.`);
  let rows;
  try {
    rows = await response.json();
  } catch {
    throw new SupabaseQueryError('Read-only query response was not valid JSON.');
  }
  if (!Array.isArray(rows)) throw new SupabaseQueryError('Read-only query returned an unexpected (non-array) response shape.');
  return rows;
}

export async function queryBaselineObjectStatus({ ref, accessToken, fetchImpl }) {
  const list = BASELINE_TABLES.map((t) => `'${t}'`).join(',');
  const rows = await queryReadOnly(
    ref,
    `select table_name from information_schema.tables where table_schema = 'public' and table_name in (${list});`,
    { accessToken, fetchImpl },
  );
  const present = new Set(rows.map((r) => r.table_name));
  const missing = BASELINE_TABLES.filter((t) => !present.has(t));
  return { present: [...present], missing };
}

export async function queryBaselineFunctionCatalogRow({ ref, accessToken, fetchImpl, spec }) {
  return queryReadOnly(
    ref,
    `select
       p.oid::regprocedure::text as identity,
       p.proname,
       p.prosecdef,
       p.proconfig,
       pg_get_function_result(p.oid) as result_type
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = '${spec.schema}'
       and p.proname = '${spec.name}'
       and p.prokind = 'f'
       and pg_get_function_identity_arguments(p.oid) = '${spec.argumentsSignature}';`,
    { accessToken, fetchImpl },
  );
}

export async function queryBaselineFunctionPrivileges({ ref, accessToken, fetchImpl, spec }) {
  const identity = functionIdentity(spec);
  const roles = [...spec.executeGrantedTo, ...spec.executeRevokedFrom];
  const columns = roles
    .map((role) => `has_function_privilege('${role}', '${identity}', 'EXECUTE') as "${role}_execute"`)
    .join(',\n       ');
  const rows = await queryReadOnly(ref, `select\n       ${columns};`, { accessToken, fetchImpl });
  if (rows.length === 0) {
    throw new MigrationBaselineError(`Privilege check for ${identity} returned no rows.`);
  }
  return rows[0];
}

// Full pg_catalog-based verification for one baseline function spec:
// existence/uniqueness/SECURITY DEFINER/search_path/result-type, then
// EXECUTE grants/revokes. Never uses information_schema — see
// BASELINE_FUNCTION_SPECS for why.
export async function verifyBaselineFunctionSpec({ ref, accessToken, fetchImpl, spec }) {
  const rows = await queryBaselineFunctionCatalogRow({ ref, accessToken, fetchImpl, spec });
  assertBaselineFunctionCatalogRow(spec, rows);
  const privilegeRow = await queryBaselineFunctionPrivileges({ ref, accessToken, fetchImpl, spec });
  assertBaselineFunctionPrivileges(spec, privilegeRow);
}

export async function queryBaselineRlsStatus({ ref, accessToken, fetchImpl }) {
  const list = BASELINE_TABLES.map((t) => `'${t}'`).join(',');
  const rows = await queryReadOnly(
    ref,
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (${list});`,
    { accessToken, fetchImpl },
  );
  const byName = new Map(rows.map((r) => [r.relname, r.relrowsecurity === true]));
  const withoutRls = BASELINE_TABLES.filter((t) => byName.get(t) === false);
  const missingTables = BASELINE_TABLES.filter((t) => !byName.has(t));
  return { withoutRls, missingTables };
}

// Executes the exact baseline migration SQL once through the Management
// API's write-query endpoint. Never logs the SQL, the response body, or
// any header — only a truncated error detail on failure, which by
// construction (a Postgres/Management-API error message) never contains
// the access token.
export async function materializeBaseline({ ref, accessToken, sql, fetchImpl = fetch }) {
  const url = `${MANAGEMENT_API_BASE}/v1/projects/${ref}/database/query`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql, read_only: false }),
    });
  } catch (networkError) {
    throw new MigrationBaselineError(`Could not reach the Supabase Management API: ${networkError.message}`);
  }
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new MigrationBaselineError(`Management API write-query response for ${ref} (name only) was not valid JSON (HTTP ${response.status}).`);
    }
  }
  if (!response.ok) {
    const detail = (parsed && (parsed.message || parsed.error)) || text.slice(0, 300) || '(no body)';
    throw new MigrationBaselineError(`Management API write-query returned HTTP ${response.status}: ${detail}`);
  }
  // A successful HTTP status doesn't guarantee the SQL itself succeeded —
  // fail closed on an explicit error/message field anywhere in the body.
  if (parsed && !Array.isArray(parsed) && (parsed.error || parsed.message)) {
    throw new MigrationBaselineError(`Management API reported a SQL error while materializing the baseline: ${parsed.error || parsed.message}`);
  }
  return parsed;
}

// Combined post-materialization acceptance check: baseline recorded
// exactly once, every baseline object present, every baseline function
// present, every baseline table has RLS enabled. Throws
// MigrationBaselineError (workflow NO-GO) on the first failed condition.
export async function verifyPostMaterialization({ ref, accessToken, fetchImpl, migrationStatusText }) {
  const rows = parseMigrationListTable(migrationStatusText);
  verifyBaselineRecordedOnce(rows);

  const { missing } = await queryBaselineObjectStatus({ ref, accessToken, fetchImpl });
  if (missing.length > 0) {
    throw new MigrationBaselineError(`Baseline object(s) still missing after materialization: ${missing.join(', ')}.`);
  }
  for (const spec of BASELINE_FUNCTION_SPECS) {
    await verifyBaselineFunctionSpec({ ref, accessToken, fetchImpl, spec });
  }
  const { withoutRls, missingTables } = await queryBaselineRlsStatus({ ref, accessToken, fetchImpl });
  if (missingTables.length > 0) throw new MigrationBaselineError(`Baseline table(s) missing during RLS verification: ${missingTables.join(', ')}.`);
  if (withoutRls.length > 0) throw new MigrationBaselineError(`Baseline table(s) missing expected row level security: ${withoutRls.join(', ')}.`);
}

// --- CLI ---

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      flags[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return flags;
}

function parsePersistent(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const flags = parseFlags(rest);
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (command === 'check-baseline') {
    const { readFileSync, appendFileSync } = await import('node:fs');
    const text = readFileSync(flags['migration-status-file'], 'utf8');
    const rows = parseMigrationListTable(text);
    const { missing } = await queryBaselineObjectStatus({ ref: flags.ref, accessToken });
    const state = classifyBaselineState(rows, missing);
    console.log(`Baseline state: ${state}.${missing.length > 0 ? ` Missing objects: ${missing.join(', ')}.` : ''}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `baseline_state=${state}\n`);
    return;
  }

  if (command === 'materialize-baseline') {
    const { readFileSync } = await import('node:fs');
    const migrationStatusText = readFileSync(flags['migration-status-file'], 'utf8');
    const rows = parseMigrationListTable(migrationStatusText);
    const { missing } = await queryBaselineObjectStatus({ ref: flags.ref, accessToken });
    const baselineState = classifyBaselineState(rows, missing);

    assertSafeToMaterializeBaseline({
      ref: flags.ref,
      productionRef: flags['production-ref'],
      source: flags.source,
      branchId: flags['branch-id'],
      createdBranchId: flags['created-branch-id'],
      persistent: parsePersistent(flags.persistent),
      baselineState,
    });
    console.log(`Safe to materialize: ref ${flags.ref} is workflow_created, non-Production, non-persistent, matches branch_id ${flags['branch-id']}, and baseline state is "${baselineState}".`);

    const sql = readFileSync(flags['baseline-sql-file'], 'utf8');
    const { sha256, bytes } = hashBaselineFile(sql);
    console.log(`Baseline file: ${flags['baseline-sql-file']} (sha256 ${sha256}, ${bytes} bytes).`);

    await materializeBaseline({ ref: flags.ref, accessToken, sql });
    console.log(`Materialized the baseline against ${flags.ref} (name only) via the Management API write-query endpoint.`);
    return;
  }

  if (command === 'verify-post-materialization') {
    const { readFileSync } = await import('node:fs');
    const migrationStatusText = readFileSync(flags['migration-status-file'], 'utf8');
    await verifyPostMaterialization({ ref: flags.ref, accessToken, migrationStatusText });
    console.log(`Post-materialization verification passed: baseline recorded exactly once, all baseline tables/functions/RLS present on ${flags.ref}.`);
    return;
  }

  if (command === 'verify-migration-history-complete') {
    const { readFileSync } = await import('node:fs');
    const migrationStatusText = readFileSync(flags['migration-status-file'], 'utf8');
    const localVersions = localMigrationVersions(readLocalMigrationFilenames(flags['migrations-dir'] || 'supabase/migrations'));
    verifyMigrationHistoryComplete(localVersions, parseMigrationListTable(migrationStatusText));
    console.log(`Migration history is consistent: all ${localVersions.length} local migrations present exactly once.`);
    return;
  }

  console.error(`Unknown command: ${command}. Expected one of: check-baseline, materialize-baseline, verify-post-materialization, verify-migration-history-complete.`);
  process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('migration-baseline-check.mjs');
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[migration-baseline-check] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

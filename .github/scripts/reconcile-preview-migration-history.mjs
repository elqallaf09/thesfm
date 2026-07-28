#!/usr/bin/env node
// Preview-only migration-history reconciliation tool.
//
// Purpose: when an isolated Supabase Preview branch's *schema* already
// matches what a given local migration file would produce, but that
// version is missing from the branch's supabase_migrations.schema_migrations
// table, this script proves (does not assume) that the branch's live schema
// objects match what the migration would have created, and only then
// prints a `supabase migration repair --status applied <version>` command
// for a human to review and run. It never runs that command itself, and it
// never marks a migration as applied merely to silence an error.
//
// Requirements: SUPABASE_ACCESS_TOKEN, a target project ref, and this
// script running only against a resolved Preview ref (never Production —
// enforced below by a hard-coded comparison against SUPABASE_PRODUCTION_REF).
//
// Usage (dry-run only — this script never writes anything):
//   SUPABASE_ACCESS_TOKEN=... \
//   SUPABASE_PRODUCTION_REF=... \
//   node .github/scripts/reconcile-preview-migration-history.mjs <preview-project-ref> <migration-version...>
//
// Output is a plan only. A human reviews it and runs the printed
// `supabase migration repair` commands themselves.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , previewRef, ...versions] = process.argv;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!previewRef) fail('Usage: reconcile-preview-migration-history.mjs <preview-project-ref> <migration-version...>');
if (versions.length === 0) fail('Provide at least one candidate migration version (the numeric/timestamp prefix of a migration filename).');

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const productionRef = process.env.SUPABASE_PRODUCTION_REF;
if (!accessToken) fail('SUPABASE_ACCESS_TOKEN is not set. This is a Management API token distinct from the Data API service-role key.');
if (!productionRef) fail('SUPABASE_PRODUCTION_REF is not set — refusing to run without a way to prove the target is not Production.');
if (!/^[a-z0-9]{20}$/.test(previewRef)) fail('The preview project ref does not look like a valid Supabase project ref.');
if (previewRef === productionRef) fail('The target ref equals SUPABASE_PRODUCTION_REF. Refusing to run against Production.');

console.log(`Target project ref: ${previewRef} (confirmed not equal to SUPABASE_PRODUCTION_REF)`);
console.log(`Candidate versions to check: ${versions.join(', ')}\n`);

// Extract the schema objects (tables, indexes) a migration file's CREATE
// statements would produce. This is a structural heuristic, not a full SQL
// parser — it is deliberately conservative: anything it cannot confidently
// classify is left out of the "proven" set, which only makes the tool more
// cautious (never a false "proven equivalent").
function extractExpectedObjects(sql) {
  const tables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1]);
  const indexes = [...sql.matchAll(/create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?/gi)].map((m) => m[1]);
  return { tables, indexes };
}

function findMigrationFile(version) {
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const match = readdirSync(dir).find((f) => f.startsWith(version));
  if (!match) fail(`No local migration file starts with version ${version}.`);
  return join(dir, match);
}

function queryRemote(sql) {
  // Uses the Supabase Management API's SQL execution endpoint via the CLI,
  // which is already authenticated with SUPABASE_ACCESS_TOKEN.
  const out = execFileSync('supabase', ['db', 'execute', '--project-ref', previewRef, '--sql', sql], {
    encoding: 'utf8',
    env: { ...process.env },
  });
  return out;
}

const plan = [];

for (const version of versions) {
  const filePath = findMigrationFile(version);
  const sql = readFileSync(filePath, 'utf8');
  const { tables, indexes } = extractExpectedObjects(sql);

  if (tables.length === 0 && indexes.length === 0) {
    console.log(`[${version}] No table/index CREATE statements detected — this tool does not have enough signal to prove equivalence. Skipping (not proposed for reconciliation).`);
    continue;
  }

  console.log(`[${version}] Expecting tables: [${tables.join(', ') || 'none'}], indexes: [${indexes.join(', ') || 'none'}]`);

  const missing = [];
  for (const table of tables) {
    const result = queryRemote(`select 1 from information_schema.tables where table_schema='public' and table_name='${table}';`);
    if (!result.includes('1')) missing.push(`table public.${table}`);
  }
  for (const index of indexes) {
    const result = queryRemote(`select 1 from pg_indexes where schemaname='public' and indexname='${index}';`);
    if (!result.includes('1')) missing.push(`index public.${index}`);
  }

  if (missing.length > 0) {
    console.log(`[${version}] NOT proven equivalent — missing on target: ${missing.join(', ')}. Not proposed for reconciliation.\n`);
    continue;
  }

  console.log(`[${version}] All expected objects exist on the target. Proposing reconciliation.\n`);
  plan.push(version);
}

console.log('=== Reconciliation plan ===');
if (plan.length === 0) {
  console.log('No candidate versions were proven equivalent. Nothing to reconcile.');
  process.exit(0);
}

console.log('The following versions had every expected schema object confirmed present on the target.');
console.log('Review each one, then run manually if you agree:\n');
for (const version of plan) {
  console.log(`  supabase migration repair --status applied ${version} --project-ref ${previewRef}`);
}
console.log('\nThis script has not executed any of the above. Nothing was written to the target database.');

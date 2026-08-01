# Supabase Preview CI: root cause and current state

## Update: self-sufficient provisioning and a real scanner validation matrix

`Supabase Preview Validate` no longer depends exclusively on the external
"Supabase Preview" GitHub check described in Issue 1 below. Resolution order
is now: 1) resolve the exact target SHA, 2) reuse a successful
externally-resolved Preview branch for that exact SHA if one exists
(unchanged), 3) otherwise create a workflow-owned, non-persistent,
schema-only ephemeral branch via the Supabase Management API
(`.github/scripts/supabase-branch.mjs`) and wait for it to become healthy.
Every credential this creates is masked immediately and only ever exported
job-scoped via `$GITHUB_ENV`, never as a cross-job `outputs:` value.

The workflow now also runs a real, live scanner-validation matrix
(`.github/scripts/scanner-validate.mjs`) against the resolved isolated
branch — the actual `/api/trader/scanner/run` route, running in production
mode, configured exclusively with that branch's own credentials — covering
unauthorized rejection, authorized structured response, cursor
persistence/resume, the overlapping-run lock (`already_running`), and
stale-lock recovery. Two scenarios are deliberately **not** claimed as
live-verified, and are reported as such rather than faked:

- **Failed-run cleanup**: this codebase's scanner deliberately degrades
  gracefully on persistence errors (they're logged and swallowed) rather
  than aborting the run, so there is no safe, non-invasive way to force a
  genuine uncaught failure through the real route without adding a
  Production-accessible failure mode or test-only API — both explicitly out
  of scope. This scenario is validated instead via the existing
  deterministic unit tests in `scannerService.test.ts` ("triggerScan failure
  recovery"), which are part of the required `CI/Unit & Integration tests`
  job.
- **Vercel deployment runtime logs**: the workflow resolves the READY
  deployment and confirms Deployment Protection bypass works and the
  homepage doesn't return a 5xx, but does not call Vercel's runtime-logs API
  — doing so needs the deployment's Vercel-internal ID and (for team-owned
  projects) a team ID, neither resolved with enough confidence to implement
  without risking a wrong, silently-passing check. It also does not send any
  state-changing scanner request to the Vercel Preview itself, since the
  workflow cannot currently prove which Supabase project ref that
  deployment's own runtime environment variables point at — the stateful
  scanner validation runs instead against the isolated local server
  described above.

See PR history for the specific evidence that motivated this (PR #58, #53
both blocked on the prior workflow's migration-only, external-check-only
design).

## Original summary

The "Supabase Preview" GitHub check (created by Supabase's own GitHub App
integration, `app.slug == "supabase"`) and the `CI/Authenticated Preview
smoke` job that depends on it are not reliable for this repository today.
This is caused by two distinct, confirmed issues — one external to this
repository, one internal.

## Issue 1: branch-per-PR association is missing for most branches (external)

For feature-branch PRs, the Supabase check itself reports:

> This git branch is not associated with any Supabase Branch. You can open a
> PR to create a new branch.

This is a statement from Supabase's own backend, not from any code in this
repository — there is no workflow, script, or `package.json` command
anywhere in this repo that invokes the Supabase CLI (`supabase db push`,
`supabase migration up`, `supabase link`, `supabase db reset` — verified by
repo-wide grep). The entire branch-provisioning decision happens on
Supabase's infrastructure. Resolving this requires access to the Supabase
dashboard's Branching settings (or support), which this change cannot
provide.

## Issue 2: replaying the migration chain against an already-migrated
## snapshot fails (confirmed, reproducible)

For `main` itself (and branches that *do* get a Supabase Branch), the check
attempts a real migration application and fails with:

```
ERROR: relation "events_name_idx" already exists (SQLSTATE 42P07)
At statement: 29
create index events_name_idx on public.events (name)
```

### Reproduction

This was reproduced twice, independently, with real (non-mocked) Postgres
execution against the exact 133-file `supabase/migrations/` chain — first
with `@electric-sql/pglite` (WASM Postgres), then with `embedded-postgres`
(a native Postgres 18.4 binary) — outside any Supabase project, using no
credentials:

- **Pass 1** (fresh, empty database): all 133 migrations apply successfully.
- **Pass 2** (replaying the same 133 migrations again, against the
  now-already-migrated database from pass 1): fails at the very first file,
  `00000000000000_create_base_public_schema.sql`, with the identical error
  Supabase's real check reports: `relation "events_name_idx" already exists`.

This conclusively shows the migration chain is fundamentally sound (clean
application from empty always succeeds), and the failure is specific to
**replaying the full history against a target that already has some or all
of the schema** — i.e. exactly what happens if Supabase's branch
provisioner seeds a new branch from a schema snapshot and then re-applies
migrations without correctly recognizing which versions are already
present in that snapshot's `supabase_migrations.schema_migrations` table.

### Why this was not "fixed" by editing the old migration file

`00000000000000_create_base_public_schema.sql`'s own header states:

> Schema-only baseline for the thirteen public tables that predate
> repository migrations. This migration is intentionally data-free and safe
> to replay against databases where the tables already exist.

This is a first-party admission that the file represents schema that
**predates migration tracking** — i.e. was already live in Production
before this migration file existed. Editing historical migration files that
already represent applied/Production state was explicitly out of scope for
this change without direct confirmation from someone with Production
database access. The same conservative standard was applied to two other
edited-then-reverted files (`20260718215822_create_intelligence_analyses.sql`,
`20260719083438_create_intelligence_analysis_outcomes.sql`), since their PR
numbering places them before the current `main` HEAD and they have very
likely already deployed through the normal merge-to-`main` pipeline.

**No migration file in this repository was modified by this change.**

## What this change adds instead

1. **`CI/Supabase migrations (clean chain)`** (`.github/workflows/ci.yml`) —
   a new, always-run, fully self-contained CI job. It spins up a genuine
   Postgres 17 service container, bootstraps minimal stand-ins for the
   Supabase-managed schemas the migrations reference
   (`auth.*`, `storage.*`, `net.*`, `vault.*`, `cron.*` — see
   `.github/scripts/bootstrap-supabase-stubs.sql`), and applies all 133
   migration files **once**, in order, against that fresh database. It does
   **not** perform a second replay — historical apply-once migrations are
   not required to be idempotent against an already-populated schema, and
   asserting otherwise would be testing the wrong thing. This job requires
   no external credentials and does not depend on Supabase's own branch
   integration, so it cannot silently skip.

2. **`Scanner Isolated Preview Validate`** (`.github/workflows/scanner-isolated-preview-validate.yml`)
   — an on-demand (`workflow_dispatch`) workflow that can target an
   arbitrary already-open PR (by number) or exact commit SHA, without
   needing a new commit on that PR. It:
   - Resolves the exact target SHA.
   - **Fails closed** (not silently skips) if any of the following required
     secrets/variables are absent, naming each one explicitly: `CRON_SECRET`,
     `VERCEL_AUTOMATION_BYPASS_SECRET`, `SUPABASE_ACCESS_TOKEN`, and
     `SUPABASE_PRODUCTION_REF`.
   - If all secrets are present, reuses the exact isolated Preview project
     already resolved for that SHA or creates a workflow-owned disposable
     branch (asserting it is never equal to `SUPABASE_PRODUCTION_REF`), runs
     `supabase migration list --linked` to compare local vs. remote
     migration history, and applies only genuinely unapplied versions via
     `supabase db push --linked` — the official Supabase CLI's own
     idempotent apply mechanism, not a custom replay loop.
   - Cleanup runs with `if: always()`.
   - Uses a `concurrency` group keyed by target PR/SHA.

3. **`.github/scripts/reconcile-preview-migration-history.mjs`** — a
   standalone, human-run, dry-run-only tool for the narrow case where a
   Preview branch's live schema already matches what a given migration
   file would produce, but that version is missing from
   `supabase_migrations.schema_migrations`. For each candidate version, it
   extracts the tables/indexes the migration file would create and queries
   the target's `information_schema`/`pg_catalog` to prove every one of
   them already exists before proposing (never executing)
   `supabase migration repair --status applied <version>`. It refuses to
   run against `SUPABASE_PRODUCTION_REF`. **This script has not been
   executed against a real Supabase project** — see "Known limitations"
   below.

## Known limitations (honest status, updated)

- `SUPABASE_ACCESS_TOKEN`, `CRON_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET`,
  and `SUPABASE_PRODUCTION_REF` are now all configured (confirmed by the
  `validate-required-secrets` job passing). `VERCEL_TOKEN` is intentionally
  **not** required — nothing in this workflow currently consumes it; see the
  "Vercel deployment runtime logs" limitation above.
- The Supabase Management API request/response shapes used by
  `.github/scripts/supabase-branch.mjs` (branch create, status poll,
  api-keys retrieval, delete) are implemented against Supabase's documented
  public Management API and fail closed with an explicit, actionable message
  on any unexpected shape — but "the code is correct against the
  documentation" is not the same claim as "this has been proven against a
  live Management API." That proof comes from an actual `workflow_dispatch`
  run, tracked in this PR's evidence.
- `.github/scripts/reconcile-preview-migration-history.mjs` remains a
  standalone, human-run, dry-run-only tool and is unaffected by this update.
- Issue 1 above (branch association) is now largely mitigated by the
  self-sufficient fallback (step 3), but is still worth understanding: when
  it *is* present, this workflow correctly reuses it instead of creating a
  redundant branch.

## Rollback

Every file this update touches or adds
(`.github/workflows/scanner-isolated-preview-validate.yml`,
`.github/scripts/supabase-branch.mjs`, `.github/scripts/scanner-validate.mjs`,
and their tests) is additive or workflow-internal; reverting restores the
prior migration-only, external-check-only behavior with zero effect on
application code, migrations, or Production.

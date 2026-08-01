# Supabase Preview CI: root cause and current state

## Summary

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

2. **`Supabase Preview Validate`** (`.github/workflows/supabase-preview-validate.yml`)
   — an on-demand (`workflow_dispatch`) workflow that can target an
   arbitrary already-open PR (by number) or exact commit SHA, without
   needing a new commit on that PR. It:
   - Resolves the exact target SHA.
   - Accepts an optional explicit `preview_ref` for an already-created isolated
     Supabase branch when the external GitHub integration check is unavailable;
     the workflow still fails closed if that ref matches Production.
   - **Fails closed** (not silently skips) if any of the following required
     secrets/variables are absent, naming each one explicitly: `CRON_SECRET`
     (as a GitHub Actions secret — see below), `VERCEL_AUTOMATION_BYPASS_SECRET`,
     `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PREVIEW_SERVICE_ROLE_KEY`,
     `SUPABASE_PRODUCTION_REF`, `VERCEL_TOKEN`.
   - If all secrets are present, links to the *exact* isolated Preview
     project ref already resolved for that SHA (asserting it is never equal
     to `SUPABASE_PRODUCTION_REF` before doing anything), runs
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

## Known limitations (honest status)

- **`SUPABASE_ACCESS_TOKEN` does not exist as a secret in this repository**
  (confirmed via `gh secret list`). This is the Supabase Management API
  token required for `supabase link`/`migration list`/`db push`/
  `migration repair` — distinct from `SUPABASE_PREVIEW_SERVICE_ROLE_KEY`
  and `SUPABASE_SERVICE_ROLE_KEY`, which are Data API keys and cannot
  perform branch/migration management. Without it, the `snapshot-upgrade`
  job and the reconciliation script are **implemented but untested against
  a real Supabase project**. They are written against officially
  documented Supabase CLI behavior and fail closed rather than silently
  pass, but "the code is correct" is not the same claim as "this job has
  been proven to work" — it has not, and should not be treated as such
  until someone with the token runs it once and confirms.
- **`VERCEL_TOKEN` does not exist** anywhere in this repository. Reading
  function logs, duration, and CPU metrics for a specific Preview
  deployment requires it; this remains unimplemented pending that
  credential.
- **`CRON_SECRET` is configured in Vercel's environment but is not mirrored
  as a GitHub Actions secret.** A workflow cannot read a Vercel project
  environment variable directly — for CI to make an authenticated request
  to `/api/trader/scanner/run`, the same value needs to also exist as a
  GitHub Actions secret (ideally scoped to the `Preview` environment).
- **Issue 1 above (branch association) cannot be fixed from this
  repository at all** — it requires Supabase dashboard/account-level
  action.

## Rollback

Both new workflow files and the two new script files are additive; removing
them (`git revert` this PR) fully restores the prior CI behavior with zero
side effects, since nothing here modifies any existing job, migration file,
or application code path.

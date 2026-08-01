# Supabase Preview CI: root cause and current state

## Summary

The "Supabase Preview" GitHub check (created by Supabase's own GitHub App
integration, `app.slug == "supabase"`) and the `CI/Authenticated Preview
smoke` job that depends on it are not reliable for this repository today.
This is caused by two distinct, confirmed issues — one external to this
repository, one internal, the internal one with two different observed
manifestations depending on how the isolated Preview branch was itself
provisioned.

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
provide. `Supabase Preview Validate` (below) works around it instead of
depending on it: it can resolve an isolated Preview branch through an
explicit input or by creating one itself, without waiting on this
integration.

## Issue 2: migration history vs. live schema can disagree (confirmed, two manifestations)

Two independent, reproducible failure modes were found, both ultimately
rooted in a Preview branch's `supabase_migrations.schema_migrations`
bookkeeping not matching what tables/objects actually exist on that branch
— but in opposite directions, and tied to different provisioning paths.

### Manifestation A — replaying the full chain against an already-migrated snapshot

For `main` itself (and any branch pre-seeded from a Production-like
snapshot), naively re-running the entire migration chain fails with:

```
ERROR: relation "events_name_idx" already exists (SQLSTATE 42P07)
At statement: 29
create index events_name_idx on public.events (name)
```

This was reproduced twice, independently, with real (non-mocked) Postgres
execution against the exact 133-file `supabase/migrations/` chain — first
with `@electric-sql/pglite` (WASM Postgres), then with `embedded-postgres`
(a native Postgres 18.4 binary) — outside any Supabase project, using no
credentials:

- **Pass 1** (fresh, empty database): all 133 migrations apply successfully.
- **Pass 2** (replaying the same 133 migrations again, against the
  now-already-migrated database from pass 1): fails at the very first file,
  `00000000000000_create_base_public_schema.sql`, with the identical error
  Supabase's real check reports.

This conclusively shows the migration chain is fundamentally sound (clean
application from empty always succeeds), and the failure is specific to
**replaying the full history against a target that already has some or all
of the schema**. `Supabase Preview Validate` never replays blindly — it
always compares local vs. remote history first (`supabase migration list
--linked`) and applies only genuinely unapplied versions via `supabase db
push --linked`, which has not shown this failure against a real branch (see
"Verified status" below).

### Manifestation B — a freshly workflow-created branch can record the baseline as applied without creating it (tier-3 only)

Live-dispatched against a real, freshly *workflow-created* ephemeral branch
(via the Supabase Management API's branch-create endpoint — see "What this
change adds" below), the opposite mismatch was found: the baseline
migration (`00000000000000`) is recorded as **applied** in
`supabase_migrations.schema_migrations`, but the tables it creates
(`public.profiles` and its twelve siblings) **do not exist**. `supabase db
push` then trusts the bookkeeping, skips the baseline, and fails applying
migration `001` against a schema that was never really seeded.

This is specific to the workflow-created (tier 3) provisioning path — it
has not been observed against an explicitly-supplied or externally-resolved
branch (tiers 1–2), consistent with a snapshot-seeding defect on Supabase's
side of the branch-create flow. `Supabase Preview Validate` detects this
exact state (recorded-applied + every baseline object absent, as opposed to
"partial" — some but not all objects present, which is never automatically
repaired) and, **only for a branch this exact workflow run created**,
repairs it by materializing the exact, unmodified baseline migration file's
SQL directly through the Management API's write-query endpoint — see
"What this change adds" below for the full mechanism and its safety gating.

### Why neither manifestation was "fixed" by editing the old migration file

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
numbering places them before `main` HEAD and they have very likely already
deployed through the normal merge-to-`main` pipeline.

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
   needing a new commit on that PR. It resolves an isolated Preview branch
   through three tiers, in priority order:
   1. An explicit `preview_ref` input, when supplied (validated as a
      20-character Supabase project ref, rejected if it equals
      `SUPABASE_PRODUCTION_REF`).
   2. A successful externally-resolved "Supabase Preview" GitHub check for
      the exact target SHA, when one exists (see Issue 1).
   3. Otherwise, a workflow-owned, non-persistent, schema-only ephemeral
      branch, created via the Supabase Management API's branch-create
      endpoint and polled until it reports a healthy status
      (`ACTIVE_HEALTHY`, `MIGRATIONS_PASSED`, or `FUNCTIONS_DEPLOYED`).

   It then, for the one resolved ref:
   - **Fails closed** (not silently skips) if any of `CRON_SECRET`,
     `VERCEL_AUTOMATION_BYPASS_SECRET`, `SUPABASE_ACCESS_TOKEN`, or
     `SUPABASE_PRODUCTION_REF` (repository variable) is absent, naming each
     one explicitly. No static Supabase service-role secret is required —
     every Preview branch's own anon/service-role keys are resolved
     dynamically per branch through the Management API and masked
     immediately (`::add-mask::`), whether the branch came from tier 1, 2,
     or 3.
   - Links to the resolved ref (asserting it is never equal to
     `SUPABASE_PRODUCTION_REF` before doing anything), runs `supabase
     migration list --linked` to compare local vs. remote migration
     history, detects the tier-3-specific baseline mismatch described above
     (Manifestation B) and — only for a workflow-created branch — repairs
     it via a single, bounded Management API SQL write, verified afterward
     through `pg_catalog` (not `information_schema`, which can omit a
     function the query role has no privilege on) for existence,
     `SECURITY DEFINER`, `search_path`, result type, and the exact
     EXECUTE-grant set the baseline migration specifies. A **partial**
     mismatch (some but not all baseline objects present) is never
     automatically repaired under any provisioning tier — it fails closed
     for manual investigation. An explicit/externally-managed branch with a
     fully-missing baseline also fails closed rather than being written to.
   - Applies only genuinely unapplied migration versions via `supabase db
     push --linked` — the official Supabase CLI's own idempotent apply
     mechanism, not a custom replay loop — then re-verifies migration
     history is complete.
   - Runs a real, live scanner-validation matrix
     (`.github/scripts/scanner-validate.mjs`) against the resolved branch —
     the actual `/api/trader/scanner/run` route, running in production
     mode, configured exclusively with that branch's own credentials —
     covering unauthorized rejection, authorized structured response,
     cursor persistence/resume, the overlapping-run distributed lock
     (`already_running`, with a hardened seed step that fails closed rather
     than trusting an unverified write), and stale-lock recovery. Two
     things are deliberately **not** claimed as live-verified, and are
     reported as such rather than faked: failed-run cleanup (validated
     instead via `scannerService.test.ts`'s deterministic unit tests, part
     of the required `CI/Unit & Integration tests` job, since there is no
     safe way to force a genuine uncaught failure through the real route
     without a Production-accessible failure mode) and Vercel runtime
     logs (the workflow confirms Deployment Protection bypass and a
     non-5xx homepage response, but does not call Vercel's runtime-logs
     API — see the job's own step summary for why).
   - Optionally (`activate_rollout` / `run_authenticated_smoke` inputs)
     configures and redeploys the isolated Vercel Preview, or runs the full
     authenticated Playwright smoke suite against it — both existing
     capabilities (see 3–4 below), now wired to the one Preview ref this
     workflow itself resolved, whichever tier it came from, instead of a
     separate unvalidated input.
   - Cleanup runs with `if: always()`, after every other job including the
     optional rollout/authenticated-smoke ones, and only ever deletes a
     branch this workflow itself created (tier 3).
   - Uses a `concurrency` group scoped by workflow name and target
     PR/SHA/cleanup input, with `cancel-in-progress: false` — a later
     dispatch for the same target queues instead of cancelling an
     already-running, stateful validation partway through.

3. **`Isolated Preview Rollout`** (`.github/workflows/preview-rollout.yml`)
   — a manual, fail-closed rollout workflow used only after migration
   validation succeeds. It retrieves the selected Preview project's API keys
   inside GitHub Actions, masks them before use, writes Supabase and feature
   variables only to the selected Vercel Preview branch, verifies variable
   names without printing values, and rebuilds an exact READY deployment. It
   rejects a Supabase ref equal to `SUPABASE_PRODUCTION_REF`.

4. **`Authenticated Preview Validate`** (`.github/workflows/authenticated-preview-validate.yml`)
   — a manual, fail-closed workflow that resolves the exact-SHA READY Vercel
   Preview deployment, provisions isolated auth fixtures, and runs the full
   authenticated Playwright smoke suite (including a dedicated
   request-to-row observability/isolation spec) against it, cleaning up its
   fixtures afterward with `if: always()`.

5. **`.github/scripts/reconcile-preview-migration-history.mjs`** — a
   standalone, human-run, dry-run-only tool for a narrower case than either
   manifestation above: a Preview branch's live schema already matches what
   a given migration file would produce, but that version is missing from
   `supabase_migrations.schema_migrations`. For each candidate version, it
   extracts the tables/indexes the migration file would create and queries
   the target's `information_schema`/`pg_catalog` to prove every one of
   them already exists before proposing (never executing) `supabase
   migration repair --status applied <version>`. It refuses to run against
   `SUPABASE_PRODUCTION_REF`. This script has not been executed against a
   real Supabase project and is not invoked by any automated workflow —
   it is a manual escape hatch, independent of everything above.

## Verified status and remaining limitations

- `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN` are configured in the GitHub
  `Preview` environment (names/presence only; values are never printed).
  `VERCEL_TOKEN` is only required by the optional rollout/authenticated-smoke
  paths, not by the core migration/scanner validation every dispatch runs.
- Tier 1/2 resolution (explicit ref / external check) plus the plain
  `migration list` → `db push` → re-verify path was proven against a real
  isolated branch (`efyibkhjlqhvrmbrnuax`, all 133 migrations, run
  `30695563497`) — this is Manifestation A's mitigation, and did not
  encounter Manifestation B.
- Tier 3 resolution (workflow-created branch) plus Manifestation B's
  baseline-materialization repair, the pg_catalog-based function/privilege
  verification, and the full live scanner-validation matrix (including the
  hardened overlapping-lock seed verification) were proven end-to-end
  against a real, freshly created isolated branch in
  `elqallaf09/thesfm#71`'s development — see that PR's run history for the
  full evidence, most recently run `30717615107` (all scenarios PASS,
  branch deleted, zero workflow-owned rows left).
- Supabase's automatic GitHub check still does not reliably associate most
  feature-branch PRs with a branch (Issue 1) — the explicit `preview_ref`
  input (tier 1) or the workflow-created fallback (tier 3) are the audited
  paths around that until the account-level integration is repaired.

## Rollback

Every workflow and script file here is additive to the application code
path — nothing in this change modifies any migration file or
non-CI/non-infra source. Reverting any individual workflow/script restores
the prior behavior for that specific capability with no effect on the
others.

# Phase 5.0D P0/P1 remediation

Status: **NO-GO — database verification passed; application observability ingestion missing**
Scope: P0/P1 only; no P2/P3 remediation and no Production database action

## Remediation migration

New additive migration:
`20260717212305_phase_5_0d_p0_p1_security_hardening.sql`

The migration contains no data deletion, `TRUNCATE`, index change, performance tuning, or
observability schema change. It drops only the insecure avatar listing policy before creating
its owner-scoped replacement.

| Finding | Remediation | Code status | Runtime status |
|---|---|---|---|
| `public.handle_new_user()` | Fixed empty search path, fully qualified objects, direct execution revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role` | Addressed | Passed on isolated database |
| `public.sync_profile_email_from_auth()` | Fixed empty search path, fully qualified objects, direct execution revoked from API roles | Addressed | Passed on isolated database |
| Avatar bucket enumeration | Replaced bucket-wide authenticated `SELECT` with authenticated-user-folder `SELECT`; public URL delivery remains bucket-native and owner SELECT remains available for upsert | Addressed | Owner upsert passed; cross-user listing/update denied |
| Admin authorization helper | Added `app_private.is_current_user_admin_role(text)`, moved five admin RLS policies to it, revoked all execution on the old `public` helper | Addressed | Admin/non-admin RLS passed; targeted advisor cleared |

`app_private` is not present in repository Data API configuration. Supabase exposes `public` by
default and requires an explicit Data API setting to expose a custom schema. The next database
gate must independently prove that `app_private` is not exposed.

## Focused regression result

- `supabaseP0P1SecurityHardening.test.ts`: 5 passed
- `supabaseCleanChainBaseline.test.ts`: 4 passed
- `analyticsTrackRoute.test.ts`: 1 passed
- Total: **10 passed, 0 failed**

These are static repository tests. They do not replace a database apply, advisor rerun, grant
inspection, auth trigger test, cross-user Storage test, or Preview workflow proof.

## `public.observability_events` determination

Verdict: **a migration is missing from the current official chain; exclusion was not
intentional**.

Exact missing migration:

- final filename: `20260716113325_create_observability_schema.sql`
- final source commit: `fbb927ba3fce3448b08c1a4c4aec6ab5e801bdd8`
- Git blob: `f61fd242d974c1122323ce8b9e0de888fe02438b`
- original filename: `20260716113325_production_observability_rum.sql`
- original creation commit: `7f74e9580b21a59f27b6b327e468f1a80c538d3f`

The 262-line final migration creates `public.observability_events`, rollups, alerts, error
fingerprints, indexes, RLS, server-only grants, and maintenance functions.

### Why it is absent

The migration did not get deleted from the current branch. It was developed on the divergent
`origin/phase-5b-production-observability-rum` branch and was never incorporated into the
ancestry of `origin/main` or `origin/release/phase-5-0d-launch-readiness`.

Evidence:

- current remediation HEAD: `8cf6038a4a2ceb2f05c13ec06b64388254c6c936`
- observability final commit: `fbb927ba3fce3448b08c1a4c4aec6ab5e801bdd8`
- common ancestor: `09f6356cf2078fda5d84e722b3e5034a57e33ad2`
- `fbb927ba` is not an ancestor of the current HEAD
- only `origin/phase-5b-production-observability-rum` contains `fbb927ba`

The apparent disappearance is therefore a branch-integration omission, not an intentional
schema decision and not a migration-history rewrite.

## Completed observability recovery

The exact reviewed Git blob `f61fd242d974c1122323ce8b9e0de888fe02438b` was restored under
its original final filename and version. Source, worktree, and index hashes match. The file was
not recreated, rewritten, or manually reimplemented.

The resulting 131-migration chain passed from zero on disposable project
`yrwhirfwvdtevsjwpvjm`. Migration history, observability tables, RLS, grants, auth triggers,
avatar isolation/upsert, admin RLS, and database-level ingestion were verified. All synthetic
data was rolled back and the disposable project was deleted.

## Remaining blockers

### P0

- Confirmed code defects remaining: **0**.
- Isolated-database verification gates: passed.
- Remaining release blocker: the release branch has no application observability ingestion route
  or ingestion regression test.

### P1

- Confirmed code defects remaining: **0**.
- Isolated-database verification gates: passed.
- Preview workflow proof remains pending.

## Recommended next Production gate

Keep Production frozen. The database chain gate passed, but the next gate requires:

- integrate the existing observability application runtime and tests from their Git history;
- prove request-to-row observability ingestion on Preview;
- run the remaining critical Preview workflows and synthetic cleanup;
- reconfirm backup/restore readiness and immutable release SHA.

Until that evidence exists, the verdict remains **NO-GO**.

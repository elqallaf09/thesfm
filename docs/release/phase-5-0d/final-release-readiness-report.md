# Phase 5.0D final release-readiness report

Verdict: **NO-GO**
Database clean-chain result: **131/131 passed**
Production touched: **no**

## Immutable migration restoration

- Source ref: `origin/phase-5b-production-observability-rum`
- File: `20260716113325_create_observability_schema.sql`
- Source Git blob: `f61fd242d974c1122323ce8b9e0de888fe02438b`
- Restored worktree blob: `f61fd242d974c1122323ce8b9e0de888fe02438b`
- Restored index blob: `f61fd242d974c1122323ce8b9e0de888fe02438b`
- Result: exact match; the file was restored from Git and was not recreated, rewritten, or
  manually reimplemented.

Final ordering:

1. `00000000000000_create_base_public_schema.sql`
2. 128 intervening repository migrations through
   `20260715070609_investment_platform_directory_index_hardening.sql`
3. `20260716113325_create_observability_schema.sql` — position 130
4. `20260717212305_phase_5_0d_p0_p1_security_hardening.sql` — position 131

## Disposable project

- Project reference: `yrwhirfwvdtevsjwpvjm`
- Project name: `thesfm-131-chain-20260718-1784324019726`
- Region: `ap-south-1`
- API-reported creation timestamp: `2026-07-17T17:59:51.121403Z`
- Chain start: `2026-07-17T21:34:34.804Z`
- Chain completion: `2026-07-17T21:48:40.950Z`
- PostgreSQL platform version: `17.6.1.147`
- Quoted project cost: `$0/month`

No Production data, auth users, storage objects, credentials, backups, or secrets were copied
or used.

## Migration result

- Total repository migrations: 131
- Passed: 131
- Failed in final state: 0
- Remote migration-history rows: 131
- First remote name: `00000000000000_create_base_public_schema`
- Restored observability name: `20260716113325_create_observability_schema`, position 130
- Last remote name: `20260717212305_phase_5_0d_p0_p1_security_hardening`, position 131

The first attempt at migration 131 failed with `SQLSTATE 42501: must be owner of table objects`
because `ALTER POLICY` cannot alter a policy on Supabase-managed `storage.objects`. The migration
transaction rolled back completely: history remained at 130, `app_private` did not exist, and
the original avatar policy remained. Because this new migration had never succeeded or entered
remote history, its avatar operation was changed to drop the insecure policy and create the
owner-scoped replacement. The restored observability file was not changed. The retry passed.

## Schema and security verification

| Check | Result |
|---|---|
| `public.observability_events` | Exists; RLS enabled |
| `public.observability_rollups` | Exists; RLS enabled |
| `public.observability_alerts` | Exists; RLS enabled |
| `public.observability_error_fingerprints` | Exists; RLS enabled |
| Observability indexes | 17 across the four tables |
| `anon` observability SELECT/INSERT | Denied |
| `authenticated` observability SELECT/INSERT | Denied |
| `service_role` observability INSERT | Granted and tested |
| `handle_new_user()` | Trigger enabled; empty search path; no `anon`, `authenticated`, or `service_role` direct execute |
| `sync_profile_email_from_auth()` | Trigger enabled; empty search path; no `anon`, `authenticated`, or `service_role` direct execute |
| Old public admin helper | No direct API-role execution |
| Private admin helper | Fixed empty search path; admin RLS policies use `app_private` |
| `app_private` in authenticator role configuration | No |
| Avatar bucket | Public; broad listing policy removed |
| Avatar owner upsert | Passed |
| Cross-user avatar metadata/list/update | Denied |

Because `avatars` remains a public bucket, an object URL that is already known remains publicly
readable by design. The verified isolation boundary is object discovery/listing and mutation;
confidential avatar bytes would require a private bucket and signed URLs, which is outside this
P0/P1 scope.

## Transactional behavior tests

All synthetic test data was transaction-scoped and rolled back.

- `handle_new_user()`: inserting an auth user created the matching profile — passed
- `sync_profile_email_from_auth()`: confirmed email update synchronized lowercase profile email — passed
- Avatar owner insert/upsert/select — passed
- Second user avatar listing/select/update — denied
- Super-admin visibility and helper — passed
- Admin own-role visibility — passed
- Admin insertion of another role — denied
- Non-admin visibility and helper — denied
- Service-role observability event insertion and readback — passed

Post-test counts were zero for `auth.users`, `public.profiles`, `storage.objects`,
`public.admin_roles`, and `public.observability_events`.

## Advisors and repository tests

The P0/P1 advisor findings for both auth trigger functions, the public admin helper, and avatar
listing are cleared. The remaining targeted advisor is `company-assets` public listing, already
classified P2 and intentionally untouched.

- Security advisors: 30 total — 17 `rls_enabled_no_policy`, 12 mutable search paths, 1
  `company-assets` listing
- Performance advisors: 603 total — P2/P3 findings only and not modified
- Repository tests: 10 passed, 0 failed
- Focused ESLint: passed

## Application observability gap

Database-level observability ingestion passed. Application-level observability ingestion could
not be validated because the release branch does not contain:

- `src/app/api/observability/route.ts`
- `src/__tests__/unit/observabilityIngestion.test.ts`

Both files, plus the observability client/server libraries and admin dashboard, exist only on
`origin/phase-5b-production-observability-rum`. Only the exact migration was authorized and
restored in this task; no application code was copied or reimplemented.

This makes application observability ingestion a remaining release blocker.

## Final gate

The database chain and scoped P0/P1 database remediation are ready for Preview, but the release
is **NO-GO**. Before any Production consideration:

1. Integrate the reviewed observability runtime and tests from their existing Git history; do
   not manually reimplement them.
2. Run the observability ingestion unit test and a Preview request-to-row proof with synthetic
   cleanup.
3. Apply the 131-file chain to Preview only after confirming its migration-history state.
4. Rerun authenticated, admin, avatar, observability, provider, payment, email, and cleanup
   workflows on Preview.
5. Reconfirm backup/restore readiness and create an immutable release SHA.

## Cleanup

- Dashboard result: `Successfully deleted thesfm-131-chain-20260718-1784324019726`
- Independent inventory confirmation: `2026-07-17T21:58:05.0062201Z`
- Temporary project reference present after deletion: no
- Persistent synthetic auth users, profiles, storage objects, admin roles, or observability
  events: none
- Temporary credentials, branches, backups, or resources remaining: none
- Final estimated cost: `$0.00`

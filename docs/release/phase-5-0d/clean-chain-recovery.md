# Supabase clean-chain recovery

Status: **clean-chain verified; NO-GO because required observability schema is absent**
Production project ref: `hirjgsyfolsvfqjayyfz` — unchanged
First disposable Preview ref: `lwcaapfqxaoxkojehfdq`

## Reproduced failure

The original PR #37 Supabase integration started with an empty Preview database
(`with_data=false`) and failed before the first checked-in migration could complete.

- First failing migration: `001_add_sfm_persistence_columns.sql`
- First failing statement: `ALTER TABLE profiles ...`
- PostgreSQL error: `SQLSTATE 42P01: relation "profiles" does not exist`
- Root cause: repository migrations assumed public tables created before migration tracking,
  but no checked-in baseline created them.

The failure was not suppressed with `IF EXISTS`, and Production migration history was not
changed.

## Recovery implemented

Added `00000000000000_create_base_public_schema.sql`, a data-free schema baseline. The first
iteration created the seven tables directly referenced by early numbered migrations. Applying
that baseline and the existing chain to the empty Preview database succeeded for all 129
migrations through `20260715070609_investment_platform_directory_index_hardening.sql`.

Metadata comparison then found six additional pre-migration Production tables absent from the
baseline: `events`, `financial_profiles`, `holdings`, `orders`, `page_views`, and `savings`.
It also found the associated `get_site_analytics()` helper. The baseline has been amended to
create all thirteen legacy tables, their Production constraints/indexes/RLS policies/grants,
and the server-only analytics helper. The helper has a fixed `search_path`; execution is revoked
from `public`, `anon`, and `authenticated` and granted only to `service_role`.

Static regression coverage verifies that the baseline is first, data-free, enables RLS on every
legacy table, avoids unconditional policies, and keeps the definer helper server-only. Focused
result: 4 tests passed.

## Remaining verification gate

The amended thirteen-table baseline must be rerun from zero on a second empty database. The
first Preview now contains the successfully applied first iteration; resetting it would be a
destructive database action and was not performed.

Supabase reports a new disposable branch cost of **$0.01344 per hour**. Creating it requires
explicit cost confirmation. Until that confirmation and a clean second run:

- step 3 remains incomplete;
- storage remediation and later database work must not start;
- no Production migration is authorized;
- no Production migration history may be edited.

## Historical drift noted separately

The successful first chain produced 122 public tables versus 128 in Production before the six
legacy tables were added to the baseline. Beyond those missing base objects, metadata
fingerprints identified historical differences across 21 shared tables and several functions.
Those differences require deliberate schema-drift review; they are not hidden by broad
`IF EXISTS` changes and are not authorization to mutate Production.

## Authorized disposable-branch attempt

Attempt start: `2026-07-17T18:37:31.347Z`
Evidence capture completion: `2026-07-17T18:38:34.821Z`

The owner authorized one data-free disposable branch at the quoted `$0.01344/hour` rate,
including immediate deletion after verification. Supabase rejected creation before a branch
was provisioned:

- result: `PaymentRequiredException`
- exact message: `Branching is supported only on the Pro plan or above`
- branch reference: none
- migrations applied: 0
- Production data copied: no
- database/auth/storage metadata read from a new target: none, because no target existed
- deletion: not applicable; the branch list confirms that no new branch was created
- estimated final cost: `$0.00`

The focused baseline regression suite was rerun after the failed provisioning attempt:
4 tests passed, 0 failed. Step 3 remains blocked because the amended thirteen-table baseline
has not yet been run from zero. A new standalone Supabase project is reported at `$0/month`
for this organization, but a project is materially different from the authorized Preview
branch and will not be created without explicit authorization.

## Authorized standalone-project attempt

Attempt start: `2026-07-17T18:56:09Z`
Evidence capture completion: `2026-07-17T18:56:53.8935506Z`

The owner subsequently authorized one temporary, empty standalone Supabase project at the
quoted `$0/month` rate, solely for amended clean-chain verification and immediate deletion.
Supabase rejected project creation before provisioning because the organization is already at
its two-active-free-project limit:

- result: `BadRequestException`
- exact message: `The following organization members have reached their maximum limits for the number of active free projects within organizations where they are an administrator or owner: elqallaf09 (2 project limit). To continue, these users will need to either delete, pause or upgrade one or more of these projects.`
- temporary project reference: none
- temporary project creation timestamp: none
- migrations applied to a new target: 0
- Production or Preview data accessed, copied, imported, cloned, or connected: no
- Production or Preview environments modified: no
- credentials created, printed, exported, or committed: no
- deletion: not applicable; a post-attempt project-list check found zero projects whose name
  begins with `thesfm-clean-chain-`
- residual branches, backups, credentials, or other temporary resources: none, because no
  temporary project was provisioned
- estimated final cost: `$0.00`

The focused baseline regression suite passed immediately before the attempt: 4 tests passed,
0 failed. The local chain remains 129 migrations, from
`00000000000000_create_base_public_schema.sql` through
`20260715070609_investment_platform_directory_index_hardening.sql`. Clean-chain execution and
remote metadata/history verification remain blocked. Resolving the limit would require
pausing or deleting an existing project, or upgrading the organization; none of those actions
is authorized, and no such action was taken.

## Completed standalone-project verification

After a project slot became available, the owner authorized one temporary standalone project.
Project `bmzaosxxfiqkmckaeguf` was created empty and data-free, and all 129 repository migrations
were applied through `20260715070609_investment_platform_directory_index_hardening.sql`.
Remote migration history is consistent with the local chain. `public.profiles` exists and has
RLS enabled; all 128 existing public tables have RLS enabled. The required
`public.observability_events` table does not exist and is not referenced by any checked-in
migration, so the release remains NO-GO despite the chain being reproducible from empty.

The focused regression suite passed (4 passed, 0 failed). Schema lint produced 627 warnings:
32 security-advisor warnings and 595 performance-advisor warnings. Exact migration and lint
evidence is recorded in `standalone-clean-chain-verification.md` and
`clean-chain-schema-lint.md`.

The dashboard confirmed successful deletion of the temporary project. A subsequent project
inventory check at `2026-07-17T19:50:55.5586462Z` confirmed that the temporary reference no
longer exists. No temporary credentials, branches, backups, or resources remain. Estimated
final cost: `$0.00`. Production was not connected to, migrated, or modified.

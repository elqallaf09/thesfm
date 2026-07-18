# Phase 5.0D final Release Candidate report

Verified: 2026-07-18 (Asia/Kuwait)
Release branch: `remediation/release-readiness-20260717`
Release branch HEAD: `8cf6038a4a2ceb2f05c13ec06b64388254c6c936`
Authoritative source branch: `origin/phase-5b-production-observability-rum`

## Verdict

**NO-GO.** The historical application dependency restoration is complete and all local gates pass. The first remote Preview boundary fails because isolated Preview project `lwcaapfqxaoxkojehfdq` does not contain `public.observability_events`. No Preview deployment was created.

No Production access, migration, deployment, merge, or tag occurred.

## Exact restored files

All three files were restored from existing Git objects only. No content was recreated, rewritten, simplified, or replaced.

| File | Source blob | Staged index blob | Worktree blob | Result |
|---|---|---|---|---|
| `src/app/api/observability/route.ts` | `33b1173459c1fddec03ee925a6e4120bc4fd2b9c` | `33b1173459c1fddec03ee925a6e4120bc4fd2b9c` | `33b1173459c1fddec03ee925a6e4120bc4fd2b9c` | Exact |
| `src/__tests__/unit/observabilityIngestion.test.ts` | `26b7fb68c1d9f3f35ab5e1e8006d528d1885704a` | `26b7fb68c1d9f3f35ab5e1e8006d528d1885704a` | `26b7fb68c1d9f3f35ab5e1e8006d528d1885704a` | Exact |
| `src/lib/observability/core.ts` | `6b572394b440d9f3f5d4a9ed12bd4819df41140c` | `6b572394b440d9f3f5d4a9ed12bd4819df41140c` | `6b572394b440d9f3f5d4a9ed12bd4819df41140c` | Exact |

`git diff --check` passed.

## Dependency audit

`src/lib/observability/core.ts` contains no imports, re-exports, or runtime requires. It introduces no further original dependency. The route's other local import, `@/lib/server/adminAccess`, already exists.

Dependency-chain result: **complete for the restored API route and focused ingestion test**.

## Local validation

| Gate | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `tsc --noEmit --pretty false` exited 0 |
| ESLint | PASS | `eslint .` exited 0 |
| Focused observability ingestion | PASS | 1/1 file; 3/3 tests |
| Full unit/integration suite | PASS | 189/189 files; 1,472/1,472 tests |
| Next.js production build | PASS | Compiled, type-checked, generated 156 static pages, and included `/api/observability` |

## Preview isolation and first failing boundary

| Environment | Supabase project reference |
|---|---|
| Isolated Preview | `lwcaapfqxaoxkojehfdq` |
| Production | `hirjgsyfolsvfqjayyfz` |

The branch-scoped Vercel Preview URL, public credential, and privileged credential all resolved to `lwcaapfqxaoxkojehfdq`. No privileged credential used a `NEXT_PUBLIC_*` name. No Production credential or endpoint was used.

The Preview Data API metadata probe returned HTTP 404 for `observability_events`. A metadata-only SQL query then confirmed:

- PostgreSQL: 17.6
- `to_regclass('public.observability_events')`: null
- therefore the required table is absent from this Preview database

The stored Preview scope also has `NEXT_PUBLIC_OBSERVABILITY_ENABLED` disabled. A deployment-only non-secret override had been planned, but no deployment was attempted after the schema boundary failed.

## End-to-end flow

| Boundary | Status |
|---|---|
| Browser -> Next.js API | Not run |
| Next.js API -> observability route | Locally compiled and unit-tested |
| Observability route -> observability core | PASS locally |
| Observability core -> Supabase client | PASS locally |
| Supabase -> `public.observability_events` | BLOCKED: table absent in Preview |
| HTTP success response | Not verified remotely |
| Exactly one row inserted | No row attempted |
| Environment and deployment SHA | Unit-tested; not verified remotely |
| Normalized route | Unit-tested; not verified remotely |
| Secret/PII exclusion | Focused tests pass; no secret values printed |
| Cleanup | Zero synthetic rows before and after; no write occurred |

## Preview deployment

- Deployment ID: **not created**
- Reason: verification stopped before deployment at the missing Preview table boundary.

Temporary local Vercel environment snapshots were deleted after the metadata check. No credentials were printed or committed.

## Required next gate

Keep the Release Candidate at **NO-GO**. Reconcile the isolated Preview database with the already verified 131-migration repository chain using an explicitly authorized Preview-only migration workflow. Do not recreate the observability migration and do not touch Production. After `public.observability_events` exists with the verified RLS/grants, rerun the Preview deployment and single-row browser-to-database validation.

# Economic Intelligence: release verification and privilege hardening

Date: 2026-09-16. This is a dated verification record, not a blanket certification of every feature or security boundary.

## PR #119 is released

- GitHub reports PR #119 merged at 11:36:18 UTC. Squash commit: `7096805494db6691de557df307935e474cab1118`.
- Exact reviewed candidate: `905412aac43c7a1c2477d5e27d1c7576d81bc0de`. CI [35087838024](https://github.com/elqallaf09/thesfm/actions/runs/35087838024) completed successfully, including both browser smoke and the subsequent platform-performance step in job `104766788217`. The previous WebKit failure is no longer a pending release blocker on that candidate.
- Vercel deployment `dpl_3iA1qHuAUQ7V85DNoMHTVgvQMCwu` reports `READY`, target `production`, Git branch `main`, and the exact squash SHA. Its aliases include the production domain.
- A GET of `https://www.the-sfm.com/economic-intelligence` returned HTTP 200. Its HTML/RSC build ID was the squash SHA, and its static assets referenced that same deployment. This verifies the released route/build identity, not signed-in browser rendering or correctness of every personal result.
- Anonymous GETs to `/api/economic-intelligence/readiness`, `/api/economic-intelligence/provenance`, and `/api/economic-intelligence/daily-brief` returned HTTP 401, JSON `UNAUTHORIZED`, and `Cache-Control: no-store`; no personalized payload was returned.
- A Vercel runtime-error query scoped to the nine Economic Intelligence API routes from 11:39:15 UTC to the verification time returned no error clusters. Absence of logged errors is not proof of complete traffic coverage or fault-injection testing.

These observations supersede the old pending-CI/merge status in earlier progress notes. They do not convert previously skipped hosted Preview checks into passes.

## Confirmed hosted privilege issue and contained repair

Read-only catalog queries found RLS enabled and owner policies present on `user_decisions`, `notifications`, and `economic_intelligence_confirmations`. Authenticated CRUD privileges were also present. However, both `anon` and `authenticated` had direct `TRUNCATE` grants on all three tables. The earlier CRUD grant migration does not revoke pre-existing broader grants.

PostgreSQL documents that [whole-table TRUNCATE is not covered by row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html). This is an unnecessary database capability; this investigation did not establish an exposed HTTP exploit path or evidence of exploitation.

A narrow additive migration, `revoke_economic_intelligence_truncate`, was applied to the connected SFM database through the migration tool. Supabase recorded the generated version `20260916130053`; the repository filename uses that exact recorded identity and SQL, rather than inventing or rewriting a remote history entry.

The migration uses one atomic DO statement and:

- Revokes only TRUNCATE from `anon`, `authenticated`, and PUBLIC on those three tables.
- Requires RLS to already be enabled.
- Compares SELECT/INSERT/UPDATE/DELETE/REFERENCES/TRIGGER privileges for all three application/service roles before and after the operation.
- Preserves the service-role TRUNCATE privilege and checks effective denial for both application roles.
- Raises an exception, rolling back the statement, if any postcondition fails.

The migration completed successfully. An independent read-only query then verified on all three tables: anon TRUNCATE false; authenticated TRUNCATE false; authenticated CRUD true; RLS enabled; service-role TRUNCATE unchanged and true. No TRUNCATE, DELETE, INSERT, UPDATE, policy rewrite, default-privilege change, or blanket database push was executed. No user rows or secrets were read or changed by this repair.

Seven static regression cases accompany the migration. They are source-contract checks, not a substitute for executing SQL. The migration's database assertions execute when the normal clean-chain and disposable Supabase isolation workflows apply it. New-PR CI and merge status must be reported separately from the already completed hosted mitigation and PR #119 release.

## Remaining acceptance boundaries

- A complete signed-in production browser journey, including saving a confirmation, viewing a daily priority, and opening historical evidence, has not been executed in this continuation.
- This repair does not certify every finance/source table, all exposed routines, default privileges on future tables, or all historical migration identities.
- The separately documented historical migration reconciliation remains outside this small fix. No blanket migration repair is authorized by this record.
- The command-center page still contains English-only heading/quick-action copy inside the Arabic shell; localization work must preserve the successful release and be independently verified.

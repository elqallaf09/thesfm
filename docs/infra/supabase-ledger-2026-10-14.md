# Production ledger reconciliation — 14 October 2026

Scope: project `hirjgsyfolsvfqjayyfz`, repository at `8928f44` plus the
security follow-up. Execution owner: Codex, following Mohammed's explicit
instruction to continue production migration reconciliation. This record does
not approve financial-data backfills, new market availability, or a release.

## Seven proven identity aliases

The recorded SQL and repository file are **byte-for-byte identical** for all
seven entries (SHA-256 equality). PostgreSQL AST comparison with pglast 8.6 also
matched, discarding only source offsets and preserving function-body strings.
The pre-change ledger rows, file/body/AST hashes and comparison metadata are
retained in the separate `SFM-ledger-reconciliation-evidence.json` artifact.
No production application data or credentials are included in that artifact.

| Recorded version | Repository version | Name |
| --- | --- | --- |
| 20260914100949 | 20260914090000 | shariah_evidence_refresh |
| 20260919101519 | 20260919093250 | platform_completion_core |
| 20260919102051 | 20260919101941 | preserve_account_deletion_with_month_locks |
| 20260919104625 | 20260919104454 | guard_ledger_owner_before_period_lookup |
| 20260919195054 | 20260919190522 | advisor_plans_notification_delivery |
| 20260919195103 | 20260919191919 | investor_access_and_readonly_integrations |
| 20260919195110 | 20260919192531 | collaboration_tasks_and_profiles |

`scripts/reconcile-sfm-ledger-20261014.sql` changes only these seven `version`
values. It preserves names, statement arrays and every other ledger field.
An exclusive-write table lock, absent-target checks, exact SQL SHA-256 checks
and exact update counts protect the transaction. Any mismatch rolls back all
seven changes. Tests cover success, changed SQL, occupied target and missing
source. The repair never replays application SQL or marks an absent migration
as applied. Reverse only these mappings, with the same hash checks and retained
before-image, if metadata recovery becomes necessary.

Execution status: applied successfully to Production on 14 October 2026.
Read-back confirmed all seven new identities, none of the seven old identities,
unchanged SQL hashes and 152 total ledger rows. No application SQL was replayed.

## Ten separate historical gaps

Object presence alone is not evidence that the corresponding migration ran.
These remain absent from the ledger and are not blanket-marked as applied.

| Repository version | Current production observation | Disposition |
| --- | --- | --- |
| 20260914103000 | Outcome trigger has `search_path=pg_catalog, public` | Effect observed; history adoption needs full catalog reconciliation |
| 20260915053000 | All three valuation evidence/snapshot tables exist with RLS | Effect partially observed; do not replay CREATE POLICY statements blindly |
| 20260915133000 | Confirmation table has authenticated CRUD and RLS | Requested grant exists; broader inherited grants need separate review |
| 20260915234500 | `subject_asset` column and service-only snapshot RPC exist | Effect observed; compare full current function/constraints before history adoption |
| 20260916110000 | Authenticated valuation tables are SELECT-only; snapshot RPC is service-only | Access effect observed; keep ownership policies |
| 20260916194500 | Five seed symbols are absent | Pending catalog change; do not change market availability during this repair |
| 20260916233000 | 12 positions/checks remain pending verification | Pending financial-data verification; do not mark verified without row-level reconciliation |
| 20260916234500 | Those canonical positions have not been verified | Pending live-legacy reconciliation; preserve customer financial records |
| 20260917142000 | Raw observation table exists, RLS on, service-only privileges | Effect partially observed; complete catalog fingerprint before adoption |
| 20260927090000 | Atomic cooldown RPC is absent | Genuinely pending code/schema migration |

The two business/storage policies and two email-MFA/assurance migrations in
PR #301 are additional pending migrations. The strict drift check remains
unchanged and should still fail for these genuine or unresolved gaps. Do not
run a blanket `db push`. No production RLS, storage visibility, authentication
setting, seed symbol or financial row is changed by the identity repair.

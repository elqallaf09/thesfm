# Database readiness, backup, and restore report

Verdict: **NO-GO**

## Production inventory

| Check | Result |
|---|---|
| Project | `hirjgsyfolsvfqjayyfz`, `ap-south-1`, ACTIVE_HEALTHY, PostgreSQL 17.6 |
| Plan | Free |
| Size | 187,960,467 bytes (about 179 MiB) |
| Migrations | 128 Production / 128 repository after filename alignment |
| Public tables | 128; all have RLS enabled |
| Policies | 342; no `auth.role()` or `user_metadata` policy use found |
| Public functions | 19; 5 `SECURITY DEFINER`; 12 mutable `search_path` findings |
| Triggers / sequences | 34 / 3 |
| Realtime publication tables | 0 |
| `pg_cron` | Not installed; schedules are Vercel cron jobs |
| Storage | 8 buckets; `receipts` and `income-attachments` are public and currently empty |

## Migration readiness

- Production records `20260715070314 investment_platform_directory_tracking` and `20260715070609 investment_platform_directory_index_hardening`.
- The repository carried identical names under different version prefixes. This branch renames those two files only. No SQL changed and no Production migration was applied.
- The clean empty-database chain does not pass: the first checked-in migration alters pre-existing tables and no preceding schema baseline creates them.
- Supabase CLI and Docker were unavailable locally, and no isolated Preview database existed during the baseline. Therefore a local clean-chain execution and Production dry-run are **blocked**.
- After draft PR #37 opened, Supabase created isolated Preview ref `lwcaapfqxaoxkojehfdq`; its check ended `MIGRATIONS_FAILED`. This runtime result confirms that the clean chain cannot initialize the Preview database. No repair SQL was applied.
- There is no pending migration approved for Production. The public financial-bucket fix requires a separately approved additive migration, rollback SQL, timeout/lock review, and isolated Preview proof.

## Backup gate

| Requirement | Status | Evidence |
|---|---|---|
| Managed or manual backup exists | Blocked | Free plan; no backup artifact/timestamp supplied |
| Backup timestamp/checksum | Unavailable | No artifact |
| Retention | Not configured/proven | No backup policy evidence |
| Restore procedure | Documented operationally | See `operations-runbooks.md`; not executed |
| Isolated restore test | Blocked | No isolated project/branch and creating one has cost/authorization implications |
| Row-count/schema/RLS/function comparison | Blocked | Requires restored target |
| Application health against restored DB | Blocked | Requires restored target and isolated Preview env |

The database gate cannot pass through static inspection. A successful dump command alone would also be insufficient: the release requires an actual isolated restore and comparison.

## Storage and RLS findings

- All public-schema tables have RLS enabled, but RLS enablement alone does not prove policy correctness for every role and path.
- `receipts` and `income-attachments` are public buckets. Storage RLS controls object operations, but public object delivery can bypass authenticated download checks. This is a launch blocker even though both buckets were empty during the audit.
- Security advisors flag `SECURITY DEFINER` functions executable by `anon`/`authenticated`, mutable search paths, and leaked-password protection disabled. These require deliberate database/security review rather than broad release-branch SQL.

## Exact migration changes in this branch

Renamed only:

- `20260715062013_investment_platform_directory_tracking.sql` → `20260715070314_investment_platform_directory_tracking.sql`
- `20260715070554_investment_platform_directory_index_hardening.sql` → `20260715070609_investment_platform_directory_index_hardening.sql`

New migrations: **none**  
Applied migrations: **none**  
Production data changes: **none**

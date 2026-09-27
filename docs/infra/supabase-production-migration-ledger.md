# Supabase production migration ledger

## Current release gate — 27 September 2026

Production's migration ledger and the repository's append-only migration
filenames are not currently proven to be identical. Read-only dashboard
inspection found these version-name mismatches:

| Repository version | Production version | Shared migration purpose |
| --- | --- | --- |
| `20260919093250` | `20260919101519` | platform completion core |
| `20260919101941` | `20260919102051` | preserve account deletion with month locks |
| `20260919104454` | `20260919104625` | guard ledger owner before period lookup |
| `20260919190522` | `20260919195054` | advisor plans notification delivery |
| `20260919191919` | `20260919195103` | investor access and readonly integrations |
| `20260919192531` | `20260919195110` | collaboration tasks and profiles |

Matching intent or SQL names is not enough: Supabase uses the numeric version
as the migration identity. Until this is reconciled, do not run `db push`,
`migration repair`, or edit an applied migration to make local output look
clean.

## Safe reconciliation procedure

1. Pause schema deployment only; normal read-only application investigation
   may continue.
2. Capture a Production backup and export the linked migration list as a
   release artifact. Do not place credentials, connection strings, or dumps in
   Git.
3. Run the read-only comparison from an authenticated Supabase CLI session:

   ```text
   supabase migration list --linked | node scripts/check-supabase-migration-drift.mjs
   ```

4. Compare the six recorded SQL bodies and the resulting schema objects with
   the repository files. Record whether each entry is semantically equivalent,
   superseded, or represents a real schema difference.
5. If a difference exists, write one new forward-only migration with an
   explicit compatibility and rollback plan. Never rename or overwrite the
   historical files above.
6. Validate a fresh database, an isolated Preview, two-user RLS isolation,
   and upgrade compatibility from the previous application release. Attach the
   result to the release record before re-enabling schema deployment.

The parser at `scripts/check-supabase-migration-drift.mjs` is deliberately
fail-closed: no parsed rows or any local/remote identity mismatch fails the
check. It is a release gate, not a repair tool.

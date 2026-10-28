# Production migration ledger inspection — 28 October 2026

**Status: preliminary, read-only evidence. This record does not approve a
ledger repair, migration replay, financial backfill, or authentication change.**

Project: `hirjgsyfolsvfqjayyfz`. Repository baseline:
`4829a18600c398afc1a6d1428d8c9877b86c3662`. Ledger captured at
**2026-10-28 05:51:29 UTC**; this inspection was assembled at 05:55 UTC.
Published migration files remain unchanged. No database, policy, grant,
migration-history, or application-data mutation was performed in this
inspection. No secrets or individual user rows were requested.

## Current evidence

The live `list_migrations` response contains **156 remote versions**, compared
with **166 local migration files**. There are **10 local-only versions and no
remote-only versions**. The release workspace retains the evidence as
`/tmp/sfm-tv-recovery-migrations.json` and
`/tmp/sfm-tv-recovery-migration-diff.json`; these temporary inspection artifacts
are not committed to Git.

This is a fresh ledger comparison. The observations in
[`supabase-ledger-2026-10-14.md`](supabase-ledger-2026-10-14.md) are historical
context, not proof of today's schema or financial verification state. Relative
to that record's ten historical gaps, `20260914103000` is now recorded, while
`20261014180749` is among today's missing versions. The previous count of 12
positions/checks has **not** been revalidated and is not a current count.

The external Supabase check failed on both the previous production baseline
and the final TV merge with the same attempted policy creation:

| Commit | Completed UTC | Check | Reported failure |
| --- | --- | --- | --- |
| `8c87f735ee6d844b04076d6b01fdcf7aa7d8848b` | 2026-10-28 04:01:15 | [122623684222](https://github.com/elqallaf09/thesfm/runs/122623684222) | SQLSTATE `42710`, policy `investment_valuation_evidence_owner_select` already exists |
| `4829a18600c398afc1a6d1428d8c9877b86c3662` | 2026-10-28 04:53:28 | [122639303188](https://github.com/elqallaf09/thesfm/runs/122639303188) | The same policy, table, and statement 11 |

The attempted statement is the owner SELECT policy on
`public.investment_valuation_evidence`, with `auth.uid() = user_id`. That
statement identifies the immediate collision; it does **not** establish the
definition of the policy that already exists. The original statement is in
`20260915053000_investments_intelligence_2_evidence_foundation.sql`.

`20260918112815_recover_missing_evidence_storage.sql` also embeds that
foundation, but executes it only when all three evidence tables are absent.
Its presence in the repository therefore does not establish an unconditional
duplicate in the clean migration chain. The recovery migration's recorded
status does not substitute for a current comparison of its effects.

The previously read Supabase branch metadata identifies the default `main`
branch in this base project, with migration status `MIGRATIONS_FAILED`, while
the project service status is `ACTIVE_HEALTHY`. Despite the check's name,
this failure is not confined to an isolated temporary Preview project.

Release verification independently checked the deployed `/login` bundle at
05:32:37 UTC: its matched Supabase project URL was
`https://hirjgsyfolsvfqjayyfz.supabase.co`. The server TV admin client uses
`NEXT_PUBLIC_SUPABASE_URL`; the public bundle observation proves the deployed
public variable's project, not the value of a separately fetched secret.
Evidence is retained in `/tmp/sfm-tv-public-project-check.json`. No API key
was output or copied for this check.

## Reads that completed, and their limits

| Read | Result | Limit of the evidence |
| --- | --- | --- |
| `list_migrations` | 156 remote versions; 10 local-only; no remote-only | Version presence does not prove schema equivalence or execution of data effects |
| Aggregate PostgreSQL logs, 03:45–05:10 UTC | 142 entries; two mentions of the policy and two mentions of `42710` | No individual log payload or user-row content was retrieved; counts alone do not identify why history diverged |
| Security advisors | 25 informational RLS-without-policy findings; seven authenticated SECURITY DEFINER warnings; leaked-password protection warning | Separate advisories, not proof of this policy's definition or permission to alter access |
| Performance advisors | Response completed | No new conclusion about the cooldown RPC was derived from this response |
| Evidence-table policy/RLS/grant SQL | Client wait ended at 45 seconds without a result | Current policy definitions, effective/inherited grants, and forced-RLS state remain unverified |
| Cooldown RPC catalog SQL | Client wait ended at 45 seconds without a result | Direct `pg_proc` proof of absence or definition is unavailable |
| One alternative `list_tables(public, verbose=true)` | Completed; the four relevant tables are summarized below | Does not return the full policy/privilege/index/constraint fingerprint required for reconciliation |
| `generate_typescript_types` | Completed; snapshot RPC is listed; cooldown RPC is not listed | Generated-type absence is supporting evidence, not conclusive `pg_proc` absence |

The two bounded SQL requests were independent and were not automatically
retried. A 45-second client timeout is not proof that the remote request was
cancelled. An earlier composite metadata/ledger/documentation request was
aborted without usable output; no conclusion here depends on that request.
An additional minimal read for the single colliding policy also reached the
45-second client limit without returning its definition. This independently
confirmed the metadata-access limitation; it did not change database state.

The alternative table response was filtered to the evidence tables and
`trader_cache`; no table rows or row-count estimates are retained here.
The filtered metadata and timeout outcomes are retained separately in
`/tmp/sfm-tv-recovery-catalog-sample.json`.

| Live table | RLS enabled | Columns | Primary key | Additional observation |
| --- | --- | --- | --- | --- |
| `public.investment_valuation_evidence` | Yes | 25 | `id` | Columns, defaults, and foreign-key names were returned |
| `public.investment_valuation_snapshots` | Yes | 18 | `id` | `subject_asset` exists as non-null JSONB with an empty-object default |
| `public.investment_snapshot_evidence` | Yes | 6 | `snapshot_id, evidence_id` | Columns and foreign-key names were returned |
| `public.trader_cache` | Yes | 4 | `cache_key` | `payload`, `expires_at`, and `updated_at` exist |

These are current partial observations. **No missing migration has been
proven fully equivalent to its intended live end state.** In particular,
table existence and RLS enabled are insufficient to adopt the foundation
version into history.

## Ten missing versions, in application order

The following describes repository SQL, not a claim that its effects are
absent from the live database. A missing ledger entry can represent either
an unperformed change or an unrecorded equivalent state.

| Version and file suffix | Repository effect | Proof required before any action |
| --- | --- | --- |
| `20260915053000` — `investments_intelligence_2_evidence_foundation` | Creates three evidence/snapshot tables, indexes, constraints, RLS, owner policies, and comments | Compare all columns/defaults/nullability, keys and FK actions, indexes, constraints, policy commands/roles/expressions, and RLS. Current table metadata is only partial proof. Do not drop the colliding policy to force replay. |
| `20260915133000` — `grant_economic_intelligence_confirmations_access` | Grants authenticated SELECT/INSERT/UPDATE/DELETE on confirmations | Verify exact effective and inherited grants, RLS and ownership policies, and the absence of TRUNCATE/other unintended access. No current grant result is available. |
| `20260915234500` — `real_estate_atomic_snapshot` | Adds `subject_asset`, restricts direct writes, and installs the atomic snapshot RPC | Compare full function body, argument/default/result types, SECURITY INVOKER, search path, ownership checks and EXECUTE ACL, plus column and table privileges. `subject_asset` and a generated RPC type alone are insufficient. |
| `20260916110000` — `real_estate_explicit_access` | Revokes broad access; grants authenticated reads, service SELECT/INSERT, and service-only RPC execution | Compare the complete effective role/ACL matrix, including PUBLIC inheritance, while preserving owner RLS. No current grant result is available. |
| `20260916194500` — `seed_published_shariah_funds` | Inserts five public catalog funds with active/unclassified status and refresh scheduling, on conflict do nothing | Count/examine only the specified public catalog entries and compare intended fields; review effects on catalog availability and refresh workload. Current seed presence has not been queried. This is a catalog-data change, not ledger-only work. |
| `20260916233000` — `verify_investment_position_imports` | Compares canonical positions with the immutable legacy snapshot; marks matching checks and positions VERIFIED and writes verification notes/timestamps | Obtain aggregate state/candidate/mismatch counts and validate the full transformation/ownership predicates. Do not treat object presence as proof that verification ran, or reuse 14 October's counts. |
| `20260916234500` — `reconcile_verified_investment_positions` | Updates already-VERIFIED canonical positions from live legacy records, then advances migration-check source timestamps/notes | Review eligible-row counts, field mismatch counts, concurrency protection and recovery evidence. This can change quantity, cost, price, valuation, currencies, converted values, FX, dates and notes; it requires a separate concrete financial-data review. |
| `20260917142000` — `create_sfm_market_observations` | Creates the observations store, keys/checks/indexes, service policy and privileges | Compare full catalog fingerprint, service-only access and actual policy expressions. The earlier recovery migration does not by itself prove current equivalence. |
| `20260927090000` — `extend_fmp_shared_cooldown_atomically` | Installs a service-only SECURITY INVOKER RPC using an atomic monotonic cache upsert | Directly confirm absence or compare exact body/signature/defaults/search path/ACL and `trader_cache` prerequisites. The RPC is absent from returned generated types; direct catalog confirmation timed out. If genuinely absent, this is an isolated schema change, not metadata adoption. |
| `20261014180749` — `enforce_enrolled_mfa_for_account_data` | Creates `sfm_private.has_required_mfa`, restrictive policies on owned/account tables and financial storage, and MFA guards in seven RPCs | Verify prerequisite session/challenge deployment and actual existing functions/policies. Review AAL1/AAL2/email-MFA and unenrolled-user behavior, expiry and recovery in disposable fixtures. This changes authorization and must not be silently replayed as part of a ledger repair. |

### What fixing only the first collision would enable

On the next integration attempt, if the foundation version is considered
applied and preceding steps succeed, the remaining missing versions are
eligible in the order above: confirmation grants, snapshot RPC/access,
public fund seed, **financial verification and reconciliation**, observation
store, cooldown RPC, then MFA enforcement. Another statement may fail first;
that possibility is not a safety boundary. Removing the first collision can
expose real data and authorization changes to automatic execution.

A new app commit that leaves this database/history state untouched has not
resolved Supabase. A clean-chain CI pass tests fresh application of the
repository history; it does not establish live ledger alignment or approve
replay against the populated project.

## Proposed preflight and review sequence

1. **Establish an execution boundary.** Before altering the first missing
   entry, explicitly review how automatic main migration execution will be
   controlled. Do not rely on a later error to prevent financial writes.
   Changing integration settings itself requires a reviewed action; this
   inspection did not change them.
2. **Refresh ledger and exact target together.** Preserve the current version
   list and relevant recorded statement hashes, identify the exact project
   and repository SHA, and require an unchanged expected state immediately
   before any approved write. Never run a blanket `db push` to discover what
   happens.
3. **Complete catalog evidence for schema/access candidates.** Query metadata
   in small bounded reads, obtaining the missing policies, effective grants,
   indexes, constraints, FK actions and function definitions. Compare to the
   intended end state after later applied hardening, not just the historical
   creation text. Do not undo stronger current controls to manufacture a
   match. At present, zero versions qualify for history adoption.
4. **Separate actual schema work.** If the cooldown RPC is proven absent,
   propose applying only its canonical definition and its single version
   record in a reviewed transaction, leaving all other gaps untouched. Verify
   privilege denial for browser roles and monotonic concurrent behavior using
   an isolated fixture. Do not invoke the production RPC merely to test it,
   because invoking it writes the shared provider marker.
5. **Review data work independently.** For the two financial migrations,
   prepare aggregate counts by verification state, eligible mappings and
   mismatch category without returning amounts, identifiers or private row
   content. Counts are preflight evidence, not automatic approval. A proposed
   execution must specify exact predicates, expected affected counts,
   concurrency safeguards, retained recovery evidence and postconditions.
   Keep legacy records authoritative and preserve ownership. No such counts
   were retrieved in this inspection.
6. **Review catalog and MFA effects separately.** The fund seed and MFA
   enforcement have different product/security consequences and must each
   have explicit preconditions and verification. Neither is a bookkeeping
   correction merely because a version is missing.
7. **Present exact changes before execution.** Any later reconciliation plan
   must name each approved version and operation, retain before-evidence,
   fail closed on mismatches, preserve published migrations as append-only
   history, and avoid replaying unrelated SQL. Do not mark unperformed
   financial or authorization work as applied.
8. **Verify afterward if a change is approved.** Re-read affected catalog/ACL
   state and ledger, confirm exact expected changes and unchanged remaining
   gaps, run relevant authorization/fixture checks and advisors, then observe
   the exact-SHA external integration. Never report the Supabase issue fixed
   solely because the application deployment or clean-chain job passed.

The current blocker is incomplete live policy/ACL/function reconciliation plus
unreviewed financial and authorization effects later in the missing sequence.
The safe deliverable from this inspection is this evidence and review plan,
not a claim that the production ledger has been reconciled.

## References

- [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase branching troubleshooting](https://supabase.com/docs/guides/deployment/branching/troubleshooting)
- [RLS without policies advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Authenticated SECURITY DEFINER advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [Repository release checklist](../release/release-checklist.md)
- [Historical integration investigation](supabase-preview-ci.md)

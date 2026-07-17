# Production backup and isolated-restore gate

Status captured: 2026-07-17 (Asia/Kuwait)
Production project ref: `hirjgsyfolsvfqjayyfz`
Release state: **NO-GO — Production changes frozen**

## Verified current state

| Requirement | Verified result |
|---|---|
| Supabase organization plan | Free |
| Managed backup plan | None available under the current plan |
| Exact managed retention | 0 days / no managed restore points |
| Latest managed backup timestamp | None available |
| Manual logical backup | No approved artifact exists |
| Latest manual backup timestamp | None |
| Restore capability | Not verified; no isolated restore has passed |
| Production migration authorization | Blocked |

Supabase documents automatic daily backups for Pro, Team, and Enterprise projects, with
7-, 14-, and up-to-30-day retention respectively. It recommends that Free projects create
manual logical backups. Database backups contain Storage metadata but not the stored object
payloads, so Storage continuity must be handled separately.

## Secure manual logical-backup plan

This is an operator runbook, not authorization to export Production data. Execution requires
the Production owner and security owner to approve the destination, retention, isolated target,
and named operator. Commands must run from an approved encrypted workstation or short-lived VM
in the database region. Secrets must come from a process-local secret manager and must never be
placed in command history, logs, repository files, CI artifacts, or chat.

1. Record the source project ref, PostgreSQL version, UTC start time, operator, ticket, and
   approved isolated target ref. Confirm the target ref is not Production and has no routes or
   credentials used by Preview or Production.
2. Install a pinned Supabase CLI and PostgreSQL client compatible with Production PostgreSQL 17.
   Discover the installed CLI syntax with `supabase db dump --help` before execution.
3. Use the Supavisor session-pooler connection supplied by the Supabase Dashboard. Pass the
   connection string through a process-local environment variable. Do not echo it.
4. Write `roles.sql`, `schema.sql`, `data.sql`, and the `supabase_migrations` schema/history into
   a newly created encrypted directory with access restricted to the named restore operators.
   Use Supabase's documented role-only, schema, and data-only dump sequence. Do not inspect,
   print, upload, or attach dump contents.
5. Create SHA-256 checksums and a manifest containing only metadata: source ref, UTC start/end,
   tool versions, byte sizes, checksums, and exit statuses. The manifest must contain no row
   data, credentials, object names, email addresses, or user identifiers.
6. Encrypt the backup before it leaves the execution host with an organization-managed key.
   Store it in an access-logged, versioned, non-public backup location. Proposed manual
   retention is **30 days**, with one successful restore-tested artifact always retained until
   superseded. Retention becomes active only after owner/security approval is recorded.
7. Treat Storage objects as a separate backup stream. Inventory bucket/object counts and
   checksums without printing object paths or contents. Copy objects only to an approved,
   encrypted, private backup location; database dumps alone are not Storage backups.
8. Remove plaintext working files with the approved secure-cleanup procedure after encryption,
   checksum verification, and upload verification. Record cleanup completion in the manifest.

## Mandatory isolated restore test

No Production migration may be scheduled or applied until every item below passes:

- Restore only into a newly provisioned, isolated Supabase project whose ref differs from
  `hirjgsyfolsvfqjayyfz`. Never restore over Production or over a shared Preview project.
- Disable outbound email, payments, webhooks, cron, Edge Functions, and other side effects on
  the restore target before data is loaded.
- Restore with `psql --single-transaction --variable ON_ERROR_STOP=1` using Supabase's documented
  roles/schema/data sequence. Preserve and verify migration history separately.
- Verify schema, extensions, roles, RLS enablement, policies, functions, triggers, constraints,
  indexes, and migration versions against the source using metadata-only comparisons.
- Compare aggregate row counts per table and Storage object counts/checksums. Reports must not
  contain raw rows, object contents, object paths, emails, or user identifiers.
- Run application health and deterministic read-only auth/admin/storage checks against the
  isolated ref. Confirm the target cannot send email, charge payments, invoke Production
  webhooks, or write to Production.
- Record restore start/end UTC timestamps, tool versions, manifest checksum, verification
  results, cleanup owner, and final PASS/FAIL. A partial restore or unexplained mismatch is FAIL.
- Destroying the isolated restore target is a separate destructive action and requires explicit
  owner approval after evidence retention.

## Hard release gate

The gate remains **FAIL** until an encrypted manual backup exists and the isolated restore test
above is recorded as PASS. Repository migration repair and Preview-only tests may continue, but
no Production migration, bucket change, environment change, merge, tag, or Production deployment
is authorized by this runbook.

## Official references

- <https://supabase.com/docs/guides/platform/backups>
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>
- <https://supabase.com/docs/guides/storage/buckets/fundamentals>

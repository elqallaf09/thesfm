# Real estate database validation

## Purpose
The analyst release must prove actual database behavior, not only mocked
Supabase query chains. `real-estate-database-check.yml` provisions disposable
PostgreSQL 17 services and applies the entire migration chain once per service.
No connected Supabase project, production URL, user credential, or service key
is read or used.

Two initial privilege configurations are tested: permissive defaults (including
TRUNCATE) and closed defaults. These defaults are configured BEFORE migrations.
The tests do not grant access to application tables afterward to force a pass.
The additive explicit-access migration revokes browser writes, including
TRUNCATE, and grants only authenticated owner-scoped SELECT on the three
valuation tables. The RPC stays server-only and security-invoker.

## Executed assertions
- RLS is enabled and authenticated/anonymous roles cannot bypass it.
- A real service-role call saves a snapshot, two evidence rows and two lineage
  rows, preserving exact evidence, subject facts, ranges and limitations.
- User A and user B see only their own snapshot/evidence/lineage.
- Missing subject claims fail closed; anonymous SELECT and RPC calls fail.
- Authenticated INSERT/UPDATE/DELETE and direct RPC calls fail, even for an
  owned property. Effective TRUNCATE privileges are also checked.
- Cross-owner RPC parameters, unverified/non-property/missing positions,
  duplicate/unmatched evidence, unavailable results and bad ranges fail.
- A failure on the SECOND evidence row (after prior rows were inserted) leaves
  no orphan snapshot, evidence or lineage. Expected SQLSTATEs are asserted.
- A retrieval timestamp is not promoted to an observation timestamp.
- The outer test transaction rolls back all synthetic fixtures.

## Scope and limitations
The claims-to-UID shim and roles model Supabase database execution. PostgreSQL
RLS and transaction behavior are real; hosted GoTrue, JWT verification,
PostgREST, project default ACL drift and a linked Preview deployment are NOT
verified by this job. Those remain separate deployment checks. Passing this
suite also does not validate any jurisdiction's live data feed or valuation
methodology. No live price coverage is enabled by this work.

The test SQL refuses to run unless the database is named
`sfm_property_isolation_ci` and the explicit `sfm.disposable_ci=1` marker is set.
Run it only through the disposable CI workflow. Never apply the bootstrap or
fixture script as a production migration.

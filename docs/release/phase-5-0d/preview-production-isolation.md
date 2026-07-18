# Preview and Production Supabase isolation

Verified: 2026-07-17 (Asia/Kuwait)
Vercel project: `prj_AumPZoHxwpIUVJID2gQBx30ZmciV`
PR #37 Preview deployment: `dpl_GDvsHAqHCYaPXeTTu9jgZmdytCZL`
Production deployment: `dpl_C5hzbDrwGnZwif7324wLGpaWtwVX`

## Project references

| Environment | Supabase project ref | Evidence |
|---|---|---|
| Preview / PR #37 | `lwcaapfqxaoxkojehfdq` | Vercel branch-resolved Supabase URL, anon credential JWT, service-role JWT, and Postgres URLs; Supabase branch metadata |
| Production | `hirjgsyfolsvfqjayyfz` | Vercel Production `SUPABASE_URL` and anon credential JWT; Supabase project metadata |

The Supabase branch is named `release/phase-5-0d-launch-readiness`, has
`with_data=false`, and has parent `hirjgsyfolsvfqjayyfz`. The refs differ.

## Credential scoping

The effective Vercel Production environment and the PR #37 branch-resolved Preview
environment were pulled to temporary local files. Values were never printed or committed.
The audit script emitted only key class, project ref when derivable, equality, length, and a
truncated SHA-256 fingerprint. The temporary files were then deleted.

| Credential class | Preview/Production result |
|---|---|
| Supabase URL | Different values; refs resolve to Preview and Production respectively |
| Legacy anon/public key | Different values; embedded refs resolve to Preview and Production respectively |
| Publishable key | Present in both; different fingerprints |
| Service-role/secret key | Server-only names; Preview resolves to Preview; Vercel redacts Production sensitive values from CLI retrieval |
| Direct/session Postgres URLs | Preview resolves only to Preview; Production sensitive values are provider-redacted |
| `NEXT_PUBLIC_*` exposure | Limited to URLs and public/anon/publishable credentials; no privileged credential uses a public prefix |

Vercel's provider-redacted Production values were not treated as value-level proof. The
cross-project rejection probes below provide the required boundary evidence instead.

## Cross-project negative probes

Two non-mutating authentication probes sent Preview credentials to Production:

| Probe | Result |
|---|---|
| Read one `profiles` identifier with the Preview anon credential against Production REST | HTTP 401 — denied before data access |
| POST with the Preview privileged credential to a deliberately nonexistent Production RPC | HTTP 401 — denied before function lookup or write execution |

The RPC probe cannot mutate data because the named function does not exist; an accepted
credential would have reached function lookup rather than returning authentication failure.
Both credentials were rejected, so Preview cannot authenticate to Production for reads or
writes with its effective public or privileged Supabase credentials.

## Reproducible verification

- `scripts/release/audit-supabase-env-isolation.mjs` emits only non-secret metadata.
- `scripts/release/verify-supabase-cross-project-boundary.mjs` emits only status codes.
- Re-run against the exact Vercel deployment/environment snapshots before every release.
- Any equal URL/key, Production ref in Preview, privileged `NEXT_PUBLIC_*` variable, or
  non-401/403 cross-project response is an immediate release failure.

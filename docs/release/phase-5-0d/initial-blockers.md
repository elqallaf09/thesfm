# Phase 5.0D initial release audit

Audit date: 2026-07-17 (Asia/Kuwait)  
Audit mode: read-only Production baseline before release fixes  
Initial verdict: **NO-GO**

No Production data, deployment, environment value, migration, tag, or release state was changed during the baseline audit.

## Baseline identifiers

| Item | Evidence |
|---|---|
| `origin/main` SHA | `04cffaa7f58f14752e2e60df1d559107d3233596` |
| Production deployment ID | `dpl_F77F5k3D4XDcFnp6YJdLxwCPxCgj` |
| Production deployment SHA | `04cffaa7f58f14752e2e60df1d559107d3233596` |
| Vercel project/environment | `thesfm`, Production, `iad1`, Node.js 24.x |
| Canonical domain | `https://www.the-sfm.com` |
| Supabase Production ref | `hirjgsyfolsvfqjayyfz` (`ap-south-1`, PostgreSQL 17.6) |
| Supabase plan | Free |
| Database size | 187,960,467 bytes (about 179 MiB) |
| Migration count | 128 local / 128 Production; version mismatch found in last two entries |
| Production health | `/api/health` 200; `/api/health/database` 200 |
| Production TLS/domain | Valid TLS; bare HTTP/HTTPS redirect to canonical `www` HTTPS |
| CI baseline | GitHub Actions run `29578378145` passed for the exact Production SHA |

## P0 blockers

| ID | Blocker | Evidence | Required release action |
|---|---|---|---|
| P0-DB-01 | No verified backup and restore proof | Supabase project is on Free plan; no managed/manual backup timestamp, retention, dump artifact, or isolated restore was available. | Create a verified backup, record checksum/timestamp/retention, restore it into an isolated environment, then compare schema, RLS, functions, constraints, row counts, and app health. |
| P0-ENV-01 | Preview and Production data boundaries are not isolated | The same Vercel env entries for Supabase URL/anon/service-role target Preview and Production. Supabase Preview checks are skipped on the Free plan. Authenticated Preview E2E could mutate Production. | Provision an isolated Preview database/branch and distinct keys, then prove project refs differ before any mutating E2E. |

## P1 blockers

| ID | Blocker | Evidence | Status/action |
|---|---|---|---|
| P1-DB-01 | Repository migration history did not match Production | Local final versions were `20260715062013` and `20260715070554`; Production records `20260715070314` and `20260715070609`. | Repository-only filename alignment is included; SQL content was not changed and no migration was applied. A clean-chain run is still blocked. |
| P1-DB-02 | Empty-database migration chain is not self-contained | `001_add_sfm_persistence_columns.sql` alters tables that are not created by an earlier checked-in baseline; there is no local Supabase config/baseline capable of initializing an empty DB. | Produce and review a clean-chain baseline in an isolated DB. This needs separate database approval. |
| P1-DATA-01 | Financial upload buckets are public | `receipts` and `income-attachments` are public Storage buckets. They are currently empty, but public object URLs bypass download policy. | Approve an additive migration to make them private; verify signed/authenticated downloads and regression-test existing upload flows. |
| P1-OPS-01 | Production has active scheduled-job failures | Last 24 hours contained 19 Production 5xx responses: 18 `504` market-news ingestion timeouts and one `500` trader scanner timeout. | Bound work per invocation or split batches, prove completion within Vercel duration, and monitor several schedules without 5xx. |
| P1-OPS-02 | Production observability readiness is not proven | Observability variables are Preview-only; the observability PR is not merged and its branch has failing checks. | Land a reviewed, green observability release separately and prove Production attribution, ingestion, alerts, retention, and privacy. |
| P1-PAY-01 | Live payment mode and lifecycle are unverified | Stripe names exist, but values/mode were not read; Preview and Production share entries. Signature-negative test returns 400 and unauthenticated checkout/portal return 401, but creation, failure, retry, cancellation, invoice, and entitlement flows were not executed. | Decide paid launch mode. Isolate test/live credentials, run Stripe test-mode lifecycle in isolated Preview, and disable paid CTA if not approved. |
| P1-EMAIL-01 | Email delivery is unverified | SMTP/contact variables exist for Preview and Production, but no isolated delivery, bounce, retry, auth-confirmation, or localized-template evidence is available. | Test delivery in isolated Preview with approved recipients and provider logs; verify Supabase Auth mail settings separately. |
| P1-LEGAL-01 | Required disclaimer pages are absent | `/privacy`, `/terms`, and `/contact` exist; dedicated Risk, AI, Investment, and Cookie disclosures were not found. | Obtain legal-approved copy and routes. No substantive legal copy was invented in this phase. |
| P1-SA-01 | Complete authenticated Smart Analysis validation is unavailable | Guest protection works. The shared-shell work is in unmerged PR #35; no approved isolated E2E account/environment was available for authenticated route, iframe sync, or data-state checks. | Merge the reviewed dependency, isolate Preview data, then run the required authenticated browser matrix. |
| P1-PROVIDER-01 | Provider health is degraded and inconsistent | Twelve Data is rate-limited; EODHD is unhealthy/unknown; Marketstack is not configured; historical/profile/logo/forex/crypto/commodities/GCC capabilities are degraded; economic calendar returns an unauthorized provider state inside HTTP 200. | Decide supported launch matrix, correct truthful status handling, and prove fallbacks/stale behavior per supported market. |

## Confirmed narrow fixes allowed in this branch

- Protect `/market-agent` consistently with its authenticated API.
- Make middleware browser-permission policy match the restrictive global policy.
- Mark contact-form responses private/no-store.
- Align the two checked-in migration filenames to the already-recorded Production versions without changing SQL.
- Add focused regression guards and release evidence/runbooks.

## P2/P3 findings

- Dependency audit reports one moderate and two low advisories. The moderate advisory is transitive `jsondiffpatch` HTML formatter XSS through `ai`; runtime/client reachability still requires review before changing a core AI dependency.
- Supabase advisors report 12 mutable function search paths, leaked-password protection disabled, executable `SECURITY DEFINER` functions, 63 unindexed foreign keys, many RLS init-plan findings, unused indexes, and multiple permissive policies.
- CSP is limited to `frame-ancestors`; this is partial hardening, not a complete script/style CSP.
- The main app manifest exists, but no main-app service worker/installability proof exists. PWA launch claims are deferred.

## Evidence index

- Complete filesystem/runtime route inventory: `route-inventory.csv`
- Vercel environment-name matrix: `environment-matrix.md`
- Baseline screenshots: `artifacts/release/phase-5-0d/baseline/`
- Database and backup report: `database-readiness.md`
- Final consolidated verdict: `release-report.md`

# Economic platform completion audit — 2026-09-18

## Baseline and scope

Production baseline: `a415bb96e7884b88463ccf9bd8083a99b7b6959c` (PR #181), deployment `dpl_9zWMmbBfisvuoQE8Dp31Tfu8pDnv`. It already includes PR #182's Saudi/ADX/Qatar/Egypt directories and preserves PR #179's quote/history separation and responsive quick analysis. The saved economic-platform roadmap remains the direction, not a claim that every product track is complete.

## Repairs in this batch

| Area | Change and practical limit |
| --- | --- |
| Reference quotes | TD remains primary. A verified Yahoo chart fallback recovers Saudi `.SR` and Qatar `.QA` identities only, checking returned symbol/exchange/currency/type and source time. No guessed ADX/Egypt mapping. These are delayed directory references, not execution quotes or a change to the SFM v1 engine. |
| Cost and operations | Shared pending requests, bounded queues/cache, separate per-provider concurrency and a 429 pause. Daily aggregate resolved-quote checks persist for 30 days; the admin panel shows seven UTC calendar dates. Counts include cached outcomes and omit private symbols, searches and user IDs. They do not prove global upstream quota compliance. |
| Financial truth | Failed/unrequested groups remain missing, not empty. Incomplete snapshots cannot advertise an investable surplus. Complete-count checks reject server row-cap truncation. Profile/decision failures cannot silently resolve durable warnings. The implicit zero expected return is removed. |
| Advisors | Watchlists and configured alerts do not establish current market evidence. Provider deadlines cover response bodies as well as headers; missing timeout configuration uses 22 seconds. Quota failures have private no-store 503 responses and do not invoke generation. |
| Accounts | Eleven finance/market/project/economic tables are exercised with two real disposable authenticated users in both directions. Migration guards revoke only application-role TRUNCATE on a verified 113-table manifest, preserve row/admin privileges, and pin twelve invoker functions to pg_catalog. No production test users or finance fixtures. |
| Property | Automatic comparables must be distinct dated transactions with source links, strong location/asset matches, usable area/unit/currency and fresh FX. Asking-price listings, stale/undated/duplicate evidence and infinite areas cannot create a valuation. Methodology is 2.1.0; it is not a backtested model. |
| Business | Existing actual-versus-plan and CSV/XLSX/PDF workflows were found. CSV text is formula-safe and payroll days clamp to month end, including leap years. |

## What is present and what remains

- Market directories: Saudi 394, ADX 84, Qatar 55 and Egypt 245 are source snapshots from PR #182, not independently verified complete exchange totals. Bahrain/Oman/Jordan/Morocco remain unconnected or selected lists. ADX/Egypt quote availability still needs provider-side investigation; a generic unavailable response does not establish a specific subscription requirement.
- Property: four official research contexts are connected; the valuation registry has no approved jurisdiction adapter. Rights/reuse (including Kuwait), reliable areas, arm's-length sale classification, local comparables and historical backtesting remain prerequisites. No asking prices or fabricated comparables fill the gap.
- Finance/investments: owner-scoped positions, transactions, valuations and private documents exist, as do migration/cutover checks. The broader import workflow and all-currency report aggregation still need separate acceptance and review. This release does not certify tax/religious methodology or introduce default return forecasts.
- Economic home/advisors: the shared deterministic brief, readiness, provenance and history exist. An evidence failure now limits conclusions. Real logged-in production performance remains distinct from anonymous browser checks and disposable RLS tests.
- Business: feasibility/model, actual-versus-plan, and report exports exist. Investor matching requires a defined operating model. Memberships/community/referrals/mobile/TV remain later product work, with measurable acceptance criteria still needed. No external social publishing was initiated.
- Supabase Auth leaked-password protection was reported disabled. This release does not purchase a plan or change that external setting. RLS-without-policy notices on backend-only tables are not repaired by granting users access.

## Validation and release record

Verification is in progress. Required gates: frozen dependency install, TypeScript, ESLint debt ratchet, i18n, maintainability/hygiene/launch guards, complete unit/engine tests, production build/performance budget, smoke/performance/contrast, clean migration chain and real two-user RLS. Record exact passing CI links and production observations in the PR before merge.

No automatic Preview on `feat/*`. Use one designated release branch only after final code verification for the genuine required Vercel status, then merge through protection for one Production deployment. Roll back application code to the baseline above if needed; retain the additive health table and restrictive privilege hardening unless a specific verified compatibility problem requires a new corrective migration. Never restore broad application TRUNCATE access as a routine rollback.

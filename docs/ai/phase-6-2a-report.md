# Phase 6.2A implementation report

## Release identity

- Branch: `feature/phase-6-2a-intelligence-history`
- Base main SHA: `29afa67adf574d4ce85442029ecde5cea7e444ce`
- Prerequisite: Phase 6.1 Financial Intelligence Core, merged through PR #45
- Production changes: none
- Production migration-history edits: none
- Report state: local implementation and validation are complete; the isolated Preview and remote CI gate remain pending the draft pull request.

## Intended delivery scope

- Versioned outcome domain for pending, evaluated, unavailable, invalidated, and failed evaluation states.
- Conservative `BUY`/`SELL` directional measurement and explicit non-directional `WAIT` treatment.
- Forward-only immutable `intelligence_analysis_outcomes` persistence with one outcome per analysis, indexes, forced RLS, constrained service-only writes, and operational rollback notes.
- Server-only historical-price evaluation with provenance, currency integrity, adjustment limitations, bounded retries, and idempotency.
- Asset/horizon intelligence timeline, deterministic drift, outcome read surfaces, and compact Smart Market Analysis disclosure.
- Descriptive calibration aggregates with a 30-directional-observation minimum; no feedback into live confidence weights.
- Focused unit, integration, browser, RLS, migration, and security coverage.

The methodology, drift, and timeline contracts are documented in [outcome-methodology.md](outcome-methodology.md), [confidence-drift.md](confidence-drift.md), and [intelligence-timeline.md](intelligence-timeline.md).

## Migration

Planned forward-only migration: `20260719083438_create_intelligence_analysis_outcomes.sql`.

The migration creates one new table and supporting trigger/function only. It does not alter the Phase 6.1 migration or existing Production migration history. The table has a unique parent-analysis foreign key, provenance/version fields, controlled `PENDING`-to-terminal transitions, indexes for shared/private timelines and pending work, forced RLS, and a parent-analysis-based authenticated read policy.

Operational rollback remains application-first: disable or roll back the evaluator and readers, export any audit history required by policy, then drop only the new outcome table and its trigger/function after confirming no running deployment uses it. Preview validation is required before any environment beyond the isolated Preview database.

## Security and privacy boundary

- Historical-price credentials remain server-only.
- Browser clients cannot submit prices, user IDs, provider URLs, or arbitrary analysis IDs for evaluation.
- Outcome visibility follows the parent analysis: shared is intentional; private is owner-only.
- Direct anonymous access and client-side writes are denied by grants and RLS.
- Provider provenance contains safe identifiers/attempt metadata only; no secrets, raw payloads, raw prompts, or sensitive personal finance details are retained.
- Terminal outcomes are immutable, preserving auditability and version reproducibility.

## Validation status

Completed locally on 2026-07-19:

| Check | Result |
| --- | --- |
| Locked-package install | Passed: `pnpm install --frozen-lockfile` |
| Lint | Passed: `pnpm lint` |
| Typecheck | Passed: `pnpm typecheck` |
| Translation completeness | Passed: `pnpm check:i18n` |
| Visual-system guard | Passed: `pnpm check:visual-system` |
| Unit and integration suite | Passed: `pnpm test:run` — 147 files, 1,648 tests |
| Focused outcome/timeline coverage | Passed: horizon policy, BUY/SELL/WAIT treatment, MFE/MAE, stale/missing/currency behavior, provider failure retry, idempotency, isolation, pagination, comparison authorization, drift, calibration gating, migration/RLS static checks, and request-boundary validation |
| Production build | Passed: `pnpm build` |
| Public endpoint and environment guards | Passed: `pnpm check:prod-endpoints` and `pnpm check:public-env` |
| Relevant desktop Playwright | Passed: 6/6 Chromium Smart Market Analysis checks, including timeline, pending/evaluated outcomes, comparison, RTL/LTR, theme, keyboard disclosure, and responsive behavior |
| Mobile Playwright | Focused timeline checks passed in mobile Chrome and mobile WebKit. The earlier full local WebKit invocation retained one pre-existing guest-login setup timeout; no timeout or skip was changed. |
| Performance budget | Passed: `/market-analysis` initial JavaScript 305.6 KiB gzip (312.5 KiB budget) and CSS 76.6 KiB gzip (78.1 KiB budget). The timeline is dynamically loaded; its emitted JavaScript/CSS chunks are 28,145/14,715 bytes before compression. |
| Secret scan | No added literal secret assignments found in project source. The optional AgentShield scan reported no critical finding, but did report user-level agent-configuration hardening items outside this repository; they were not changed. |

Pending after the draft pull request is opened:

| Check | Required evidence |
| --- | --- |
| Migration and RLS validation on isolated Preview | Apply this forward-only migration only to the provisioned Preview database and run its migration/RLS checks. No local or Production database was linked or guessed. |
| Authenticated Preview smoke | Resolve the exact-SHA HTTPS Vercel Preview, provision temporary Preview fixtures, run the remote suite, then clean up the fixtures. |
| Remote CI / Lighthouse | Record the exact pull-request workflow and deployment result. |
| Branch push and draft PR | Push only the feature branch and create a draft PR against `main`; do not merge. |

## Known limitations and deferred work

- Historical results are descriptive and do not change live confidence, factor weights, or recommendation thresholds.
- AI model comparison is not part of this subphase.
- No autonomous trading, brokerage execution, rebalancing, or alert automation is introduced.
- Benchmark comparison, verified FX conversion, exchange-calendar certainty, and full corporate-action handling remain unavailable until separately supported.
- A provider outage, missing candle, stale evidence, incompatible currency, suspension, or delisting is recorded as an unavailable or invalidated state rather than an estimated outcome.
- No Production deployment, merge, or tag is authorized by this report.

## Review recommendation

**NO-GO pending isolated Preview migration/RLS validation, authenticated Preview smoke, and remote CI evidence.** Production remains untouched. A GO recommendation requires those remote checks against the final exact commit SHA; merge and Production deployment remain subject to explicit approval.

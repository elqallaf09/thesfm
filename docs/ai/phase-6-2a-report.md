# Phase 6.2A implementation report

## Release identity

- Branch: `feature/phase-6-2a-intelligence-history`
- Base main SHA: `29afa67adf574d4ce85442029ecde5cea7e444ce`
- Prerequisite: Phase 6.1 Financial Intelligence Core, merged through PR #45
- Production changes: none
- Production migration-history edits: none
- Report state: implementation and verification are in progress; this document does not claim completion of pending checks.

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

| Check | Status at report creation |
| --- | --- |
| Locked-package install | Pending |
| Lint | Pending |
| Typecheck | Pending |
| Unit tests | Pending |
| Integration tests | Pending |
| Production build | Pending |
| Migration and RLS validation on isolated Preview | Pending |
| Playwright desktop/mobile/RTL/LTR/light/dark coverage | Pending |
| Performance budget and bundle-impact review | Pending |
| Secret scan | Pending |
| Authenticated Preview smoke | Pending |
| Branch push and draft PR | Pending |

No Preview URL, final branch SHA, PR URL, migration-application result, test result, or performance measurement is recorded here until it has been observed and verified.

## Known limitations and deferred work

- Historical results are descriptive and do not change live confidence, factor weights, or recommendation thresholds.
- AI model comparison is not part of this subphase.
- No autonomous trading, brokerage execution, rebalancing, or alert automation is introduced.
- Benchmark comparison, verified FX conversion, exchange-calendar certainty, and full corporate-action handling remain unavailable until separately supported.
- A provider outage, missing candle, stale evidence, incompatible currency, suspension, or delisting is recorded as an unavailable or invalidated state rather than an estimated outcome.
- No Production deployment, merge, or tag is authorized by this report.

## Review recommendation

**NO-GO pending implementation completion and the verification evidence above.** Production remains untouched. A GO recommendation requires a final exact commit SHA, draft PR, isolated Preview validation, security/RLS evidence, full relevant test results, performance review, and authenticated affected-surface smoke.

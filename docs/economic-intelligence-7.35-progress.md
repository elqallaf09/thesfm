# Phase 7.35A — CI repair and scoped production hardening

Date: 2026-09-14. Base: `de0002b929feb91f3e15aeff3b2835ffb6bc7b09`, PR #119.

This is a completed implementation slice, not a claim that the full Phase 7.35 security audit or production rollout is complete. Repository checks and deployment status remain authoritative after publication.

## Confirmed fixes

- Fixed the explicit loan/repayment regression test to inspect actual simulation debt payments and income, rather than a nonexistent assessment property. It asserts 370/2500 and 160/2500 explicitly; no missing-value fallback masks the result.
- Updated the resolution-history assertion for the existing, intentional priorityScore field.
- Replaced unsupported 800 font weights with 700 and consumed centralized radius/shadow tokens. No visual guard allowlists or required-check thresholds were weakened.
- Included the three existing Economic Intelligence domain test files in the regular Vitest configuration.
- Hardened event-outcomes responses: private/no-store on success and failure, validated JSON object/id/action, safe transport failures, Retry-After, and session-owner plus source-module filters on lookup and update. Historical evidence metadata is preserved.
- Diagnosed the original Playwright failure from its saved traces: dashboard finance tables were fetched three times on mount, not once. Added a dashboard-mount/owner/refresh-scoped shared data source consumed by the executive page and both financial intelligence panels. No process-global or cross-user result cache is introduced. Refresh replaces the scope, failed requests are evicted, and a user switch remounts consumers.
- Corrected three Decision Timeline requests from the nonexistent singular event-outcome endpoint to the canonical event-outcomes route.

## Validation completed locally

- Full TypeScript check: passed, exit 0.
- Full unit/integration suite with coverage: 278 files, 2172 tests passed, exit 0.
- Coverage run includes 16 outcome API tests, 8 shared dashboard data-source tests, and the timeline route contract regression test.
- The shared-source tests cover concurrent deduplication, different owners, refresh/remount isolation, rejected transport, error eviction, distinct query limits, and denial of anonymous/unscoped reads.

## Validation limitations and remaining work

- Local Next.js production build could not fetch Google Fonts because the build environment could not resolve the font host. This is not recorded as a passing build; the new Vercel deployment must validate the published commit.
- Playwright browser download was blocked by the local network. The original browser regression has an implementation fix and unit coverage, but browser confirmation still requires GitHub CI.
- No live database records, migrations, secrets, billing configuration, or branch protection rules were modified by this slice.

## Publication

Publish these related changes together on the existing PR branch, retaining main and unrelated work. Auto-merge is authorized only when repository-required checks permit it. Do not infer production deployment from a successful Preview build.

## Follow-up — type contracts and lint debt repair

- Published 7.35A as `02959e830b44d5f3446ce44c6524614f62e8b881`; its Vercel Preview reached READY. GitHub TypeScript passed, while the lint debt guard found 534 explicit-any warnings against main's 458 baseline. Ordinary ESLint error counts alone did not detect that budget failure.
- Replaced loose row types with selected-field contracts and unknown JSON boundaries across economic loaders, Financial Twin, decision analysis, and shared finance metadata helpers. Removed redundant casts; no eslint-disable directives or baseline increases were added.
- Typed readiness text and narrative copy selection. A missing notification row after a competing unique-key insert no longer reaches the strict cross-workspace normalizer.
- Full local TypeScript rerun passed. Full coverage rerun passed: 278 files / 2172 tests. Final repository lint guard passed with 457 explicit-any warnings and 420 unused-variable warnings; the checked-out baseline remains unchanged (459 / 423). The main merge candidate has its own stricter baseline and must pass fresh CI.
- Generated coverage reports were kept outside the checkout for the lint run, matching CI's separate clean jobs; no tracked source was excluded.

## Follow-up — lifecycle, ownership, privacy and live-RLS hardening

- Decision Timeline page load now records only `opened`. It no longer fabricates an `actioned` outcome merely because the user viewed the timeline. A real resolution still records the appropriate interaction through the event-outcomes route.
- Proactive and freshness stale-event writers now preserve existing notification metadata before adding resolution metadata. Evidence snapshots and historical provenance are not replaced by a smaller resolution object.
- Stale-event updates are additionally scoped by user and `source_module = economic_intelligence`.
- Event-family ownership is explicit: proactive owns only `risk:`, `decision:` and `opportunity:` events; freshness owns only `freshness:` events; cross-workspace priorities own only `priority:` events. The proactive writer can no longer archive another writer's active family during concurrent refresh.
- Personalized advisor-grounding, advisor-chat and proactive-events responses now apply `private, no-store` to authentication failures, validation failures, rate limits, upstream failures and success responses. Retry-After remains present on application throttling.
- Added source-contract regression coverage for timeline semantics, metadata preservation, event-family ownership and personalized API privacy.
- Added a real two-identity RLS Playwright check that runs only when CI resolves an exact-SHA isolated Supabase Preview. It verifies own-row access plus denial of cross-user read, update and forged insert on `user_decisions`, and cleans up only its own synthetic rows. It refuses to run if the Preview ref is absent, invalid or equals Production.

## Remaining before Phase 7.35 can be called complete

- The new exact-SHA CI head must pass TypeScript, lint-debt guards, unit/integration tests, production build/budgets, browser smoke and, when an isolated Supabase Preview is available for that SHA, the authenticated two-user RLS check. A prior green head is not sufficient.
- If the exact-SHA Supabase Preview is legitimately unavailable and the existing CI contract skips authenticated Preview validation, do not mislabel that skip as live-RLS proof. Phase 7.35 remains technically implemented but live isolation evidence remains outstanding until an isolated Preview run executes it successfully.
- Review any CI failure from the new lifecycle/RLS coverage without weakening assertions or falling back to Production credentials.
- Re-run the final route/error-boundary inventory after the current head is green and confirm no personalized Economic Intelligence route lacks private/no-store behavior.
- Merge only after repository-required checks permit it; then verify the exact merged SHA/deployment separately before starting the next product phase.

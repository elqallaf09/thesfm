# Phase 6.1 implementation report

## Release identity

- Branch: `feature/phase-6-1-ai-intelligence-core`
- Base: `d0a24efa177e6c89686e56d43692cb71fde65f51`
- Base release: Phase 5.0D release candidate and launch-readiness audit
- Production changes: none
- Production migration changes: none

## Delivered

- Provider-independent canonical request, result, factor, evidence, provenance, freshness, confidence, risk, recommendation, and explanation contracts.
- Asset- and horizon-specific versioned weight configuration.
- Deterministic factor modules for verified technical, fundamental, momentum, liquidity, volatility, risk, and Sharia evidence.
- Truthful unavailable modules for sentiment, news, and macro until providers are connected.
- Central orchestrator with canonical resolution, persistent/process cache, in-flight deduplication, timeouts, fallback, partial results, stale refresh fallback, persistence, and observability.
- Deterministic confidence and recommendation policies independent of LLM output.
- `POST /api/intelligence/analyze` and `GET /api/intelligence/latest` with validation, bounded bodies, rate limits, force-refresh authorization, safe errors, and correlation IDs.
- Forward-only `intelligence_analyses` migration with constraints, indexes, RLS, grants, and operational rollback notes.
- Compact Smart Market Analysis evidence ledger with Arabic/English/French, RTL/LTR, keyboard disclosure, mobile layout, and semantic light/dark tokens.
- Optional legacy AI summary retained as presentation only; it no longer changes canonical confidence or risk.

## Removed from the affected UI path

- UI-only fixed confidence bonuses.
- Confidence bonus for a ready AI summary.
- AI-provider risk score override.
- The duplicate page-level `/api/market/signals/{symbol}` request and legacy signal panel.

The legacy services and routes themselves were not deleted and remain available to other current consumers.

## Migration

Added `supabase/migrations/20260718215822_create_intelligence_analyses.sql`. It creates one new table only. No previous migration was edited and no Production database was touched.

## Test coverage added

Unit coverage:

- canonical API validation and SSRF-shaped symbol rejection;
- factor normalization and verified-only Sharia handling;
- deterministic confidence, stale/missing/conflict penalties, asset weights, and version reproducibility;
- recommendation thresholds, risk gates, and insufficient data;
- migration constraints, RLS, grants, and secret-shaped column prevention.

Integration coverage:

- provider success;
- fallback after partial provider failure;
- total provider failure;
- fresh cache hit/miss;
- concurrent request deduplication;
- persistence;
- stale refresh fallback;
- unsupported provider capability;
- shared/private history isolation;
- prevention of private-row promotion into shared cache/latest reads.

Browser coverage:

- canonical structured result rendering;
- partial, stale, and insufficient-data states;
- unavailable target/entry/stop disclosure;
- provider provenance;
- keyboard disclosure;
- Arabic RTL and English/French LTR;
- light/dark theme behavior;
- 390px overflow check.

The same Playwright specification is configured for desktop Chromium, mobile Chrome, and mobile WebKit.

## Security findings

Resolved:

- browser Supabase configuration prefers an independently rotatable publishable key while preserving generated legacy consumers through a compatibility adapter;
- authenticated Preview CI uses a dedicated encrypted branch credential instead of the Production-scoped shared service credential;
- the isolated Preview project's legacy API keys and legacy HS256 signing key were revoked after modern publishable/secret key validation; the Production project and its data were not changed;
- client-supplied user IDs and provider preferences are rejected;
- URL-shaped symbols are rejected before resolution;
- provider secrets and raw errors never enter API results;
- anonymous force refresh is denied;
- direct anonymous database access is denied;
- authenticated inserts are denied;
- private history is owner-scoped by RLS;
- shared cache and previous-analysis lookups are shared-only, preventing future cross-user cache leakage.

Known limit: the existing rate limiter and in-flight lock are process-local. This is acceptable for the current bounded launch surface but should become distributed before high-volume automation.

## Performance impact

- Heavy detail uses native progressive disclosure and adds no charting or animation dependency.
- Provider orchestration remains server-side; raw provider payloads never reach the browser.
- Smart Analysis replaces one legacy signal request with one cached/deduplicated intelligence request.
- The UI component uses no polling and no new runtime package.
- Process cache and persistent freshness reuse reduce repeated provider traffic.

## Known limitations and deferred work

- Sentiment, news-factor, and macro modules remain unavailable until verified contracts are connected.
- Only the existing aggregate market pipeline is adapted as a provider.
- Distributed locks, distributed rate limits, and background revalidation are deferred.
- Target, entry, and stop-loss calculations are unavailable.
- Historical accuracy scoring is explicitly out of scope.
- Private analysis write/read APIs are not exposed in Phase 6.1.
- No autonomous trading, brokerage execution, alerts automation, or portfolio rebalancing is implemented.

## Validation status

Passed locally on 2026-07-19:

- `pnpm install --frozen-lockfile` with pnpm `11.1.3`;
- repository-wide ESLint;
- TypeScript `tsc --noEmit`;
- Arabic/English/French translation completeness;
- semantic visual-system guard with zero active-production findings;
- public environment-variable guard;
- complete Vitest suite: 127 files and 1627 tests passed;
- Phase 6.1 Playwright suite: 11 runs passed across desktop Chromium, mobile Chrome, and mobile WebKit;
- optimized Next.js production build: 156 static pages generated;
- performance budgets, including `/market-analysis` at 305.4 KiB gzip initial JavaScript against 312.5 KiB and 76.6 KiB CSS against 78.1 KiB;
- credential-shaped added-line scan and public-environment secret guard;
- migration/RLS static security tests.

The local Supabase CLI refused linked commands with `LegacyProjectNotLinkedError`, so no project was guessed or linked. After draft PR #45 opened, Supabase provisioned isolated Preview ref `tilrkqdngnokvxuvllio`; database, services, APIs, configuration, migration, seed, and Edge Function tasks all passed there. The Vercel Preview reached READY at `https://thesfm-git-feature-phase-6-aa0268-mohammed-alqallaf-s-projects.vercel.app` for the committed PR SHA.

Remote CI run `29665738621` passed TypeScript, ESLint, i18n, launch guards, 206 test files with 1629 unit/integration tests, the production build and performance budget, the complete Playwright smoke matrix, Lighthouse, and the complete authenticated Preview smoke. The authenticated job resolved the exact-SHA Vercel deployment, provisioned isolated Preview fixtures, validated request-to-row observability and cross-user isolation, passed the full remote browser suite, and removed its fixtures. An initial Lighthouse sample narrowly missed the unchanged performance threshold on a cold runner; the single unchanged retry passed, while the independent bundle budget and Playwright performance regression remained green.

Current gate recommendation: **GO for Phase 6.1 review**. Production remains untouched; merge and Production deployment still require explicit approval.

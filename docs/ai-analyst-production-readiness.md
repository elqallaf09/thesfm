# Smart AI Analyst production-readiness repair

## Scope and root causes

The repaired product route is the AI Analyst workspace (`/ai-analyst/*`), not the separate static trader application under `src/trader-app/public`. The exact-string audit found that the static trader scanner and its i18n test are a separate product surface and were not changed.

The production issues had four concrete causes:

1. The application shell put a sticky sidebar in the first grid track while its RTL positioning used the logical start edge. The visual sidebar and the allocated track could therefore disagree, letting pages and mega-menu content render below it.
2. `AiAnalystAnalysis` only generated a first analysis when an `autoRun` query flag was present. A direct supported-asset URL stopped at the missing-cache response.
3. The orchestrator deliberately discarded a verified provider quote and represented targets as unavailable. Its cache key omitted market and user scope, and its history store converted database failures into an empty timeline.
4. Market Map and the future-tool cards were static unavailable/placeholder surfaces with no verified provider implementation.

## Routes and components repaired

| Surface | Ownership | Production behaviour |
| --- | --- | --- |
| Analysis | `/ai-analyst/analyze/[symbol]` → `AiAnalystAnalysis` → `/api/intelligence/latest` and `/api/intelligence/analyze` | Cache miss starts a normal server-side analysis request; verified quote, target range, provenance, freshness, and disclaimer render when available. |
| History | `/ai-analyst/history` and expanded analysis timeline → `IntelligenceTimelinePanel` → `/api/intelligence/timeline` | Authentication required; private owner scope only; database errors remain errors with a retry action. |
| Market Map | `/ai-analyst/markets?view=map` | Hidden from production navigation and redirects to Market Explorer unless an internal non-production flag is enabled. No decorative map is created. |
| Future tools | `/ai-analyst/opportunities` | Hidden from production navigation and redirects to Overview. Internal preview exposes one compact roadmap panel only. |

## Data flow, cache, and history

The request path is now UI → authenticated API boundary → canonical asset resolver → existing market-data provider → deterministic analysis engine → immutable Supabase persistence → scoped history/rendering.

- A normal refresh reads only a fresh valid cache result. A miss or expired result creates a real analysis request.
- A forced refresh is authenticated, server-rate-limited, and deduplicated by the scoped analysis key. Guests receive a sign-in action, not a technical authorization banner.
- Cache lookup keys include scope/owner, normalized symbol, type, market, horizon; immutable record keys additionally include provider, methodology versions, and generation time.
- Successful signed-in analyses are private. Public cached analyses remain shared only for the product's guest read policy. History lists private rows for the authenticated owner only.
- Failed provider generation never overwrites the last valid persisted result. Failed persistence is explicitly marked and does not claim that history was saved.

The existing market provider is used without synthetic values. A recommendation is emitted only for live, fresh provider data meeting the configured evidence threshold. Current price is carried from the verified quote. The target range is displayed only when deterministically derived from recent verified OHLC data; otherwise its unavailable reason is explicit.

## Authentication, rate limiting, and security

- `/api/intelligence/timeline` requires an authenticated session and never accepts a user id from client input.
- `/api/intelligence/analyze` enforces forced-refresh authentication and rate limits on the server. API errors use stable machine codes and safe correlation IDs; retry windows are returned in `Retry-After`.
- History queries use `scope = private` and `user_id = authenticated user` in the service store. Existing RLS remains enabled and forced; the cache migration adds no client grants or policy relaxations.
- Provider tokens, cookies, authorization headers, and user data are not written into result snapshots or logs. Server logs retain only safe provider/error codes and correlation ids.

## Database change

`supabase/migrations/20260720090000_harden_intelligence_analysis_cache.sql` is additive and backward compatible. It adds and backfills `cache_scope_key` and `cache_key`, adds lookup/uniqueness indexes, and leaves the existing table, data, RLS, and policies intact.

Rollback: deploy the prior application build first. The added columns and indexes may then be removed only in a separate reviewed migration; do not rewrite the original production migrations.

## Flags

`NEXT_PUBLIC_AI_ANALYST_INTERNAL_SURFACES=true` enables the incomplete Market Map and future-tools preview surfaces only outside production. The flag is deliberately ignored for production deployments.

## Tests

- Unit: state/error mapping, cache scoping, freshness boundary, flag behaviour, rate-limit retry metadata, recommendation contracts, migration/RLS contract.
- Integration: cache hit/miss, request deduplication, provider failure, stale result protection, owner isolation, timeline pagination and comparison scope.
- Browser: source-backed analysis result, direct first-read generation, guest forced-refresh sign-in, history retry state, RTL/LTR/theme/mobile behaviour, Market Map and future-route redirects, and all required viewport widths with scroll-width and sidebar-intersection assertions.

Completed locally:

- `pnpm test:run` — 219 files and 1,698 tests passed.
- `pnpm exec playwright test tests/smoke/intelligence-smart-analysis.spec.ts --project=chromium-desktop` — 8 passed (the suite iterates all required desktop and mobile viewport sizes).
- `pnpm exec playwright test tests/smoke/ai-analyst-consolidation.spec.ts --project=chromium-desktop` — 8 passed.
- `pnpm typecheck`, `pnpm lint`, `pnpm check:i18n`, `pnpm check:visual-system`, and `pnpm build` — passed.

## Screenshots

The RTL desktop baseline is captured from `origin/main` at the repair base commit (`048846a7`). It shows the original content-under-sidebar and unconstrained mega-menu failure. Corrected captures are committed with the repair:

- [Before — RTL desktop, 1440×900](assets/ai-analyst-rtl-desktop-before.png)
- [After — RTL desktop](assets/ai-analyst-rtl-desktop.png)
- [After — RTL mobile](assets/ai-analyst-rtl-mobile.png)

## External limitations

- No verified Market Map provider exists, so the feature remains unavailable in production.
- The current rate limiter is server-side but process-local. Deploy a shared atomic rate-limit backend before horizontally scaling the API, otherwise limits are per runtime instance.
- Provider outages or insufficient/freshness-failing data correctly yield an explanatory no-recommendation state rather than synthetic market output.

## Deployment

1. Apply the new Supabase migration in preview, verify the backfill and RLS policies, then apply it to production.
2. Deploy application code with `NEXT_PUBLIC_AI_ANALYST_INTERNAL_SURFACES` unset/false in production.
3. Configure a shared rate-limit backend before adding multiple application instances.
4. Run typecheck, ESLint, the intelligence unit/integration suites, the relevant Playwright suites, and the production build.

Production-readiness verdict: **NO-GO until the configured production database migration and the final full deployment test suite complete; GO for the repaired code path once those deployment prerequisites pass.**

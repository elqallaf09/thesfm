# Phase 5.0C Part 2 — Missing Information & Regression Recovery

## Scope and baseline

- Audit baseline: `origin/main` at `04cffaa7f58f14752e2e60df1d559107d3233596`.
- Isolated branch: `fix/missing-information-regression-recovery`.
- Historical implementations compared: `59ed3e82` (dashboard recovery), `eba0946c` (market AI and trade performance), `1946eda9` (investment identity and ZAD), `a0121142` (market command center), `e68925d9` (OpenBB removal), and unmerged recovery audit `6a7bcd13`.
- No Production data was read or changed. No database migration was added or executed.
- Priority order: confirmed P0 saved-data/value-integrity regressions, then P1 provider/market regressions. Existing recovered pages were verified rather than redesigned.

## Missing-information audit

| Priority | Route | Section | Previous behavior | Current symptom on baseline | Root cause | Source of truth | Fix | Test evidence | Final status |
|---|---|---|---|---|---|---|---|---|---|
| P0 | `/projects` | Project list | Failed loads were distinguishable from an empty project list | A failed query rendered the same state as no projects; failed delete/progress mutations changed local state | Query errors were discarded and optimistic local mutations were committed before persistence succeeded | Supabase `projects`, scoped by authenticated user | Preserve prior rows on reload failure, add retry/error state, apply explicit ownership filters, update UI only after successful mutation | `dataIntegrityRecovery.test.ts`; full unit suite; typecheck | Restored |
| P0 | `/income` | Income records | A deleted card reflected a successful persisted delete | A failed delete silently removed the card until refresh | Local state was changed without checking the Supabase delete result | Supabase `monthly_income_sources` | Check mutation result, keep the row on failure, and show localized error feedback | `dataIntegrityRecovery.test.ts`; i18n check | Restored |
| P0 | `/dashboard`, finance route pages, `/notifications`, `/charity/donations`, `/education/expenses` | User-owned mutations | Mutations applied only to the current user's row | Several client mutations relied on RLS alone and omitted explicit `user_id` filtering | Ownership predicates had been removed or were never applied consistently | Authenticated user ID plus table RLS | Add authenticated-user guards and explicit ownership predicates to update/delete operations | `dataIntegrityRecovery.test.ts`; typecheck; existing RLS policy tests | Restored in client contract; live RLS validation pending approved credentials |
| P0 | `/invest` | Cross-currency quote refresh | Stored account-currency value remained valid when no verified FX conversion existed | A successful native quote could overwrite account value with a numerically incompatible foreign-currency value | Quote refresh treated native price × quantity as account-currency value without a conversion | Stored investment currency, native quote currency, and verified FX result | Always update safe native fields; update account value only for same-currency or verified conversion; never replace valid stored value with null/failed conversion | `investmentPlatformDirectory.test.ts` (same-currency and missing-FX cases); investment browser suite | Restored |
| P1 | Trader calendar APIs and `/thesfm-trader-own/calendar` | Earnings, dividends, IPO, economic events | Provider fallback and last-known-good data survived upstream degradation | An empty provider payload was recorded as connected/success and stopped fallback | Success was based on HTTP/provider completion, not a non-empty normalized dataset | Normalized provider results and non-empty cached last-known-good entries | Treat empty payloads as provider failure, continue to secondary provider, discard fresh empty cache entries, and preserve non-empty stale cache | `traderCalendarProviders.test.ts` empty-primary fallback, all-empty failure, stale preservation | Restored |
| P1 | `/api/trader/provider-status`, Smart Analysis diagnostics | Provider identity | Removed integrations no longer appeared in capability or status contracts | OpenBB remained in runtime types, catalog capability maps, diagnostics, legacy client labels, and fixtures after its removal | Vestigial references survived the earlier removal commit | Current provider router and configured runtime adapters | Remove the obsolete adapter and all runtime/fixture references; do not restore OpenBB configuration | `obsoleteProviderRecovery.test.ts`; provider-status and market-state suites | Restored |
| P1 | `/market-analysis`; `/thesfm-trader-own/market-analysis/[market]`; `/recommendations`; `/trade-performance` | Selected-market AI, recommendations, winning/losing/open trades | Pages and APIs returned source-backed analysis and consistent trade state | Reported as potentially missing; no current route regression reproduced | These experiences were restored earlier by `eba0946c` and remained present on `main` | Current route tree, analysis engine, followed-trade store | No duplicate restoration; verified route build, recommendation invariants, GCC catalog, and trade visibility tests | Build includes all routes; recommendation/trade/GCC focused suites pass | Verified present |
| P2 | `/dashboard` | Executive widgets and financial summaries | Source-aware widgets showed stored values, zero only for real zero, and separate currencies | Reported as potentially missing; application regression not reproduced | Dashboard was restored earlier by `59ed3e82`; the remaining failure was a smoke fixture losing middleware state on reload | Supabase-backed dashboard model and historical dashboard tests | Restore fixture cookie across login/reload and capture required widths; no product redesign | 11/11 dashboard browser checks; 390/768/1440/1920 screenshots | Verified present; test regression restored |
| P2 | `/today`, `/tasks`, `/notifications` | Operational centers | Separate routes remained available while roadmap consolidation evolved | No disappearing route or data source reproduced | Prior consolidation work was intentional, not an accidental deletion | Current navigation and route history | No merge or redesign in this phase | Build route inventory and navigation tests | Intentionally unchanged |
| P3 | `/education`, trader education, news routes | Content and education | Bundled/database/provider-backed content rendered when its source existed | No deleted content file, missing route, or translation regression reproduced | Provider-backed pages can legitimately be empty/degraded; bundled content remains present | Bundled education sources, translations, market-news registry | No generated filler content; verified current content/routes and error-state contracts | Education, news, locale, and build tests | Verified present |
| P3 | Legacy trader subroutes | Navigation | Old URLs reached the current source-of-truth pages | Redirect-only files appeared to be missing implementations during route inventory | Intentional route consolidation | Redirect targets in Git history and current app router | Retain redirects; do not duplicate navigation/pages | Build route inventory and navigation tests | Intentional redirects |

## Restored functionality

1. Project load failures no longer masquerade as empty data, and failed mutations no longer erase visible records.
2. Income deletion preserves the visible record when persistence fails.
3. Client-side user-owned mutations now include explicit authenticated ownership predicates in the audited routes.
4. Investment refresh preserves stored account-currency value when a cross-currency quote has no verified conversion.
5. Empty trader-calendar provider responses now trigger fallback/degraded handling instead of false connectivity.
6. Non-empty last-known-good calendar data survives an empty or failed refresh and is marked stale/degraded.
7. Obsolete OpenBB runtime/provider references are removed without restoring deleted configuration.
8. Dashboard authenticated fixture state survives reloads, with source-aware widgets verified across locales, themes, and required widths.

## Items intentionally not restored

- The alternate Smart Analysis shared-shell redesign from `c226d7aa`: it is an unmerged redesign and is outside recovery scope.
- OpenBB: removed by project history and absent from the current architecture; restoring it would violate the provider rule.
- Duplicate implementations for selected-market analysis, recommendations, trade performance, dashboard widgets, ZAD mapping, or the market command center: these are already present on `main` and tested.
- Generated education copy or fake market rows: no verified deleted source was found, and recovery must not invent content.
- Today/Tasks/Notifications restructuring: intentionally deferred to the future consolidation roadmap.
- Any destructive recalculation or database repair: neither was required.

## Provider limitations and recovery contract

| Feature / markets | Primary and fallback order | Timeout / retry | Cache and stale behavior | Empty result | User state | Admin diagnostics |
|---|---|---|---|---|---|---|
| Quotes: US, Kuwait, Saudi, UAE, Oman, Bahrain, Qatar, Europe aliases, forex, crypto, ETFs | Twelve Data → EODHD → internal Yahoo fallback | Provider adapters enforce bounded requests; sequential provider fallback is the retry policy | Fresh 5 min; last-known-good retained up to 6 h; provider timestamp older than 15 min fails fresh validation | Invalid/empty quote continues fallback | `live`, `delayed`, `cached`, or `unavailable`; never zero-substituted | Safe provider ID, latency, and reason are logged; keys/raw errors are not exposed |
| Metals / commodities | EODHD → Twelve Data → internal Yahoo fallback | Same router contract | Same 5 min / 6 h contract | Continues fallback | Same normalized status contract | Same safe diagnostics |
| Trader quotes and catalog | Configured FMP-first trader chain with Yahoo/Finnhub fallbacks according to capability | Sequential fallback; FMP rate-limit circuit handling | Quotes fresh 3 min and stale up to 30 min; catalog fresh 12 h and stale 24 h | Unavailable quote with null value, never fabricated recommendation | Provider status includes fallback, freshness, reason, and last update | `/api/trader/provider-status` and Admin market diagnostics; obsolete OpenBB removed |
| Trader earnings/dividends | FMP → Finnhub | Provider adapters use bounded 9 s class timeouts; sequential fallback | Feature cache 3 h; stale non-empty last-known-good preserved on failure | Now treated as failure and fallback trigger | `success`, `provider_error`, `rate_limited`, `not_configured`, plus stale metadata | Provider, result count, last success, failure reason/status code |
| Trader IPOs | FMP only | Bounded provider request | Feature cache 3 h; stale non-empty last-known-good preserved | Provider failure, not success | Insufficient/unavailable state when no real events | Same feature diagnostics |
| Trader economic calendar | Trading Economics → FMP → Finnhub | Bounded 9 s class timeouts; sequential fallback | Feature cache 1 h; stale non-empty last-known-good preserved | Now treated as failure and fallback trigger | Degraded/stale/unavailable distinguished | Same feature diagnostics |
| General economic calendar API | Configured Finnhub → Trading Economics → FMP | 9 s adapter timeouts; sequential fallback | Fresh 7 min; stale last-known-good on provider failure | Continues fallback | Safe provider message codes | Provider, entitlement, response status, count, last success |
| Dividend calendar API | FMP in current configuration contract; Finnhub adapter remains supported by the module | 9 s Finnhub-class timeout where used | Fresh 30 min | No fabricated events | Safe no-events or provider error state | Configured provider and last fetch/success |
| Market news | Official/core/Gulf/crypto RSS plus configured Finnhub and NewsAPI sources | Default 8 s, capped at 20 s; bounded concurrency and circuit breaker | Fresh 90 s; stale 15 min; indexed freshness 30 min | Empty aggregate is not reported as live provider success | Live, stored fallback, stale, or unavailable without raw provider errors | Provider health, coverage, attempt counts, failure codes, source registry |
| Sentiment / technical analysis / recommendations | Derived only from validated quote/history/news inputs | No independent fake fallback | Inherits source freshness and analysis sufficiency gates | Insufficient data yields no recommendation | Connected, degraded, stale, insufficient, unavailable, or provider failure remain distinct | Analysis/provider status and safe failure reasons |
| Earnings/company fundamentals | FMP with supported calendar/profile fallbacks where configured | Provider-bounded requests | Feature-specific cache above | No earnings row is synthesized | Unavailable/insufficient when source fails | Provider-status feature record |

Provider availability still depends on configured keys, provider entitlement, exchange coverage, symbol mapping, and upstream market hours. “Configured” is not treated as proof of returned content.

## Database and API contract result

- No schema mismatch requiring migration was confirmed.
- No migration was created, repaired, rewritten, or applied.
- Exact migration SQL: none.
- Affected tables / row impact / lock risk: none.
- Rollback SQL: none.
- Static user-scoping recovery was added to audited client mutations. Live user-vs-user RLS isolation remains a release gate because approved authenticated credentials are not available in this worktree/session.
- API/provider contracts now reject an empty trader calendar dataset as a successful connected result.

## Test and validation evidence

| Check | Result |
|---|---|
| `pnpm exec vitest run --reporter=dot` | 186 files, 1,456 tests passed |
| `pnpm typecheck` | Passed |
| `pnpm check:i18n` | Passed for Arabic, English, and French |
| `pnpm lint` | Passed |
| `pnpm build` | Passed; 155 static pages generated and all audited routes present |
| Focused recommendation/trade/GCC/education suites | 12 files, 95 tests passed |
| Focused provider/calendar suites | 4 files, 24 tests passed; calendar file 13/13 |
| Investment/platform/market Playwright subset | 37 passed, 10 intentional mobile skips; the 9 dashboard cases exposed the reused-server fixture configuration and were rerun below |
| Isolated dashboard Playwright matrix | 11/11 passed on desktop Chromium, mobile Chromium, and mobile WebKit |
| Independent `agent-browser` production smoke | `HAS_CONTENT`; no Next.js error overlay; interactive snapshot populated |

Browser coverage includes 390, 768, 1440, and 1920 widths; Arabic RTL, English LTR, French LTR; light/dark; empty/populated deterministic accounts; provider failure; refresh; offline/reconnect investment behavior; asset/platform identity; and responsive visibility. The deterministic dashboard account uses intercepted `.example` fixture requests and no real credentials or fake user-facing Production data.

## Screenshots

- Historical baseline: `docs/screenshots/dashboard-executive/before-main-chromium-desktop.png`
- Historical mobile baseline: `docs/screenshots/dashboard-executive/before-main-mobile-chrome.png`
- Recovered dashboard matrix:
  - `docs/screenshots/dashboard-executive/phase-5-0c-390px-fr-dark.png`
  - `docs/screenshots/dashboard-executive/phase-5-0c-768px-fr-dark.png`
  - `docs/screenshots/dashboard-executive/phase-5-0c-1440px-fr-dark.png`
  - `docs/screenshots/dashboard-executive/phase-5-0c-1920px-fr-dark.png`

## Preview, blockers, and rollout recommendation

- Preview deployment ID and commit SHA: pending branch publication and Vercel Preview.
- Authenticated Preview persistence, logout/login, populated approved test user, Admin diagnostics, and live two-user RLS isolation are not locally claimable without the existing approved E2E credentials. No credential was printed or committed.
- Supabase Preview is not required for this change because there is no migration.
- Do not merge or deploy to Production until the branch CI is green, Vercel Preview is READY, and the authenticated/RLS gates above pass.
- If those gates pass without new failures, recommend a normal guarded Production rollout; otherwise keep the PR unmerged and treat the first verified failure as the next regression to recover.

## Exact changed files

- `src/app/charity/donations/page.tsx`
- `src/app/education/expenses/page.tsx`
- `src/app/income/page.tsx`
- `src/app/projects/page.tsx`
- `src/components/finance/NotificationsPage.tsx`
- `src/components/finance/RouteDashboardPage.tsx`
- `src/lib/investments/investmentUtils.ts`
- `src/lib/translations/projects.ts`
- `src/app/api/trader/provider-status/route.ts`
- `src/lib/market-state/aggregateMarketState.ts`
- `src/lib/trader/marketCatalog.ts`
- `src/lib/trader/marketMetadata.ts`
- `src/lib/trader/marketQuotes.ts`
- `src/lib/trader/providers/openbb.ts` (deleted)
- `src/lib/trader/providers/providerStatus.ts`
- `src/lib/trader/providers/types.ts`
- `src/trader-app/public/app.js`
- `src/__tests__/unit/dataIntegrityRecovery.test.ts`
- `src/__tests__/unit/investmentPlatformDirectory.test.ts`
- `src/__tests__/unit/marketStateAggregate.test.ts`
- `src/__tests__/unit/marketStateGlobalConsistency.test.ts`
- `src/__tests__/unit/obsoleteProviderRecovery.test.ts`
- `src/__tests__/unit/traderCalendarProviders.test.ts`
- `tests/smoke/dashboard-executive-overview.spec.ts`
- `docs/data-integrity/phase-5-0c-part-2-report.md`
- `docs/screenshots/dashboard-executive/phase-5-0c-390px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-768px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-1440px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-1920px-fr-dark.png`

There are no unrelated migrations, dependency changes, or product redesign files.

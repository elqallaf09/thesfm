# Phase 5.0C — Data Integrity and Missing Information Recovery

Audit date: 2026-07-17

Baseline: `origin/main` at `b19770ad`

Branch: `fix/data-integrity-missing-information-recovery`

## Executive result

The current `main` already contains the dashboard recovery, trader market-analysis and trade-performance recovery, ZAD identity restoration, GCC symbol coverage, and the approved Global Header Variant 03. This phase did not revive superseded pages or add synthetic content.

The audit found and repaired four correctness classes:

1. A failed cross-currency quote conversion could replace an account-currency value with an amount denominated in the asset's native currency.
2. Several client mutations relied only on RLS and did not include an explicit `user_id` predicate.
3. Income and project delete/progress flows could update local UI before the database mutation was known to have succeeded.
4. The projects page treated a failed query as a genuinely empty account and offered no retry.

No production database was accessed or changed. No schema change or migration was required. No mock, placeholder, or synthetic user-facing data was added.

## A. Data integrity audit table

| Route | Section | Symptom / audit finding | Root cause | Source of truth | Fix / disposition | Test evidence | Status |
|---|---|---|---|---|---|---|---|
| `/` | Public landing and global shell | No missing section found; Variant 03 remains present. | N/A | Current route and shell components | Preserved without redesign. | Production build; browser shell checks | Verified |
| `/dashboard` | Financial cards, goals, reports link, charts | Previously recovered metrics remain present; zero-valued goal progress must remain visible and unavailable sources must not render as zero. | Prior regression was removed/fabricated aggregation; current source-aware implementation is from `59ed3e82`. | User-scoped Supabase financial tables | Preserved; repaired reload fixture so the regression matrix continues through all locale/theme reloads. | Dashboard Playwright: populated, empty, degraded; 390/768/1440/1920; ar/en/fr; light/dark | Verified |
| `/today`, `/tasks`, `/notifications` | Daily actions | No missing action source found. Current separation is intentional and already deduplicated by source identity. | Prior consolidation work in `30939075` and `dbc34e91` | Task-center source queries and notification records | Preserved current roadmap; no premature consolidation. Added explicit ownership filters to notification mutations. | Task-center, notification, deduplication unit tests; full unit suite | Hardened |
| `/command-center` | Legacy daily command entry | Route has no standalone page. | Intentional consolidation | Git history `30939075` | Keep redirect to `/today`; do not revive old UI. | Route source and build manifest | Intentional redirect |
| `/income` | Saved income rows | A failed delete could silently remove the row from local UI. | Mutation result was not checked before local state update. | `monthly_income_sources` | Check database error first; only mutate UI on success; add localized failure copy. | `dataIntegrityRecovery.test.ts`; i18n check; full unit suite | Fixed |
| `/expenses`, `/savings`, `/goals`, `/invest` | Add/edit/delete | Writes were protected by RLS but some update/delete builders lacked defense-in-depth ownership predicates. | Incomplete client query scoping | User-owned Supabase tables plus RLS | Added explicit `user_id` filters to generic route-dashboard updates/deletes and education expense mutations. | `dataIntegrityRecovery.test.ts`; route-dashboard unit suite | Fixed |
| `/projects` | Load, edit, delete, progress | Provider/database failure appeared as an empty account; delete/progress UI could diverge from persisted state. | Error was ignored and optimistic local state was unconditional. | User-scoped `projects` rows | Added distinct loading/error/empty states, localized retry, scoped mutations, and success-before-local-update behavior; retain prior rows on failed reload. | Static integrity contract tests; typecheck/lint/i18n; full unit suite | Fixed |
| `/charity/donations`, `/zakat`, `/khums` | User donations and calculations | Donation delete lacked an explicit owner predicate; no missing zakat/khums experience found. | Client mutation relied only on RLS. | User-scoped donation and charity tables | Add user guard and `user_id` filter; preserve existing real calculation/data flows. | Charity/zakat unit suites; integrity contract test | Hardened |
| `/decisions`, `/watchlist`, `/market-watchlist`, `/market-alerts` | Saved decisions, symbols, alerts | No current disappearance or duplicate regression found in source/tests. | N/A | User-scoped tables and existing dedupe keys | No product change. | Focused audit suite and full unit suite | Verified statically |
| `/business`, `/business-hub`, `/business-operations` | Customers, subscriptions, trainees, business records | No current missing route found. Live persistence could not be exercised without a safe authenticated test account. | Environment limitation, not a code diagnosis | User-scoped business tables and reminder records | No speculative change. | Subscription/reminder unit tests; route/build audit | Verified statically; live validation blocked |
| Company/service pages and submission routes | Directory and owner submissions | Routes and review/admin surfaces exist; no removed mapping found. | N/A | `company_listings` APIs/tables and approved source records | No change; no synthetic company entries. | Route inventory, API contract tests, build | Verified statically |
| Admin dashboards | Operations, providers, companies, Shariah, platforms | Admin diagnostics remain separate from user-facing messages. | N/A | Admin-only server aggregation and service-role queries | Preserved access controls and diagnostic boundaries. | Admin access/ops/provider tests; build | Verified statically |
| `/invest` | Native value, account value, currency, ROI | If FX was unavailable, a fresh native quote could overwrite `current_value` as though it were account currency. | Fallback used `currentMarketValue` without proving currency equality. | Native provider quote + explicit FX conversion + last known valid account value | Only write account fields when conversion exists or currencies match; otherwise update native fields and preserve last valid account value. | New cross-currency and same-currency unit tests; investment browser provider-failure preservation | Fixed |
| `/invest` | Fractional quantity and precision | No regression found. | N/A | Stored numeric quantity and provider quote | Preserve fractional arithmetic and market currency. | Investment utility/card tests; browser portfolio suite | Verified |
| `/invest` | Asset/platform identity and ZAD | ZAD and single-logo behavior already restored on `main` by `1946eda9`. | Earlier mapping/rendering regression already repaired | Verified platform directory plus asset logo resolver | Preserve existing mapping; do not create generic duplicate logos. | Platform directory unit/browser tests; ZAD browser assertion | Verified recovered upstream |
| `/invest` | Shariah status | No fabricated classification found; unavailable is distinct from compliant/non-compliant. | N/A | Stored/researched Shariah record with provenance | Preserve unclassified/insufficient-data treatment. | Shariah rendering and research tests | Verified |
| `/market-analysis` | Provider status and command center | Connected/degraded/empty states are explicit; heavy panels remain lazy. | Prior command-center production failure already repaired in `a0121142`. | Market-state envelope and provider adapters | Preserve status taxonomy and user/admin detail boundary. | Market command-center browser suite; market-state/provider unit tests | Verified recovered upstream |
| Market analysis APIs | Quotes, exchange, currency, profile, logo | No repeated generic ETF/USD contract found in audited normalizers; market currency mappings cover KWD/AED/SAR/QAR/etc. | N/A | Provider response normalized against exchange metadata | No speculative change. | Currency, symbol, exchange, logo, provider fallback tests | Verified |
| News pages | Market/Gulf/Europe/crypto/sector feeds | No “available with empty content” path found in audited aggregation contract. | N/A | Configured RSS/Finnhub/NewsAPI plus persisted indexed news | Preserve partial/stale/unavailable metadata and cached last-known-good results. | Market news engine/provider tests; full unit suite | Verified |
| Economic calendar | Events and provider state | Fallback and stale preservation already implemented. | N/A | Trading Economics, FMP, Finnhub in declared order | Preserve last successful events as stale when live providers fail. | Provider tests, including rate-limited stale fallback | Verified |
| Technical/smart analysis | Recommendation, confidence, targets, holding period | No fake recommendation path found; insufficient input returns unavailable/insufficient state. | N/A | Provider technical data and deterministic recommendation engine | No change; preserve recommendation/state consistency. | Analysis, recommendation, signal, contract tests | Verified |
| `/thesfm-trader-own/market-analysis/[market]` | Selected-market AI analysis | Live implementation exists and legacy routes redirect to it. | Previously disappeared and was restored by `eba0946c` on 2026-06-25. | Trader live frame and market-analysis APIs | Keep working implementation; do not revive dead legacy component. | Trader live-frame/market filter/analysis tests; build route manifest | Verified recovered upstream |
| `/thesfm-trader-own/trade-performance` | Winning, losing, open/pending, watching trades | Live implementation exists and status mappings cover won/lost/open/waiting/watching. | Previously disappeared and was restored by `eba0946c`. | Followed trades and recommendation outcomes | Keep consolidated performance experience. | Trade-performance unit tests; trader build routes | Verified recovered upstream |
| Trader legacy routes | `ai-analysis`, `recommendations-history`, `trades`, `positions`, `signal-history`, `trade-history` | These are redirects, not missing pages. | Intentional route compatibility consolidation | Current route redirects and Git history | Keep redirects to selected-market analysis or trade performance. | Route source and 155-route build | Intentional redirects |
| `/thesfm-trader-own/education`, `/education`, `/ebooks` | Education content | Routes and real bundled/published content remain present. | N/A | Repository content/assets | No change; no fake lessons added. | Route/build audit | Verified statically |
| Kuwait/GCC market pages | Coverage and full lists | Coverage remains present; bundled directories include Kuwait/GCC exchanges and provider aliases. | N/A | Versioned market-symbol directories plus live provider enrichment | Preserve bundled discovery metadata while never presenting it as a live quote. | Market catalog/filter/directory tests; full unit suite | Verified |
| `/reports` | Legacy report entry | Standalone page intentionally removed. | Intentional reports-center consolidation | Git history and route redirect | Keep redirect to `/reports-center`. | Route source and build manifest | Intentional redirect |
| All protected routes | Authentication and privacy | No bypass introduced. Local browser validation uses isolated mocked auth/data and documented fixture-only guest middleware allowance. | No live test credentials supplied | Middleware, signed session cookies, RLS | Preserve middleware/RLS; no production data mutation. | Auth/middleware/security unit tests; browser guest/auth fixture runs | Verified in code; live account blocked |

## B. Missing-information recovery report

### Restored or repaired in this branch

- Correct cross-currency investment valuation behavior: a failed FX conversion no longer replaces the valid account-currency amount with a native-currency number.
- Project loading failures now remain failures, preserve existing records, and expose a localized retry instead of masquerading as an empty account.
- Income and project destructive/progress actions no longer silently disappear from the UI when persistence fails.
- Explicit owner scoping was added to affected income, expense, savings, investment, project, donation, education-expense, and notification mutations.
- The dashboard browser regression fixture now survives the current login flow across refreshes, allowing the populated, empty, degraded, locale, theme, and viewport checks to run again.

### Already restored on current `main`

- Executive dashboard missing-data recovery: `59ed3e82` (2026-07-15).
- Selected-market AI analysis and winning/losing/open trade performance: `eba0946c` (2026-06-25).
- ZAD identity, single asset logo, and investment shell regression repair: `1946eda9` (2026-07-17).
- Market command-center production recovery: `a0121142`.

### Intentionally deferred

- Live authenticated CRUD, logout/login persistence, and cross-account RLS probes: no safe E2E user credentials are present in the supplied workspace.
- Live provider entitlement checks and provider-specific content counts: no provider keys were supplied locally. Contract, fallback, stale, and degraded behavior was validated with deterministic provider fixtures.
- Preview authenticated safe-record validation remains a release gate and must use a designated non-production test account.

### Intentionally removed or consolidated

- `/command-center` remains an intentional redirect to `/today`.
- `/reports` remains an intentional redirect to `/reports-center`.
- Trader legacy analysis/history/positions/trades routes remain compatibility redirects to the live market-analysis or trade-performance experience.
- Placeholder-only investment subsections remain removed; they must not return until backed by real data.

### Provider limitations

- Provider availability depends on configured keys, entitlements, exchange coverage, and market hours.
- A configured provider is not treated as content availability; empty success payloads normalize to insufficient/unavailable states.
- Provider diagnostics remain admin-only. Public errors use safe, non-technical messages and a retry path where applicable.

### Database limitations

- This audit was static and test-fixture based because Supabase project credentials and safe E2E users were not supplied.
- The repository contains 128 migrations and explicit RLS/grant statements. This branch does not rewrite migration history.
- Supabase changed new-project Data API exposure in 2026: grants and RLS must both be checked. Existing relevant migrations use explicit grants; no new grant migration was justified by the evidence.

## C. Exact changed files

Application:

- `src/app/charity/donations/page.tsx`
- `src/app/education/expenses/page.tsx`
- `src/app/income/page.tsx`
- `src/app/projects/page.tsx`
- `src/components/finance/NotificationsPage.tsx`
- `src/components/finance/RouteDashboardPage.tsx`
- `src/lib/investments/investmentUtils.ts`
- `src/lib/translations/projects.ts`

Tests and evidence:

- `src/__tests__/unit/dataIntegrityRecovery.test.ts`
- `src/__tests__/unit/investmentPlatformDirectory.test.ts`
- `tests/smoke/dashboard-executive-overview.spec.ts`
- `tests/smoke/long-page-workspaces.spec.ts`
- `docs/screenshots/dashboard-executive/after-chromium-desktop-ar-dark.png`
- `docs/screenshots/dashboard-executive/after-chromium-desktop-en-light.png`
- `docs/screenshots/dashboard-executive/after-chromium-desktop-fr-light.png`
- `docs/screenshots/dashboard-executive/after-mobile-chrome-ar-light.png`
- `docs/screenshots/dashboard-executive/after-mobile-chrome-en-dark.png`
- `docs/screenshots/dashboard-executive/after-mobile-chrome-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-390px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-768px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-1440px-fr-dark.png`
- `docs/screenshots/dashboard-executive/phase-5-0c-1920px-fr-dark.png`
- `docs/data-integrity/phase-5-0c-report.md`

## D. Exact migrations

None.

Migration risk: none, because this branch creates, changes, and applies no SQL migration.

Rollback: revert the application/test commit; no database rollback is required.

## E. Test results

- `pnpm test:run`: 440/440 suites and 1447/1447 tests passed (machine-readable local report retained outside the Git diff).
- Focused integrity matrix: 43 files / 395 tests passed.
- New/changed focused unit tests: 34 tests passed.
- Dashboard Playwright: 6/6 passed across desktop and mobile projects.
- Investment/platform/market Playwright: 15/15 passed.
- Mobile WebKit cached-route navigation stabilization: 2/2 repeated targeted runs passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm check:i18n`: passed for Arabic, English, and French.
- `pnpm build`: passed; 155 application routes generated.

## F. Preview validation evidence

Local production-mode evidence:

- Dashboard screenshots are stored in `docs/screenshots/dashboard-executive/`.
- Required widths 390, 768, 1440, and 1920 were asserted for horizontal overflow and captured.
- Arabic RTL, English LTR, French LTR, light mode, dark mode, populated data, empty data, provider-degraded data, and refresh behavior passed.
- Investment browser tests passed provider failure, last-known-value preservation, offline/reconnect, fractional/value presentation, ZAD identity, logo fallback, locale/theme, and responsive checks.
- Market command-center browser tests passed provider status, degraded response, lazy loading, route canonicalization, RTL/LTR, and responsive checks.

Remote Preview: `https://thesfm-git-fix-data-integri-52c48b-mohammed-alqallaf-s-projects.vercel.app` reached READY. Vercel Authentication protects the hostname, and unauthenticated route and health requests redirect to Vercel login. No protection was bypassed or weakened; remote page-level validation therefore requires an authorized Vercel session or bypass token.

## G. Remaining blockers

1. No safe authenticated E2E account credentials were provided, so real Supabase CRUD, refresh, logout/login, and cross-user isolation were not executed against Preview.
2. No provider keys were supplied locally, so live provider entitlements/freshness cannot be certified from this workspace.
3. The READY Preview is protected by Vercel Authentication, so remote page-level browser validation remains blocked without an authorized session or bypass token.
4. Production rollout remains blocked until the draft PR CI is green and the designated authenticated Preview account passes the safe-record checklist.

## H. Production rollout recommendation

Do not deploy or merge yet.

Proceed only after:

1. CI passes on the draft PR.
2. Vercel Preview reaches READY.
3. A designated non-production account validates add/edit/delete/reload/logout-login for each owned record type and a second account confirms isolation.
4. Preview provider-degraded checks preserve last-known-good values and never display unavailable values as zero.
5. The PR diff is confirmed to contain only this phase and no migration.

Once these gates pass, the change is low database risk because it is application-only, additive in behavior, and rollback requires only reverting the commit.

## Data-source truth matrix

| Category | Source | Provider / fallback order | Refresh and cache | Stale threshold | Last-known-good behavior | User-facing unavailable state |
|---|---|---|---|---|---|---|
| User financial data | User-owned Supabase rows protected by RLS | No synthetic fallback; guest data is isolated local guest storage | Read on page load/explicit refresh; mutations are no-store database writes | Not market-staled; query failure is an error, not empty/zero | Preserve already rendered rows when a safe refresh fails | Localized error and retry; no fabricated balances |
| Market quotes | Normalized market providers | General: Twelve Data → Finnhub → EODHD → Marketstack → Yahoo. Trader: FMP → Yahoo → Finnhub | Quote memory cache 45s; provider-router cache 5m | Fresh 15s; stale 60s; provider-router accepts LKG up to 6h where explicitly marked stale | Preserve last valid quote/account value; never overwrite account currency without FX | Degraded/stale/unavailable/insufficient, never a false zero |
| Historical prices | Provider candles | General: Twelve Data → EODHD → Yahoo. Trader: FMP → Yahoo | Candle cache 5m | Fresh 1h; stale 24h; LKG candle cache up to 24h | Return marked stale historical points when safe | History unavailable message; no invented chart points |
| Company profiles | Provider company metadata | General: Twelve Data → EODHD → Yahoo. Trader: FMP | 24h profile cache | Fresh 24h; stale 7d; LKG up to 7d | Use marked cached profile | Hide genuinely unavailable fields |
| News | Official/core/Gulf/crypto RSS plus Finnhub and NewsAPI; persisted indexed stories | Priority-ordered registry; partial provider results retained | Aggregation cache 90s; HTTP `s-maxage=90`, SWR 600s | Fresh 5m; stale 30m; indexed freshness 30m; in-memory LKG 15m | Serve marked cached/stale stories when live sources fail | Clear unavailable/partial message; never claim available with zero stories |
| Sentiment | Configured sentiment/market providers and real returned observations | Capability-specific provider router | Request/capability cache as declared by provider | Capability status from market-state envelope | Preserve only a sourced cached result with timestamp | Insufficient data or unavailable; no fake score |
| Economic calendar | Trading Economics, FMP, Finnhub | Trading Economics → FMP → Finnhub | Provider cache 7m; HTTP `s-maxage=300`, SWR 900s | Fresh 1h; stale 2h | Keep last successful event set as explicitly stale on provider failure | Provider-safe unavailable message, no fabricated event |
| Technical analysis | Market candles/technical provider data and deterministic engine | Trader: FMP → Yahoo | Capability/provider cache | Fresh 15m; stale 1h | Use only timestamped provider inputs; stale is labelled | Insufficient data/unavailable, not buy/sell/wait |
| Recommendations | Deterministic recommendation engine over sourced technical inputs | Trader: FMP → Yahoo inputs | Signal cache 4m | Fresh 15m; stale 1h | Preserve an existing result only with its state/timestamp | No recommendation when evidence is insufficient |
| Shariah status | Stored researched record and sourced financial screening | FMP financials where configured; otherwise existing verified record | Research fetch cache 15m; market-state capability metadata | Fresh 7d; stale 30d | Preserve provenance-bearing prior result | Unclassified/needs review; never assume compliant |
| Asset logos | Provider company/logo response plus verified symbol mappings | General: Twelve Data → EODHD → Yahoo; trader FMP; honest monogram fallback | Provider logo cache 24h | Fresh 7d; stale 30d | Keep valid cached URL while marked delivery metadata remains truthful | One monogram/identity fallback; no duplicate generic logo |
| Platform/broker directory | Approved `investment_platforms` records plus verified built-in identity mapping | API directory first, verified identity mapping for known platforms such as ZAD | Private/no-store directory request | Directory record timestamps/status | Keep stored purchase platform identity | Text/initial identity fallback; no fabricated platform |
| FX conversion | Frankfurter-backed FX service through normalized FX route | Direct pair, then inverse/cross handling in service | 5m FX cache | Conversion validity is request-scoped | Preserve previous account-currency value when conversion fails; update native quote only | Native currency remains explicit; account value is unavailable/stale, never relabelled |

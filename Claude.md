# Project Structure

## Overview
Arabic-first smart financial manager with username/password authentication, monthly income source setup, income distribution planning, financial goals, charitable works allocation, profile management, and market indicators.

## Tech Stack
- Framework: Next.js 15 App Router
- Language: TypeScript
- Database/Auth: Nubase/Supabase client integration
- UI: React, Tailwind CSS, shadcn/ui-style components
- Icons: lucide-react
- Font/Layout: Cairo font with RTL support

## Directory Structure
```text
src/
├── app/
│   ├── api/
│   │   ├── health/            # Health check route
│   │   └── market-ticker/     # Market ticker data route
│   ├── globals.css            # Global styles and ticker animation
│   ├── layout.tsx             # Root layout, theme, auth provider, Arabic RTL setup
│   └── page.tsx               # Auth-gated financial manager UI
├── components/
│   ├── auth/                  # Login and registration UI
│   ├── income/                # Monthly income source setup UI
│   └── ui/                    # Shared UI primitives
├── hooks/                     # React hooks including auth context
├── integrations/supabase/     # Supabase/Nubase client and types
└── lib/                       # Utility helpers and income category definitions
```

## Core Systems

### Authentication
- Status: Implemented
- Location: `src/hooks/useAuth.tsx`, `src/components/auth/AuthForm.tsx`, `src/app/layout.tsx`
- Description: Username/password auth flow using Supabase auth. Registration collects username, password, email, and age; login remains username/password. Usernames are mapped to internal email-style identifiers, session state is provided through `AuthProvider`, and unauthenticated users see the login/register screen first.

### Monthly Income Sources
- Status: Implemented
- Location: `src/components/income/IncomeSourcesForm.tsx`, `src/lib/income-categories.ts`, `src/app/page.tsx`
- Database: `public.profiles` (username, display name, email, age, phone country code, phone number), `public.monthly_income_sources`
- Description: New users enter monthly income by category: active, passive, investment, business, additional, seasonal, and government/support income. Saved sources are summed and passed into the financial manager as monthly income, and users can update those income sources from the profile panel.

### Profile Management
- Status: Implemented
- Location: `src/app/page.tsx`
- Database: `public.profiles`
- Description: Authenticated users can open the profile panel from the top bar to view and update profile data, phone country code, phone number, monthly income sources, and password. Current passwords are never displayed; only password changes are supported.

### Financial Manager
- Status: Implemented
- Location: `src/app/page.tsx`
- Description: Calculates monthly income distribution with preset and manual allocation modes, independent charitable works percentages by type, dynamic expense/savings/investment items, bilingual examples, financial goal suggestions with day/month/year duration units, manual allocation warnings, print optimization, and advice. The main income amount is initialized from saved monthly income sources after login.

### Market Ticker
- Status: Implemented
- Location: `src/app/page.tsx`, `src/app/api/market-ticker/route.ts`
- Description: Displays a moving market ticker with categories for global, Gulf, Asian, European, crypto, and metals markets. Data is requested through an internal API route from external providers, with local fallback data when providers are unavailable.

### Internationalization
- Status: Implemented
- Location: `src/app/page.tsx`, `src/app/layout.tsx`
- Description: Arabic and English interface toggle with RTL/LTR switching.

### Currency Selection
- Status: Implemented
- Location: `src/app/page.tsx`
- Description: Supports a broad currency list with Kuwaiti Dinar as the default.

### AI Trading Terminal (thesfm-trader-own)
- Status: Implemented
- Location: `src/trader-app/public/app.js` (static SPA served via `src/app/thesfm-trader-own/app/[[...path]]/route.ts`), data endpoints `src/app/api/markets/route.ts` and `src/app/api/recommendations/route.ts`, shared helper `src/lib/trader/marketQuotes.ts`.
- Description: Arabic trading terminal (dashboard, markets, heatmap, scanner, watchlist, symbol details). Market data is served live from Yahoo Finance (no API key) through `src/lib/trader/marketQuotes.ts`, which maps trader symbols (forex `=X`, crypto `-USD`, commodity futures, `^` indices) to Yahoo tickers and fetches 3-month daily history with bounded concurrency. `/api/recommendations?market=<id>` returns per-market quotes plus rule-based technical signals (buy/sell/watch) with confidence and risk derived from SMA20/SMA50 alignment and RSI-14 — transparent indicator readings, not fabricated advice. `/api/markets` returns the market directory and reports the provider as connected. Prices are normalized with `normalizeMarketPrice` so Gulf subunit quotes (Kuwait fils / `KWF`) are converted to major units (e.g. `KFH.KW` 771 → 0.77 KWD). Symbols Yahoo cannot serve degrade to an `unavailable` list rather than showing placeholder data. Company logos in the SPA use the FMP image endpoint for US tickers with a Google favicon fallback (the previous `logo.clearbit.com` service was discontinued).

## Current State
- [x] Username/password login and registration as homepage entry
- [x] Registration fields for username, password, email, and age
- [x] Nubase database tables for user profiles and monthly income sources
- [x] RLS policies for user-owned profile and income data
- [x] Monthly income setup with seven income categories and examples
- [x] Arabic smart financial manager UI
- [x] Currency selector with KWD default
- [x] Income split presets and manual allocation analysis
- [x] Dynamic rows for expenses, savings, and investment
- [x] Bilingual examples for expenses, savings, and investment
- [x] Charitable works section with independent percentages for Sadaqah, Zakat, sacrifice, expiation, and other charity
- [x] Financial goals section with achievement suggestions and day/month/year duration units
- [x] Profile panel with profile updates, phone details, password change, previous calculation details, and monthly income updates
- [x] Manual allocation warning when entered values exceed suggested ratios
- [x] Print optimization for the financial page
- [x] Arabic/English language selector
- [x] Moving market ticker with external data route
- [x] Boursa Kuwait-inspired visual background
- [x] AI trading terminal wired to live Yahoo Finance quotes with rule-based technical signals and Gulf price-unit normalization

## Maintenance Log
- 2026-05-12: Added username/password authentication, user profiles, monthly income source database tables, income setup UI, and connected saved income sources to the financial manager.
- 2026-05-12: Added project knowledge base and documented financial manager, market ticker API, language support, and current implementation state.
- 2026-05-12: Updated registration to collect email and age, added bilingual financial examples, optional chart display, goal suggestions, manual warnings, and print optimization.
- 2026-05-12: Added profile management with phone fields and password change, monthly income updates from the profile panel, independent charitable works percentages, and goal duration units.
- 2026-07-01: Fixed trader app logos (Clearbit discontinued → FMP + Google favicon). Wired the AI trading terminal's `/api/markets` and `/api/recommendations` from hardcoded "not_configured" stubs to live Yahoo Finance data via `src/lib/trader/marketQuotes.ts`, added rule-based technical buy/sell/watch signals (SMA20/50 + RSI-14) with confidence/risk, and normalized Gulf subunit prices (Kuwait fils → KWD).
- 2026-07-12: Trading dashboard polish (phase 2.6, trader-scoped only): fixed the ticker-chip logo overlapping prices (32px column vs forced 44px logo), three invalid `:is(...::placeholder)` rules that made Light-Mode placeholders invisible, the unreadable Light-Mode active workspace tab, and the "بيع→Sell" mid-word corruption of "1-3 أسابيع" (fragment replacement is now word-boundary-aware). Collapsed repeated "unavailable" labels into compact accessible dashes across ticker/sessions/heatmap/tables, gated confidence/AI-score display behind `assetDataState` evidence completeness (presentation only), and upgraded Command Center empty states. Visual QA record: `docs/trader-visual-qa.md`.
- 2026-07-12: Added an information-density system: `comfortable` (default, approved appearance) and `compact` (opt-in, persisted) via `src/lib/ui/density.ts`, `src/hooks/useDensity.tsx`, a header `DensityToggle`, and `src/styles/density.css` (`data-density` on the root element). Compact tightens cards, tables, KPI tiles, grids and page heroes, with a denser table tier for the trader/admin scopes and a gentler tier for Core Finance; guaranteed color-free, control-free and ≥12px so identity, touch targets and accessibility are unaffected.
- 2026-07-12: Workspace architecture phase 3 — added a typed workspace registry (`src/config/workspaces/`: types, registry, resolver, navigation mapping) organizing the platform into four workspaces (personal-finance `/dashboard`, markets-trading `/market-analysis`, business-projects `/business-hub` with guest entry at `/investment-companies`, administration `/sfm-admin-control`). Pathnames resolve via longest-prefix, segment-aware matching with a personal-finance fallback; `isPublicShellRoute` is the single source AppLayout consumes. The route-driven, permission-filtered `WorkspaceSwitcher` is rendered only in the sticky global header; Sidebar and MobileMenu show only the active workspace navigation, and server administration gates remain unchanged. The shared application grid owns header/sidebar/main sizing and `WorkspacePageContainer` provides full, wide, standard, and reading measures without changing public URLs. Details: docs/workspace-architecture.md; tests: workspaceRegistry.test.ts, headerWorkspaceNavigation.test.ts, workspacePageLayout.test.ts.
- 2026-07-12: Investor Experience phase 2.9 — rebuilt `/investment-offers` into an eight-tab investor workspace (overview, readiness, financials, documents+due-diligence, pitch deck, risks, sharing, activity) with colocated `_text.ts` (AR/EN/FR), `_data.ts`, tab components and `investor.module.css`. Readiness is computed by the deterministic engine `src/lib/investor/readiness.ts` (9 weighted categories, statuses complete/partial/missing/blocked/needs_review, blocking checks, 365-day staleness review flag, injectable clock) — never by AI and never hardcoded. New migration `20260712130000_create_investor_relations.sql` adds `project_investor_links` (SHA-256 token hash, scrypt password hash, section allowlist, expiry, revocation), `project_investor_events`, `project_risks`, `project_investor_questions`, `project_due_diligence_items`, all user-owned RLS. Secure sharing: `POST /api/investor/links` (owner, raw token returned once) and `POST /api/investor/view` (service role, enforces state/password/sections, filters private docs — visibility is opt-in — logs real events only). Public viewer at `/investor/[token]` (public in AppLayout, password gate, expired/revoked states, question submission). Due-diligence items complete only with evidence or a written review note. Tests: investorReadiness, investorShareAccess, rewritten investmentOffersJourney (privacy + copy + RTL-safe CSS guards). NOTE: the migration must be applied to Supabase before links/risks/questions persist; until then those sections degrade to safe empty states.
- 2026-07-12: Density phase 2.7 — per-area defaults + trader terminal tier. The density preference gained an `auto` tier (no stored choice): `resolveDensity` in `src/lib/ui/density.ts` defaults the `trader`/`admin` scopes to compact on desktop while everything else (and all mobile viewports) stays comfortable; an explicit toggle choice wins everywhere. Compact now also tightens the shared layout tokens (`--sfm-section-gap`/`--sfm-card-gap`/`--sfm-page-pad-y`, desktop-only) with a tighter re-declaration inside trader/admin scope containers. The standalone trader terminal reads the same preference pre-paint (`index.html`/`detail.html` stamp `data-density` on `<html>`) and applies a marked compact tier at the end of `cinema.css` (≥1024px, `sfm-density-layer` markers) — compact by default on desktop, comfortable on mobile/tablet, live cross-tab sync via `storage` events in `app.js`. Guarded by `densityMode.test.ts` + `traderDensity.test.ts` (no colors, no control metrics, no sub-12px fonts, RTL-safe spacing).
- 2026-07-17: Smart Analysis shell unification — the SFM Smart Analyzer (`/thesfm-trader-own`) now uses the shared application shell navigation instead of its own white terminal sidebar. The shared Sidebar/MobileMenu gained route-scoped contextual groups (`trader-trading`/`trader-follow`/`trader-more` in `navigationConfig.ts`, filtered by `filterGroupsForRoute` in `workspace-navigation.ts`) that render only inside `/thesfm-trader-own` and replace the markets groups there; labels are AR/EN/FR (`nav.ts`), and route-scoped groups stay out of global surfaces (command menu, site map). The terminal iframe is persistent: it moved from per-page `TraderOwnFrame` into the segment layout (`layout.tsx` + client `TraderShellPage.tsx`), pages became URL anchors returning null, and a versioned same-origin message bridge (`src/lib/trader/routeBridge.ts` + mirror in `app.js`) syncs routes both ways — sidebar navigation posts `SFM_TRADER_ROUTE_SET` into the frame (no reload) and terminal-internal navigation posts `SFM_TRADER_ROUTE_CHANGE` up for `router.push`, so active states and deep links (including `symbol-details/EURUSD=X`) stay correct. In embedded mode the SPA stamps `data-embedded` pre-paint (`index.html`/`detail.html`) and the marked `sfm-embedded-shell-layer` at the end of `cinema.css` hides `.terminal-sidebar` at every width (single navigation column, no duplicated brand); the bottom mobile tab bar and the full standalone terminal remain untouched. Guarded by `smartAnalysisShellUnification.test.ts` and `tests/smoke/smart-analysis-shell-unification.spec.ts` (requires `SFM_LOCAL_TRADER_QA=1`).
- 2026-07-12: Restored the approved Core Finance visual identity after the control-unification sweep re-metered it (42px button floor, 48px fields, 50px touch fields, approved dark radii), and introduced product-area theme scopes (`core-finance`, `business`, `trader`, `admin`, `shariah`) via `src/lib/navigation/themeScopes.ts` + `src/styles/scopes.css`; `AppLayout` stamps `data-theme-scope` on `#main-content` so one area's redesign can no longer leak into another.
- 2026-07-18: Added verified platform logos + safe category icons to the investment-platform directory. New shared resolver `src/lib/platformVisuals.ts` — `resolvePlatformIdentity()` follows priority: explicit approved logo → internal id/slug → verified website domain → canonical name → verified alias → null (category icon). Verified directory keyed by stable slug with approved-host allowlist (`APPROVED_PLATFORM_LOGO_HOSTS`: cdn.simpleicons.org, www.google.com favicon), covering all real seeded platforms (XTB, Interactive Brokers, eToro, Trading 212, Saxo, Swissquote, Charles Schwab, Fidelity, DEGIRO, Robinhood, Binance, Coinbase, Kraken) plus ZAD and KFH; generic seeded rows (Other broker, Local bank brokerage, …) intentionally have NO logo and fall to a semantic category icon (never a fabricated logo). New `src/components/invest/PlatformAvatar.tsx` renders exactly one visual — the verified logo with an onError→category-icon fallback (broker→briefcase, bank→landmark, multi-asset→candlestick, crypto→coins, fund/robo/private→pie, metals→gem, real-estate→building, other→building) — replacing the generic `Building2` in the admin directory list (`InvestmentPlatformsAdminClient.tsx`) and the selector dropdown/summary (`InvestmentPlatformSelector.tsx`). This is separate from the ASSET resolver and from the holding-card `PlatformIdentity` badge (which keeps its monogram fallback, unchanged). Tests: `platformLogoIdentity.test.ts` (priority chain, domain-wins-over-name, alias, unknown→category, host policy, all listed platforms, explicit-URL host restriction, single-visual guards) and Playwright cases in `investment-platform-directory.spec.ts` (verified logo + category-icon fallback rows, single visual, consistent size, no overflow, EN-LTR + AR-RTL, desktop + webkit). No fake or unverified logos.
- 2026-07-17: Hardened the shared asset logo-identity resolver so the TSM/TSMC fix generalizes across global markets (`src/lib/assetVisuals.ts`). `resolveAssetIdentity()` follows a strict priority — stable internal asset id → ISIN → exchange-qualified ticker (ticker + MIC/exchange + market) → canonical ticker → verified alias → normalized company name → safe fallback — with ticker always winning over display name and name aliases used only when no usable ticker exists (no fuzzy matching). Verified logos live in a structured directory (`VERIFIED_ASSET_LOGO_DIRECTORY`) keyed by canonical identity with approved source URL, expected hostname (validated against `APPROVED_LOGO_HOSTS`: cdn.simpleicons.org, www.google.com favicon service, financialmodelingprep.com), ticker/ISIN/name aliases, and optional market scoping. Market/exchange context disambiguates duplicate tickers (a market-scoped identity like KFH→Kuwait is skipped for a same-ticker asset on another exchange, falling back safely rather than borrowing the wrong logo). `normalizeTickerSymbol()` strips trailing ADR/ADS/ADRS designators generically for any ticker while preserving class-share suffixes (BRK.A/BRK.B/RDS.A/RDS.B) and venue suffixes (KFH.KW, 2330.TW); numeric global tickers (Saudi 2222.SR, HK 0700.HK, Tokyo 7203.T, Korea 005930.KS) are recognized. `normalizeCompanyNameKey()` strips corporate/depositary designators (Co., Ltd., ADR, ADS, American Depositary Receipt/Shares, PLC, SA, NV, AG, …) from the name tail before alias lookup and never mutates the user-facing display name. Verified entries carry real public ISINs (TSM US8740391003, NVDA US67066G1040, AMD US0079031078). The ZAD platform badge (`PlatformIdentity.tsx`) remains a fully separate component/data path (`purchasePlatformId` → `platformLogos`) — untouched, non-overlapping. Tests: `assetLogoTsmResolution.test.ts` (all 5 required TSM aliases + rendering guards), `assetLogoIdentity.test.ts` (priority chain, ISIN, class shares, market disambiguation, verified-host policy, 16-market coverage audit, safe fallback), and Playwright cases in `investments-premium-cards.spec.ts` (verified logo per alias, no asset/platform overlap, long-ADR-name no clip/overlap in LTR+RTL, safe fallback on broken remote logo). No fake or unverified logos were introduced.

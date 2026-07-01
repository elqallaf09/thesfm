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

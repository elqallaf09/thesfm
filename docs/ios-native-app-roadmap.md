# THE SFM iOS Native App Roadmap

This document prepares THE SFM for a full native iOS application. The goal is to build the app on stable product logic instead of duplicating unfinished web behavior.

## Product Decision

- Build a full native iOS app with SwiftUI.
- Keep the current Next.js app as the web product and backend/API surface.
- Keep Supabase as the main data source for auth, user data, RLS, and persistence.
- Reuse existing API routes for AI, market data, Stripe, receipts, and expensive server-only logic.
- Keep Arabic as the default language, with English and French support.
- Support RTL, dark mode, and light mode from the first app milestone.

## MVP Screens

The first iOS version should include the flows users need every day:

1. Authentication
   - Login
   - Sign up
   - Reset password
   - Optional MFA when enabled

2. Home
   - Executive dashboard
   - Today view
   - Smart alerts
   - Quick actions

3. Personal Finance
   - Income
   - Expenses
   - Monthly subscriptions
   - Debts and installments
   - Savings
   - Financial goals

4. Investment And Market
   - Portfolio
   - Live price refresh
   - Market analysis
   - Market agent
   - Watchlist and alerts

5. Projects
   - Projects list
   - Project workspace summary
   - Project income
   - Project expenses
   - Tasks and documents

6. Reports And Documents
   - Reports center
   - Documents center
   - Receipt scan entry point

7. Account
   - Profile
   - Language
   - Currency
   - Display mode
   - Security and privacy

## Shared Backend Contracts

The native app should not recreate financial calculations independently unless the logic is lightweight and already stable. Important shared tables and APIs:

### Supabase Tables

- `profiles`
- `monthly_income_sources`
- `expense_items`
- `debts`
- `debt_payments`
- `savings_items`
- `financial_goals`
- `investment_items`
- `projects`
- `project_income`
- `project_expenses`
- `project_tasks`
- `project_documents`
- `notifications`
- `market_watchlist`
- `market_price_alerts`
- `market_agent_history`
- `zakat_assets`
- `zakat_calculations`
- `charity_projects`

### API Routes To Reuse

- `/api/market/refresh-investment-price`
- `/api/market-agent/analyze`
- `/api/market/analyze`
- `/api/market/search-assets`
- `/api/market/symbols`
- `/api/market/metals`
- `/api/debts/generate-monthly-expenses`
- `/api/receipts/scan`
- `/api/ai/receipt-scan`
- `/api/invoices/analyze`
- `/api/projects/[id]/ai-advisor`
- `/api/projects/[id]/expense-analysis`
- `/api/projects/[id]/pitch-deck`
- `/api/stripe/create-checkout-session`
- `/api/stripe/create-portal-session`

## What Should Be Finished Before Full Native Build

These parts should be stable on the web before the iOS app mirrors them:

1. Payment linking
   - Stripe checkout and customer portal are already present.
   - Need final product rules for plans, access gates, and renewal states.

2. Monthly subscriptions
   - Currency-specific amounts must stay per subscription.
   - Expense totals must convert each item to the selected display currency.
   - Recurring timing rules must be final.

3. Debts
   - Paid installment count, next installment, remaining amount, and progress must be consistent.
   - Generated monthly expenses should not duplicate past payments.

4. Expenses
   - Project expenses, normal expenses, subscriptions, and debt installments should show original currency plus converted display value.

5. Investments
   - Portfolio value should refresh quickly without overloading market providers.
   - Price source, stale data, and unsupported assets must be clear.

6. AI and market analysis
   - All AI outputs must keep safe financial disclaimers.
   - AI should explain calculations, not invent prices or indicators.

## Native Build Phases

### Phase 0 - Preparation

Deliverables:

- Confirm MVP screen list.
- Confirm data ownership and RLS rules.
- Freeze shared financial calculation rules.
- Define iOS design tokens for colors, typography, cards, buttons, and spacing.
- Create API contract notes for mobile-only calls.

### Phase 1 - iOS Foundation

Deliverables:

- Create SwiftUI project.
- Add environment configuration for Supabase and API base URL.
- Add authentication flow.
- Add Arabic RTL support.
- Add language switcher.
- Add dark and light themes.
- Add secure token storage.
- Add base networking layer.

### Phase 2 - Personal Finance Core

Deliverables:

- Dashboard.
- Income.
- Expenses.
- Monthly subscriptions.
- Debts.
- Savings.
- Financial goals.
- Shared money formatter with currency conversion.

### Phase 3 - Investments And Market

Deliverables:

- Investment portfolio list.
- Live portfolio refresh.
- Asset details.
- Market analysis.
- Market agent.
- Watchlist.
- Price alerts.

### Phase 4 - Projects, Reports, And AI

Deliverables:

- Projects list.
- Project workspace summary.
- Project income and expenses.
- Reports center.
- Documents center.
- Receipt scan and invoice analysis.
- AI assistant entry points.

### Phase 5 - TestFlight And App Store

Deliverables:

- App icon and launch screen.
- Privacy labels.
- App Store screenshots.
- TestFlight internal testing.
- TestFlight external testing.
- Production release checklist.

## iOS Technical Shape

Recommended app structure:

```text
THE SFM iOS
+-- App
|   +-- TheSFMApp.swift
|   +-- AppRouter.swift
|   +-- AppEnvironment.swift
+-- Core
|   +-- Auth
|   +-- Networking
|   +-- Supabase
|   +-- Formatting
|   +-- Currency
|   +-- Theme
+-- Features
|   +-- Dashboard
|   +-- Income
|   +-- Expenses
|   +-- MonthlySubscriptions
|   +-- Debts
|   +-- Savings
|   +-- Goals
|   +-- Investments
|   +-- MarketAnalysis
|   +-- MarketAgent
|   +-- Projects
|   +-- Reports
|   +-- Profile
+-- Resources
    +-- Localizable.strings
    +-- Assets.xcassets
    +-- Theme.json
```

## Mobile API Rules

- The app should send authenticated requests with the current Supabase session token.
- Server-only providers must stay behind Next.js API routes.
- Do not expose market provider keys or AI keys in the iOS app.
- The app can read/write simple Supabase tables directly when RLS is already correct.
- Complex calculations should be centralized behind an API route when the same result appears on web and iOS.

## First Native Sprint

The first practical sprint should be:

1. Create SwiftUI project.
2. Connect Supabase auth.
3. Build login and dashboard shell.
4. Build shared theme for Arabic RTL, light mode, and dark mode.
5. Read `profiles`, `expense_items`, `monthly_income_sources`, `debts`, and `investment_items`.
6. Show dashboard totals as read-only.
7. Compare iOS totals with the web dashboard before adding editing flows.

## Open Decisions

- Whether payments stay web-only through Stripe Checkout links or get a native purchase/payment flow.
- Whether market data refresh should be push-triggered, polling-based, or opened only on demand.
- Whether the app starts as personal finance only or includes projects and market analysis in version 1.
- Whether documents and PDF exports are native-generated or opened from web-generated files.

## Recommendation

Start coding the native app after the payment, subscriptions, debt, and currency rules are stable. Until then, Phase 0 can run now without wasting effort.

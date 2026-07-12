# The SFM route inventory

Snapshot date: 2026-07-12
Scope: `src/app/**/page.tsx`, `src/app/**/route.ts`, `src/middleware.ts`, `src/lib/auth/accessPolicy.ts`, `src/components/AppLayout.tsx`, and page-level Admin/Trader gates.

## Method and counting rules

- Route groups such as `(auth)` are omitted from the URL.
- Dynamic parameters retain App Router notation (`[id]`, `[...path]`, and `[[...path]]`).
- A page is **middleware protected** only when its URL matches `protectedPrefixes` in `src/middleware.ts`.
- A page is **guest allowed** only when it is both middleware protected and an exact member of `guestAllowedPaths`; the `sfm_guest=true` cookie is required.
- **Not middleware-auth-gated** means exactly that. A route handler may still enforce a token, signature, ownership, Admin permission, cron secret, or provider configuration itself. It must not be treated as anonymously usable without a handler-level test.
- Admin and Trader classifications include their explicit page-level authorization helpers in addition to middleware.

Inventory totals at this snapshot:

| Entry type | Count |
| --- | ---: |
| Page routes | 132 |
| Middleware-protected page routes | 88 |
| Exact guest-allowed protected pages | 11 |
| Page routes not middleware-auth-gated | 44 |
| Route handlers under `/api` | 169 |
| Non-API route handlers | 3 |
| Route handlers total | 172 |
| Middleware-protected route handlers | 68 |
| Route handlers not middleware-auth-gated | 104 |

## Page routes

### Not middleware-auth-gated (44)

These routes do not trigger the authenticated-page branch in `src/middleware.ts`. The public application shell (no authenticated header/command menu) is narrower: `/`, `/login`, `/reset-password`, `/about`, `/contact`, `/terms`, `/privacy`, and `/investor/*` only.

- `/`
- `/about`
- `/accounting-companies`
- `/alerts` — compatibility redirect to `/market-analysis?tab=alerts`
- `/banking-stocks`
- `/companies/[id]`
- `/company-listing/cancel`
- `/company-listing/submit`
- `/company-listing/success`
- `/contact`
- `/crypto-news`
- `/cyclical-stocks`
- `/defensive-stocks`
- `/dividend-stocks`
- `/ebooks`
- `/ebooks/[slug]`
- `/education`
- `/education/expenses`
- `/education/savings`
- `/energy-stocks`
- `/europe-news`
- `/feasibility-companies`
- `/financial-consulting-companies`
- `/financial-theories`
- `/growth-stocks`
- `/guest` — creates the client-side guest session, then navigates to `/dashboard`
- `/gulf-news`
- `/investment-companies`
- `/investor/[token]` — public share viewer; the token/password/expiry rules are enforced by `/api/investor/view`
- `/login`
- `/market-agent` — page is not middleware-gated; its analysis API is protected
- `/notif` — compatibility redirect to `/notifications`; the destination is middleware protected
- `/privacy`
- `/reset-password`
- `/services/accounting-firms` — redirect
- `/services/advisory-firms` — redirect
- `/services/feasibility-firms` — redirect
- `/services/investment-firms` — redirect
- `/setup` — not middleware-gated; the client page checks auth and offers a sign-in action
- `/sharia-stocks`
- `/tech-news`
- `/terms`
- `/trading-companies`
- `/wakeel`

### Middleware protected (88)

Unauthenticated requests redirect to `/login?next=<path>`. Authenticated sessions with an unmet MFA requirement redirect to the applicable MFA flow. `/dashboard` redirects an authenticated user with incomplete onboarding to `/onboarding`.

- `/ai`
- `/business`
- `/business/subscriptions`
- `/business/subscriptions/[clientId]`
- `/business-hub`
- `/business-operations`
- `/charity`
- `/charity/donations`
- `/charity-projects`
- `/charity-projects/report`
- `/command-center`
- `/customers`
- `/dashboard`
- `/debts`
- `/debts/monthly-subscriptions`
- `/decisions`
- `/documents`
- `/education/investments`
- `/employees`
- `/expenses`
- `/expenses/add`
- `/expenses/monthly-subscriptions`
- `/goals`
- `/goals/add`
- `/income`
- `/income/add`
- `/invest`
- `/invest/add`
- `/investment-offers`
- `/invoices`
- `/khums`
- `/market-alerts`
- `/market-analysis`
- `/market-watchlist`
- `/mfa/verify`
- `/notifications`
- `/onboarding`
- `/operating-expenses`
- `/profile`
- `/profile/companies`
- `/projects`
- `/projects/[id]`
- `/projects/ad-calculator`
- `/reports`
- `/reports-center`
- `/sales`
- `/savings`
- `/security`
- `/settings`
- `/sfm-admin-control`
- `/sfm-admin-control/admin-permissions`
- `/sfm-admin-control/companies`
- `/sfm-admin-control/instagram-automation`
- `/sfm-admin-control/market-diagnostics`
- `/sfm-admin-control/news-providers`
- `/sfm-admin-control/shariah`
- `/site-map`
- `/suppliers`
- `/tasks`
- `/thesfm-trader-own`
- `/thesfm-trader-own/ai-analysis`
- `/thesfm-trader-own/ai-analysis/[market]`
- `/thesfm-trader-own/ai-scanner`
- `/thesfm-trader-own/alerts`
- `/thesfm-trader-own/calendar`
- `/thesfm-trader-own/dashboard`
- `/thesfm-trader-own/education`
- `/thesfm-trader-own/market-analysis`
- `/thesfm-trader-own/market-analysis/[market]`
- `/thesfm-trader-own/markets`
- `/thesfm-trader-own/markets/[market]`
- `/thesfm-trader-own/news`
- `/thesfm-trader-own/portfolio`
- `/thesfm-trader-own/positions`
- `/thesfm-trader-own/recommendations`
- `/thesfm-trader-own/recommendations-history`
- `/thesfm-trader-own/scanner`
- `/thesfm-trader-own/settings`
- `/thesfm-trader-own/signal-history`
- `/thesfm-trader-own/symbol-details`
- `/thesfm-trader-own/symbol-details/[symbol]`
- `/thesfm-trader-own/trade-history`
- `/thesfm-trader-own/trade-performance`
- `/thesfm-trader-own/trades`
- `/thesfm-trader-own/watchlist`
- `/today`
- `/watchlist`
- `/zakat`

### Guest-allowed protected pages (11)

These exact routes may pass middleware with `sfm_guest=true`. Child routes are not implicitly guest allowed.

- `/ai`
- `/dashboard`
- `/expenses`
- `/expenses/monthly-subscriptions`
- `/goals`
- `/income`
- `/invest`
- `/market-analysis`
- `/reports`
- `/reports-center`
- `/savings`

### Admin-only pages

All are authenticated by middleware. The page then calls a server authorization helper and renders `AdminAccessDenied` for an authenticated user without the required role/permission.

| Route | Page-level requirement |
| --- | --- |
| `/sfm-admin-control` | Admin + `admin_dashboard` |
| `/sfm-admin-control/companies` | Admin + `company_reviews` |
| `/sfm-admin-control/news-providers` | Admin + `admin_dashboard` |
| `/sfm-admin-control/market-diagnostics` | Admin + `admin_dashboard` |
| `/sfm-admin-control/shariah` | Admin + `admin_dashboard` |
| `/sfm-admin-control/instagram-automation` | Instagram automation Admin helper |
| `/sfm-admin-control/admin-permissions` | Super Admin |

All seven routes have corresponding permission-filtered entries in the current Admin navigation.

### Trader-entitled pages

Every `/thesfm-trader-own*` page is middleware protected and renders through `TraderOwnFrame`, which calls `getTraderAccess()`. Access requires a configured Admin identity or an approved, unexpired `trader_access` row. `SFM_LOCAL_TRADER_QA=1` can bypass this only outside Vercel. The navigation configuration exposes the Trader root only to Super Admins, while the page-level gate can also admit approved non-Admin Trader users.

### Dynamic page routes

- `/business/subscriptions/[clientId]`
- `/companies/[id]`
- `/ebooks/[slug]` — unknown slugs call `notFound()`
- `/investor/[token]`
- `/projects/[id]`
- `/thesfm-trader-own/ai-analysis/[market]` — redirects to its market-analysis counterpart
- `/thesfm-trader-own/market-analysis/[market]` — invalid markets redirect to `/thesfm-trader-own/markets`
- `/thesfm-trader-own/markets/[market]` — invalid markets redirect to `/thesfm-trader-own/markets`
- `/thesfm-trader-own/symbol-details/[symbol]`

## Explicit compatibility redirects

No page route was deleted during this inventory. The following source-backed redirects preserve old/bookmarked paths:

| Source route | Destination |
| --- | --- |
| `/alerts` | `/market-analysis?tab=alerts` |
| `/market-alerts` | `/market-analysis?tab=alerts` |
| `/market-watchlist` | `/market-analysis?tab=watchlist` |
| `/watchlist` | `/market-analysis?tab=watchlist` |
| `/notif` | `/notifications` |
| `/debts/monthly-subscriptions` | `/expenses/monthly-subscriptions` |
| `/invest/add` | `/invest` |
| `/income/add` | `/income` |
| `/onboarding` | `/setup` |
| `/settings` | `/profile` |
| `/business` | `/business-operations` |
| `/services/accounting-firms` | `/accounting-companies` |
| `/services/advisory-firms` | `/financial-consulting-companies` |
| `/services/feasibility-firms` | `/feasibility-companies` |
| `/services/investment-firms` | `/investment-companies` |
| `/thesfm-trader-own/ai-analysis` | `/thesfm-trader-own/market-analysis/stocks` |
| `/thesfm-trader-own/ai-analysis/[market]` | `/thesfm-trader-own/market-analysis/[market]` |
| `/thesfm-trader-own/scanner` | `/thesfm-trader-own/market-analysis/stocks` |
| `/thesfm-trader-own/positions` | `/thesfm-trader-own/trade-performance` |
| `/thesfm-trader-own/recommendations-history` | `/thesfm-trader-own/trade-performance` |
| `/thesfm-trader-own/signal-history` | `/thesfm-trader-own/trade-performance` |
| `/thesfm-trader-own/trade-history` | `/thesfm-trader-own/trade-performance` |
| `/thesfm-trader-own/trades` | `/thesfm-trader-own/trade-performance` |
| `/favicon.ico` | `/icons/favicon-32.png` (308) |

## API and route-handler inventory

Methods below are exported methods. The gate column is represented by the section: middleware-protected or not middleware-auth-gated.

### Middleware-protected handlers (68)

The middleware returns structured JSON `401`, `503`, or MFA `403` responses for these API prefixes rather than an HTML/login redirect. Reminder routes also allow a valid cron authorization header.

- `/api/account/delete` — POST
- `/api/admin/access` — POST
- `/api/admin/ai-usage-limits` — GET/POST
- `/api/admin/analytics` — GET/POST
- `/api/admin/audit-logs` — GET
- `/api/admin/companies/review` — POST
- `/api/admin/market-news/providers` — GET
- `/api/admin/me` — GET
- `/api/admin/ops-center` — GET
- `/api/admin/roles` — GET
- `/api/admin/roles/[id]` — PATCH
- `/api/admin/roles/grant` — POST
- `/api/admin/roles/revoke` — POST
- `/api/admin/shariah` — GET/PATCH/POST
- `/api/admin/users/search` — GET
- `/api/ai/receipt-scan` — POST
- `/api/business/subscriptions/reminders` — GET/POST
- `/api/business/subscriptions/reminders/status` — GET
- `/api/business/subscriptions/reminders/test-email` — POST
- `/api/charity-projects/export` — GET
- `/api/company-listings/admin` — GET/PATCH/POST
- `/api/company-listings/eligibility` — GET
- `/api/company-listings/owner` — GET
- `/api/company-listings/owner/[id]` — DELETE/PATCH
- `/api/daily-tip` — GET
- `/api/debts/generate-monthly-expenses` — GET/POST
- `/api/debug/document-ai` — GET
- `/api/debug/receipt-provider` — GET
- `/api/followed-trades` — GET/POST
- `/api/funding-programs/admin` — POST
- `/api/instagram-automation/approve` — POST
- `/api/instagram-automation/create-draft` — POST
- `/api/instagram-automation/delete` — POST
- `/api/instagram-automation/list` — GET
- `/api/instagram-automation/publish` — POST
- `/api/instagram-automation/reject` — POST
- `/api/instagram-automation/send-approval` — POST
- `/api/investor/links` — POST
- `/api/invoices/analyze` — POST
- `/api/market/ai-insight` — POST
- `/api/market/refresh-investment-price` — GET
- `/api/market/signal-alerts` — GET/PATCH
- `/api/market/signal-alerts/read` — PATCH (re-export of the parent handler)
- `/api/market/signal-preferences` — GET/POST
- `/api/market/signals` — GET
- `/api/market/signals/[symbol]` — GET
- `/api/market/signals/refresh` — GET/POST
- `/api/market-agent/analyze` — GET/POST
- `/api/markets/portfolio-comparison` — GET
- `/api/notifications` — DELETE/GET/POST
- `/api/portfolio` — GET
- `/api/projects/[id]/ai-advisor` — POST
- `/api/projects/[id]/expense-analysis` — POST
- `/api/projects/[id]/pitch-deck` — POST
- `/api/projects/[id]/pitch-deck/export` — POST
- `/api/projects-chat` — POST
- `/api/receipts/provider-status` — GET
- `/api/receipts/scan` — POST
- `/api/stripe/create-checkout-session` — POST
- `/api/stripe/create-portal-session` — POST
- `/api/thesfm-trader/[...path]` — GET/POST; PUT/PATCH/DELETE return 405
- `/api/trader/analysis/[symbol]` — GET/POST
- `/api/trader/provider-status` — GET/POST
- `/api/trader/scanner/results` — GET
- `/api/trader/scanner/run` — GET/POST
- `/api/trader/status` — GET
- `/api/tts` — POST
- `/api/watchlist` — GET

All `/api/admin/*` handlers are additionally expected to apply route-level Admin or Super Admin checks. That requirement remains a smoke-test assertion; middleware authentication alone is not Admin authorization.

### Not middleware-auth-gated handlers (104)

These handlers are allowed past middleware. Many still have route-level controls: auth endpoints validate credentials/proofs, `/api/investor/view` validates the share token and optional password, `/api/stripe/webhook` validates Stripe signatures, ingestion/refresh handlers may validate cron/Admin access, and Shariah research endpoints perform their own user/ownership checks. Test each contract; do not equate this list with unrestricted data access.

- `/api/analytics/track` — OPTIONS/POST
- `/api/asset` — GET
- `/api/auth/login` — POST
- `/api/auth/mfa/email/start` — POST
- `/api/auth/mfa/email/verify` — POST
- `/api/auth/password-reset/check` — POST
- `/api/auth/password-reset/request` — POST
- `/api/auth/resolve-username` — POST
- `/api/auth/session` — DELETE/POST
- `/api/banking-stocks/movers` — GET
- `/api/banking-stocks/news` — GET
- `/api/banking-stocks/ticker` — GET
- `/api/charity-projects/metals-prices` — GET
- `/api/companies/[companyId]/analytics` — GET
- `/api/companies/[companyId]/track` — POST
- `/api/companies/analytics` — GET
- `/api/company-listings` — GET/POST
- `/api/company-listings/[id]` — GET
- `/api/company-listings/resolve-image` — GET
- `/api/contact` — POST
- `/api/crypto-news` — GET
- `/api/crypto-news/market` — GET
- `/api/cyclical-stocks/economic-cycle` — GET
- `/api/cyclical-stocks/movers` — GET
- `/api/cyclical-stocks/news` — GET
- `/api/cyclical-stocks/ticker` — GET
- `/api/defensive-stocks/movers` — GET
- `/api/defensive-stocks/news` — GET
- `/api/defensive-stocks/ticker` — GET
- `/api/dividend-stocks/calendar` — GET
- `/api/dividend-stocks/movers` — GET
- `/api/dividend-stocks/news` — GET
- `/api/dividend-stocks/ticker` — GET
- `/api/economic-calendar` — GET (alias of `/api/market/economic-calendar`)
- `/api/energy-stocks/movers` — GET
- `/api/energy-stocks/news` — GET
- `/api/energy-stocks/ticker` — GET
- `/api/europe-news` — GET
- `/api/growth-stocks/movers` — GET
- `/api/growth-stocks/news` — GET
- `/api/growth-stocks/ticker` — GET
- `/api/gulf-news` — GET
- `/api/health` — GET
- `/api/health/database` — GET
- `/api/investor/view` — POST
- `/api/market/analyze` — GET/POST
- `/api/market/asset-profile` — GET
- `/api/market/banking/snapshot` — GET
- `/api/market/central-bank-news` — GET
- `/api/market/company-profile` — GET
- `/api/market/compare` — GET
- `/api/market/dividends/provider-status` — GET
- `/api/market/economic-calendar` — GET
- `/api/market/energy/commodities` — GET
- `/api/market/fx/batch` — POST
- `/api/market/fx/rate` — GET
- `/api/market/health` — GET
- `/api/market/history` — GET
- `/api/market/metals` — GET
- `/api/market/performance` — GET
- `/api/market/provider-health` — GET
- `/api/market/providers/health` — GET
- `/api/market/search` — GET
- `/api/market/search-assets` — GET
- `/api/market/sentiment` — GET
- `/api/market/sentiment/health` — GET
- `/api/market/symbols` — GET
- `/api/market/technical-analysis` — GET
- `/api/market/tickers/crypto` — GET
- `/api/market/tickers/shariah` — GET (alias of `/api/sharia-stocks/ticker`)
- `/api/market-data/status` — GET
- `/api/market-news` — GET
- `/api/market-news/ingest` — GET/POST; route-level cron/Admin authorization
- `/api/markets` — GET
- `/api/markets/movers` — GET
- `/api/market-state/system` — GET
- `/api/market-ticker` — GET
- `/api/myfxbook/health` — GET
- `/api/ollama-status` — GET
- `/api/recommendations` — GET
- `/api/sharia-research/history` — GET
- `/api/sharia-research/jobs/[jobId]` — DELETE/GET
- `/api/sharia-research/manual-source` — POST
- `/api/sharia-research/methodologies` — GET
- `/api/sharia-research/results/[resultId]` — GET
- `/api/sharia-research/results/[resultId]/refresh` — POST
- `/api/sharia-research/search` — POST
- `/api/sharia-stocks/news` — GET
- `/api/sharia-stocks/screening` — GET
- `/api/sharia-stocks/ticker` — GET
- `/api/stock-categories/movers` — GET
- `/api/stock-categories/news` — GET
- `/api/stripe/webhook` — POST
- `/api/tech-news` — GET
- `/api/trader/calendar/dividends` — GET
- `/api/trader/calendar/earnings` — GET
- `/api/trader/calendar/economic` — GET
- `/api/trader/calendar/ipos` — GET
- `/api/trader/us-stocks` — GET
- `/api/wakeel` — POST
- `/api/zakat/metals-prices` — GET (alias of `/api/charity-projects/metals-prices`)
- `/favicon.ico` — GET; 308 redirect
- `/thesfm-trader-own/app/[[...path]]` — GET; public static asset extensions, Trader entitlement for HTML/non-asset files
- `/zoer_proxy/[...path]` — GET/POST/PUT/PATCH/DELETE; retired compatibility endpoint, always structured JSON 410

### Explicit API compatibility routes

- `/api/economic-calendar` re-exports `/api/market/economic-calendar`.
- `/api/market/signal-alerts/read` re-exports `PATCH` from `/api/market/signal-alerts`.
- `/api/market/tickers/shariah` re-exports `/api/sharia-stocks/ticker`.
- `/api/zakat/metals-prices` re-exports `/api/charity-projects/metals-prices`.
- `/api/thesfm-trader/[...path]` is an explicit legacy compatibility dispatcher. Recognized suffixes are `health`, `status`, `markets`, `recommendations`, `us-stocks`, `scanner/results`, and `scanner/run`; unknown suffixes return structured 404.

## Dead, retired, and ambiguous route findings

### Resolved during Phase 2.10

1. **`/notif` authorization mismatch:** the old route previously re-exported the protected `/notifications` component without sharing its middleware gate. It now performs a server redirect to `/notifications`, where normal middleware authorization runs.
2. **Legacy Zoer secret proxy:** `/zoer_proxy/[...path]` previously forwarded five public methods to Zoer and injected a server credential. It now performs no upstream request, reads no credential, and returns a structured, cacheable `410 ZOER_PROXY_RETIRED` response for every previously supported method. The unused client dependency was removed.

### Ambiguous, not proven dead

- `/market-agent` is not middleware protected while `/api/market-agent/analyze` is protected. This may be an intentional public shell with an authenticated action, but must be verified explicitly.
- `/setup` is middleware-public and only redirects unauthenticated users after client hydration. It should be checked for private-content flash and aligned with the intended onboarding policy.
- Provider-health endpoints overlap (`/api/market/health`, `/api/market/provider-health`, `/api/market/providers/health`, `/api/market-data/status`, `/api/trader/provider-status`, and related feature health routes). They are valid handlers, but contract ownership and intended consumers require documentation to avoid contradictory health states.
- No source-backed deleted page routes were found. The Zoer proxy is explicitly retired with 410; page compatibility redirects should not be described as removed until their migration window is explicitly closed.

## Maintenance rule

Regenerate the counts from `rg --files src/app` whenever a `page.tsx` or `route.ts` is added, removed, or renamed, then re-check `src/middleware.ts`, `src/lib/auth/accessPolicy.ts`, Admin page helpers, Trader entitlement, navigation entries, `robots.ts`, and sitemap behavior. A route existing in the filesystem does not by itself prove it is correctly authorized, navigable, indexed, or operational in Production.

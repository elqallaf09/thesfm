# THE SFM Production Audit Report

Generated: 2026-06-25T16:14:34.583Z
Repository: `thesfm-origin-main-review`
Framework: Next.js 15.5.7 / React 19 / Supabase / Stripe / market-data providers

## Executive Summary

THE SFM was reviewed across application routes, dashboard/admin layout usage, API routes, Supabase/RLS posture, Stripe/payment surfaces, authentication and authorization patterns, market-data provider integrations, UI shell consistency, RTL/LTR readiness, light/dark mode risks, duplicate/demo-data risks, and launch validation commands.

The codebase is a **launch candidate with required operational checks**. Automated validation is green, production build succeeds, and several safe launch issues were fixed during this audit. Remaining launch risks are primarily operational: deploying pending Supabase migrations, confirming production environment variables, and smoke-testing real provider credentials in the target deployment.

## Scores

| Area | Score | Rationale |
| --- | ---: | --- |
| Security | 88% | Admin/API protection patterns are present, service keys remain server-side, Stripe uses server routes, and the audit removed a predictable analytics hash fallback. Remaining risk is live RLS/provider verification in the deployed Supabase project. |
| Code Quality | 86% | TypeScript, ESLint, tests, and build pass. Shared admin shell abstraction was added. Some very large page components remain and should be decomposed over time. |
| Performance | 82% | Build is successful and provider caching/rate-limit patterns exist. Some feature pages, especially market analysis, remain heavy and should be split/lazy-loaded further. |
| UI/UX Readiness | 84% | Shared sidebar shell was restored for admin pages and recent market-page regressions have tests. Remaining readiness depends on visual smoke tests across the largest market pages and mobile layouts. |
| Launch Readiness | Conditional Go | Safe to stage after migrations/env configuration; production launch should wait for Supabase migration application, provider credential smoke tests, and Stripe webhook verification. |

## What Was Reviewed

- 106 App Router pages.
- 108 API route handlers.
- 10 layout files.
- Supabase migration history through migration 112.
- Admin pages and protected dashboard shell usage.
- Stripe checkout, portal, and webhook route surfaces.
- Market provider routes, news/calendar adapters, trader routes, and provider status surfaces.
- Navigation/sidebar configuration and admin-only visibility.
- Localhost/private endpoint references, service-role key usage, public env exposure risks, unsafe HTML patterns, mock/demo fallback indicators, and RLS policy patterns.
- Validation commands: TypeScript, ESLint, i18n completeness, unit/integration tests, and production build.

## Issues Found By Severity

### High - Fixed

1. **Admin pages missing the shared sidebar shell**
   - Affected: `/sfm-admin-control`, `/sfm-admin-control/companies`.
   - Risk: admins could lose platform navigation and admin pages looked standalone/inconsistent.
   - Fix: introduced `AdminDashboardShell` and wired both admin pages through the shared sidebar-aware dashboard shell.

2. **Deprecated service-role policy check for news translation cache**
   - Affected migration/table: `public.news_translations`.
   - Risk: older `auth.role() = 'service_role'` policy style is no longer aligned with current Supabase guidance and explicit grants model.
   - Fix: added migration `111_harden_news_translations_service_role_policy.sql` with a service-role-scoped policy and explicit grants/revokes.

3. **Predictable fallback analytics hash salt**
   - Affected: `src/lib/server/companyAnalytics.ts`.
   - Risk: fallback salt could make IP hashes easier to compare across deployments when configured secrets are missing.
   - Fix: removed the static production fallback; analytics omits `ip_hash` if no server salt/secret is configured. Added `ANALYTICS_HASH_SALT` to `.env.example`.

4. **Profile creation trigger needed explicit search-path hardening**
   - Affected: `public.handle_new_user()`.
   - Risk: security-definer functions should pin `search_path` to the intended schema.
   - Fix: added migration `112_harden_profile_trigger_search_path.sql` preserving behavior while setting `search_path = public`.

### Medium - Fixed

5. **Platform Admin navigation lacked the private trading terminal link**
   - Affected: sidebar admin group.
   - Fix: added `/thesfm-trader-own` with Arabic, English, and French labels and a terminal icon. Existing admin-only filtering protects visibility.

6. **Production start script used a shell-specific port expression**
   - Affected: `package.json`.
   - Risk: less portable local production start behavior.
   - Fix: simplified to `next start`; platform deployments should provide their own runtime process.

### Medium - Reviewed / Remaining

7. **Some print/export modules use `document.write`**
   - Affected areas include generated reports and print windows.
   - Risk: acceptable for internal generated output when escaped, but should remain on the security backlog for sanitizer review.
   - Status: documented; not changed because it may alter export behavior.

8. **Large page components and heavy first-load bundles**
   - Example: `/market-analysis` first-load JS is materially larger than most pages.
   - Status: documented for future lazy-loading/component decomposition.

9. **Live Supabase policy verification was not performed in the remote project**
   - The Supabase CLI is not installed in this local environment and no production project credentials were used.
   - Status: migration prepared; applying and verifying in the target Supabase project remains a launch checklist item.

### Low - Reviewed

10. **Localhost references are documentation/development-only or blocked by tests**
    - Runtime scans found no production self-fetch fallback to localhost. Existing trader compatibility tests enforce this.

11. **Seed market symbols exist in migrations**
    - These are static symbol universe records, not user data or demo activity records.

## Fixes Completed

- Added `src/components/AdminDashboardShell.tsx` and used it on admin dashboard/company review pages.
- Restored sidebar rendering on `/sfm-admin-control` and `/sfm-admin-control/companies`.
- Added Smart Trading Terminal admin sidebar item for `/thesfm-trader-own`.
- Added navigation translation key `nav_smart_trading_terminal` for Arabic, English, and French.
- Removed the static production fallback for company analytics IP hashing.
- Added `ANALYTICS_HASH_SALT` to `.env.example`.
- Added Supabase migration to harden the news translation cache policy and grants.
- Added Supabase migration to pin the profile creation trigger's `search_path`.
- Simplified `npm start` to a portable Next.js start command.

## Duplicated / Unused Code Removed

- Removed the duplicate Supabase migration created during audit consolidation and retained one migration for the news translation policy fix.
- No production components or routes were deleted. No working feature was removed.

## Security Review

Strengths:

- Admin pages checked server-side via authenticated Supabase token and admin email allowlist.
- Trader terminal access is server-gated via `getTraderAccess`.
- Stripe secret usage is confined to server routes/libraries.
- Public env secret exposure scan found no `NEXT_PUBLIC_*SECRET/SERVICE/PRIVATE/TOKEN/KEY` misuse.
- External image resolver rejects localhost, loopback, and private network hosts before server-side fetch.
- Account activity has regression tests for empty users and user isolation.

Remaining security tasks before production:

- Apply and verify pending Supabase migrations in the production project.
- Confirm RLS policies directly in Supabase for account activity, subscriptions, company listings, analytics, trader access, and funding/admin tables.
- Configure `ANALYTICS_HASH_SALT`, `ADMIN_EMAILS`, `ADMIN_ACCESS_CODE`, `CRON_SECRET`, Supabase service key, Stripe secrets, provider keys, and webhook secrets in Preview and Production.
- Review generated print/export HTML paths for sanitization hardening.

## Performance Review

Observed:

- Production build completes successfully.
- Static generation completed for 137 generated pages/routes.
- Most API routes are dynamic handlers with small route bundles.
- Heavy client pages remain: market analysis, project detail, business hub, charity projects, financial theories, setup, profile, debts.

Recommendations:

- Continue lazy-loading lower market-analysis modules.
- Split oversized page components into smaller client islands.
- Add route-level performance budgets for pages over 300 kB first-load JS.
- Add Playwright/Lighthouse smoke tests for primary desktop/mobile routes after deployment.

## UI/UX Review

Fixed:

- Admin pages now render inside the dashboard shell with sidebar navigation.
- Admin terminal link appears in the Platform Admin sidebar with active-state support.

Reviewed risks:

- Many market pages have been recently repaired, but should receive cross-language visual smoke tests in production data conditions.
- Largest dashboard pages still rely on substantial inline/page-local CSS; over time, migrate stable patterns into shared components.
- RTL/LTR support is present through language hooks and logical CSS, but pages with custom inline CSS should remain in regression testing.

## Data Provider Review

Provider surfaces reviewed:

- Yahoo Finance quote/history helpers.
- Finnhub news/ticker routes.
- FMP economic calendar provider interface.
- Myfxbook/market sentiment health routes.
- Stripe payment routes.
- Trader scanner compatibility API.

Launch checks required:

- Confirm `FINNHUB_API_KEY`, `FMP_API_KEY`, optional `ECONOMIC_CALENDAR_PROVIDER`, `OPENAI_API_KEY`/AI gateway credentials, Stripe keys, and Supabase keys are configured in deployment.
- Smoke-test provider health endpoints in Vercel Preview and Production.
- Verify provider-error UI states do not expose raw upstream errors.

## Validation Results

| Command | Result |
| --- | --- |
| `corepack pnpm exec tsc --noEmit --pretty false` | Passed |
| `npm run lint` | Passed |
| `npm run check:i18n` | Passed; all translation entries include ar/en/fr |
| `npm run test:run` | Passed; 14 files, 121 tests |
| `npm run build` | Passed; Next.js production build completed |

## Full Page Route Audit Table

| Route | File | Shell/Layout Signal | Auth Signal | Dynamic |
| --- | --- | --- | --- | --- |
| / | src/app/page.tsx | public/standalone | yes | no |
| /about | src/app/about/page.tsx | public/standalone | yes | no |
| /accounting-companies | src/app/accounting-companies/page.tsx | public/standalone | public | no |
| /ai | src/app/ai/page.tsx | shared/sidebar-aware | yes | no |
| /alerts | src/app/alerts/page.tsx | review | review | no |
| /banking-stocks | src/app/banking-stocks/page.tsx | review | review | no |
| /business | src/app/business/page.tsx | review | review | no |
| /business-hub | src/app/business-hub/page.tsx | shared/sidebar-aware | yes | no |
| /business-operations | src/app/business-operations/page.tsx | shared/sidebar-aware | yes | no |
| /charity | src/app/charity/page.tsx | shared/sidebar-aware | yes | no |
| /charity-projects | src/app/charity-projects/page.tsx | shared/sidebar-aware | yes | no |
| /charity-projects/report | src/app/charity-projects/report/page.tsx | review | yes | no |
| /command-center | src/app/command-center/page.tsx | shared/sidebar-aware | yes | no |
| /companies/[id] | src/app/companies/[id]/page.tsx | review | review | no |
| /company-listing/cancel | src/app/company-listing/cancel/page.tsx | review | review | no |
| /company-listing/submit | src/app/company-listing/submit/page.tsx | review | review | no |
| /company-listing/success | src/app/company-listing/success/page.tsx | review | review | no |
| /contact | src/app/contact/page.tsx | public/standalone | yes | no |
| /crypto-news | src/app/crypto-news/page.tsx | review | review | no |
| /customers | src/app/customers/page.tsx | review | review | no |
| /cyclical-stocks | src/app/cyclical-stocks/page.tsx | review | review | no |
| /dashboard | src/app/dashboard/page.tsx | shared/sidebar-aware | yes | no |
| /debts | src/app/debts/page.tsx | shared/sidebar-aware | yes | no |
| /debts/monthly-subscriptions | src/app/debts/monthly-subscriptions/page.tsx | review | review | no |
| /decisions | src/app/decisions/page.tsx | shared/sidebar-aware | yes | no |
| /defensive-stocks | src/app/defensive-stocks/page.tsx | review | review | no |
| /dividend-stocks | src/app/dividend-stocks/page.tsx | review | review | no |
| /documents | src/app/documents/page.tsx | shared/sidebar-aware | review | no |
| /ebooks | src/app/ebooks/page.tsx | shared/sidebar-aware | review | no |
| /ebooks/[slug] | src/app/ebooks/[slug]/page.tsx | review | review | no |
| /education | src/app/education/page.tsx | review | review | no |
| /education/expenses | src/app/education/expenses/page.tsx | review | yes | no |
| /education/investments | src/app/education/investments/page.tsx | review | review | no |
| /education/savings | src/app/education/savings/page.tsx | review | review | no |
| /employees | src/app/employees/page.tsx | shared/sidebar-aware | yes | no |
| /energy-stocks | src/app/energy-stocks/page.tsx | review | review | no |
| /europe-news | src/app/europe-news/page.tsx | review | review | no |
| /expenses | src/app/expenses/page.tsx | review | review | no |
| /expenses/add | src/app/expenses/add/page.tsx | review | yes | no |
| /expenses/monthly-subscriptions | src/app/expenses/monthly-subscriptions/page.tsx | shared/sidebar-aware | yes | no |
| /feasibility-companies | src/app/feasibility-companies/page.tsx | public/standalone | public | no |
| /financial-consulting-companies | src/app/financial-consulting-companies/page.tsx | public/standalone | public | no |
| /financial-theories | src/app/financial-theories/page.tsx | shared/sidebar-aware | yes | no |
| /goals | src/app/goals/page.tsx | review | review | no |
| /goals/add | src/app/goals/add/page.tsx | review | yes | no |
| /growth-stocks | src/app/growth-stocks/page.tsx | review | review | no |
| /guest | src/app/guest/page.tsx | review | yes | no |
| /gulf-news | src/app/gulf-news/page.tsx | review | review | no |
| /income | src/app/income/page.tsx | shared/sidebar-aware | yes | no |
| /income/add | src/app/income/add/page.tsx | review | review | no |
| /invest | src/app/invest/page.tsx | shared/sidebar-aware | yes | no |
| /invest/add | src/app/invest/add/page.tsx | review | review | no |
| /investment-companies | src/app/investment-companies/page.tsx | public/standalone | public | no |
| /investment-offers | src/app/investment-offers/page.tsx | shared/sidebar-aware | yes | no |
| /invoices | src/app/invoices/page.tsx | review | review | no |
| /login | src/app/(auth)/login/page.tsx | public/standalone | yes | no |
| /market-agent | src/app/market-agent/page.tsx | shared/sidebar-aware | review | no |
| /market-alerts | src/app/market-alerts/page.tsx | review | review | no |
| /market-analysis | src/app/market-analysis/page.tsx | shared/sidebar-aware | yes | no |
| /market-watchlist | src/app/market-watchlist/page.tsx | review | review | no |
| /mfa/verify | src/app/mfa/verify/page.tsx | review | yes | no |
| /notif | src/app/notif/page.tsx | review | review | no |
| /notifications | src/app/notifications/page.tsx | review | review | no |
| /onboarding | src/app/onboarding/page.tsx | review | review | no |
| /operating-expenses | src/app/operating-expenses/page.tsx | review | review | no |
| /privacy | src/app/privacy/page.tsx | public/standalone | yes | no |
| /profile | src/app/profile/page.tsx | shared/sidebar-aware | yes | no |
| /profile/companies | src/app/profile/companies/page.tsx | review | review | no |
| /projects | src/app/projects/page.tsx | shared/sidebar-aware | yes | no |
| /projects/[id] | src/app/projects/[id]/page.tsx | shared/sidebar-aware | yes | no |
| /projects/ad-calculator | src/app/projects/ad-calculator/page.tsx | review | yes | no |
| /reports | src/app/reports/page.tsx | review | review | no |
| /reports-center | src/app/reports-center/page.tsx | shared/sidebar-aware | yes | no |
| /reset-password | src/app/reset-password/page.tsx | public/standalone | public | no |
| /sales | src/app/sales/page.tsx | shared/sidebar-aware | yes | no |
| /savings | src/app/savings/page.tsx | review | review | no |
| /security | src/app/security/page.tsx | shared/sidebar-aware | yes | no |
| /services/accounting-firms | src/app/services/accounting-firms/page.tsx | review | review | no |
| /services/advisory-firms | src/app/services/advisory-firms/page.tsx | review | review | no |
| /services/feasibility-firms | src/app/services/feasibility-firms/page.tsx | review | review | no |
| /services/investment-firms | src/app/services/investment-firms/page.tsx | review | review | no |
| /settings | src/app/settings/page.tsx | review | review | no |
| /setup | src/app/setup/page.tsx | shared/sidebar-aware | yes | no |
| /sfm-admin-control | src/app/sfm-admin-control/page.tsx | shared/sidebar-aware | yes | yes |
| /sfm-admin-control/companies | src/app/sfm-admin-control/companies/page.tsx | shared/sidebar-aware | yes | yes |
| /sharia-stocks | src/app/sharia-stocks/page.tsx | review | review | no |
| /site-map | src/app/site-map/page.tsx | shared/sidebar-aware | review | no |
| /suppliers | src/app/suppliers/page.tsx | review | review | no |
| /tasks | src/app/tasks/page.tsx | shared/sidebar-aware | review | no |
| /tech-news | src/app/tech-news/page.tsx | review | review | no |
| /terms | src/app/terms/page.tsx | public/standalone | yes | no |
| /thesfm-trader-own | src/app/thesfm-trader-own/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/ai-scanner | src/app/thesfm-trader-own/ai-scanner/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/alerts | src/app/thesfm-trader-own/alerts/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/calendar | src/app/thesfm-trader-own/calendar/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/education | src/app/thesfm-trader-own/education/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/markets | src/app/thesfm-trader-own/markets/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/markets/[market] | src/app/thesfm-trader-own/markets/[market]/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/news | src/app/thesfm-trader-own/news/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/portfolio | src/app/thesfm-trader-own/portfolio/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/settings | src/app/thesfm-trader-own/settings/page.tsx | shared/sidebar-aware | review | yes |
| /thesfm-trader-own/watchlist | src/app/thesfm-trader-own/watchlist/page.tsx | shared/sidebar-aware | review | yes |
| /today | src/app/today/page.tsx | shared/sidebar-aware | yes | no |
| /trading-companies | src/app/trading-companies/page.tsx | public/standalone | public | no |
| /watchlist | src/app/watchlist/page.tsx | review | review | no |
| /zakat | src/app/zakat/page.tsx | shared/sidebar-aware | yes | no |

## Full API Route Audit Table

| Route | File | Access Signal | Cache Signal | Server Secret Usage | Client Secret Risk |
| --- | --- | --- | --- | --- | --- |
| /api/account/delete | src/app/api/account/delete/route.ts | admin/protected | no-store/dynamic | server-side env | review |
| /api/admin/access | src/app/api/admin/access/route.ts | admin/protected | review | - | none found |
| /api/admin/ai-usage-limits | src/app/api/admin/ai-usage-limits/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/admin/analytics | src/app/api/admin/analytics/route.ts | admin/protected | review | - | none found |
| /api/admin/companies/review | src/app/api/admin/companies/review/route.ts | admin/protected | review | - | none found |
| /api/ai/receipt-scan | src/app/api/ai/receipt-scan/route.ts | admin/protected | review | server-side env | none found |
| /api/analytics/track | src/app/api/analytics/track/route.ts | admin/protected | review | - | none found |
| /api/auth/password-reset/check | src/app/api/auth/password-reset/check/route.ts | admin/protected | review | - | none found |
| /api/auth/resolve-username | src/app/api/auth/resolve-username/route.ts | admin/protected | no-store/dynamic | server-side env | none found |
| /api/banking-stocks/movers | src/app/api/banking-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/banking-stocks/news | src/app/api/banking-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/banking-stocks/ticker | src/app/api/banking-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/charity-projects/export | src/app/api/charity-projects/export/route.ts | protected/session-or-token | no-store/dynamic | - | review |
| /api/charity-projects/metals-prices | src/app/api/charity-projects/metals-prices/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/companies/[companyId]/analytics | src/app/api/companies/[companyId]/analytics/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/companies/[companyId]/track | src/app/api/companies/[companyId]/track/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/companies/analytics | src/app/api/companies/analytics/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/company-listings | src/app/api/company-listings/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/[id] | src/app/api/company-listings/[id]/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/admin | src/app/api/company-listings/admin/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/eligibility | src/app/api/company-listings/eligibility/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/owner | src/app/api/company-listings/owner/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/owner/[id] | src/app/api/company-listings/owner/[id]/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/company-listings/resolve-image | src/app/api/company-listings/resolve-image/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/contact | src/app/api/contact/route.ts | public/provider | review | - | none found |
| /api/crypto-news | src/app/api/crypto-news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/crypto-news/market | src/app/api/crypto-news/market/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/cyclical-stocks/movers | src/app/api/cyclical-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/cyclical-stocks/news | src/app/api/cyclical-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/cyclical-stocks/ticker | src/app/api/cyclical-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/daily-tip | src/app/api/daily-tip/route.ts | admin/protected | review | server-side env | none found |
| /api/debts/generate-monthly-expenses | src/app/api/debts/generate-monthly-expenses/route.ts | admin/protected | review | server-side env | none found |
| /api/debug/document-ai | src/app/api/debug/document-ai/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/debug/receipt-provider | src/app/api/debug/receipt-provider/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/defensive-stocks/movers | src/app/api/defensive-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/defensive-stocks/news | src/app/api/defensive-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/defensive-stocks/ticker | src/app/api/defensive-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/dividend-stocks/movers | src/app/api/dividend-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/dividend-stocks/news | src/app/api/dividend-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/dividend-stocks/ticker | src/app/api/dividend-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/economic-calendar | src/app/api/economic-calendar/route.ts | public/provider | review | - | none found |
| /api/energy-stocks/movers | src/app/api/energy-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/energy-stocks/news | src/app/api/energy-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/energy-stocks/ticker | src/app/api/energy-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/europe-news | src/app/api/europe-news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/funding-programs/admin | src/app/api/funding-programs/admin/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/growth-stocks/movers | src/app/api/growth-stocks/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/growth-stocks/news | src/app/api/growth-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/growth-stocks/ticker | src/app/api/growth-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/gulf-news | src/app/api/gulf-news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/health | src/app/api/health/route.ts | public/provider | review | - | none found |
| /api/health/database | src/app/api/health/database/route.ts | public/provider | review | - | review |
| /api/invoices/analyze | src/app/api/invoices/analyze/route.ts | admin/protected | review | - | none found |
| /api/market-agent/analyze | src/app/api/market-agent/analyze/route.ts | admin/protected | no-store/dynamic | server-side env | review |
| /api/market-data/status | src/app/api/market-data/status/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market-news | src/app/api/market-news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market-ticker | src/app/api/market-ticker/route.ts | public/provider | review | - | none found |
| /api/market/ai-insight | src/app/api/market/ai-insight/route.ts | admin/protected | review | server-side env | none found |
| /api/market/analyze | src/app/api/market/analyze/route.ts | public/provider | review | - | none found |
| /api/market/asset-profile | src/app/api/market/asset-profile/route.ts | public/provider | review | - | none found |
| /api/market/banking/snapshot | src/app/api/market/banking/snapshot/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/market/central-bank-news | src/app/api/market/central-bank-news/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/market/company-profile | src/app/api/market/company-profile/route.ts | public/provider | review | - | none found |
| /api/market/compare | src/app/api/market/compare/route.ts | public/provider | review | - | none found |
| /api/market/economic-calendar | src/app/api/market/economic-calendar/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market/energy/commodities | src/app/api/market/energy/commodities/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/market/fx/batch | src/app/api/market/fx/batch/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market/fx/rate | src/app/api/market/fx/rate/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market/health | src/app/api/market/health/route.ts | public/provider | review | - | none found |
| /api/market/history | src/app/api/market/history/route.ts | public/provider | review | - | none found |
| /api/market/metals | src/app/api/market/metals/route.ts | protected/session-or-token | no-store/dynamic | - | none found |
| /api/market/performance | src/app/api/market/performance/route.ts | public/provider | review | - | none found |
| /api/market/provider-health | src/app/api/market/provider-health/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/market/refresh-investment-price | src/app/api/market/refresh-investment-price/route.ts | admin/protected | no-store/dynamic | server-side env | none found |
| /api/market/search | src/app/api/market/search/route.ts | public/provider | review | server-side env | review |
| /api/market/search-assets | src/app/api/market/search-assets/route.ts | public/provider | no-store/dynamic | server-side env | review |
| /api/market/sentiment | src/app/api/market/sentiment/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/market/sentiment/health | src/app/api/market/sentiment/health/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market/symbols | src/app/api/market/symbols/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/market/technical-analysis | src/app/api/market/technical-analysis/route.ts | public/provider | review | - | none found |
| /api/markets/movers | src/app/api/markets/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/markets/portfolio-comparison | src/app/api/markets/portfolio-comparison/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/myfxbook/health | src/app/api/myfxbook/health/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/projects-chat | src/app/api/projects-chat/route.ts | admin/protected | review | server-side env | none found |
| /api/projects/[id]/ai-advisor | src/app/api/projects/[id]/ai-advisor/route.ts | protected/session-or-token | review | server-side env | review |
| /api/projects/[id]/expense-analysis | src/app/api/projects/[id]/expense-analysis/route.ts | protected/session-or-token | review | server-side env | review |
| /api/projects/[id]/pitch-deck | src/app/api/projects/[id]/pitch-deck/route.ts | protected/session-or-token | review | server-side env | review |
| /api/projects/[id]/pitch-deck/export | src/app/api/projects/[id]/pitch-deck/export/route.ts | protected/session-or-token | no-store/dynamic | server-side env | review |
| /api/receipts/provider-status | src/app/api/receipts/provider-status/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/receipts/scan | src/app/api/receipts/scan/route.ts | admin/protected | review | server-side env | none found |
| /api/sharia-stocks/news | src/app/api/sharia-stocks/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/sharia-stocks/screening | src/app/api/sharia-stocks/screening/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/sharia-stocks/ticker | src/app/api/sharia-stocks/ticker/route.ts | public/provider | no-store/dynamic | server-side env | none found |
| /api/stock-categories/movers | src/app/api/stock-categories/movers/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/stock-categories/news | src/app/api/stock-categories/news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/stripe/create-checkout-session | src/app/api/stripe/create-checkout-session/route.ts | admin/protected | no-store/dynamic | server-side env | review |
| /api/stripe/create-portal-session | src/app/api/stripe/create-portal-session/route.ts | admin/protected | no-store/dynamic | - | none found |
| /api/stripe/webhook | src/app/api/stripe/webhook/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/tech-news | src/app/api/tech-news/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/thesfm-trader/[...path] | src/app/api/thesfm-trader/[...path]/route.ts | admin/protected | no-store/dynamic | server-side env | none found |
| /api/trader/analysis/[symbol] | src/app/api/trader/analysis/[symbol]/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/trader/scanner/results | src/app/api/trader/scanner/results/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/trader/scanner/run | src/app/api/trader/scanner/run/route.ts | admin/protected | no-store/dynamic | server-side env | none found |
| /api/trader/status | src/app/api/trader/status/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/trader/us-stocks | src/app/api/trader/us-stocks/route.ts | public/provider | no-store/dynamic | - | none found |
| /api/zakat/metals-prices | src/app/api/zakat/metals-prices/route.ts | public/provider | review | - | none found |
| /thesfm-trader-own/app/[[...path]] | src/app/thesfm-trader-own/app/[[...path]]/route.ts | public/provider | no-store/dynamic | - | none found |
| /zoer_proxy/[...path] | src/app/zoer_proxy/[...path]/route.ts | protected/session-or-token | review | - | none found |

## Remaining Risks

- Pending Supabase migrations must be applied and verified in the target project.
- Provider credentials and Stripe webhooks must be tested in the actual deployment environment.
- Some exports still use generated HTML/print windows and should receive sanitizer-focused review.
- Bundle sizes on the largest client pages warrant future lazy-loading work.
- Visual regression tests should be expanded to cover Arabic RTL, English LTR, French LTR, dark mode, and mobile Safari for key flows.

## Future Improvements Before Launch

1. Add Playwright smoke tests for auth, admin, company submission, Stripe checkout creation, market analysis, charity projects, subscriptions, and market-news pages.
2. Add CI checks for production-localhost references and public secret env patterns.
3. Add Supabase policy tests with a local Supabase test harness once the CLI is available.
4. Add route-level performance budgets for large client pages.
5. Extract common market-page ticker/card/table patterns into shared components.
6. Add deployment runbook for provider credential validation and webhook replay tests.

## Final Launch Checklist

- [ ] Apply all Supabase migrations, including `111_harden_news_translations_service_role_policy.sql` and `112_harden_profile_trigger_search_path.sql`.
- [ ] Verify RLS policies directly in Supabase for all user-owned tables.
- [ ] Configure Preview and Production environment variables.
- [ ] Verify Stripe checkout, portal, and webhook routes with test events.
- [ ] Smoke-test market data, news, economic calendar, trader terminal, and AI routes with real provider credentials.
- [ ] Smoke-test admin pages and sidebar navigation in Arabic and English.
- [ ] Confirm no raw provider errors or secrets appear in browser responses/logs.
- [ ] Run the validation suite in CI.
- [ ] Run a final mobile Safari and desktop visual pass for key dashboard and market pages.

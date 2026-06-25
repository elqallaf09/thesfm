# THE SFM Launch Checklist

This checklist is based on `docs/production-audit-report.md` and should be completed before every production launch or major redeployment.

## Required Validation

- [ ] Install dependencies with `corepack pnpm install --frozen-lockfile`.
- [ ] Run TypeScript: `pnpm exec tsc --noEmit --pretty false`.
- [ ] Run lint: `npm run lint`.
- [ ] Run translation coverage: `npm run check:i18n`.
- [ ] Run unit and integration tests: `npm run test:run`.
- [ ] Run production endpoint guard: `npm run check:prod-endpoints`.
- [ ] Run public env guard: `npm run check:public-env`.
- [ ] Run production build: `npm run build`.
- [ ] Run smoke tests against either local production build or deployed preview: `npm run test:smoke`.

## Environment And Secrets

- [ ] Configure Supabase URL and anon key for Development, Preview, and Production.
- [ ] Configure server-only Supabase service role keys only where server code requires them.
- [ ] Configure Stripe secret key, publishable key, price IDs, and webhook secret in Vercel.
- [ ] Configure market-data provider keys for Finnhub, FMP, Yahoo-compatible services, Myfxbook, OpenAI, and any enabled providers.
- [ ] Confirm no secret-like value is stored in a `NEXT_PUBLIC_*` variable unless it is intentionally public, such as a publishable key or Supabase anon key.
- [ ] Redeploy after changing any Vercel environment variable.
- [ ] Confirm production logs do not print API keys, tokens, webhook secrets, provider payloads, stack traces, or private financial metadata.

## Database And RLS

- [ ] Apply all Supabase migrations to production.
- [ ] Verify RLS is enabled on user-owned tables including profiles, account activity, subscriptions, clients, payments, reports, portfolios, watchlists, and company submissions.
- [ ] Confirm normal users cannot read, insert, update, or delete another user's rows.
- [ ] Confirm admin-only routes still require a server-side admin check.
- [ ] Verify indexes for high-traffic tables used by dashboards, activities, subscriptions, market alerts, and company reviews.
- [ ] Confirm no demo or fallback rows are inserted when a new account is created.

## Authentication And Admin Access

- [ ] Test login and logout.
- [ ] Test dashboard refresh after authentication.
- [ ] Test a normal user cannot open admin pages.
- [ ] Test an admin can open the Platform Admin sidebar section.
- [ ] Test Company Reviews and Admin Control Dashboard render inside the shared dashboard/sidebar shell.
- [ ] Test `/thesfm-trader-own` access follows the intended admin/protected visibility rules.

## Payments

- [ ] Create a Stripe checkout session in Preview.
- [ ] Complete a test checkout with Stripe test cards.
- [ ] Verify webhook signature validation in Vercel logs.
- [ ] Verify successful company payment creates the expected company submission status.
- [ ] Verify failed or canceled checkout does not create a paid/approved record.
- [ ] Verify admin company creation bypasses payment only for authorized admins.

## Provider And Market Data

- [ ] Test `/api/market-data/status`.
- [ ] Test Finnhub market news for general and asset-specific queries.
- [ ] Test FMP economic calendar with configured credentials.
- [ ] Verify provider-not-configured, access-denied, rate-limited, no-events, and provider-error states are distinct.
- [ ] Verify raw upstream errors are logged server-side only and replaced with localized user messages.
- [ ] Verify no fake market, news, calendar, or analysis data appears in production.

## UI, RTL/LTR, And Responsive QA

- [ ] Test Arabic RTL, English LTR, and French LTR basics.
- [ ] Test desktop, tablet, and mobile viewports.
- [ ] Confirm sidebar never overlaps dashboard content.
- [ ] Confirm no horizontal page overflow on key dashboards and market pages.
- [ ] Confirm light and dark mode have readable contrast.
- [ ] Confirm loading, empty, partial, and error states are actionable and localized.
- [ ] Confirm market-analysis, charity projects, admin dashboard, company review, subscription manager, and trader pages smoke-test successfully.

## Performance And Monitoring

- [ ] Review Next.js build output for oversized first-load bundles and unusually large routes.
- [ ] Confirm heavy market-analysis modules are lazy-loaded where practical.
- [ ] Confirm provider calls are cached and rate-limited according to the provider contract.
- [ ] Confirm no client-side loop refreshes provider data every second.
- [ ] Run Lighthouse CI or equivalent performance smoke checks.
- [ ] Configure Vercel monitoring and review error logs after deployment.

## Final Release Gate

- [ ] Production build passes.
- [ ] CI passes on `main`.
- [ ] Smoke tests pass in Preview.
- [ ] Stripe webhook test passes.
- [ ] Supabase RLS checks pass.
- [ ] Provider health checks pass or unavailable providers show clean localized states.
- [ ] Rollback plan is documented and the previous stable deployment is known.
- [ ] Launch owner confirms no critical or high-severity audit findings remain unaccepted.

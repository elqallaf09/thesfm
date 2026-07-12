# Phase 2.10 production smoke-test checklist

Snapshot date: 2026-07-12
Companion inventory: [`docs/route-inventory.md`](./route-inventory.md)

This is an execution checklist, not a declaration of passing status. Leave an item unchecked until evidence (command output, response capture, database assertion, or screenshot) has been recorded. Never use a real customer account or create irreversible Production data for smoke testing.

## Execution labels

| Label | Meaning |
| --- | --- |
| **A** | Automated command/test; save its exit code and output artifact. |
| **L** | Local or preview verification that does not require privileged external credentials. |
| **M** | Manual interaction or visual inspection. |
| **C** | Requires a controlled test account, environment variable, database access, or external provider credential. |
| **P** | Must be repeated against the deployed Vercel Production URL. |

Recommended evidence record for each run:

- Commit SHA:
- Branch:
- Environment (local/preview/Production):
- Base URL:
- UTC timestamp:
- Tester:
- Browser/device:
- Test account class (guest/member/Admin/Super Admin/Trader; never record credentials):
- Result artifact or screenshot directory:

## 1. Release gate

- [ ] **A/L** `pnpm install --frozen-lockfile` completes from the committed lockfile.
- [ ] **A/L** `pnpm lint` exits 0 without disabling rules.
- [ ] **A/L** `pnpm typecheck` exits 0.
- [ ] **A/L** `pnpm test:run` exits 0 and terminates normally (no watch-mode hang).
- [ ] **A/L** `pnpm build` exits 0 without skipped type/lint failures.
- [ ] **A/L** `pnpm check:i18n` exits 0; no raw translation keys are emitted.
- [ ] **A/L** `pnpm check:prod-endpoints` exits 0.
- [ ] **A/L** `pnpm check:public-env` exits 0 and reports no secret exposed through a `NEXT_PUBLIC_*` variable.
- [ ] **A/L** `pnpm test:smoke` exits 0 against the intended local/preview base URL.
- [ ] **A/L** Relevant integration, API, auth, RLS, accessibility, responsive, RTL, and visual-regression suites run when present; missing suites are reported as missing, not passed.
- [ ] **A/L** `pnpm audit --prod` output is saved and every unresolved High/Critical advisory is either fixed or recorded as a launch blocker with an owner.
- [ ] **A/L** `git diff --check` exits 0.
- [ ] **A/L** `git status --short` contains only intended Phase 2.10 files before commit.
- [ ] **A/L** Diff review confirms no `.env*`, tokens, cookies, API keys, private URLs, generated credentials, user documents, or Production data are staged.
- [ ] **A/P** The deployed SHA exactly matches the approved commit.

## 2. Boot and base HTTP behavior

- [ ] **A/L** Start the production build with `pnpm start`; it boots without runtime import/configuration errors.
- [ ] **A/L** `/` returns 200 HTML and renders the public homepage.
- [ ] **A/L** `/login`, `/reset-password`, `/about`, `/contact`, `/terms`, and `/privacy` return 200 and use the public shell.
- [ ] **A/L** An unknown page returns the custom 404 and correct 404 status.
- [ ] **A/L** `/favicon.ico` returns the intended 308 redirect and the target PNG returns 200 with an image content type.
- [ ] **A/L** Requests to `/_next/static/*` are not intercepted by auth middleware.
- [ ] **A/L** Security headers are present on representative page and API responses (`X-Frame-Options`, frame-ancestor policy, and the configured permissions policy).
- [ ] **A/P** Repeat homepage, login, 404, favicon, and representative security-header checks on Production.

## 3. Authentication, guest mode, MFA, and session lifecycle

- [ ] **A/L** An unauthenticated request to `/dashboard` redirects to `/login?next=/dashboard` without rendering private content.
- [ ] **A/L** An unauthenticated request to `/thesfm-trader-own` redirects to login; local QA bypass is disabled in Vercel.
- [ ] **A/L** A protected `/api/*` request returns structured JSON 401, not HTML and not a login/locale redirect.
- [ ] **M/C** Registration succeeds with a disposable test identity; localized validation covers invalid username, email, password, age, and duplicate identity.
- [ ] **M/C** Login with username/password succeeds without a manual refresh and lands on the safe validated `next` path or dashboard.
- [ ] **M/C** Invalid login uses one generic localized error and does not reveal whether a username/email exists.
- [ ] **A/C** Username resolution and password-reset request/check endpoints return enumeration-safe response shapes for existing and non-existing identifiers and enforce rate limits.
- [ ] **M/C** Password-reset email arrives, its link opens the correct host/locale, token expiry is handled, and the new password works.
- [ ] **M/C** TOTP-required users cannot open protected pages or APIs until AAL2 verification succeeds.
- [ ] **M/C** Email-MFA-required users cannot bypass verification by writing a browser cookie or calling Supabase directly.
- [ ] **A/C** Auth/session cookies are Secure in Production, SameSite-scoped, server-controlled/HttpOnly where required, and cleared on logout/expiry.
- [ ] **M/C** Session refresh preserves the signed-in state across reload and server/client state agrees.
- [ ] **M/C** Expired or revoked sessions redirect safely, clear stale user state, and do not loop.
- [ ] **M/L** `/guest` creates guest mode and lands on `/dashboard`.
- [ ] **M/L** Guest mode opens only the exact supported routes: dashboard, income, expenses, monthly subscriptions, invest, savings, goals, reports, reports center, AI, and market analysis.
- [ ] **A/L** A guest request to a non-allowed protected route (for example `/documents`) redirects to login.
- [ ] **M/C** Logout clears member data, caches, MFA proof, and navigation state; Back does not reveal private content.
- [ ] **A/P** Repeat unauthenticated page/API behavior, guest entry, login, session refresh, MFA, and logout on Production.

## 4. Route and navigation integrity

- [ ] **A/L** Every page in `docs/route-inventory.md` either returns its intended page, an evidenced compatibility redirect, authorization response, or validated 404 for an invalid dynamic parameter.
- [ ] **A/L** Every internal `href` in desktop navigation resolves; none points to a blank or missing page.
- [ ] **M/L** Active navigation state follows route changes, including Back/Forward.
- [ ] **M/L** Query-backed tabs (`market-analysis`, charity projects, and investor workspace) preserve the correct active state on reload and Back/Forward.
- [ ] **M/L** Arabic navigation mirrors correctly; English and French remain LTR.
- [ ] **M/L** Language, theme, density, profile, and logout controls remain reachable on desktop and mobile.
- [ ] **A/L** Compatibility redirects preserve bookmarks and do not loop: alerts/watchlist, subscriptions, onboarding/setup, settings/profile, business, service directories, and Trader history/scanner aliases.
- [ ] **A/L** Invalid ebook slug returns 404.
- [ ] **A/L** Invalid Trader market redirects to `/thesfm-trader-own/markets` without a loop.
- [ ] **A/L** `/notif` redirects server-side to `/notifications`; the destination applies the normal authentication gate and no notification data is rendered at the legacy URL.
- [ ] **A/L** Every method on `/zoer_proxy/[...path]` returns structured JSON 410, performs no upstream fetch, and does not read or inject a server credential.
- [ ] **M/C** Admin-only navigation is hidden from regular users; direct Admin URLs render access denied rather than Admin data.
- [ ] **M/C** Super-Admin-only navigation and pages remain hidden/denied for an ordinary Admin.
- [ ] **M/C** Approved non-Admin Trader users can reach intended Trader pages even though the main navigation currently shows the Trader root only to Super Admins; record the intended discoverability policy.
- [ ] **M/P** Repeat primary navigation, Back/Forward, legacy redirects, and direct unauthorized URL checks on Production.

## 5. Public and pre-login pages, SEO

- [ ] **A/L** Homepage title, description, canonical URL, Open Graph, Twitter metadata, and locale metadata are valid.
- [ ] **A/L** `/robots.txt` and `/sitemap.xml` return 200 and contain only intended public URLs.
- [ ] **A/L** Private dashboard, Admin, Trader, user data, reports, documents, and share-management routes are excluded from indexing.
- [ ] **A/L** Investor public viewer is noindex unless the approved product policy explicitly says otherwise.
- [ ] **M/L** Public images/logos load without broken-image glyphs, have meaningful alt text where informative, and preserve aspect ratio.
- [ ] **M/L** Company listing submit/cancel/success and `/companies/[id]` render with the intended public/app shell and no authenticated-data leakage.
- [ ] **A/L** Structured data parses where present and contains no private fields or fabricated claims.
- [ ] **A/P** Validate canonical host, robots, sitemap, metadata preview, 404, and public-link performance on Production.

## 6. Core Finance smoke journey

- [ ] **M/C** Dashboard loads real user/empty state without fake values, raw errors, or private-content flash.
- [ ] **M/C** Profile reads and updates the current user only; password fields never display an existing password.
- [ ] **M/C** Income list loads; add/edit/delete/save/cancel work; Enter submits where appropriate; double click produces one write.
- [ ] **M/C** Expenses and monthly subscriptions load; add/edit/delete/filter/search work; amounts and dates round-trip correctly.
- [ ] **M/C** Investments load; add/edit/delete and price refresh work; unavailable market data is disclosed without fake prices.
- [ ] **M/C** Savings load; add/edit/delete and progress calculations remain consistent.
- [ ] **M/C** Goals load; add/edit/delete and progress state work for empty, active, and completed goals.
- [ ] **M/C** Debts load; add/edit/delete and monthly-expense generation prevent duplicate writes.
- [ ] **M/C** Reports and Reports Center open, filters work, and generated/exported files contain the selected real data only.
- [ ] **M/C** Documents list/open/upload/download/delete work with ownership checks and safe file validation.
- [ ] **M/C** AI insights show loading/partial/unavailable/rate-limit/error states honestly and never fabricate advice.
- [ ] **M/C** Search and command menu find only authorized destinations/data.
- [ ] **M/C** Notifications load, mark/read/delete actions work once, and `/notif` canonical behavior is correct.
- [ ] **M/P** Repeat the save/open/download critical path on Production with a disposable test record, then clean it up through the UI.

## 7. Business and project smoke journey

- [ ] **M/C** `/business` redirects to `/business-operations` and the Business overview loads.
- [ ] **M/C** Employees, sales, customers, suppliers, operating expenses, and invoices load their success/empty/error states.
- [ ] **M/C** Representative Business create/edit/delete/save/cancel actions work and prevent duplicate submission.
- [ ] **M/C** Invoice analysis rejects invalid file/type/size safely, reports provider misconfiguration, and does not expose raw provider errors.
- [ ] **M/C** Projects list and `/projects/[id]` enforce ownership; invalid IDs return a safe not-found/denied state.
- [ ] **M/C** Project calculator, expense analysis, AI advisor, chat, and pitch-deck generation/export report partial/provider failures honestly.
- [ ] **M/C** Business subscriptions create/edit/delete and reminder timing/history use the configured timezone.
- [ ] **M/C** Reminder test email is Admin/owner controlled, cannot be double-sent, and does not put `CRON_SECRET` in a URL.
- [ ] **A/C** Scheduled reminder invocation accepts only the approved authorization header, uses bounded retries, and records real delivery failure.
- [ ] **M/P** Repeat one Business save, one project read, and reminder status (without sending to a real customer) on Production.

## 8. Charity, Zakat, and Khums smoke journey

- [ ] **M/C** Charity Center, donations, projects, beneficiaries, and reports load the current user's authorized data only.
- [ ] **M/C** Charity create/edit/delete/save/cancel actions work and destructive actions require confirmation.
- [ ] **M/C** Zakat calculator uses the selected real inputs and current provider state; missing metal prices are unavailable/misconfigured, not replaced with a fake value.
- [ ] **M/C** Khums calculations and terminology remain correct in Arabic, English, and French.
- [ ] **M/C** Charity project report and export open successfully and contain no unrelated beneficiary/private user data.
- [ ] **A/C** Metals-price aliases return consistent values, attribution, freshness, cache/delay state, and error JSON.
- [ ] **M/P** Repeat Zakat, Khums, Charity Center, beneficiary privacy, and report export on Production.

## 9. Investor Experience smoke journey

- [ ] **M/C** Investor Overview, Readiness, Financials, Documents/Due Diligence, Pitch Deck, Risks, Sharing, and Activity tabs load and preserve Back/Forward state.
- [ ] **M/C** Readiness derives from real project records, distinguishes missing/blocked/stale/needs-review, and does not claim 100% when blockers exist.
- [ ] **M/C** Investor documents expose only explicitly shared files; private documents never appear in public viewer responses.
- [ ] **M/C** Creating a share link returns its raw token once, stores only the expected hash, and prevents duplicate submissions.
- [ ] **M/C** Valid share token opens only allowed sections; optional password, expiry, revocation, and view limit are enforced.
- [ ] **A/C** Invalid token/password attempts are rate limited and do not amplify synchronous CPU or write one event per wrong guess.
- [ ] **M/C** Questions and activity events use real outcomes, have bounded submission rates, and do not disclose owner/private fields.
- [ ] **M/C** Share/copy/download actions show localized success only after confirmed completion.
- [ ] **C** Supabase migration `20260712130000_create_investor_relations.sql` is confirmed applied before declaring these flows operational.
- [ ] **M/P** Repeat valid, expired, revoked, wrong-password, section-limited, and private-document cases on Production.

## 10. Trader and Smart Market Analysis

- [ ] **M/C** `/thesfm-trader-own` and its Dashboard, Markets, Market Analysis, Recommendations, Heatmap/Scanner, Watchlist, Sessions, News, Calendar, Earnings, Dividends, and IPO experiences are reachable for an entitled account.
- [ ] **M/C** Trader sidebar expanded mode has one localized primary label, readable contrast, no clipped Arabic, aligned icons, and no redundant micro-labels.
- [ ] **M/C** Collapsed sidebar is icon-only with localized accessible names/tooltips, visible active state, and complete keyboard operation.
- [ ] **M/C** Mobile Trader navigation exposes the required destinations and does not cover content.
- [ ] **M/C** General UI uses IBM Plex Sans Arabic/Tajawal; IBM Plex Mono is limited to prices, percentages, values, timestamps, tickers, and numeric tables.
- [ ] **M/C** Market flags, asset icons, exchange, currency, ticker, and positive/negative states are correct for at least one US, Kuwait, Saudi, UAE, Europe, forex, crypto, commodity, and index example.
- [ ] **M/C** Buy/Sell/Wait presentation matches the existing recommendation output; formulas are unchanged.
- [ ] **M/C** Analysis lifecycle maps exactly: loading → in progress; successful zero matches → empty; incomplete inputs → insufficient data with missing fields; provider failure → error/fallback; cached old data → stale; delayed feed → delayed; rate rejection → rate limited; unsupported provider → unavailable/unsupported.
- [ ] **M/C** Strategy agreement excludes invalid/missing strategies and cannot display 100% unless every required participating strategy returned a valid comparable result.
- [ ] **M/C** AI confidence, evidence completeness, technical/fundamental/news availability, provider freshness, risk, and final status do not contradict one another.
- [ ] **M/C** Selected provider, attempted providers, fallback and reason, freshness, delay/cache state, completeness, last success/failure, rate-limit state, and missing fields are visible where the architecture supplies them.
- [ ] **M/C** A successful quote probe does not label news, fundamentals, calendar, or global provider health as connected.
- [ ] **M/C** Filters, search, timeframe selectors, Retry, watchlist, alerts, followed trades, share, and PDF export perform their real action once.
- [ ] **A/C** `/api/recommendations` returns structured JSON within the route budget for default and explicit-symbol requests; its response does not duplicate a large recommendation array under multiple keys unless contractually required.
- [ ] **A/C** `/api/markets` returns a bounded payload and truthful provider/freshness metadata.
- [ ] **A/C** Provider-health GETs are read-only; cache reset/refresh/discovery actions require authorized POST and are rate limited.
- [ ] **A/C** News, economic calendar, earnings, dividends, and IPO routes return consistent JSON status/schema for success, empty, partial, unsupported, rate-limited, and provider failure.
- [ ] **M/P** Repeat desktop/mobile Trader critical path in all three locales and both themes on Production.

## 11. API contract smoke tests

- [ ] **A/L** Representative success responses have valid JSON and `Content-Type: application/json`.
- [ ] **A/L** Invalid body/query/path cases return the intended 400/404/405/409 status and a stable JSON error code.
- [ ] **A/L** Authentication failure returns JSON 401; authorization failure returns JSON 403; missing configuration returns JSON 503 where appropriate.
- [ ] **A/L** No tested `/api/*` response contains a Next.js HTML error page, stack trace, secret, SQL text, full provider error, token, or private record.
- [ ] **A/L** Unsupported methods return 405 rather than silently executing another method.
- [ ] **A/L** Slow upstream calls have bounded timeouts; retries are limited and aborted where supported.
- [ ] **A/L** A client disconnect or timeout does not leave uncontrolled provider work running.
- [ ] **A/L** Response schemas match the frontend consumers for recommendations, market state, provider health, news, calendar, earnings, dividends, IPOs, Shariah research, Admin diagnostics, reminders, documents/reports, and investor sharing.
- [ ] **A/L** Errors are logged server-side in sanitized form and are not silently swallowed.
- [ ] **A/C** Authenticated ownership tests cover account, notifications, watchlist, portfolio, followed trades, projects, documents/reports, company owner, receipts, subscriptions, and investor links.
- [ ] **A/C** Admin endpoint tests cover regular member 403, scoped Admin permission, and Super Admin restriction.
- [ ] **A/C** Cron/webhook tests cover missing, invalid, and valid signatures without query-string secrets.
- [ ] **A/P** Run the non-mutating API subset on Production; run mutating cases only with a disposable test account and cleanup plan.

## 12. Forms, actions, and feedback

- [ ] **M/C** Representative Save, Edit, Delete, Cancel, Retry, Upload, Download, PDF export, Share, Filter, Search, and Enter-key actions work.
- [ ] **M/C** Submit buttons expose `aria-busy`, show a localized loading label, and block repeated clicks until completion.
- [ ] **M/C** Required, numeric, decimal, currency, date, null, and empty-string validation messages are useful and localized.
- [ ] **M/C** Success feedback appears only after confirmed persistence/delivery; failure feedback states the safe cause and next action.
- [ ] **M/C** Destructive actions require confirmation and focus returns to the trigger afterward.
- [ ] **M/L** One Toast system is used for new feedback; position follows RTL/LTR and mobile Toasts do not cover bottom navigation/safe area.
- [ ] **M/L** Dialogs trap focus, have an accessible title/description, close with Escape when safe, restore focus, and prevent background scroll.
- [ ] **M/L** Drawers/bottom sheets are keyboard accessible and fit the viewport without nested page overflow.
- [ ] **M/L** Inline errors and status banners use text/icon semantics in addition to color.

## 13. Localization, typography, and numeric formatting

- [ ] **A/L** Translation check finds no missing/duplicate/raw keys in Arabic, English, or French.
- [ ] **M/L** Every core page and reusable state renders in Arabic RTL and English/French LTR without mixed-language controls.
- [ ] **M/L** Long Arabic labels and diacritics are not clipped; line height remains readable.
- [ ] **M/L** Official company names, brands, legal names, tickers, and symbols are preserved.
- [ ] **M/L** Provider display names use approved labels while technical provider IDs are not shown as raw UI keys.
- [ ] **M/L** Financial, Investor, Zakat, Khums, and Charity terminology is consistent across routes.
- [ ] **A/L** Arabic, English, and French formatting uses Latin digits `0123456789` (`nu-latn`) for dates, currency, percentages, counts, and timestamps.
- [ ] **M/L** Financial numbers align consistently and use tabular numerals where appropriate.
- [ ] **M/L** Body, caption, label, navigation, title, numeric, market, ticker, and table-number variants are visually consistent.

## 14. Responsive and visual QA matrix

For each matrix cell, capture at least the homepage/login, dashboard, one dense Finance page, Trader root/analysis, Charity/Zakat, Investor workspace/viewer, Admin diagnostics/access-denied, a table, a chart, a dialog, and a drawer.

| Width/device | Light AR | Dark AR | Light EN | Dark EN | Light FR | Dark FR |
| --- | --- | --- | --- | --- | --- | --- |
| 320 px | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 375 px | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 390 px | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 430 px | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Tablet portrait | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Tablet landscape | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Laptop | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Desktop | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Large desktop | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

For every checked cell:

- [ ] **M/L** No page-level horizontal overflow.
- [ ] **M/L** Touch targets are at least 44×44 CSS px.
- [ ] **M/L** Sidebar/mobile menu/bottom navigation do not cover content and handle safe areas.
- [ ] **M/L** Cards, badges, tabs, toolbars, charts, and tables fit or use a deliberate local overflow/mobile pattern.
- [ ] **M/L** Dialogs/drawers fit the visual viewport and controls remain above browser bars.
- [ ] **M/L** Sticky elements do not hide headings, rows, or action buttons.
- [ ] **M/L** Light cards have a visible semantic border near `#E2E8F0`, distinguishable surface, and readable muted/disabled/selected/focus states.
- [ ] **M/L** Dark surfaces preserve navy/teal identity without excessive glow, invisible borders, saturated status badges, or unreadable tooltips.
- [ ] **M/L** Charts remain legible in both themes and communicate series/status without color alone.
- [ ] **M/P** The minimum matrix subset (375, 390, 430, tablet, laptop, desktop; both themes; AR/EN/FR) is repeated on Production.

## 15. Accessibility

- [ ] **A/L** Automated accessibility scan reports no Critical/Serious violations on representative public, Finance, Trader, Charity, Investor, and Admin/access-denied pages.
- [ ] **M/L** Keyboard-only traversal reaches all interactive controls in a logical order.
- [ ] **M/L** Skip link reaches `#main-content` and visible focus is never clipped or color-only.
- [ ] **M/L** Buttons/links have accessible names; icon-only controls use localized labels.
- [ ] **M/L** Form labels, descriptions, requirements, and errors are programmatically associated.
- [ ] **M/L** Tabs, accordions, tables, dialogs, drawers, menus, and status announcements expose correct semantics/state.
- [ ] **M/L** Heading hierarchy is coherent and each page has one useful primary heading.
- [ ] **M/L** Tables have headers/scope; charts have a text summary or accessible data alternative.
- [ ] **M/L** Loading, success, warning, stale, rate-limited, unavailable, and error changes are announced appropriately without excessive live-region noise.
- [ ] **A/L** Contrast meets WCAG AA for text, controls, focus indicators, statuses, charts, and disabled/read-only differentiation.
- [ ] **M/L** `prefers-reduced-motion` disables nonessential motion; no infinite animation consumes resources or blocks interaction.

## 16. Performance and serverless safety

- [ ] **A/L** Network trace shows no duplicate initial requests for recommendations, provider health, market state, news, reports, documents, or investor activity.
- [ ] **M/L** Polling pauses or backs off when the tab is hidden and resumes without a request burst.
- [ ] **A/L** Polling intervals respect provider limits; no sub-second market refresh exists without an explicitly supported feed.
- [ ] **A/L** Concurrent identical safe requests are coalesced where implemented and cache headers match actual freshness.
- [ ] **A/L** Cached/stale-while-revalidate data is labeled cached/stale/delayed in the UI, not live.
- [ ] **A/L** Heavy charts mount lazily and do not continue work while hidden.
- [ ] **A/L** Production bundle review records unexpectedly large client chunks and verifies heavy client-only modules are dynamically loaded where justified.
- [ ] **A/L** Representative route timings and response sizes are captured for recommendations, markets, provider health, Smart Analysis, Operations Center, reports, documents, investor activity, and Shariah research.
- [ ] **A/L** Server routes use bounded concurrency and total deadlines; no unbounded retry/recursive fallback is observed.
- [ ] **A/L** Large PDF/report/document work stays within Vercel duration/memory limits or uses an already-supported background mechanism.
- [ ] **A/L** Diagnostics distinguish request/process/provider metrics and show “not instrumented” when unavailable; no CPU, memory, jobs, AI, delivery, or provider success value is fabricated.
- [ ] **A/P** Review Vercel function duration, invocation count, error rate, and CPU/memory telemetry where actually instrumented; record unavailable metrics as unavailable.

## 17. Supabase, RLS, files, and security

- [ ] **C** Compare local migration filenames/checksums to the linked Supabase migration history; record unapplied, divergent, or duplicate migrations without applying them during smoke testing.
- [ ] **C** Confirm `20260712130000_create_investor_relations.sql` application state.
- [ ] **A/L** Generated database types match code expectations and no migration is required merely to silence TypeScript.
- [ ] **A/C** RLS tests prove user A cannot select/insert/update/delete user B's Finance, Business, Charity, project, notification, document, company, or investor records.
- [ ] **A/C** Admin tables/actions require the intended permission; regular authenticated users receive 403/zero rows as designed.
- [ ] **A/C** Public investor/file access returns only allowlisted records/fields and uses expiring/signed access where designed.
- [ ] **A/C** Upload validation covers MIME, extension, size, path traversal, executable/SVG/HTML risk, ownership, and download disposition.
- [ ] **A/L** SSRF tests reject private, loopback, link-local, metadata, credentialed, and unsafe redirect targets.
- [ ] **A/L** User HTML/Markdown is sanitized and no unsafe `dangerouslySetInnerHTML` path accepts unsanitized input.
- [ ] **A/L** Logs omit passwords, tokens, cookies, API keys, financial records, beneficiaries, investors, and full documents.
- [ ] **A/L** Debug routes are unavailable to unauthenticated/regular users in Production.
- [ ] **A/L** Public health endpoints expose only coarse status and never schema names, environment presence, raw database/provider errors, or secret fingerprints.
- [ ] **A/P** Repeat negative ownership, Admin, file, debug, health, and proxy tests on Production using controlled accounts.

## 18. Email, reminders, billing, and external integrations

- [ ] **C** SMTP/provider configuration status is reported without exposing host credentials or tokens.
- [ ] **M/C** Sender identity is verified and Reply-To is safe.
- [ ] **M/C** Arabic, English, and French templates render correctly in representative desktop/mobile email clients.
- [ ] **M/C** Delivery failure is recorded honestly; retry count is bounded and duplicate delivery is prevented.
- [ ] **M/C** Reminder timezone, schedule, history, links, unsubscribe/preferences, and disabled state are correct.
- [ ] **A/C** Stripe checkout/portal require the authenticated user and safe allowlisted return URLs.
- [ ] **A/C** Stripe webhook rejects invalid signatures and is idempotent for duplicate events.
- [ ] **C** Market/news/calendar/earnings/dividends/IPO/Shariah providers are tested for configured, missing config, invalid credential, timeout, rate limit, partial response, and fallback.
- [ ] **C** AI/document/OCR/TTS/Wakeel/Instagram integrations report unavailable/misconfigured safely when credentials are absent.
- [ ] **P/C** Repeat one non-destructive provider request per configured Production integration and capture attribution/freshness/fallback evidence.

## 19. Production-only verification

- [ ] **P** The Production deployment is healthy and serves the approved SHA on the canonical HTTPS host.
- [ ] **P** Environment variables required by enabled features exist in the correct Vercel environments; values are never printed.
- [ ] **P** No redirect loop occurs between canonical host, HTTPS, login, MFA, onboarding, locale, and protected routes.
- [ ] **P** Server logs for the smoke window contain no new unhandled exception, raw stack response, hydration warning, or repeated request storm.
- [ ] **P** Browser console on core journeys contains no major error or secret/private payload.
- [ ] **P** Production APIs return JSON for success and failure, including authentication and provider failures.
- [ ] **P** Production-only provider/CORS/cookie/domain/file/email behavior matches preview/local contracts.
- [ ] **P** Vercel timeout/memory/CPU risks are checked using real platform telemetry where available; unavailable telemetry is explicitly recorded.
- [ ] **P** Rollback target (previous known-good deployment) is identified before release approval.

## 20. Exit decision

Mark exactly one after all evidence is reviewed:

- [ ] **Ready** — all release gates pass; no Critical/High launch blocker remains; required Production and credential-backed checks pass.
- [ ] **Ready with known limitations** — all release gates pass and remaining limitations are non-blocking, documented, owned, and user-visible where relevant.
- [ ] **Not ready** — any required build/lint/type/test gate fails, a Critical/High issue remains, migrations/RLS/auth cannot be verified, or mandatory Production verification is incomplete.

Required release note fields:

- Critical blockers open:
- High issues open:
- Credential-blocked checks:
- Manual Production checks not completed:
- Unapplied/unverified migrations:
- External provider limitations:
- Rollback target:
- Approver and UTC timestamp:

Phase 3 / Workspace Architecture is explicitly outside this checklist and must not begin until the Phase 2.10 exit decision is recorded.

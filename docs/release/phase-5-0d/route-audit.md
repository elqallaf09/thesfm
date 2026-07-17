# Route audit

The complete machine-readable inventory is `route-inventory.csv`. It was generated from App Router pages and handlers, then cross-checked against middleware, API access policy, navigation configuration, workspace registry, redirects, robots, sitemap generation, and the Smart Analysis terminal route map.

## Inventory totals

| Kind/access | Count |
|---|---:|
| Pages | 133 |
| Route handlers | 138 |
| Public pages | 40 |
| Authenticated pages | 72 |
| Authenticated-or-guest demo pages | 11 |
| Admin-only pages | 8 |
| Redirect aliases | 2 |
| Public APIs | 66 |
| Authenticated APIs | 41 |
| Admin-only APIs | 22 |
| Cron-secret APIs | 6 |
| Hidden/internal handlers | 3 |

Handler access is classified at route level. Handlers whose HTTP methods have different role requirements still require method-level negative tests before launch.

## Production runtime coverage

- 124 non-dynamic page routes received a read-only Production GET: 40 returned 200 and 84 returned 307. No static page returned 404 or 5xx.
- Nine dynamic pages were not called without real fixture IDs/tokens: company detail, investor capability link, project detail, business subscription client, ebook slug, and Smart Analysis market/symbol routes. They remain **blocked**, not passed.
- Browser samples followed redirects for login/signup, dashboard, invest, market analysis, reports, and Smart Analysis auth wall. No redirect loop, error overlay, blank page, console error, or horizontal overflow was observed in those samples.
- The baseline covered desktop Arabic Dark/Light, desktop English, mobile Arabic/English, and the requested primary surfaces. Authenticated and admin content validation is blocked by the failed Preview database and absent approved isolated credentials.

## Redirects and deprecated aliases

Confirmed code redirects include `/command-center` → `/today`, `/reports` → `/reports-center`, `/business` → `/business-operations`, `/settings` → `/profile`, `/watchlist` and `/market-watchlist` → market-analysis watchlist, `/market-alerts` and `/alerts` → market-analysis alerts, and legacy Smart Analysis aliases → canonical terminal routes.

`/notif` redirects to `/notifications`. Internal redirect implementations returned the expected RSC/static status behavior and were also exercised through browser navigation where sampled.

## Access findings

- `/market-agent` exposed an authenticated workspace shell while `/api/market-agent` was protected. This branch adds the page prefix to middleware and adds `noindex`; focused guards pass. Production still returns 200 until this reviewed branch is deployed.
- Smart Analysis `/thesfm-trader-own` guest access redirects to login. Its shared-shell implementation is now in main and passes focused/local/CI tests; authenticated runtime proof remains blocked.
- Admin routes are middleware-protected and server-authorized. Normal-user versus admin runtime proof was not executed without isolated accounts.
- Capability routes such as `/investor/:token` remain public by design but are now explicitly disallowed from indexing.

## Language, direction, and mobile evidence

Arabic RTL and English LTR were exercised in Production browser samples. The translation checker confirms every registered entry has Arabic, English, and French. French browser coverage, authenticated Smart Analysis language/theme coverage, tablet, all requested breakpoint widths, and 125%/150% zoom were not all manually completed; CI/local responsive suites provide partial automated coverage only.

# Smart Analyzer quote observation accuracy — 2026-09-18

## Problem and baseline

Production `a415bb96e7884b88463ccf9bd8083a99b7b6959c` returned AAPL/MSFT reference
prices and 260 historical candles, but labelled the overall recommendations
response `provider_error` / `unavailable`. Both observation dates were normalized
to midnight on September 17. The Twelve Data adapter preferred the daily
`datetime` over event timestamps, inferred realtime entitlement from an open
exchange, and supplied request time when source time was absent. Cache hits
changed the delay class and could extend the accepted age of a quote.

## Change

- Prefer a valid source `last_quote_at`, then `timestamp`, then the source
  datetime; request UTC explicitly. Retain daily precision rather than claiming
  a midnight trade. Reject missing, malformed, ambiguous and future observation
  times for current-price eligibility. No wall-clock replacement prices or dates.
- Keep the original feed delay class through cache hits. Exchange-open state
  alone never establishes realtime entitlement.
- Preserve daily/closed-session prices, daily change and volume as dated
  reference evidence. Do not promote them to current quotes or trading targets.
- Expose partial evidence instead of a blanket provider failure. Count current
  quotes, reference prices, historical technical analyses and sufficient
  recommendations separately. Missing observation dates remain null in the API.
- Display reference labels, daily date precision and the historical analysis
  date in Arabic, English and French. Technical indicators remain visible;
  confidence, targets and stops remain withheld when current evidence is absent.

No exchange holiday calendar is invented or used to extend freshness windows.
Closed-session classification uses the source's explicit market-open field;
unknown state remains unknown. This does not certify an official closing auction
price or predict investment outcomes.

Provider contract references: [official Python quote parameters](https://github.com/twelvedata/twelvedata-python/blob/master/src/twelvedata/endpoints.py)
(daily default and timezone parameter) and [official timezone guidance](https://support.twelvedata.com/en/articles/5745849-timezones).

## Verification and release

Regression tests cover precise versus daily timestamps, seconds/milliseconds and
timezones, invalid/future/missing times, cache delay preservation, reference-only
and failed API responses, withheld trade outputs and localized rendering.
Browser smoke coverage exercises the reference-only analysis tab in all three
languages in addition to the existing route/action suite.

Local validation: 2940 unit/integration tests and 93 Node tests passed; the two
additional API route integration cases also passed. Typecheck, ESLint, translation
and maintainability checks passed. Required CI must validate the exact published
candidate, including frozen dependencies, the production build, browser tests,
migrations and performance budgets before merge. CI uses Node 22.13.0 and pnpm
11.1.3; the local runtime is Node 24.

The local production build compiled and generated 216 pages, then encountered
the pre-existing scratch-filesystem `ENOTEMPTY` export-cleanup error. Bundle
budgets passed on the generated output. The release remains gated on successful
CI and Vercel production builds; this local build is not recorded as a pass.

Rollback baseline: production deployment `dpl_9zWMmbBfisvuoQE8Dp31Tfu8pDnv`,
commit `a415bb96e7884b88463ccf9bd8083a99b7b6959c`. Release and rollback owner:
Mohammed AlQallaf under the existing merge/deploy authorization. No auth, RLS,
schema or provider subscription changes.

Post-deployment checks must read canonical quote/recommendation APIs, confirm
partial/reference labels, preserve historical samples and verify no current
trading confidence is fabricated. Abort on a new auth/data leak or critical route
failure. The release record must contain exact commit/deployment IDs and results.
There is no authenticated manual-account browser check, production RUM/SLO claim
or unattended canary claim. Those observability limitations remain disclosed
under the existing release authorization; CI and a point-in-time API smoke check
do not satisfy continuous production monitoring.

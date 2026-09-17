# Smart Analyzer evidence flow

The deployed `/thesfm-trader-own/dashboard` is owned by this Next.js repository.
Its protected static terminal lives in `src/trader-app/public`. Updating the
separate `the-sfm-trader` repository does not update this production route.

## Data repair

- The production quote facade uses the SFM engine. FMP now participates in that
  engine's quote and daily-history fallback chain; Yahoo remains excluded.
- FMP credentials remain server-only (`FMP_API_KEY`, sent as the documented
  `apikey` header). Coverage is US equities and ETFs. Provider subscription
  entitlements still apply; a configured key does not establish realtime access.
- Quotes require the requested symbol and a positive price. Missing fields and
  timestamps remain missing. Historical bars are dated, ordered and deduplicated.
- Repeated FMP requests share a bounded cache and in-flight work, using the existing
  queue and rate-limit backoff. Quotes cache for 60 seconds, daily history for
  15 minutes. Original provider observation times are retained.
- A stale price appears only as `lastKnownPrice`, with its time and stale label.
  It is excluded from current-price coverage and cannot unlock trade targets,
  stops or confidence. Technical history can still be inspected.
- Failed signal responses cannot erase a good quote. Records are selected as a
  whole so a price is never combined with targets from a different observation.
- A configured provider failure is not relabelled as missing configuration just
  because a later provider has no key. Hydration commits each completed request
  separately, and failed responses remain retryable.

## Dashboard behavior

The default dashboard uses a labelled stock research sample instead of the first
alphabetical directory rows. Other directory views keep their normal ordering.
The full market directory remains searchable. Coverage and timestamps describe
observed data, not directory size or the browser's clock.

The research panel explains trend, RSI/MACD, moving averages, support/resistance,
momentum, volume ratio and ATR from the selected record. It exposes source,
observation time, history count, daily change and supplied market capitalization.
Missing fundamentals are not manufactured. The detail action opens the existing
symbol research drawer. Arabic/RTL, English and French copy is included.

## Release verification

Regression tests cover the FMP-only provider path, symbol identity, nulls,
request coalescing, failure classification, stale trade gating, coherent merging,
coverage counts, regional sample selection and escaped multilingual rendering.

After deployment, verify with an authorized account and an entitled provider key:

1. Open the dashboard and check quote coverage, original observation time and
   upstream name against `/api/recommendations?market=us-stocks&view=dashboard`.
2. Open a symbol, switch dashboard tabs and switch market. Confirm that source
   identities and currencies remain correct and earlier requests do not overwrite
   the selected market.
3. Verify stale/closed-session, partial-history and provider-error states. A stale
   reference price must not appear as a current quote or unlock a trade signal.
4. Check the layout at phone and desktop widths in Arabic, English and French.

No provider credentials, financial holdings, auth policy or database migrations
are changed by this repair. Rollback is the preceding production deployment.

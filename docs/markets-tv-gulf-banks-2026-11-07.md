# Missing Gulf bank quotes

## Problem and scope

The Gulf TV scene could recover Kuwait, Saudi Arabia, Dubai and Qatar through
its verified Yahoo fallback, but had no alternative for FAB (ADX), NBB (Bahrain)
or BKMB (Muscat) when the configured primary provider was unavailable or limited.

This change adds one server-side, shared TradingView screener request restricted
to these three listings. It applies to the existing TV snapshot API consumed by
the WebView and native clients. It needs no Android rebuild, database migration,
client credential or fabricated/seeded market price.

| App listing | Provider listing | MIC | Currency | ISIN |
| --- | --- | --- | --- | --- |
| FAB.AE | ADX:FAB | XADS | AED | AEN000101016 |
| NBB.BH | BAHRAIN:NBB | XBAH | BHD | BH0005508773 |
| BKMB.OM | MSX:BKMB | XMUS | OMR | OM0000002796 |

Identity references: [FAB issuer share information](https://www.bankfab.com/en-ae/about-fab/investor-relations/shareholder-information/share-information-bundle),
[Bahrain Bourse ISIN directory](https://bahrainbourse.com/en/Bahrain%20Clear/ISINCodes),
[MSX Bank Muscat profile](https://www.msx.om/snapshot.aspx?s=BKMB).
The quote source displayed by this fallback is **TradingView**, not an exchange
or issuer. The public screener response is an external integration, not a
contractual market-data availability guarantee; schema changes fail closed.

## Data and failure handling

- Require exact provider ticker, exchange, stock type, currency, ISIN and field
  count. Reject duplicates, non-positive/non-numeric prices, missing/future
  timestamps and observations older than seven days. No cross-exchange aliases
  or guessed price-unit conversion.
- Preserve `update_time` as the provider's quote observation time (not proof of
  an execution time); `receivedAt` remains the separate fetch time. A fresh
  snapshot never makes an old quote fresh.
- `delayed_streaming_900` is explicitly delayed data; no realtime entitlement is
  inferred. `out_of_session` supplies the closed-market state. Invalid changes
  stay null instead of becoming zero or entering the sample ranking.
- Healthy configured primary quotes win. The fallback starts after a 500ms
  primary head start. One in-flight batch and a five-minute process cache are
  shared across the three banks; negative responses back off for 30 seconds and
  429 responses for at least 60 seconds, respecting longer Retry-After values.
- Live validation exposed a slow cold network response (up to about 14 seconds
  through the QA proxy). The upstream read is bounded at 20 seconds. Existing
  per-quote 6.5-second and scene 9-second UI deadlines remain unchanged.
  Next `after()` keeps the verified quote-cache writes alive after that bounded
  response. A cold request may initially report unavailable and recover on the
  next refresh. Existing dated observations survive a failed cache revalidation.
- No raw provider payload, key or user watchlist is sent to the client. The only
  outgoing symbols are the three fixed, public listing identities above.

## Verification and release

Deterministic tests cover all three identities, wrong markets/ISINs/units,
missing and future times, stale open-market readings, missing changes, duplicate
rows, concurrency, primary recovery, retries, failed responses and a slow cold
request that completes after the UI deadline and supplies the next request.
Live network validation also exercises the actual fallback and normalization;
raw responses/logs stay outside Git. The optimized local Next server was also
queried through `/api/tv/snapshot?group=gulf&scene=gulf&pageSize=10`: a slow cold
request respected the scene deadline and the following request returned all
three banks from the warmed cache with TradingView provenance. This is local
server evidence, not a claim that production or the existing preview changed.

This is a server change prepared separately from the concurrent integration
PR #343. Production promotion and any further external preview are not part of
this change. Before promotion, verify the exact deployed commit's Gulf snapshot,
source timestamps and three prices, including cold then warm requests. Rollback
is reverting the focused bank-fallback commit; no APK rollback is required.

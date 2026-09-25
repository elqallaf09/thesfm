# Silver spot data recovery

Production XAGUSD requests returned no price or history. Twelve Data's public
symbol search identifies `XAG/USD` as `COMMODITY` (Precious Metal, USD), but the
adapter sent an unqualified pair. Its history path also stopped after the first
candidate. Production logs recorded 404 from Twelve Data, 402 from EODHD and
empty responses from the other configured adapters.

The repair qualifies silver's Twelve Data quote/history requests with
`exchange=COMMODITY`. Historical requests can try the unqualified spot identity
after a not-found result; permission, quota and server failures stop identity
retries. Returned symbol, currency, dates, positive prices and OHLC ranges are
validated. Real volume remains optional.

If the primary price feed fails, Gold API's public XAG endpoint supplies the
silver spot price in USD per troy ounce. The response must identify XAG and USD,
contain a positive numeric price and provide a timezone-qualified observation
timestamp. The timestamp is preserved through caching; future observations are
rejected, and older observations remain subject to SFM's existing stale-data
rules. In-flight deduplication and a minimum 30-second cache apply even on
refresh. No secret or additional paid subscription is required for this endpoint.

Gold API's free price response does not contain daily OHLC, change, volume or
history. Those fields are kept null, and the capability registry marks this
adapter as quote-only. A quote alone cannot unlock technical confidence or
trading targets. The existing daily-history analysis continues to use its own
provider, observation date, sample sufficiency and risk calculations.

Spot requests no longer try silver futures through the Finnhub quote adapter,
EODHD SI.COMM or Yahoo SI=F. Other instruments retain their existing provider
order. The Gold API adapter only accepts the USD spot-silver identity.

Sources verified on 2026-09-19:

- https://api.twelvedata.com/symbol_search?symbol=XAG%2FUSD
- https://api.twelvedata.com/commodities?format=JSON
- https://twelvedata.com/exchanges/commodity
- https://gold-api.com/docs
- https://gold-api.com/llms.txt
- https://gold-api.com/terms (commercial API use permitted)

The live Gold API endpoint returned a valid, timestamped XAG/USD spot price
during implementation. End-to-end results for the qualified Twelve Data path
must be recorded after deployment; local fixtures do not establish provider
availability. No authentication, subscription, database schema or user records
are changed. Release/production verification is recorded in the pull request.

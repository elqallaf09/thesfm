# THE SFM economic event discovery

The calendar API and the analyst macro module use the same multi-source engine in
`src/lib/providers/economic-calendar`. A missing commercial entitlement is a
source failure, not a reason to disable the calendar.

## Sources

| Adapter | Publisher | Coverage | Payload |
| --- | --- | --- | --- |
| bea | https://www.bea.gov/news/schedule | US national accounts, income, spending, trade | Published HTML schedule |
| boc | https://www.bankofcanada.ca/press/upcoming-events/ | Canadian policy and surveys with explicit release times | Published HTML schedule |
| bls | https://www.bls.gov/schedule/news_release/bls.ics | US employment and prices | iCalendar |
| ons | https://www.ons.gov.uk/calendar/releasecalendar?release-type=type-upcoming&limit=100 | Upcoming UK releases returned by ONS | iCalendar |
| finnhub, fmp, tradingeconomics | Existing configured adapters | Subscription-dependent international coverage and values | JSON |

Official sources require no key. All configured sources run independently, in
parallel. The engine does not claim global completeness: untimed events and
recurring ICS rules are excluded; ONS coverage is limited to its returned feed.
Publisher access restrictions are reported, never bypassed. During implementation
BEA and Bank of Canada returned usable schedules; BLS and ONS returned HTTP 403
from this environment. Schedule parsers extracted 17 BEA and 6 timed Bank of
Canada events. These counts describe that retrieval, not a permanent inventory.

## Evidence and availability

- UTC times are derived from the publisher timezone with DST. No invented midnight
  release times, actual values, previous values, consensus forecasts, or events.
- Official schedule impact is a transparent THE SFM title classification, with
  `impactMethod=sfm-title-rule-v1`. It is not a publisher rating or a prediction.
- Exact normalized title, jurisdiction, currency, timestamp and unit identify a
  duplicate. Each contributing source remains attached. Stale values never fill
  a current source's missing actual/forecast.
- An event without an actual value is not labeled released merely because its
  scheduled time has passed. Source links and verification timestamps are exposed.
- Source caches last seven minutes and persist via the existing server-only
  `trader_cache` helper for 48 hours. Failed refresh copies remain explicitly stale.
  Analyst evidence excludes stale events. No schema migration is needed.
- Four-second official fetch deadlines and a 4.5-second per-source ceiling isolate
  slow providers. Same-source work is deduplicated; refresh has a 30-second minimum
  interval, and denied sources cool down for 30 minutes.
- Operations Center uses a persisted calendar measurement, rather than inferring
  calendar health from a provider's successful quote request. An unmeasured or
  expired measurement is shown as maintenance, not healthy.
- Arabic/French financial search aliases match official English titles. All three
  interface languages show source states.

## Analyst refresh repair

Explicit refresh reaches the quote, candle, Yahoo and remote-service caches.
Context loading starts alongside market data. A short candle series triggers
bounded existing history recovery. Cache transport alone does not make a recent
observation stale; eligibility still depends on its source timestamp and horizon.
A delayed source retains delayed eligibility and is not promoted to live.
A new history fetch must not make an older quote look current. Engine 6.1.1
invalidates previously computed cached analyses; insufficient evidence and stale
prices continue to block directional recommendations.

## Verification

`sfmEconomicCalendar.test.ts` covers official parsers, DST, missing/cancelled
records, partial failures, empty sources, durable stale fallback, deduplication,
refresh/cooldown, Arabic search and cache freshness boundaries. The existing
provider and Operations Center tests cover quote/history identity and the
separation between quote health and calendar health.

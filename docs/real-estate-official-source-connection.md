# Official property source connection — 2026-09-16

## Connected transport, not an approved valuation feed

The Qatar Ministry of Justice dataset `weekly-real-estates-sales-bulletin` is accessed through the official State of Qatar Open Data Explore v2.1 API:

- Metadata: https://www.data.gov.qa/api/explore/v2.1/catalog/datasets/weekly-real-estates-sales-bulletin
- Source: https://www.data.gov.qa/explore/dataset/weekly-real-estates-sales-bulletin/
- Published license verified on the actual response: https://creativecommons.org/licenses/by/4.0/
- Publisher in the reviewed English default metadata: `Ministry of Justice`.

Both real public probes ran on GitHub-hosted runners without application secrets, database access, provider credentials or user-owned properties:

1. https://github.com/elqallaf09/thesfm/actions/runs/35112075474 — public Qatar/Bahrain catalogue discovery.
2. https://github.com/elqallaf09/thesfm/actions/runs/35112607151 — exact Qatar field types, latest registration date, classifications and a bounded public transaction sample.

The second probe found 26,719 published records; the maximum **transaction registration date was 2025-12-31**, while the metadata/data-processing timestamp was in August 2026. These are different facts. The runtime reads observation dates dynamically; it never hard-codes the historical probe date as today's market date.

The inspected dataset also had contradictory bilingual classifications: rows with Arabic `أرض فضاء` had English `Two separate villas`. Other Arabic building categories mapped to the same English label. The connector must not choose one silently and value a user's land as a villa. The reviewed numeric field metadata does not explicitly declare currency; the implementation therefore keeps source-reported values separate and leaves currency unverified rather than assuming QAR, USD or the user's display currency.

## Implemented boundary

- Server-only, fixed HTTPS origin/dataset; no arbitrary fetch URL, no redirects and no authentication headers forwarded to the provider.
- 8-second transport timeout, bounded 1 MB JSON responses, expected schema/publisher/license checks, capped public-directory cache and bounded pagination.
- Public municipality/district choices come from the API rather than a hand-written list. Both geographic fields are checked again against the returned rows. Unknown geography does not broaden to a country-wide price sample.
- Only verified public geographic labels enter the provider query. User IDs, private parcel numbers, addresses, purchase prices and access tokens are not sent.
- A maximum 50-row context sample; explicit total/truncation, date validation, conservative transaction-ID deduplication, non-coercive numeric parsing and partial-share/inconsistent-share labeling.
- Original Arabic and English classifications, transaction dates, source record links, attribution and license remain visible.
- Authenticated, private/no-store directory and analysis endpoints with per-user process-local abuse limits and bounded input. This is not represented as a globally distributed quota service.
- Source context has its own type and `valuationEligible: false`; it is never appended to `ValuationEvidence`, never passed to the range engine and never persisted as a current valuation. Newer rows alone do not remove this review boundary.
- The form/source panel supports Arabic, English and French, with RTL and Latin digits. Location choices require selection, not guessing spellings.

The source is connected for inspection. **Current-property valuation remains unavailable** until classification reconciliation, explicit currency/units, recency/comparability rules and methodology validation are complete. The valuation-adapter registry intentionally remains distinct from this connected context source.

## Kuwait and other GCC sources

Kuwait MOJ's published terms, reviewed 2026-09-16, require prior written consent for content reuse unless explicitly stated otherwise. No permission, subscription, payment or data-reuse agreement was submitted/accepted on the owner's behalf. Do not ingest/re-publish its portal as a commercial price feed until permission or another licensed route is verified. Terms reference: https://www.moj.gov.kw/AR/pages/Footer03.aspx

The Bahrain catalogue discovery returned ownership-count datasets, not transaction price feeds; their license metadata was missing. These are not registered as valuation comparables. Other countries' abstract adapters are not claims of live connection.

## Validation boundary

Unconditional mocked tests cover schema/license drift, unsafe/oversized transport, private-field non-disclosure, geographic scoping, future/invalid/stale dates, partial shares, deduplication, truncation, currency non-assumption, API authentication/rate limiting, AR/EN/FR presentation and refusal to turn source context into a valuation.

A separate opt-in live contract test reads real public rows and executes the actual connector. It must retrieve records and prove they remain ineligible; absence/failure is not silently considered a successful valuation. The normal full CI, isolated database regression suite and Vercel deployment gates are still required. A source connection does not imply that this branch is merged, deployed, or that Production database migrations have completed.

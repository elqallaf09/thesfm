# Investments Intelligence 2.0

## Objective
Turn the Investments Center into an evidence-first intelligence layer for public and private assets without invented market values, confidence, or provenance.

## Asset architecture
Canonical families:
- STOCK
- ETF / FUND
- CRYPTO
- GOLD / SILVER / COMMODITY
- REAL_ESTATE / LAND
- PRIVATE_BUSINESS / PROJECT
- BOND
- OTHER

The existing Phase 6.4 schema remains the compatibility foundation. New specialist modules must extend it additively and must not destroy legacy position history.

## Evidence contract
Every computed valuation must preserve:
- source name and source URL when externally sourced
- evidence type
- observation/publication date
- retrieval timestamp
- geography and asset match quality
- value/currency/unit when supplied by the source
- whether the evidence is official, transaction-based, listing/asking, broker/research, model-derived, or user-entered
- explicit limitations

No source -> no externally claimed current value.
No comparable evidence -> return unavailable / insufficient evidence, never a fabricated estimate.

## Confidence contract
Confidence is evidence quality, not probability that a price is correct.
It must be derived from transparent factors such as source authority, recency, geographic match, asset/property match, sample depth and agreement between independent evidence.
The UI must expose why confidence is high/medium/low and must not show a fake precision percentage unless the scoring policy has a documented deterministic basis.

## Real Estate & Land Intelligence Analyst
### Input
- country
- governorate/state/region
- city/municipality/district
- property/land type
- purchase year/date
- purchase price and currency
- land area and unit
- built area when relevant
- optional parcel/address/location identifiers
- optional ownership documents and user notes

### Source priority
1. Government/open-data/justice/land-registry/municipality sources when publicly accessible.
2. Official statistical and transaction publications.
3. Regulated/established market datasets and research.
4. Broker/listing evidence clearly labelled as asking-price evidence, never transaction truth.
5. User-entered evidence, clearly labelled.

### Output
- current estimated value as a range, only when evidence supports a range
- value per area unit where meaningful
- purchase-to-current change
- evidence table with source/type/date
- confidence level plus reasons
- valuation date
- historical valuation snapshots
- missing-data warnings and limitations

### Valuation policy
- Prefer recent verified transactions over listings.
- Never treat asking prices as completed-sale prices.
- Normalize currency and area units before comparison.
- Weight comparable evidence by recency, geographic proximity and property similarity.
- Reject/flag obvious unit/currency/geography mismatches.
- If evidence is too sparse or stale, return insufficient evidence.
- Persist the evidence set used for every valuation snapshot so historical values remain auditable.

## Portfolio intelligence
Once specialist valuations are trustworthy, aggregate across assets for:
- Net Worth
- allocation/diversification
- concentration risk
- country/geographic exposure
- currency exposure
- liquidity profile
- valuation freshness
- evidence coverage

Portfolio summaries must distinguish known values from unavailable/stale values and must not silently count missing values as zero.

## Delivery sequence
1. Add specialist asset/evidence/valuation schema and deterministic contracts.
2. Implement Real Estate & Land input + evidence ingestion adapters.
3. Implement comparable normalization and evidence sufficiency rules.
4. Implement valuation range engine and snapshot history.
5. Build analyst UI with provenance/confidence/limitations.
6. Add public-market/crypto/metals/private-business specialists on the same evidence contract.
7. Add Net Worth and portfolio intelligence only after valuation freshness/coverage rules pass.

## Production gates
- RLS isolation for all user-owned asset/evidence/snapshot records.
- No service-role access from the browser.
- No fake/demo values in production paths.
- Source URLs validated and sanitized.
- Deterministic tests for currency/area normalization and evidence sufficiency.
- Regression tests proving stale/missing evidence cannot be presented as a fresh current valuation.
- AR/EN/FR strings and RTL validation.
- TypeScript, ESLint, unit/integration, production build and browser smoke must pass before merge.

# Real Estate Intelligence — Global Coverage Strategy

THE SFM Real Estate & Land Analyst is global by design. Turkey and Bosnia are pilot source-policy cases, not the product boundary.

## Coverage rule
A country/territory may be shown in the asset input before valuation support exists, but the UI must separately expose valuation readiness. We never label a country `VALUATION_READY` until permitted, machine-consumable evidence can support the methodology.

Readiness dimensions:
- `ASSET_INPUT`: user can record an owned property/land asset.
- `PARCEL_CONTEXT`: official cadastral/title/parcel context exists.
- `OFFICIAL_AGGREGATES`: official transaction/index/report evidence exists.
- `TRANSACTION_COMPARABLES`: permitted completed-sale comparable data exists at useful geography/property grain.
- `MARKET_COMPARABLES`: permitted asking/broker data exists and is explicitly labelled non-transaction evidence.
- `FX_READY`: verified currency conversion is available where required.
- `VALUATION_READY`: evidence sufficiency + legal/source policy + normalization requirements pass.

## Rollout tiers
### Tier 1 — GCC
Kuwait, Saudi Arabia, United Arab Emirates (Dubai and Abu Dhabi tracked separately where source systems differ), Qatar, Bahrain, Oman.

Verified examples as of Sep 2026:
- Saudi Arabia: REGA/MOJ real-estate indicators expose daily and historical sale transactions, including location, value, area and price-per-square-meter contexts.
- Dubai: Dubai Land Department publishes transaction/open-data datasets including transaction date/type, area, amount and size, with downloadable/API resources via Dubai Pulse subject to dataset terms.
- Abu Dhabi: ADREC publishes market transaction and price-index views with area/asset filters and export surfaces.
- Oman: Ministry of Housing and Urban Planning publishes monthly buy/sell real-estate transaction open datasets.
- Qatar: Ministry of Justice publishes open statistics for real-estate registration/documentation transactions; exact comparable-price granularity must be validated before valuation-ready status.
- Kuwait and Bahrain: source discovery/terms/granularity verification remain required before claiming transaction-comparable readiness.

### Tier 2 — Arab markets
Jordan, Egypt, Morocco, Tunisia, Algeria, Lebanon, Iraq, Palestine, Libya, Mauritania, Sudan, Syria, Yemen, Djibouti, Somalia and Comoros.

Each market receives an independent source dossier. Statistical indices/reports are not silently upgraded to parcel-level transaction comparables.

### Tier 3 — Europe
EU/EEA countries, United Kingdom, Switzerland, Balkans, Turkey, Eastern Europe and other European jurisdictions. Prefer national land registries, cadastres, official transaction-price registers and national statistical institutes. Respect database licensing and personal-data restrictions jurisdiction by jurisdiction.

### Tier 4 — Americas
United States and Canada require subnational adapters because deed/assessment/transaction systems vary by state/province/county. Latin America and the Caribbean require country/municipality-specific registries and statistical sources.

### Tier 5 — Asia-Pacific
Australia/New Zealand, Singapore, Hong Kong, Japan, South Korea, India, China, Southeast Asia and other APAC jurisdictions. Prefer official land/property transaction and statistical sources; separate restricted registry access from open market evidence.

### Tier 6 — Africa
Country-by-country land registry, deeds office, valuation roll and statistics coverage. Do not infer national coverage from one city or province.

## Source dossier required for every adapter
- jurisdiction and geographic scope
- official owner/publisher
- source URL and API/download endpoint when available
- evidence types actually supplied
- grain: parcel / transaction / district / city / region / national
- update frequency
- historical depth
- access/authentication requirements
- license/terms and commercial-use status
- personal-data restrictions
- stable identifiers and geography mapping
- currencies and area units
- known quality limitations
- adapter tests and last verification date

## Product behavior
Users may add an asset anywhere in the world. If THE SFM lacks sufficient permitted evidence, it stores the asset and purchase history but displays `SOURCE_COVERAGE_UNAVAILABLE` or `INSUFFICIENT_EVIDENCE`; it does not manufacture a current value.

Global Net Worth must show known, stale, and unavailable valuation coverage separately so unsupported assets never silently become zero.

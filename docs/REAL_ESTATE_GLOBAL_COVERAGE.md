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
- Qatar: Ministry of Justice public source is connected as review-only official context. It is not valuation evidence while recency, classification and currency issues remain unresolved.
- Kuwait: Ministry of Justice source terms reviewed by THE SFM require a permitted reuse path before commercial ingestion is enabled.
- Bahrain: source discovery/terms/granularity verification remain required before claiming transaction-comparable readiness.

### Tier 2 — Arab markets
Jordan, Egypt, Morocco, Tunisia, Algeria, Lebanon, Iraq, Palestine, Libya, Mauritania, Sudan, Syria, Yemen, Djibouti, Somalia and Comoros.

Each market receives an independent source dossier. Statistical indices/reports are not silently upgraded to parcel-level transaction comparables.

### Tier 3 — Europe
EU/EEA countries, United Kingdom, Switzerland, Balkans, Turkey, Eastern Europe and other European jurisdictions. Prefer national land registries, cadastres, official transaction-price registers and national statistical institutes. Respect database licensing and personal-data restrictions jurisdiction by jurisdiction.

#### United Kingdom / London — connected official context
- HM Land Registry Price Paid Data is connected for England and Wales as completed-sale price context. The initial London integration queries recent sales by HMLR district/town and preserves GBP price, transaction date, property type, estate type and official transaction link.
- Price Paid Data does not provide dependable floor/land area, so HMLR rows are not automatically promoted to price-per-m² valuation comparables.
- HMLR registration lag and Price Paid address-rights conditions remain visible product limitations.
- Scotland and Northern Ireland are explicitly excluded from this HMLR adapter and require separate national sources.
- From the August 2026 HMLR releases, transaction identifiers can be linked to UPRNs using a separately published lookup table. This is the preferred future deterministic join key for property-level enrichment.
- Detailed EPC property data can contain floor area and UPRNs, but access requires registration/acceptance of MHCLG data terms. THE SFM must not assume that licence on a user's behalf. Until an approved access path exists, EPC is not part of the production valuation chain.

London readiness today: `ASSET_INPUT` yes; `OFFICIAL_AGGREGATES` yes; completed-sale price context yes; deterministic property-area join under development; `VALUATION_READY` no.

### Tier 4 — Americas
United States and Canada require subnational adapters because deed/assessment/transaction systems vary by state/province/county. Latin America and the Caribbean require country/municipality-specific registries and statistical sources.

#### United States / New York City — connected official context
- NYC Department of Finance Citywide Rolling Calendar Sales is connected through NYC Open Data/Socrata.
- The source is updated monthly and includes borough, neighborhood, building class, block/lot, land/gross square feet, recorded sale price and sale date.
- THE SFM converts published square feet to m² for display only and keeps these rows outside valuation evidence until non-market transfers and building-class compatibility are deterministically filtered.
- The integration is deliberately scoped to New York City. It must never be presented as United States coverage.

NYC readiness today: `ASSET_INPUT` yes; `OFFICIAL_AGGREGATES` yes; transaction records + area context connected; market-transfer filtering/building-class mapping under development; `VALUATION_READY` no.

#### United States expansion sequence
1. New York City — active source integration and validation.
2. King County / Seattle — official sales/assessor sources identified; commercial-use and field-contract review required before connection.
3. Los Angeles County — locate and validate permitted assessor/recorder sale-price source; do not infer from listing portals.
4. Miami-Dade County — validate official property-appraiser/deed sale records and reuse terms.
5. Cook County / Chicago — validate official assessor/recorder sale dataset and identifiers.
6. Additional counties/states are added independently; one county can never mark a whole state or the US as valuation-ready.

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

# Real estate automatic valuation expansion — 2026-09-19

The production valuation registry was empty and the market center always sent `market_context`, so connected official records could never produce a valuation. The center now requests valuation when the appropriate area is entered; geography-only searches retain context mode.

## Connected evidence

- **NYC:** Department of Finance rolling sales, `usep-8jbt`. Exact borough + official neighborhood, most recent eligible sale per distinct parcel within 366 days, price >= USD 10,000, no easement, comparable area between 0.5 and 2 times the subject. HOUSE accepts one-family classes A0–A5/A9 and exactly one residential/total unit with no commercial units. LAND accepts residential vacant classes V0/V3 with zero gross floor area/units. Other classes stay unsupported. Subject BBL is excluded when supplied.
- **Chicago:** Cook County sales `wvhk-k5uv`, joined by 14-digit PIN and **sale year** to building characteristics `x54s-btds`. Exact five-digit assessor neighborhood (townships 70–77), county sale filters, single-sale/single-parcel requirement, class 202–209 plus explicit `Single-Family` use, exactly one building/card, full tieback proration, no commercial unit, comparable floor area. Missing/ambiguous joins are rejected. Single-card records may have card_proration_rate=0; the adapter relies on the explicit single-card flags and full PIN attribution, never sums card areas.
- Queries use fixed HTTPS endpoints, no redirects, 20-second timeouts, a 2 MB response cap, at most 200 recent sales, and bounded characteristic batches fetched concurrently. Cook buyer/seller names are not requested.

Sources:
- https://www.nyc.gov/site/finance/property/property-rolling-sales-data.page
- https://www.nyc.gov/assets/finance/jump/hlpbldgcode.html
- https://data.cityofnewyork.us/api/views/usep-8jbt.json
- https://datacatalog.cookcountyil.gov/api/views/wvhk-k5uv.json
- https://datacatalog.cookcountyil.gov/api/views/x54s-btds.json

These are screened recorded-sale comparisons, not appraiser-certified valuations. Official recording does not independently establish arm’s-length status, title or property condition. The county itself warns that non-market transfers and reporting lag can remain. No adjustment coefficients or invented prices are introduced.

## Method 2.2.0

Land and building floor area have separate inputs and evidence bases; no substitution is permitted. At least two dated, linked, distinct, strongly matched transactions remain mandatory. Two to four observations produce a **preliminary** LOW-confidence estimate using the complete observed range. Larger samples retain weighted quartiles and the weighted median. This is not a calibrated prediction interval.

When a verified account-currency FX quote is absent, a valid single-source-currency estimate is retained in its native currency and prominently labelled; the requested display currency is preserved separately. Raw prices are never relabelled or converted with guessed FX. Context records are still excluded from valuation and persistence.

The form explains missing borough/neighborhood/type/area requirements in Arabic, English and French. Coverage cards advertise conditional valuation only for the two implemented adapters. Qatar, England/Wales, Kuwait and other jurisdictions retain their documented source gaps; country selection does not imply automatic valuation coverage.

Snapshot saving continues to re-read the owned saved property and re-run trusted sources. This change does not add database columns or accept client evidence as authoritative. Saved properties lacking the precise geography required by these adapters cannot produce a persisted snapshot until those facts are available to the saved-property workflow.

## Verification

Live requests on 2026-09-19 returned 131 NYC sales for Brooklyn / MARINE PARK and 32 Chicago sales for assessor neighborhood 71030. With a 140 m² building area, the final engine accepted 126 and 31 comparisons respectively and returned USD ranges with MEDIUM evidence quality. Counts vary with the moving 366-day cutoff. Raw records remain outside Git.

Unit coverage includes invalid/stale/future dates, symbolic transfers, mismatched geography/classes/units/area, duplicate or subject parcels, wrong-year/multi-card/prorated Cook joins, separate floor/land area, sparse-sample ranges, native-currency fallback, unsupported jurisdictions and bounded provider errors. Existing smoke expectations now verify the requested removal of the Back to Global Markets link, retain sidebar navigation, and scope record assertions to visible record text rather than duplicate select options.

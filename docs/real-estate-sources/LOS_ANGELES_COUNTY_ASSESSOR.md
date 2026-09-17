# Los Angeles County Assessor — Recent Sales context

Status: `CONNECTED_CONTEXT` only. `VALUATION_READY=false`.

## Official owner and scope

- Publisher: Los Angeles County Assessor.
- Geographic scope: Los Angeles County, California, United States.
- Production integration requires a user-supplied 10-digit Assessor Identification Number (AIN). THE SFM does not send a user's street address to this adapter.
- Official ArcGIS layer: `PAIS/pais_sales_parcels/MapServer/0` (`Sales Parcels`).

## Reviewed machine-readable fields

The official Sales Parcels layer currently exposes the following fields relevant to this integration:

- `AIN`, `FORMATTED_AIN`
- `SALEDATE`, `FORMATTED_SALEDATE`
- `SALEPRICE`, `FORMATTED_SALEPRICE`
- `SIZE`, `FORMATTED_SIZE`
- `BEDROOMS`, `BATHROOMS`
- `YEARBUILT`, `EFFECTIVE_YEARBUILT`
- `USECODE`, `USETYPE`

THE SFM intentionally requests only identity/date/price/use fields. It does **not** map `SIZE` into land area or building area because the reviewed ArcGIS schema does not by itself establish the semantic meaning needed for valuation normalization.

## Official quality limitations

The Assessor's public mapping help states that:

1. recent-sales coloring represents sales activity in approximately the prior 24 months;
2. the website displays **unverified single-parcel sales**;
3. indicated sale prices can be derived from Documentary Transfer Tax (DTT), and the Assessor documents a systematic digit-copy convention used to identify those converted prices;
4. property-detail data is generally updated weekly, with a seasonal suspension around the annual roll/tax-extension process.

These limitations are material. A value returned by this adapter is official source context, not a verified arm's-length comparable and not a current market valuation.

## Product guardrails

- `valuationEligible` is permanently `false` for this adapter until a separate methodology change is reviewed and tested.
- Rows from this adapter never enter `ValuationEvidence`, price-per-area normalization, valuation snapshots, or the Low/Mid/High valuation engine.
- `SALEPRICE` may be displayed only as the Assessor's reported/indicated recent-sale value with the source limitations visible.
- `SIZE` is ignored for valuation.
- Missing/invalid AIN returns `INPUT_REQUIRED`; the adapter does not fall back to address search.
- Provider failures return `UNAVAILABLE`; there is no synthetic or third-party fallback price.
- The query is bounded, geometry is disabled, and only a minimal field list is requested.

## Future work before any valuation promotion

Promotion would require all of the following, independently reviewed:

- documented area semantics and reliable land/building-area selection;
- deterministic exclusion of non-arm's-length or otherwise non-comparable transfers;
- sale-verification treatment consistent with the Assessor's own warning;
- property-type and location comparability rules;
- freshness thresholds;
- confirmed reuse/access policy for the intended production use;
- automated regression tests proving these rules;
- explicit methodology/version update.

Until then, Los Angeles County remains `CONNECTED_CONTEXT` and `VALUATION_READY=false`.

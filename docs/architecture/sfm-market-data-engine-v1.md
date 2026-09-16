# THE SFM Market Data Engine v1

## Objective

THE SFM should own the market-data contract, validation, derived analytics and analyst output consumed by its products. User-facing applications must progressively stop depending on provider-specific response shapes.

This does **not** mean inventing exchange facts. Prices, volumes, filings and corporate events must still originate from lawful market, exchange, regulator, issuer or licensed-feed observations. THE SFM owns the ingestion, normalization, quality, provenance, derived analytics and distribution layers.

## v1 boundary

The first release adds a stable SFM-owned contract on top of the repository's existing upstream provider layer:

- `GET /api/sfm-market/v1/quote/:symbol`
- `GET /api/sfm-market/v1/analyze/:symbol`
- `src/lib/sfm-market/types.ts` — provider-independent public contract.
- `src/lib/sfm-market/quality.ts` — completeness/freshness quality gate.
- `src/lib/sfm-market/engine.ts` — quote normalization boundary plus deterministic technical analyst.

Current Yahoo/Finnhub/Twelve Data/EODHD/Marketstack observations are explicitly identified as `aggregator` provenance. v1 does not rename an aggregator into a primary source.

## Data contract rules

1. Missing values remain `null`; no fake `0`, confidence, target or replacement price.
2. Every quote exposes upstream provider, provider symbol, observation time, received time, delay/cached state and provider-attempt count.
3. The SFM quality gate distinguishes `complete`, `usable`, `partial`, `stale` and `unavailable` observations.
4. Technical calculations are deterministic and only appear when the required history exists.
5. Analyst summaries are evidence summaries, not autonomous trade execution and not a substitute for missing market facts.
6. Upstream provenance stays visible even when THE SFM is the analytical/distribution source.

## Migration path

### Phase A — owned contract (this PR)

Create the SFM API and analyst boundary without breaking existing market surfaces.

### Phase B — first-party consumers

Move Strongest Signals, quick symbol drawer and watchlist to `SFM Market Data Engine` responses. Provider-specific fields must not leak into those UIs.

### Phase C — primary-source adapters

Add direct source adapters where licensing and technical access permit it:

- exchanges / official market feeds;
- regulators and official filings;
- issuer investor-relations disclosures;
- licensed redistribution feeds where a direct exchange feed is unavailable.

Each adapter must declare source class, licensing/redistribution boundary, timestamp semantics, symbol mapping and failure mode.

### Phase D — SFM historical store

Persist canonical observations with source lineage, immutable observation timestamps and deduplication. Derived indicators are stored separately from raw facts.

### Phase E — external SFM Data API

Expose stable authenticated APIs/SDKs to external clients only after licensing, rate limits, billing, SLA/monitoring and redistribution rights are defined.

## Non-goals for v1

- Claiming that THE SFM originated an exchange price.
- Hiding provider provenance.
- Removing all upstream providers in one release.
- Generating recommendations or confidence when supporting evidence is incomplete.
- Redistributing licensed real-time exchange data without the required rights.

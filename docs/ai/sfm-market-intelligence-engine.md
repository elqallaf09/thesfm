# THE SFM Market Intelligence Engine

## Product identity

THE SFM Market Intelligence Engine is the analytical source for canonical market-intelligence results produced by THE SFM.

External market-data services are upstream data providers, not the author of THE SFM recommendation, confidence, risk, weighting, factor scores, or historical calibration.

## Provenance model

The UI must distinguish two concepts:

1. **Analytical source** — `THE SFM Market Intelligence Engine`.
2. **Market-data provider** — the verified upstream provider selected for the underlying quote, history, fundamentals, or other evidence.

The platform must never relabel an upstream market-data feed as first-party exchange data. Provider provenance remains stored and auditable even when the primary user-facing analytical source is THE SFM.

## Engine responsibilities

THE SFM owns and versions the deterministic layers that turn verified inputs into analysis:

- canonical symbol and asset resolution;
- factor normalization;
- technical, momentum, volatility, liquidity, risk and other supported factor calculations;
- asset/horizon weighting;
- confidence and conflict handling;
- recommendation policy;
- structured explanations and invalidation conditions;
- immutable analysis history;
- outcome evaluation and historical calibration.

## Data-fabric direction

The target architecture is:

`market feeds -> SFM data fabric -> canonical market snapshot -> factor engine -> risk/confidence engine -> recommendation engine -> outcome calibration`

Multiple upstream providers may be used for resilience and verification. A provider outage must degrade data availability explicitly rather than change the analytical identity of the product.

## Public presentation rule

User-facing analysis surfaces should show:

- Analytical source: THE SFM Market Intelligence Engine
- Engine version
- Weighting version
- Recommendation-policy version
- Market-data provider(s) separately under transparency/provenance
- Data freshness and provider-attempt information

This separation is a presentation rule only. Stored provider provenance remains unchanged and continues to identify the real upstream data source.

# SFM Market Historical Store v1

## Purpose

The historical store is THE SFM's append-only evidence ledger for market observations. It records the normalized fact plus its upstream lineage so SFM can build its own history without pretending to have originated exchange facts.

## Storage rules

- Raw market observations and derived analytics are separate concerns.
- Missing values stay null; they are never converted to zero for storage.
- Every row records observation time, receipt time, source class, upstream provider, provider symbol, cache/delay state, quality, and a deterministic evidence hash.
- Duplicate upstream observations are ignored by evidence hash rather than rewritten.
- Browser roles have no table privileges. The service role may only `SELECT` and `INSERT`; update, delete, and truncate are revoked.
- Aggregator-derived observations are `internal_only`.
- Direct exchange, regulator, issuer, or licensed-feed data is still `rights_review_required` until redistribution rights are explicitly recorded. Source quality never implies redistribution permission.

## Collection

`GET /api/sfm-market/v1/ingest` is a Vercel Cron-only entry point. It runs at minute 5 of each hour and collects the current SFM ingest universe through `getSfmMarketQuote`, which inherits the v1 rule that Yahoo is excluded.

`POST /api/sfm-market/v1/ingest` is available to an authenticated administrator (or the cron secret) for an explicit bounded symbol list. Runs are capped and use bounded concurrency.

## Next steps

1. Expand primary/direct adapters for exchanges and official issuer/regulator sources where lawful access exists.
2. Add a derived-snapshot table keyed to immutable observations.
3. Add retention, reconciliation, gap detection, and source-health jobs.
4. Expose external history only after each source has an explicit redistribution policy and the API has authentication, rate limits, billing, and SLA controls.

# SFM Canonical Market Observation Store v1

## Why it exists

THE SFM cannot become a dependable data platform if every product request fans out to an upstream provider and forgets the result. The canonical store gives the platform its own normalized, auditable observation history while preserving where each fact originated.

## Ownership boundary

THE SFM owns:

- the canonical schema;
- symbol normalization;
- quality/freshness validation;
- observation fingerprints and deduplication;
- lineage and timestamps;
- derived analytics stored separately from raw market facts;
- distribution policy enforced by THE SFM APIs.

THE SFM does **not** claim to originate an exchange price that came from another source.

## Persistence rules

`public.sfm_market_observations` is append-only from the application perspective:

- service role receives `SELECT` and `INSERT` only;
- browser `anon` and `authenticated` roles receive no direct table privileges;
- RLS is enabled;
- observations are deduplicated by a deterministic SHA-256 fingerprint;
- raw/opaque provider response bodies are not persisted;
- normalized facts remain nullable when the source did not provide them;
- prices cannot be zero/negative and volume cannot be negative.

## Redistribution rule

Every row carries one of two scopes:

- `internal_only` — default for all observations;
- `external_allowed` — may be selected only after THE SFM has independently verified the relevant source licence/redistribution rights.

A source being official, public, or technically reachable does not automatically make redistribution lawful.

## Ingestion

`src/lib/sfm-market/ingestion.ts` provides a bounded server-only ingestion service. It:

1. requests a force-fresh quote through `SFM Market Data Engine`;
2. preserves upstream provenance and SFM quality state;
3. writes the normalized observation only when persistence is enabled;
4. defaults redistribution to `internal_only`;
5. reports unavailable/skipped/failed symbols without manufacturing replacement data.

The service deliberately does not expose a browser-triggered ingestion endpoint and does not schedule itself. Source-specific workers/cron jobs should be added only after the relevant symbol universe, entitlement and source licence are configured.

## Activation

The store is opt-in through the server-only environment flag:

`SFM_MARKET_STORE_ENABLED=true`

Do not enable the flag in Production until the migration is deployed and the intended upstream usage/storage rights have been reviewed.

## Next step

After sufficient canonical observations exist, add a read service that prefers SFM-owned recent observations and falls back to a fresh lawful source only when freshness requirements are not met. External APIs must return only observations whose `distribution_scope` is `external_allowed`.

# Intelligence operations and failure modes

## Endpoints

### `POST /api/intelligence/analyze`

Accepts a validated canonical asset request, horizon, locale, requested modules, source, and optional force refresh. User identity is always derived from the server session, never from the body.

The endpoint returns a canonical `AnalysisResult`. It never returns raw provider payloads, secrets, or exception details.

### `GET /api/intelligence/latest`

Returns the latest allowed shared analysis without generating provider traffic. Phase 6.1 does not expose private history through this endpoint.

Both responses are `private, no-store`, include `X-Correlation-ID`, and use safe structured error codes.

## Rate and latency controls

| Operation | Anonymous | Authenticated |
| --- | ---: | ---: |
| Analyze | 8/minute/IP | 30/minute/user |
| Force refresh | Denied | 6/minute/user |
| Latest | 60/minute/IP | 120/minute/user |

The provider call timeout is 20 seconds and the route maximum duration is 30 seconds. Client code uses a 28-second request timeout. Provider attempts are sequential and bounded; client input cannot trigger arbitrary provider fan-out.

The current limiter is the repository’s process-local abuse guard. Distributed rate enforcement is recommended before a material traffic increase.

## Freshness policy

Base TTLs are:

| Horizon | Base TTL |
| --- | ---: |
| Intraday | 90 seconds |
| Short term | 300 seconds |
| Swing | 900 seconds |
| Position | 3600 seconds |
| Long term | 21600 seconds |

Multipliers are stock/index/commodity `1.0`, crypto `0.65`, forex `0.75`, and fund `2.0`. A closed market can multiply TTL by `4`; a provider-declared update interval can raise the minimum TTL.

Data is fresh through the TTL, delayed through 3 times the TTL, then stale. Cached provider data is at least delayed. Failed live refresh reuse is always forced to stale.

## Failure matrix

| Condition | Result |
| --- | --- |
| Invalid canonical asset | Safe `INVALID_ASSET`; no provider call |
| Unsupported asset | Safe `UNSUPPORTED_ASSET` |
| One provider fails | Failure recorded; next supported provider attempted |
| All providers fail, no history | Persisted/returned `INSUFFICIENT_DATA` with unavailable factors |
| All providers fail, prior shared history | Stale result, confidence recalculated, critical warning |
| Optional factor unsupported | Partial result; factor marked unavailable with reason |
| Persistence unavailable | Analysis still returns; safe code-only server warning |
| Observability unavailable | Analysis still returns; no sensitive fallback logging |
| LLM unavailable | Deterministic result remains fully functional |

## Observability

Events use the Phase 5.0D schema and correlation ID. Implemented names include:

- `intelligence_analysis_requested`
- `intelligence_cache_hit`
- `intelligence_cache_miss`
- `intelligence_request_deduplicated`
- `intelligence_provider_called`
- `intelligence_provider_failed`
- `intelligence_provider_fallback_used`
- `intelligence_factor_unavailable`
- `intelligence_confidence_calculated`
- `intelligence_recommendation_generated`
- `intelligence_insufficient_data_result`
- `intelligence_analysis_persisted`
- `intelligence_api_latency`
- `intelligence_end_to_end_latency`

Never log keys, tokens, passwords, raw prompts, raw provider responses, detailed personal finance data, or raw exception messages. Provider failure logging is limited to safe code classifications.

## Database rollout

Migration: `20260718215822_create_intelligence_analyses.sql`

Preview procedure:

1. Verify the linked project is the isolated Preview project.
2. Run migration listing and dry-run/diff checks supported by the environment.
3. Apply only to Preview.
4. Verify constraints and indexes.
5. Test anonymous denial, authenticated shared read, own-private read, cross-user denial, and denied authenticated insert.
6. Run API persistence, latest-read, and stale-refresh smoke checks.
7. Record results in the Phase 6.1 report.

Do not edit applied migration history. Do not apply the migration to Production without explicit approval.

Operational rollback requires rolling back the application first, exporting any audit history that must be retained, then dropping only the new table. Existing schemas are not altered.

## Security checklist

- Provider credentials remain in server-only environment variables.
- Body validation rejects user IDs, provider preferences, unknown fields, URLs, and unsupported asset types.
- Body size is limited to 16 KiB.
- Force refresh requires an authenticated server session.
- Shared cache reads never include private rows.
- Anonymous clients have no direct table grant.
- RLS forces owner matching through `auth.uid()` for private rows.
- Client roles cannot insert history.
- Service-role credentials are never imported into a client component.
- Error responses contain only code, message key, retryability, validation paths/codes, and correlation ID.

## Retention and cleanup

Phase 6.1 does not add an automatic deletion job because analysis history is required for reproducibility and material-change comparison. Before volume grows, define approved retention windows by shared/private scope, export requirements, and an observable bounded cleanup job. Any cleanup must emit count/duration events and must not mutate retained rows.

## Known operational limits

- In-flight deduplication and abuse rate limits are process-local.
- The aggregate market adapter is the only intelligence provider in this phase.
- Sentiment, news-factor, and macro-factor providers are not connected to the orchestrator and are reported unavailable.
- No historical model-accuracy score is claimed.
- No background revalidation job is added; stale detection and foreground refresh are implemented.

# Production observability operations

## Configuration

Telemetry is disabled unless `NEXT_PUBLIC_OBSERVABILITY_ENABLED=true`. It is always disabled in the test runtime and is excluded from local development by the deployment procedure. Sampling values are decimal rates from 0 through 1; invalid values fall back to the documented defaults.

The legacy product-usage analytics path is separately controlled by `NEXT_PUBLIC_PRODUCT_ANALYTICS_ENABLED` and defaults to `false`; it must follow the applicable consent decision. Operational reliability collection does not enable that product analytics path.

| Variable | Default | Scope |
| --- | ---: | --- |
| `NEXT_PUBLIC_OBSERVABILITY_ENABLED` | `false` | Explicit collection switch |
| `NEXT_PUBLIC_RUM_SAMPLE_RATE` | `1` | Core Web Vitals and client reliability |
| `NEXT_PUBLIC_ROUTE_SAMPLE_RATE` | `0.15` | Route transitions |
| `NEXT_PUBLIC_LONG_TASK_SAMPLE_RATE` | `0.10` | Aggregated long tasks |
| `NEXT_PUBLIC_MEMORY_SAMPLE_RATE` | `0.02` | Infrequent supported-browser memory trends |
| `NEXT_PUBLIC_API_SUCCESS_SAMPLE_RATE` | `0.05` | Successful internal API calls; failures remain 100% |
| `OBSERVABILITY_PROVIDER_SUCCESS_SAMPLE_RATE` | `0.05` | Successful provider calls; failures remain 100% |
| `OBSERVABILITY_RETENTION_DAYS` | `14` | Raw events, bounded to 7–30 days |
| `OBSERVABILITY_ROLLUP_RETENTION_DAYS` | `180` | Rollups, bounded to 30–365 days |
| `OBSERVABILITY_ALERT_RETENTION_DAYS` | `90` | Alert history, bounded to 30–180 days |
| `OBSERVABILITY_ALERTS_ENABLED` | `false` | Aggregate alert evaluation |

No client ingestion secret is used: a browser-visible secret would not be secret. The ingestion boundary instead enforces same-origin requests, JSON content type, a 64 KiB body limit, a 20-event strict schema, secret rejection, server-owned deployment attribution, and an ephemeral hashed rate-limit key. `CRON_SECRET` protects the hourly maintenance endpoint and is never placed in a URL or public variable.

The rate limiter is intentionally in-memory and bounded per runtime instance; it is a load-shedding control, not a globally consistent quota. Origin validation, strict schemas, small batches, and database grants remain the primary controls. A shared counter should be considered only if measured abuse demonstrates the need.

## Cost, residency, and lock-in

This phase adds no vendor or subscription. It uses the existing Vercel deployment/runtime logs and the existing Supabase project. Operational rows remain in the currently configured Supabase `ap-south-1` project. Storage and query usage count against that existing project; sampling and retention bound incremental usage. Tables use ordinary PostgreSQL types and SQL functions, so migration to another PostgreSQL service is straightforward. Vercel-specific deployment environment and SHA values are attribution inputs, not a storage dependency.

## Maintenance and alerts

Vercel calls `/api/observability/maintenance` at minute 17 each hour. The endpoint:

1. refreshes hourly and daily aggregate rows;
2. removes expired raw, rollup, and alert data;
3. evaluates alerts when explicitly enabled;
4. records alert state and writes a structured runtime log.

Initial alert thresholds require meaningful volume: Web Vital p75 alerts need 50 samples, API 5xx alerts need 100, provider failure/fallback alerts need 50 per provider, and identical hydration/chunk-load signatures need five occurrences. The cooldown is one hour. No email, Slack, PagerDuty, or paid delivery system is enabled. A delivery integration can be approved later after normal-volume alert quality is proven.

“No telemetry” route alerts are deliberately deferred until a normal per-route traffic baseline exists; enabling them without that evidence would turn low traffic into false incidents. The existing `/api/health` deployment check remains the immediate availability signal during rollout.

## Dashboard interpretation

The admin-only `/sfm-admin-control/observability` page uses the existing `admin_dashboard` permission. P75/P95 values display as unavailable below 20 samples. Hydration and meaningful-content-ready values are explicitly labelled proxy metrics. Memory growth is a trend signal only and is never presented as proof of a leak. Preview and Production are separate filters.

## Staged rollout checklist

- Apply the migration and verify RLS/grants before enabling collection.
- Enable Preview, submit a synthetic non-sensitive event, and inspect the stored columns.
- Verify unknown fields, tokens, raw URLs, queries, and oversized batches are rejected.
- Check admin permitted/denied behavior in Arabic, English, French, Light, Dark, desktop, and mobile.
- Compare the production build output and browser main-thread/request overhead with the Phase 5.0A baseline.
- Enable Production with the default low non-vital sampling rates; keep alerts disabled.
- Observe ingestion, errors, and runtime logs for two to four hours.
- Enable alert evaluation only after baseline volumes are known.
- Prepare a 24–48-hour report with measured sample counts. If volume is insufficient, state that without publishing percentiles as representative.

## Incident controls

Set `NEXT_PUBLIC_OBSERVABILITY_ENABLED=false` and redeploy to stop new browser collection. The ingestion endpoint then returns `204`. Existing retention continues through maintenance. A failed ingestion never retries in a loop: the in-memory client queue is capped at 40 events, drops entries after five minutes, and flushes once after reconnect. Telemetry failures never block rendering or navigation.

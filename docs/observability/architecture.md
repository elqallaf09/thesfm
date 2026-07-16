# Phase 5.0B observability architecture

## Decision

The SFM extends its existing first-party Supabase, Vercel runtime-log, provider reliability, and admin authorization architecture. It uses Next.js `useReportWebVitals` for browser metrics and a strict `/api/observability` ingestion endpoint. No paid vendor, session replay, fingerprinting, or second general-purpose analytics stack is introduced.

Vercel Web Analytics and Speed Insights were not installed at audit time. Adding them as a competing store would not cover the provider and API classifications already present in The SFM, and would fragment retention and access control. The first-party store is therefore the smallest coherent option.

## Privacy boundary

Allowed fields are fixed in `src/lib/observability/core.ts`. They include metric name/value/rating, normalized route template, coarse locale/theme/viewport/device/browser/network classifications, a session-only random identifier, authenticated boolean, deployment/build/environment, timestamp, and event-specific operational classifications.

The ingestion schema rejects unknown fields and secret-like keys or values. It never accepts request bodies, financial values, raw record or account IDs, user-entered content, names, email addresses, phone numbers, tokens, cookies, authorization headers, full IP addresses, geolocation, full URLs, query parameters, or raw stack traces. The anonymous identifier lives in `sessionStorage`, is random, is not shared across devices, and expires when the browsing session ends.

Operational telemetry is treated as strictly necessary reliability data. It is enabled only when explicitly configured and is disabled in automated tests and local development by default. Optional product and marketing analytics remain separate concerns. Legal applicability and consent assumptions must be reviewed for each deployment jurisdiction before increasing sampling.

## Storage and access

Raw events are append-only and writable only with the Supabase service role. Browser roles have no direct read or write grants. The admin API and page reuse the existing `admin_dashboard` permission. Preview, Production, and development records are kept separate by an immutable server-attributed environment and deployment SHA.

- Raw events: 14 days by default.
- Hourly/daily rollups: 180 days.
- Alert occurrences and error/provider fingerprints: 90 days.
- Release summaries: retained only when deliberately promoted from aggregate data.

A scheduled maintenance endpoint produces rollups and deletes expired rows. Percentiles are labelled unavailable below the configured minimum sample count; every percentile is displayed with its sample count.

## Default sampling

| Signal | Default |
| --- | ---: |
| Core Web Vitals | 100% |
| Runtime errors and failed API calls | 100% |
| Provider failures | 100% |
| Route transitions | 15% |
| Long-task aggregates | 10% |
| Memory trend samples | 2% |
| Successful API timings | 5% |

All rates are bounded to 0–1 and configurable with documented environment variables. Long tasks are aggregated before transmission. Memory is feature-detected and sampled infrequently; an unsupported state is reported without implying a leak.

## Alert model

Alerts require a minimum sample count and a cooldown. Initial thresholds are LCP p75 above 4,000 ms, INP p75 above 500 ms, CLS p75 above 0.25, API 5xx rate above 5%, provider failure rate above 20%, fallback rate above 25%, or five repeated hydration/chunk-load signatures. Alert records and structured Vercel logs are produced; no paid delivery channel is enabled without approval.

## Rollout

1. Validate schemas, sanitization, authorization, and overhead locally.
2. Enable Preview and inspect stored payloads.
3. Enable Production at the documented low non-vital sampling rates.
4. Verify ingestion, privacy, retention, and alert silence for two to four hours.
5. Review 24–48 hours of real traffic before making any trend claim. Low sample volume is reported as low volume, never extrapolated.

## Measurement limitations

Browser APIs do not expose an exact React hydration interval, the identity/timing of the “largest client island,” or the Next.js router-cache decision. The implementation therefore reports shell/route-controls/meaningful-content timings only as named proxy metrics. It does not infer a cache hit from a fast duration and does not claim a hydration duration or memory leak. A route can provide an explicit safe cache classification in a future change if its data source exposes one without record identifiers.

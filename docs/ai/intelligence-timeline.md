# Intelligence timeline

## Purpose

The intelligence timeline is an immutable, asset-and-horizon-specific history of allowed intelligence analyses. It lets a user see what the system recorded at the time, how the structured inputs changed, and—only when a completed evaluation exists—what happened under the documented outcome methodology.

It is not a trade ledger, price chart substitute, model leaderboard, or performance promise. A later analysis never mutates an earlier timeline entry.

## Timeline record

Each compact timeline item contains only canonical, safe data:

- analysis ID and generated/data-as-of timestamps;
- canonical asset identity, asset type, exchange, market, quote currency, and horizon;
- recommendation, analysis confidence, risk, freshness, structured warnings, selected provider/provenance summary, and engine/rules/weighting versions;
- deterministic drift from the allowed preceding analysis, including confidence delta, factor/availability deltas, transitions, and material reason codes;
- the immutable outcome when present, including its evaluation status and directional classification.

Raw provider payloads, provider URLs, credentials, raw prompts, personal finance data, and unbounded candle series never belong in a timeline response.

## Read contract and authorization

The Phase 6.2A read surface is designed around bounded server-side requests:

- `GET /api/intelligence/timeline` filters by a validated canonical asset, asset type, horizon, bounded date range, and pagination cursor/limit;
- `GET /api/intelligence/outcomes/latest` returns the most recent allowed outcome without triggering an evaluation;
- an optional comparison accepts exactly two allowed analysis IDs and returns their deterministic structured drift.

The server derives user identity from the authenticated session. It never accepts a client-supplied user ID, price, provider URL, or arbitrary analysis scope.

Shared analyses are readable as intentional shared market history. Private analyses and their outcomes are readable only by their owner. The outcome row is authorised through its parent analysis, so a user cannot gain access by guessing an outcome or analysis UUID. Direct client writes are not granted; only the server service role can create or transition an outcome record.

The immutable `intelligence_analysis_outcomes` table is protected by forced RLS. Authenticated users have a read policy only when the parent analysis is shared or is private and owned by `auth.uid()`. Anonymous roles receive no table grant. Database uniqueness, append-only transition rules, and RLS are complementary safeguards; neither replaces API authorization.

## Ordering, comparison, and material change

Timeline membership is defined by canonical asset identity and horizon within the caller's permitted scope. Rows are paginated and date ranges are bounded to prevent unbounded history scans. The comparison path must authorize both records independently and reject a pair that does not share a valid comparison context rather than leaking either record.

The timeline does not trust the compact `previousAnalysis` display summary as a complete explanation. It recomputes deterministic drift from the retained immutable snapshots, preserving factor changes, coverage, freshness, conflicts, provider changes, and methodology changes. See [confidence-drift.md](confidence-drift.md) for the reason-code rules.

## Outcome presentation

An outcome badge reflects the stored evaluation state:

| State | Required presentation |
| --- | --- |
| `PENDING` | Evaluation window or retry is still pending; do not display accuracy. |
| `EVALUATED` | Show the directional classification only with its methodology/context. |
| `INSUFFICIENT_DATA` | Explain that verified data was unavailable; do not replace it with a current price. |
| `INVALIDATED` | Explain that the analysis could not be evaluated under the method. |
| `FAILED` | Show a safe failure state; do not expose internal exception details. |

`WAIT` and original `INSUFFICIENT_DATA` recommendations use `NOT_APPLICABLE` rather than a pass/fail badge. Timeline detail must preserve that distinction and link it to the outcome methodology.

The Smart Market Analysis integration is intentionally compact: timestamp, recommendation, confidence and delta, risk, primary change reason, and outcome state are visible first. Factor deltas, limitations, provenance, warnings, version changes, and the two-analysis comparison are disclosed on demand. This protects the existing workspace layout while allowing keyboard navigation, screen-reader labels, Arabic RTL, English/French LTR, English digits, responsive layout, and light/dark semantic tokens.

## Operational model

Outcome evaluation is server-only and scheduled in bounded batches. A run finds analyses whose versioned windows have completed, confirms or creates the one pending record, requests allow-listed historical data, applies the policy, and persists one terminal result. It is safe to retry: the unique `analysis_id` constraint and controlled pending-to-terminal transition prevent duplicate final outcomes.

The scheduled route must use the existing cron-secret authorization pattern and must not accept arbitrary analysis IDs or prices from a browser. It records safe telemetry for eligibility, provider-history requests, successful or unavailable evaluation, duplicate prevention, persistence, and latency. Provider failure is visible as a retryable unavailable condition; it is never silently converted into an evaluated result.

No automatic retention cleanup is introduced by this foundation. Any future retention policy must preserve reproducibility, be scope-aware, use a bounded observable job, and never rewrite retained history.

## Limits and future boundary

The timeline can show observations and descriptive calibration inputs, but it does not feed historical accuracy into live confidence weights. It does not compare AI models, execute trades, infer a benchmark, convert currency without verified FX data, or fill unsupported price history. Those capabilities require separately versioned methods and review.

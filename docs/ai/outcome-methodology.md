# Intelligence outcome methodology

Methodology version: `outcome-evaluation-v1`
Calibration-report version: `confidence-calibration-foundation-v1`

## Purpose and boundary

Phase 6.2A records what happened after a completed intelligence analysis window. It creates an auditable historical observation; it does not predict a return, validate a trade, or change a live recommendation.

Every outcome preserves the original analysis recommendation, confidence and confidence quality, canonical asset identity, horizon, engine version, rules version, weighting version, evaluation configuration, and safe price-provider provenance. A later methodology change creates new records under a new version; it does not rewrite an existing analysis or outcome.

Historical outcomes are descriptive only in this phase. They do not alter the live confidence engine, factor weights, thresholds, or recommendation policy.

## Evaluation lifecycle

| Status | Meaning |
| --- | --- |
| `PENDING` | The analysis has an evaluation record but its window is not complete, or evaluation is awaiting a safe retry. |
| `EVALUATED` | A complete, accepted price series supported the defined measurement. This does not imply that the recommendation was correct. |
| `INSUFFICIENT_DATA` | Required verified prices, timestamps, currency context, or candle coverage were unavailable. No value is invented or carried forward. |
| `INVALIDATED` | The original analysis cannot be evaluated under this methodology, for example because the original result was itself `INSUFFICIENT_DATA` or a non-recoverable integrity rule fails. |
| `FAILED` | A non-recoverable evaluator failure was recorded safely. Transient provider failures remain retryable rather than being presented as an outcome. |

An analysis has at most one outcome record. A record starts as `PENDING` and may make one controlled transition to a terminal status. Terminal records are immutable. The database enforces the one-to-one analysis relationship and protects the original provenance fields from update.

## Evaluation reference and horizon windows

The window starts at the analysis `dataAsOf` timestamp only when it is valid and no more than five minutes after `generatedAt`. Otherwise it starts at `generatedAt`. This prevents an implausible provider timestamp from silently moving the measurement window.

`eligibleAt` equals the configured end of the window. The evaluator must not classify an analysis before that instant.

| Horizon | Duration | Candle interval | History request period | Entry tolerance | Final tolerance |
| --- | ---: | --- | --- | ---: | ---: |
| `INTRADAY` | 4 hours | 5 minutes | 5 days | 1 hour | 3 days |
| `SHORT_TERM` | 7 days | 1 day | 3 months | 3 days | 7 days |
| `SWING` | 30 days | 1 day | 6 months | 3 days | 10 days |
| `POSITION` | 90 days | 1 day | 1 year | 5 days | 14 days |
| `LONG_TERM` | 365 days | 1 day | 2 years | 7 days | 21 days |

These are methodology values, not assertions that an exchange is open at a particular calendar time. For each boundary, the evaluator selects the earliest accepted provider candle at or after the boundary and within its tolerance. It never backfills with a candle before the boundary. A weekend, holiday, market closure, suspension, delisting, or provider gap is therefore visible as missing coverage rather than hidden by an assumed price.

If no suitable entry or final candle exists, the result is `INSUFFICIENT_DATA`. The evaluator never substitutes a current quote, a client-provided price, a synthetic close, or a price from an unlabelled legacy fallback.

## Accepted price evidence

Outcome evaluation uses an allow-listed, server-only historical-price provider contract. An accepted response must identify its provider and provider symbol, quote currency when known, receipt time, data-as-of time, delivery state, safe attempt metadata, and normalized positive finite price points. Raw provider payloads, credentials, and URLs are neither persisted nor returned.

The first adapter requests the named historical series directly rather than using the generic UI candle fallback. Cached and delayed delivery are retained as provenance and warnings; they are not relabelled as live. The evaluator rejects or records unavailable data whenever freshness, coverage, or currency requirements cannot be demonstrated.

Currency is part of the measurement. Entry and final prices must use the same accepted currency and must be compatible with the analysis quote currency. Phase 6.2A performs no implicit currency conversion. Without verified FX evidence and a documented method, a cross-currency result remains unavailable.

For daily series, adjusted close is used only when the provider supplies it for every accepted point. This is necessary to avoid silently treating a split or comparable corporate action as investment performance. When adjusted closes differ from raw OHLC values, intrawindow high/low excursions are not comparable and MFE/MAE remain unavailable. If adjustment support or corporate-action context is insufficient for the selected asset and window, the evaluator records that limitation instead of manufacturing an adjusted series.

## Directional measurement

For a directional recommendation, the signed return is measured in the recommendation direction:

```text
BUY  = (final reference price - entry reference price) / entry reference price * 100
SELL = (entry reference price - final reference price) / entry reference price * 100
```

The return is rounded only for storage/display after calculation. It is not a promised, realized portfolio return and excludes fees, spreads, taxes, execution quality, position sizing, leverage, dividends, funding, and unsupported corporate-action effects.

The classification uses an asset-specific neutral band so small moves are not forced into correct or incorrect:

| Asset type | Neutral band |
| --- | ---: |
| Stock | 0.50% |
| Crypto | 1.50% |
| Forex | 0.25% |
| Index | 0.35% |
| Commodity | 0.75% |
| Fund | 0.40% |

Within the inclusive neutral band, the outcome is `NEUTRAL`. A positive signed return outside the band is `CORRECT`; a negative signed return outside it is `INCORRECT`.

`WAIT` is deliberately not scored as a directional success or failure. When its window has complete accepted evidence, it is stored as `EVALUATED` with `NOT_APPLICABLE`; directional return, MFE, and MAE are unavailable and it is excluded from directional-accuracy calculations. The same `NOT_APPLICABLE` handling applies to an original `INSUFFICIENT_DATA` recommendation. This conservative rule avoids rewarding inactivity merely because a market moved little or penalising it because a market moved.

## Excursion and benchmark fields

For a `BUY` or `SELL` recommendation with a complete compatible high/low series between the accepted entry and final references:

- maximum favourable excursion (MFE) is non-negative;
- maximum adverse excursion (MAE) is non-positive;
- both are measured against the accepted entry price and in recommendation direction.

If one required high or low is absent, or adjustment semantics make the values incomparable, both values are unavailable. The system does not infer intraday highs/lows from closes.

`benchmarkReturn` remains null until a verified benchmark identity, matching currency, time alignment, and versioned calculation method are implemented. It is never guessed from an index name or a provider narrative.

## Calibration reporting boundary

Outcome reports group evaluated observations by confidence bucket, asset type, horizon, and recommendation. Directional accuracy includes only `CORRECT` and `INCORRECT` results. `NEUTRAL`, `NOT_APPLICABLE`, pending, unavailable, invalidated, and failed observations are counted transparently but do not inflate a directional rate.

The minimum directional sample is **30** per reported group. Below that threshold, accuracy, mean confidence, and descriptive calibration gap are null and the interface must show an insufficient-sample state rather than a percentage. At or above the threshold, the calibration gap is only:

```text
mean original confidence - observed directional accuracy
```

It is a descriptive diagnostic, not a probability estimate, causal finding, or instruction to change live weighting. Any future calibration feedback requires a separately reviewed and versioned phase.

## Reproduction and limitations

To reproduce a stored outcome, load the immutable analysis snapshot and outcome record, use the recorded methodology/configuration versions and provider attempt metadata, then apply the same boundary selection and classification rules. Do not use a later quote, a later engine version, or a later provider response as a substitute.

Current limitations include provider coverage, exchange calendars, holidays, suspensions, delistings, corporate actions, benchmark support, and verified FX conversion. These limitations are preserved as structured warnings or unavailable fields; they are not hidden behind estimated prices or accuracy claims.

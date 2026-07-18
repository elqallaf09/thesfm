# Deterministic recommendation policy

Policy version: `recommendation-policy-v1`

## Principles

- Directional output requires minimum evidence and a usable risk factor.
- Strongly conflicting evidence produces `WAIT`.
- Very high risk prevents directional output.
- A directional score alone is insufficient; confidence must clear its configured threshold.
- `INSUFFICIENT_DATA` is a valid result, not an error to hide.
- Price targets, entry prices, and stop-losses remain unavailable in Phase 6.1.
- Recommendations are analysis readings, not trade instructions or promises of return.

## Decision order

The first matching rule wins:

1. If minimum evidence fails, confidence quality is insufficient, or risk evidence is unavailable: `INSUFFICIENT_DATA`.
2. If strong signals conflict: `WAIT`.
3. If risk is `VERY_HIGH`: `WAIT`.
4. If confidence is below the directional threshold: `WAIT`.
5. If composite score is at or above the buy threshold and risk is not `HIGH`: `BUY`.
6. If composite score is at or below the sell threshold: `SELL`.
7. If a buy score is reached but risk is `HIGH`: `WAIT`.
8. Otherwise: `WAIT`.

This order ensures risk and evidence gates cannot be bypassed by a large score.

## Thresholds

Base thresholds are `+28` for buy and `-28` for sell. Adjustments are applied symmetrically:

| Context | Absolute threshold adjustment |
| --- | ---: |
| Crypto | `+6` |
| Forex or commodity | `+3` |
| Intraday | `+3` |
| Long term | `-2` |

The minimum directional confidence is `60` for crypto and `55` for other asset classes. Thresholds and applied factor weights are returned in `recommendationDecision` for traceability.

## Risk classification

Risk is derived from the canonical risk factor plus verified volatility and liquidity warnings:

- risk score at or below `-80`, or at/below `-60` with excessive volatility: `VERY_HIGH`;
- risk score at or below `-50`, or any excessive-volatility warning: `HIGH`;
- risk score at or below `-15`, or weak liquidity: `MEDIUM`;
- otherwise: `LOW`;
- missing risk evidence: `UNAVAILABLE`.

## Material factors and explanation

The policy records up to four directional factors with the largest absolute weighted contribution. Structured explanation separates factors aligned with the result from factors opposing it. It also records:

- recommendation reason code;
- confidence penalty reason codes;
- data limitations and stale factors;
- important risk codes;
- factor-reversal, staleness, risk-escalation, and provider-degradation invalidation conditions;
- previous shared recommendation and a material-change reason when available.

Localized UI copy is rendered from this structure. An optional LLM summary cannot change it.

## Price levels

`entryContext`, `targets`, and `stopLossContext` intentionally return unavailable values. They may be enabled only after the relevant asset class has:

- verified price and volatility inputs;
- a documented calculation method;
- rounding and currency rules;
- risk review;
- versioned tests and historical reproducibility.

An LLM or provider narrative is never sufficient evidence for a price level.

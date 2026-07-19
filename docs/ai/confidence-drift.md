# Intelligence confidence drift

Methodology version: `intelligence-drift-v1`

## Purpose

Confidence drift is a deterministic comparison between two immutable intelligence analyses for the same allowed timeline context. It explains how the recorded analysis inputs changed; it does not describe a model's accuracy, explain a market move, or prove a future outcome.

The calculation uses structured analysis fields only. A language model may localize the resulting reason codes for presentation, but it is never the source of a drift fact or a reason code.

## Inputs and output

For a current analysis and its immediately relevant previous analysis, the drift result contains:

- prior analysis ID, or an explicit no-prior state;
- confidence delta (`current confidence - previous confidence`);
- recommendation and risk transitions;
- a delta for every factor present in either snapshot;
- factor availability before and after;
- completeness/coverage delta;
- freshness and conflict transitions;
- provider and methodology-change flags;
- ordered structured reason codes and one primary reason code.

Factor scores are compared only when both snapshots have a numeric normalized score. A missing score produces a null score delta while preserving the availability transition. This prevents an unavailable factor from being represented as a fabricated zero.

## Deterministic change rules

| Condition | Reason code |
| --- | --- |
| Technical score changes by at least -15 / +15 | `TECHNICAL_WEAKENED` / `TECHNICAL_STRENGTHENED` |
| Fundamental score changes by at least -15 / +15 | `FUNDAMENTAL_WEAKENED` / `FUNDAMENTAL_STRENGTHENED` |
| Momentum score changes by at least -15 / +15 | `MOMENTUM_WEAKENED` / `MOMENTUM_STRENGTHENED` |
| Volatility score changes by at least +15 / -15 | `VOLATILITY_INCREASED` / `VOLATILITY_DECREASED` |
| Completeness changes by at least -10 / +10 points | `COVERAGE_DECREASED` / `COVERAGE_INCREASED` |
| Freshness moves to a worse state | `DATA_BECAME_STALE` |
| Conflict moves to `STRONG` | `PROVIDER_DISAGREEMENT_INCREASED` |
| Risk moves higher / lower | `RISK_INCREASED` / `RISK_DECREASED` |
| Selected provider changes | `PROVIDER_CHANGED` |
| Recommendation changes | `RECOMMENDATION_CHANGED` |
| Engine, rules, or weighting version changes | `METHODOLOGY_VERSION_CHANGED` |

Freshness is ordered `FRESH`, `DELAYED`, `STALE`, `UNAVAILABLE`. Risk is ordered `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`, `UNAVAILABLE`; the final state is therefore treated conservatively when risk evidence disappears.

If two analyses have no material difference under these rules, the output is `NO_MATERIAL_CHANGE`. If there is no allowed earlier analysis, it is `NO_PREVIOUS_ANALYSIS`, not a zero delta.

## Primary reason

Several facts can be true at once. The primary reason is chosen deterministically in this order:

1. `METHODOLOGY_VERSION_CHANGED`
2. `RECOMMENDATION_CHANGED`
3. `RISK_INCREASED`
4. `PROVIDER_DISAGREEMENT_INCREASED`
5. `DATA_BECAME_STALE`
6. `COVERAGE_DECREASED`
7. `PROVIDER_CHANGED`
8. Material factor weakening or strengthening
9. `RISK_DECREASED`, `VOLATILITY_DECREASED`, or `COVERAGE_INCREASED`
10. `NO_MATERIAL_CHANGE`

The full reason-code list and factor deltas remain available for disclosure. A compact timeline may show only the primary reason, but must not imply that it is the sole cause of a change.

## Versioning and interpretation limits

The drift methodology version is returned with every result. A change to engine, rules, or weighting versions is itself a material change because comparisons across methods must remain distinguishable. Historical snapshots are never updated to make a later comparison look smoother.

Drift does not feed the live confidence calculation. It has no claim about realized accuracy, profit probability, model ranking, provider quality beyond the observed selected-provider transition, or causation. Provider outages, missing factors, stale data, and changed methodology are represented explicitly so the UI can reduce certainty rather than narrate a false explanation.

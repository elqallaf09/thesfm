# Deterministic confidence methodology

Methodology version: `deterministic-confidence-v1`  
Weighting version: `asset-horizon-weights-v1`

## Meaning

Confidence is a reproducible score from `0` to `100` describing the strength of the current analysis evidence. It is not a probability of profit, forecast accuracy, backtested success rate, or promise of return.

No provider or LLM supplies the final value. The server calculates it from the persisted factor snapshot and versioned configuration.

## Inputs

Each factor supplies availability, normalized score, direction, strength, freshness, evidence, source, provider, warnings, and operational delivery reliability.

Availability multipliers are:

| Availability | Multiplier |
| --- | ---: |
| Available | `1.00` |
| Partial | `0.55` |
| Unavailable | `0.00` |

Freshness component values are:

| State | Component value |
| --- | ---: |
| Fresh | `100` |
| Delayed | `70` |
| Stale | `35` |
| Unavailable | `0` |

## Composite directional score

Directional factors are technical, fundamental, sentiment, news, macro, and momentum. For active directional factors:

```text
composite = sum(score × configured weight × availability multiplier)
            / sum(configured weight × availability multiplier)
```

The result is rounded and clamped to `-100..100`. Liquidity, volatility, and risk influence confidence and risk gating rather than being treated as direct buy/sell votes.

## Confidence components

The engine calculates five `0..100` components:

- coverage: weighted data completeness;
- freshness: weighted factor freshness;
- consistency: reduction for opposing weighted directional contributions;
- operational reliability: weighted verified delivery state;
- signal clarity: distance of the composite score from the configured directional threshold.

The base formula is:

```text
base = coverage × 0.34
     + freshness × 0.18
     + consistency × 0.20
     + operational reliability × 0.14
     + signal clarity × 0.14

confidence = round(clamp(base - explicit penalties, 0, 100))
```

## Explicit penalties

| Condition | Penalty |
| --- | ---: |
| Missing required factors | `10` each, maximum `30` |
| Any stale factor | `12` |
| Strong factor conflict | `18` |
| Moderate factor conflict | `8` |
| Excessive volatility | `10` |
| Weak liquidity | `8` |
| Operational reliability below `70` | `8` |
| Signal clarity below `25` | `8` |

Strong conflict requires strong positive and negative directional factors. Three or more opposing strong factors produce `STRONG`; one strong factor on each side produces `MODERATE`.

## Minimum evidence and caps

Minimum evidence requires all of the following:

- at least 3 available or partial factors;
- at least 2 available directional factors;
- asset-specific minimum weighted coverage (`0.58` for crypto, `0.55` otherwise);
- no missing required factor.

Caps prevent misleading high confidence:

- one usable factor: maximum `30`;
- two usable factors: maximum `45`;
- minimum evidence not met: maximum `29`.

Quality labels are:

| Rule | Quality |
| --- | --- |
| Minimum evidence not met or confidence below `30` | `INSUFFICIENT_EVIDENCE` |
| Confidence `30..54` | `LIMITED_EVIDENCE` |
| Confidence `55..74` | `MODERATE_EVIDENCE` |
| Confidence `75..100` | `STRONG_EVIDENCE` |

## Asset and horizon weights

Base weights differ for stocks, crypto, forex, indices, commodities, and funds. Horizon multipliers then emphasize short-horizon technical/momentum/liquidity inputs or longer-horizon fundamental/macro/risk inputs. Weights are normalized after applying the multiplier.

Examples:

- stock base weights emphasize technical (`0.22`) and fundamental (`0.18`);
- crypto emphasizes technical (`0.25`), momentum (`0.18`), sentiment (`0.12`), and liquidity (`0.10`);
- forex assigns macro `0.20` and no fundamental weight;
- fund analysis assigns fundamental `0.25` and risk `0.10`;
- intraday multiplies technical and momentum by `1.40`;
- long-term multiplies fundamental by `1.80`, macro by `1.50`, and risk by `1.30`.

The exact source of truth is `src/lib/intelligence/config.ts`. Every result stores the weighting version and the exact applied weight map in `confidenceCalculation`, so historical output remains reproducible if future source weights change.

## Reproduction procedure

To reproduce a historical confidence value:

1. Load the immutable result snapshot.
2. Select the recorded methodology and weighting versions.
3. Use the stored factor snapshot and applied weights.
4. Recalculate components, explicit penalties, minimum-evidence decision, and caps.
5. Compare confidence, quality, completeness, conflict status, and composite score.

Changing any formula or threshold requires a new version and new rows. Existing analyses must not be mutated.

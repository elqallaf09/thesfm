# Trader signal evidence consistency

## Incident
A provider connection is not proof that a specific symbol has complete data. The retained detail view previously preferred a raw `item.decision` over the shared normalized verdict, retained confidence after a rejection, and manufactured a final score by awarding fallback points for missing inputs. The quick drawer also read only market/detail caches, not the new exact-symbol watchlist engine.

## Repair
- The shared recommendation normalizer rejects missing core price/technical evidence, explicit insufficient-data flags, degraded/unknown quality, stale/future/missing observation times, and a pending or last-known watchlist engine state.
- Freshness uses a source observation timestamp (`engine.asOf`, `lastUpdated`, `dataTimestamp`, `updatedAt`, or provider `lastUpdated`), never HTTP `generatedAt`. Quotes older than 15 minutes are not eligible for a current signal; future tolerance is 60 seconds. Last-known prices remain displayable with their original timestamp.
- Core indicator coverage is RSI in range, a positive moving average, finite MACD and signal, positive ATR, and ordered positive support/resistance. Optional descriptive company metadata does not satisfy or override these requirements.
- Rejected output has no confidence, target, stop, or bullish source rationale. A generic score is not substituted for confidence. Confidence must be explicitly supplied, numeric, and between 0 and 100.
- The full detail view always builds its decision from the checked verdict, hides unsupported execution fields, and displays only a real source final score. No invented points for absent Shariah/risk/backtest inputs. Null/blank/boolean evaluations are unavailable, not numeric zero.
- The quick drawer reuses its exact watchlist row without another provider request or blending old detail recommendations into it.
- Script URLs and cache contracts are versioned together. Both one-time transport workflows were removed from the final source tree.

## Verification boundary
42 focused Node regressions passed locally and on the actual repaired GitHub source, including stale timestamps, partial data with a raw strong-buy verdict, missing indicators, invalid confidence, score absence, and raw-decision bypass. Three actual-asset Playwright journeys were added to the existing three-browser watchlist suite: drawer reuse, table/drawer rejection, and full-detail rejection.

These are isolated test fixtures, not market data. Full CI, browser results, and the production deployment must be checked on this final clean head before calling the release complete. Provider coverage or uptime is not guaranteed by these gates, and a model confidence score is not a demonstrated probability of investment success.

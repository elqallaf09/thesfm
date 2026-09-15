# Trader signal evidence consistency

## Incident
A provider connection is not proof that a specific symbol has complete data. The retained detail view previously preferred a raw `item.decision` over the shared normalized verdict, retained confidence after a rejection, and manufactured a final score by awarding fallback points for missing inputs. The quick drawer also read only market/detail caches, not the new exact-symbol watchlist engine.

## Repair
- The shared recommendation normalizer rejects missing core price/technical evidence, explicit insufficient-data flags, degraded/unknown quality, stale/future/missing observation times, and a pending or last-known watchlist engine state.
- Freshness uses a source observation timestamp (`engine.asOf`, `lastUpdated`, `dataTimestamp`, `updatedAt`, or provider `lastUpdated`), never HTTP `generatedAt`. Quotes older than 15 minutes are not eligible for a current signal; future tolerance is 60 seconds. Last-known prices remain displayable with their original timestamp.
- Core indicator coverage is RSI in range, a positive moving average, finite MACD and signal, positive ATR, and ordered positive support/resistance. Optional descriptive company metadata does not satisfy or override these requirements.
- Rejected output has no confidence, target, stop, or bullish source rationale. A generic score is not substituted for confidence. Confidence must be explicitly supplied, numeric, and between 0 and 100.
- The full detail view always builds its decision from the checked verdict, hides unsupported execution fields, and displays only a real source final score. No invented points for absent Shariah/risk/backtest inputs. Null/blank/boolean evaluations are unavailable, not numeric zero.
- Missing confidence and a null timeframe-consensus object render an explicit unavailable state. They must not interpolate `null%`, coerce absence to zero, or throw and replace the whole detail body with an error screen. A genuine zero remains a valid displayed zero. Rejected detail data cannot retain a raw data-health score.
- The quick drawer reuses its exact watchlist row without another provider request or blending old detail recommendations into it.
- Script URLs and cache contracts are versioned together. All one-time repair transport workflows were removed from the final source tree.

## Verification boundary
The initial 42 focused Node regressions passed locally and on the actual repaired GitHub source, including stale timestamps, partial data with a raw strong-buy verdict, missing indicators, invalid confidence, score absence, and raw-decision bypass. Two additional formatter regressions cover missing confidence and null timeframe consensus; the 44-test focused suite and syntax/diff validation passed in the final null-repair workflow (35003565545). The original 41 watchlist engine/route regressions remain unchanged.

Three actual-asset Playwright journeys were added to the existing three-browser watchlist suite: drawer reuse, table/drawer rejection, and full-detail rejection. The first two passed on all three browser projects before the final null repair. The full-detail journey exposed the null-consensus renderer exception; the repair was verified against the actual full detail script/HTML in a local DOM run: decision `Insufficient data`, confidence and score `Unavailable`, a genuine source price retained, and no executable target. The browser assertion now checks the confidence text exactly rather than merely excluding the previous percentage.

These are isolated test fixtures, not market data. Fresh full CI, all 27 browser cases, and the production deployment must be checked on the final clean head before calling the release complete. Provider coverage or uptime is not guaranteed by these gates, and a model confidence score is not a demonstrated probability of investment success.

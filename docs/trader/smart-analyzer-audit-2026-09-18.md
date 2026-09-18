# Smart Analyzer interaction and evidence audit

Baseline: production `3693b10ff89e8c2106465e01d5f31617aa456aac`.
Scope: the existing protected Trader workspace, its navigation, shared drawers,
market-news endpoint and the calculation/quote contracts it consumes.

## Observed defects and corrections

| Finding | Correction | Regression evidence |
| --- | --- | --- |
| An actual US Nasdaq/Nvidia story acquired unrelated Kuwaiti energy tickers. Directory aliases included sector and exchange search keywords. | Separate company identity aliases from discovery keywords; require crypto context for crypto names and preserve ticker case. Revalidate older stored associations before filtering/merging them. | Entity, Arabic company, crypto and stored-association tests. |
| Original English news was reported as translated. | Read the translation service's explicit success flag; retain original title/summary. | API projection test. |
| General news was restricted to a small seed watchlist; market selector values did not match canonical market codes. | Broad country/asset coverage uses canonical codes; sectors and individual symbols keep scoped requests. | Request contract and browser tests. |
| Search only filtered already loaded headlines; choosing a source rerendered and lost an unsubmitted query. | Submit query/source to the news service, keep typed text and open the results tab. | Browser flows in Arabic, English and French. |
| News refresh bypassed the shared request generation guard. | Use the same guarded hydration for initial loads, market changes and refreshes; forced refresh wins over older requests. | Out-of-order market/refresh and deduplication tests. |
| Confirmed labels could appear with no independent corroboration; stored outages could appear issue-free. | Require the corroboration count, retain conflict precedence, expose stale/partial news and supporting links. | Evidence-state tests and clickable source links in browser coverage. |
| Drawer fallback matched ticker substrings inside unrelated words. | Use resolved symbol associations for unscoped news. | Existing drawer and new news-action flows. |
| Two analysis paths used different RSI formulas. | Share Wilder RSI; snapshots round only at their output boundary. | Fixed numerical sequence and existing recommendation tests. |
| Null volume became zero; volume gaps pulled older sessions into a claimed 20-session average. Missing high/low prices were substituted in ATR. | Preserve missing inputs, require 20 actual recent volumes, withhold ATR/ADX when required ranges are incomplete. | Missing-input calculation tests. |
| Provider summary named the legacy Yahoo preference while returned prices came from Twelve Data. | Summarize observed upstream sources and original timestamps; stale references remain degraded. | Observed-provider tests. |
| The SFM history/analysis path passed `1d` to Twelve Data, whose daily interval is `1day`; the request also capped history below the 200 sessions needed by SMA 200. | Normalize daily aliases at the provider boundary and request 260 observations. Preserve actual missing fields and chronological order. | Provider contract tests reject unsupported intervals and exercise daily aliases plus an unchanged hourly interval. |

Calculation references: TradingView's [RSI calculation](https://www.tradingview.com/support/solutions/43000502338-relative-strength-index-rsi/)
and [ATR definition](https://www.tradingview.com/support/solutions/43000501823-average-true-range-atr/).
These define indicator math, not predictive accuracy or investment outcomes.
History interval reference: [Twelve Data official client parameters](https://github.com/twelvedata/twelvedata-python#supported-parameters).

## Verification scope

| Area | Coverage |
| --- | --- |
| Dashboard and tabs | Overview, analysis, recommendations, sessions, heatmap, news and diagnostics; existing workspace smoke suite. |
| Buttons and navigation | Stock drawer opening/closing, keyboard focus, compare/watchlist, full analysis, filters, ticker, top search and route bridge; existing interaction suites. |
| News interactions | Every news tab, source selection, submitted search, primary/supporting links and stock detail action; added browser cases for all three languages on the existing desktop/mobile projects. |
| Data evidence | Delayed/stale quotes, original timestamps, missing prices/history, confidence gating, indicator math and entity attribution; unit and Node engine suites. |
| Routes and protection | Page ownership/API policy guards and existing authorization/bridge tests. No authentication changes. |

The live cloud-browser session was signed out, so this audit does not claim a
manual authenticated production UI pass. Browser fixtures exercise the shipped
assets with isolated test observations; CI also runs the existing authenticated
smoke suite. Fixture prices are never shipped as market data.

Live API checks on the baseline returned stale AAPL/MSFT reference prices with
their original timestamps. AAPL history returned zero points and `UNKNOWN_ERROR`;
the provider diagnostics reported FMP rate limiting. Code corrections cannot
establish provider entitlements or recover unavailable history. Indicators remain
unavailable where the required source observations are absent.

## Release discipline

No schema changes or new legacy product surfaces. These are repairs to existing
views during the native-route migration tracked in ADR 0001. Preserve the
same-origin iframe/authentication boundary. Run required CI and a single release
preview before merging. Rollback target is the baseline production deployment
`dpl_Z9u7YdAqHewMUz2e7UUU7tuufnwP`; no database rollback is needed.

Attach final test/deployment results to the PR. Production RUM, external alert
delivery and a staffed observation window are not established by this audit;
the live runtime error query alone does not prove those controls are configured.

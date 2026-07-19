# AI Analyst workspace

## Purpose

`/ai-analyst` is the single market-intelligence entry point for THE SFM. It consolidates navigation and presentation only. It does not replace the Phase 6.1 intelligence domain, deterministic confidence or recommendation policy, immutable analysis history, outcome evaluator, timeline, RLS policies, or provider contracts.

## Route map

| Route | Purpose | Data boundary |
| --- | --- | --- |
| `/ai-analyst/overview` | Market-intelligence landing surface | Safe recent-analysis projection, sample-gated shared calibration, optional existing provider-health probe |
| `/ai-analyst/analyze/[symbol]` | Canonical single-asset analysis | Existing `latest` and `analyze` intelligence APIs only |
| `/ai-analyst/agent` | Canonical-analysis launcher | Uses the same analysis path; it does not call or render the legacy Market Agent recommendation model |
| `/ai-analyst/compare` | Two-reading comparison entry | Delegates to the existing authorized timeline comparison flow |
| `/ai-analyst/history` | Timeline, outcomes, drift, and descriptive accuracy | Existing timeline/outcome data plus the read-only shared calibration projection |
| `/ai-analyst/opportunities` | Reserved information architecture | No scanner, arbitrage, price, alert, or recommendation output is generated |

## Compatibility

Legacy paths remain available:

- `/market-analysis` redirects to the unified overview; explicit analysis URLs redirect to `/ai-analyst/analyze/[symbol]`.
- Legacy command-center tabs such as watchlist, alerts, calendar, tools, and reports retain their behavior through the explicit `legacy=market` compatibility view. No working tab is silently discarded.
- `/market-agent` redirects to `/ai-analyst/agent`.
- The requested root `/symbol-details/[symbol]` alias redirects to canonical analysis. The separate terminal route under `/thesfm-trader-own/symbol-details/[symbol]` is intentionally unchanged.

The compatibility Market Agent UI and API remain intact for existing dependencies, but they are not mounted in the unified workspace. This prevents two unrelated recommendation/confidence models from being displayed together.

## Truthfulness and security

- `IntelligencePanel` is the only recommendation surface in the new analysis view.
- `IntelligenceStatusPanel` consolidates partial, stale, unsupported, conflicting, provider-unavailable, and insufficient-evidence conditions without inventing a substitute price, outcome, or recommendation.
- The overview's `recent` adapter returns a fixed safe projection only. It scopes private rows using the current server-side user identity and exposes neither user IDs, snapshots, prompts, provider payloads, nor credentials.
- The accuracy adapter exposes only the existing shared, descriptive calibration report. Minimum sample gating remains in the Phase 6.2A reporting service, and no report value feeds live confidence weights.
- Provider-health probing is optional and user-initiated on the overview. It exposes safe status metadata, not keys or raw provider errors.

## Performance

The new shell uses link-based tabs. Timeline, price history, accuracy details, the comparison surface, agent launcher, opportunities architecture, and legacy compatibility implementation are dynamically loaded or only rendered after the user requests them. No provider call is made merely by entering the analysis overview; canonical analysis is requested only from a selected asset path and only after the existing endpoint's validation, authorization, rate limiting, caching, and deduplication controls.

## Deferred scope

This phase does not add AI model comparison, local models, autonomous trading, triangular arbitrage, scanner results, route animation, automated smart alerts, new confidence weighting, or production deployment.

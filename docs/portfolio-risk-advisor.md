# Portfolio Risk Advisor — implementation contract

Issue #354. Branch: `feat/portfolio-risk-advisor`.

## Phase 1: source and quality gates
- Read user-owned positions using authenticated user context and RLS; never accept a client-supplied user ID as authority.
- Normalize positions to base currency with timestamped FX quotes; account for cash, liabilities, splits, dividends and delisted instruments.
- Historical series must be date-aligned and corporate-action-adjusted; exclude missing sessions rather than forward-filling returns silently.
- Record vendor, license entitlement, as-of time, currency, market calendar and coverage.
- Block risk scoring when portfolio ownership, position coverage, FX, or sufficient history cannot be established. Never fabricate values.

## Phase 2: deterministic engine
- `src/lib/portfolio-risk/core.ts` implements pure volatility, historical 95% VaR/CVaR, drawdown and concentration.
- Returns are fractions, not percentages. VaR/CVaR are positive loss magnitudes; not guarantees or worst-case bounds.
- Minimum 60 aligned daily observations for provisional calculations; production thresholds and annualization calendar must be configured per market.
- Compute portfolio returns using time-aware holdings and cash flows, not a naïve constant-weight proxy for changing holdings.
- Validate with deterministic fixtures, edge cases, missing data and independently calculated benchmarks.

## Phase 3: interface
- RTL Arabic / English, IBM Plex Sans Arabic, clear data freshness, coverage and methodology.
- No numeric risk score when data quality gate fails; show a localized explanation.
- Never show example figures as live account data.

## Phase 4: AI advisor
- AI explains only verified structured results and cites calculation windows and data provenance.
- No trade execution, allocation mutation, or regulated advice without explicit permissions and compliance review.

## Proposed API
`POST /api/portfolio/risk/analyze` (not implemented yet): authenticated portfolio selector only; returns `metrics`, `dataQuality`, `asOf`, `methodologyVersion` or a typed insufficiency error.


## Production isolation (added 2026-11-11)
- Both flags default to disabled. The UI is visible only with `NEXT_PUBLIC_SFM_PORTFOLIO_RISK_ENABLED=1`, and the API returns 404 unless `SFM_PORTFOLIO_RISK_ENABLED=1`.
- Keep both flags unset in production until security, data-quality and integration checks pass. A public flag does **not** secure the API; the server flag and user authentication are separate safeguards.
- The current endpoint returns **partial concentration only** from user-scoped verified canonical positions. It does not calculate historical metrics or risk scores. The `asOf` timestamp represents the oldest position valuation in the response, not the request time.
- Do not enable the UI for production users before verifying access controls, cookie/session assurance, position completeness, zero-value positions, valuation freshness across market holidays, source-quality enumerations, and end-to-end tests.
- CI/typecheck/build status must be explicitly confirmed. A skipped Supabase Preview check is not a passing build.

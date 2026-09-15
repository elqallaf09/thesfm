# Phase 7.0 — SFM Economic Intelligence Foundation

## Product goal

Turn The SFM from a collection of finance, market, and business tools into a decision intelligence system that can explain a user's current economic position, simulate future scenarios, and assess major financial decisions.

## Foundation delivered in this phase

### 1. Financial Digital Twin

The financial twin is a normalized, currency-scoped snapshot computed from existing SFM source tables. It does not create or persist substitute finance records.

Inputs currently include:

- `monthly_income_sources`
- `expense_items`
- `debts`
- `savings_items`
- `investment_items`

The snapshot exposes:

- monthly income
- monthly expenses
- monthly debt payments
- monthly surplus
- debt balance
- savings balance
- investment balance
- liquid balance
- net worth
- debt-service ratio
- savings rate
- liquidity runway
- source-data completeness

### 2. Scenario Forecast Engine

The forecast engine projects the financial twin over a bounded horizon and keeps assumptions explicit. It produces three scenarios:

- `stress`
- `base`
- `optimistic`

Forecast values are simulations, not claimed facts. UI surfaces must show assumptions and must not present scenario output as guaranteed future performance.

### 3. Financial Decision Engine

The first domain contract supports:

- car purchase
- home purchase
- new loan
- debt payoff versus investing
- starting a business

The engine returns an affordability class, risk score, post-decision monthly surplus, post-decision liquidity runway, reasons, and warnings.

## Architectural rules

1. Reuse existing SFM finance tables and currency-integrity helpers.
2. Do not introduce fake/demo financial records into production paths.
3. Keep core calculations deterministic and testable outside React.
4. Treat AI as an explanation/orchestration layer, not as the source of financial arithmetic.
5. Every recommendation must be traceable to source data and explicit assumptions.
6. Incomplete source data must reduce confidence instead of being silently filled with fabricated values.
7. Forecasts and decision assessments are educational decision-support outputs, not guarantees or licensed financial advice.

## Next integration slice

1. Add a server-side data adapter that loads the five core source groups once.
2. Expose the Financial Digital Twin to `/decisions` and the Finance dashboard.
3. Replace duplicated decision arithmetic with the shared Decision Engine progressively.
4. Add scenario controls (3 / 6 / 12 months, assumptions visible to the user).
5. Add an Economic Context layer for rates, inflation, market regime, and user-held assets.
6. Add AI explanation only after deterministic metrics and source citations are available.

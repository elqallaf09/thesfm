# Economic Intelligence Integrity Audit — Phase 7.34

## Scope
This audit covers the Economic Intelligence production paths introduced or materially changed by PR #119: Financial Digital Twin, decision assessment/simulation, Daily Brief, readiness/confidence, provenance/history, specialist advisor grounding, Cross-Workspace Brain, and the Economic Command Center.

It does **not** claim that every legacy page in the repository has been fully audited.

## Data classification contract

### 1. Canonical source facts
Values loaded from authenticated user-owned database/provider records, including income, expenses, debts, savings, investments, goals, watchlists, alerts, projects, and funding-readiness records.

Rules:
- missing source data stays missing;
- stale source data lowers readiness/confidence;
- raw private rows and provider secrets are not exposed through provenance/history;
- cross-user evidence is not used.

### 2. Deterministic derived metrics
Arithmetic derived from canonical facts, including monthly surplus, debt-service ratio, liquidity runway, net worth, readiness scores, scenario cash-flow points, and evidence drift.

These values are calculations, not external facts or predictions.

### 3. Product-policy heuristics
Risk scores, affordability bands, warning thresholds, and ranked priorities are deterministic product-policy heuristics. They are **not probabilities** of success, default, loss, or future return.

The Financial Decision contract now explicitly tags `riskScoreMethod` as `deterministic_policy_heuristic`.

### 4. Fixed-assumption sensitivity simulations
Stress / Base / Optimistic financial scenarios are sensitivity simulations driven by explicit fixed assumptions. They are **not market forecasts** and are not guarantees of future results.

The forecast contract now explicitly tags `methodology` as `fixed_assumption_sensitivity_simulation`, and the Finance Dashboard exposes the scenario assumptions and a localized disclaimer.

### 5. AI narrative/explanation
Specialist advisors may summarize and explain grounded evidence, but they may not invent financial/market facts, override deterministic constraints, or convert heuristic scores into probabilities.

## Confirmed findings and fixes

### Fixed — empty cash-flow inputs could look complete
Previously, present-but-empty income and expense arrays could leave Financial Twin completeness at 100%.

Fix:
- empty income or expenses now lower completeness;
- warnings include `income:empty` / `expenses:empty`;
- deterministic decision assessment emits `assessment_based_on_incomplete_data`.

### Fixed — legacy decision amount could be treated as monthly cost
The legacy fallback rules could include the full one-off decision amount in monthly cash-flow impact, potentially turning a one-off purchase into an artificial monthly deficit.

Fix:
- one-off `amount` is no longer included in monthly decision cost;
- only explicit recurring/maintenance/project monthly cost and monthly payment affect monthly cash flow;
- one-off project, debt-paydown and charity scenarios no longer silently become monthly obligations.

### Fixed — simulation wording could be mistaken for prediction
Stress/Base/Optimistic outputs previously did not make the fixed-assumption methodology prominent enough.

Fix:
- UI now labels the output as a 12-month scenario simulation;
- each scenario exposes monthly income/expense/investment assumptions;
- localized text states that the output is not a market forecast or guarantee.

### Fixed — methodology was implicit in API/domain contracts
Risk and forecast methodology were previously inferable from implementation but not encoded in the types.

Fix:
- `FinancialDecisionAssessment.riskScoreMethod = deterministic_policy_heuristic`;
- `FinancialTwinForecast.methodology = fixed_assumption_sensitivity_simulation`.

## Verified integrity controls
- `/api/economic-intelligence/*` is behind the protected API namespace.
- Evidence Provenance exposes metadata (source group, counts, timestamps/freshness), not raw private rows or provider secrets.
- Historical Evidence Snapshot Trace stores privacy-safe metadata and does not rebuild old evidence from current records.
- Historical Evidence Drift is explicitly descriptive/non-causal.
- Workspace readiness and advisor confidence depend on evidence completeness/freshness rather than fabricated rows.
- Cross-workspace funding aggregation does not silently combine incompatible currencies.
- Deterministic finance constraints remain authoritative over AI wording.

## No confirmed fake production facts in audited EI paths
The audited Economic Intelligence paths contain policy thresholds and scenario assumptions, but no confirmed mock/demo user financial rows or fabricated market prices used as production facts.

Policy thresholds and fixed scenario assumptions must remain labeled as methodology, not source evidence.

## Remaining semantic cleanup
`src/app/decisions/page.tsx` currently supplies `expectedReturn: 0` in the decision input object while the current deterministic Economic Intelligence assessment does not use it as a source fact or risk input. It must not be interpreted or displayed as an expected investment return. Remove or replace it only when there is an explicit user-entered return assumption with a clearly labeled methodology.

Legacy scenario suggestions such as smaller-investment percentages or split allocations are heuristic option templates, not forecasts. Any future surface that displays them should label them as example/heuristic scenarios rather than evidence-backed predictions.

## Phase 7.34 conclusion
The confirmed integrity defects found in the core Economic Intelligence calculation path were corrected. The system now distinguishes source facts, deterministic calculations, product-policy heuristics, and fixed-assumption simulations at the contract/UI level.

Next: Phase 7.35 Production Hardening — auth/RLS isolation, server-only secret boundaries, environment handling, cache/rate-limit/retry/error contracts, and route/runtime resilience.

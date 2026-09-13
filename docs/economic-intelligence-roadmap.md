# SFM Economic Intelligence Roadmap

## Phase 7.0 — Foundation — implemented in PR #119
- Economic Intelligence domain contracts
- Financial Digital Twin snapshot
- 3/6/12 month forecasting primitives
- Stress / Base / Optimistic scenarios
- Deterministic decision risk engine
- Data-quality and confidence guardrails
- Unit coverage

## Phase 7.1 — Decisions Integration — implemented in PR #119
- Compatibility bridge from the existing Decisions Center into Economic Intelligence
- Route purchase, investment, project, and debt/saving decisions through the Financial Digital Twin
- Preserve legacy deterministic rules for charity/zakat and budget decisions until migrated
- Load debt records directly into the Decisions Center source bundle
- Include debt-service context in affordability and runway calculations
- Surface Financial Digital Twin completeness/confidence in the Decisions UI
- Show 12-month Stress / Base / Optimistic outcomes next to each supported decision
- Translate Economic Intelligence reason/warning and missing-data codes in AR / EN / FR
- Persist versioned inputs + analysis JSON for decision-history auditability
- Add bridge and presentation/versioning unit coverage

## Phase 7.2 — Finance Dashboard Intelligence — implemented in PR #119
- Current financial state summary from the same Digital Twin
- 12-month trajectory cards
- Liquidity runway and debt-service pressure
- Early warnings from canonical finance data
- Dashboard unit coverage

## Phase 7.3 — Economic Context Engine — implemented in PR #119
- Inflation, policy-rate, growth, labor and yield-curve context
- Explicit source/provider timestamps and freshness
- Personal Economic Impact mapping from macro context to the Financial Digital Twin
- Never replace deterministic personal-finance arithmetic with LLM estimates

## Phase 7.4 — Specialist Advisors — in progress in PR #119
- Finance Advisor grounding
- Investment / Markets Advisor grounding
- Business Advisor grounding
- Shared evidence, missing-data and confidence contract
- Shared allowed/prohibited claim boundaries
- Next: connect grounded advisor context to the existing AI Analyst / workspace chat surfaces without creating a parallel chatbot stack

## Phase 7.5 — Decision Simulation
- Buy car / home
- Take loan
- Pay debt vs invest
- Start or expand business
- Scenario comparison and decision history

### Validation gate
- Keep PR #119 Draft and unmerged until Preview build, CI and visual validation are clean
- No Production changes before the validation gate passes

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete data lowers confidence; it is never silently filled
- Forecasts are simulations, not guarantees
- High-impact recommendations must expose assumptions and reasons
- All workspaces consume one canonical Economic Intelligence layer
- Advisors may explain evidence, scenarios and risks but may not invent market/user data or guarantee outcomes

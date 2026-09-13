# SFM Economic Intelligence Roadmap

## Phase 7.0 — Foundation
- Economic Intelligence domain contracts
- Financial Digital Twin snapshot
- 3/6/12 month forecasting primitives
- Stress / Base / Optimistic scenarios
- Deterministic decision risk engine
- Data-quality and confidence guardrails
- Unit coverage

## Phase 7.1 — Decisions Integration
- Compatibility bridge from the existing Decisions Center into Economic Intelligence
- Route purchase, investment, project, and debt/saving decisions through the Financial Digital Twin
- Preserve legacy deterministic rules for charity/zakat and budget decisions until migrated
- Include debt-service context when the source is available
- Expose missing financial sources instead of fabricating values
- Add bridge integration tests

### Remaining in 7.1
- Load debt records directly in the Decisions Center source bundle
- Surface Financial Digital Twin completeness/confidence in the Decisions UI
- Show 12-month Stress / Base / Optimistic outcomes next to each decision
- Add translated explanations for Economic Intelligence reason/warning codes
- Persist a versioned decision-analysis snapshot for auditability

## Phase 7.2 — Finance Dashboard Intelligence
- Current financial state summary from the same Digital Twin
- 12-month trajectory cards
- Liquidity runway and debt-service pressure
- Goal trajectory and early warnings

## Phase 7.3 — Economic Context Engine
- Inflation, rates, FX, market regime and relevant macro context
- Explicit source timestamps and freshness
- Never replace deterministic personal-finance arithmetic with LLM estimates

## Phase 7.4 — Specialist Agents
- Finance Advisor
- Investment / Markets Advisor
- Business Advisor
- Shared Economic Intelligence context and permission boundaries

## Phase 7.5 — Decision Simulation
- Buy car / home
- Take loan
- Pay debt vs invest
- Start or expand business
- Scenario comparison and decision history

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete data lowers confidence; it is never silently filled
- Forecasts are simulations, not guarantees
- High-impact recommendations must expose assumptions and reasons
- All workspaces consume one canonical Economic Intelligence layer

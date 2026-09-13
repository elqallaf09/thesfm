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
- Load debt records directly into the Decisions Center source bundle
- Include debt-service context in affordability and runway calculations
- Surface Financial Digital Twin completeness/confidence in the Decisions UI
- Show 12-month Stress / Base / Optimistic outcomes next to each supported decision
- Translate Economic Intelligence reason/warning and missing-data codes in AR / EN / FR
- Persist versioned inputs + analysis JSON for decision-history auditability
- Add bridge and presentation/versioning unit coverage

### Validation gate
- Preview production build must pass before Phase 7.1 is merged
- Keep PR #119 Draft until build and visual review are clean

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

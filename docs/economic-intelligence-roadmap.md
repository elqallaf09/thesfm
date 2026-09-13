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

## Phase 7.4 — Specialist Advisors — implemented in PR #119
- Finance Advisor grounding
- Investment / Markets Advisor grounding
- Business Advisor grounding
- Shared evidence, missing-data and confidence contract
- Shared allowed/prohibited claim boundaries
- Grounded advisor context connects to the existing AI surfaces rather than creating a parallel chatbot stack

## Phase 7.5 — Decision Simulation — implemented in PR #119
- Deterministic before/after simulation against one canonical Financial Digital Twin
- Buy-car / large-purchase modeling
- Debt vs investment paths
- Start-business/project paths
- Stress / Base / Optimistic comparison at 3/6/12 months
- Versioned decision history
- Financed purchases are not silently treated as full-cash purchases

## Phase 7.6 — Explicit Decision Inputs — implemented in PR #119
- Explicit down payment / upfront cash outflow
- Explicit financing principal
- Explicit monthly payment and loan term
- Explicit new-loan vs debt-repayment direction
- Explicit debt-payment reduction after repayment
- Explicit project monthly income change
- Missing financing assumptions are exposed instead of inferred
- Inputs flow through Decisions Center analysis into the simulation engine

## Phase 7.7 — Decision Templates — implemented in PR #119
- Typed input templates per decision type
- Purchase, investment, project, debt, charity/zakat and budget contracts
- Conditional financing fields for financed purchases
- Separate field sets for new borrowing and debt repayment
- Deterministic completeness validation before simulation
- No fabricated terms or inferred financing assumptions

## Phase 7.8 — Decision Comparison — implemented in PR #119
- Compare two or more candidate decisions against the same Financial Digital Twin
- Rank only candidates with complete comparable inputs
- Use deterministic status, risk score, post-decision monthly net and liquidity as comparison signals
- Refuse ranking when data is incomplete
- Refuse cross-currency ranking without an explicit conversion layer
- Return an auditable comparison reason rather than an unexplained AI recommendation

## Next — Phase 7.9 — Decision Experience
- Surface the typed templates in the Decisions Center UI
- Dynamic AR / EN / FR fields by decision type
- Cash vs finance toggle for large purchases
- New loan vs repay debt selector
- Before/after 3/6/12 month comparison cards
- Side-by-side candidate comparison UI
- Persist and reopen comparison sets
- Mobile-first responsive validation

### Validation gate
- Required GitHub checks, Preview build and browser validation must pass before merge
- Auto-merge is authorized after repository-required checks pass
- No fake data, skipped required checks or lowered quality thresholds to force a merge

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete data lowers confidence; it is never silently filled
- Forecasts are simulations, not guarantees
- High-impact recommendations must expose assumptions and reasons
- All workspaces consume one canonical Economic Intelligence layer
- Advisors may explain evidence, scenarios and risks but may not invent market/user data or guarantee outcomes

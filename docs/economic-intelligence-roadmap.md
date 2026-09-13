# SFM Economic Intelligence Roadmap

## Phase 7.0 — Foundation — implemented in PR #119
- Economic Intelligence domain contracts
- Financial Digital Twin snapshot
- 3/6/12 month forecasting primitives
- Stress / Base / Optimistic scenarios
- Deterministic decision risk engine
- Data-quality and confidence guardrails

## Phase 7.1 — Decisions Integration — implemented in PR #119
- Decisions Center compatibility bridge
- Debt-service context in affordability and runway
- Data confidence / completeness
- 12-month Stress / Base / Optimistic outcomes
- AR / EN / FR presentation
- Versioned inputs + analysis history

## Phase 7.2 — Finance Dashboard Intelligence — implemented in PR #119
- Current financial state from the canonical Digital Twin
- 12-month trajectory
- Liquidity runway and debt-service pressure
- Early warnings

## Phase 7.3 — Economic Context Engine — implemented in PR #119
- Inflation, policy-rate, growth, labor and yield-curve context
- Provider/source timestamps and freshness
- Personal Economic Impact mapping

## Phase 7.4 — Specialist Advisors — implemented in PR #119
- Finance Advisor
- Investment / Markets Advisor
- Business Advisor
- Shared evidence, confidence, missing-data and claim guardrails
- Authenticated grounded advisor chat

## Phase 7.5 — Decision Simulation — implemented in PR #119
- Before/after financial paths
- Buy car / home
- Take loan
- Pay debt vs invest
- Start or expand business
- Stress / Base / Optimistic deltas

## Phase 7.6 — Explicit Decision Inputs — implemented in PR #119
- Down payment and financing principal modeled independently
- New borrowing vs debt repayment direction
- Loan term and payment inputs
- Explicit project income changes
- Explicit debt-payment reductions
- Missing financing inputs are surfaced rather than guessed

## Phase 7.7 — Economic Command Center — implemented on `feat/economic-command-center`
- Rank the highest economic priorities across Finance / Investment / Business
- Evidence-bound priority score and confidence
- Liquidity, cash-flow and debt-pressure priorities
- Market-evidence and business-data completeness priorities
- Authenticated private API
- Surface the unified economic priority panel in Today Center

## Phase 7.8 — Outcome Learning — next
- Compare saved decision simulation with realized outcomes
- Track forecast error without rewriting historical predictions
- Calibrate confidence using observed results
- Separate model-quality metrics from user financial performance

## Phase 7.9 — Cross-Workspace Intelligence — next
- Shared Finance / Trader / Business event context
- Explain how market or macro events affect the user's financial plan and business exposure
- One evidence graph; no duplicated AI context stacks

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete data lowers confidence; it is never silently filled
- Forecasts are simulations, not guarantees
- High-impact recommendations expose assumptions and reasons
- All workspaces consume one canonical Economic Intelligence layer
- Advisors may explain evidence, scenarios and risks but may not invent market/user data or guarantee outcomes

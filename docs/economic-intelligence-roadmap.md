# SFM Economic Intelligence Roadmap

## Phase 7.0–7.17 — Implemented in PR #119
- Financial Digital Twin, 3/6/12 month scenarios, deterministic decision risk and simulation
- Decisions Center integration, explicit financing inputs, templates, comparison and Decision Lab
- Finance Dashboard Intelligence and Economic Context Engine
- Specialist Finance / Investment / Business advisors with shared grounding and guardrails
- Economic Intelligence Home, proactive event feed, durable lifecycle, outcomes and Resolution Intelligence
- Decision Timeline and user-owned Decision Memory
- Cross-Workspace Economic Brain combining Finance, Trader and Business evidence

## Phase 7.18–7.23 — Implemented in PR #119
- Ranked Daily Priorities with deterministic action destinations and stable fingerprints
- Economic Command Center at `/economic-intelligence`
- Advisor orchestration against the same Daily Priority
- Daily Brief narrative, material-change history and archive
- One shared Economic Intelligence event stack across workspaces

## Phase 7.24–7.27 — Implemented in PR #119
- Workspace readiness for Finance / Trader / Business
- Readiness-aware confidence gates for Daily Brief and advisors
- Explicit zero-state confirmations such as no debts / no investments / no business projects
- Truth reconciliation invalidates confirmations contradicted by live evidence

## Phase 7.28–7.29 — Implemented in PR #119
- Evidence freshness scoring with workspace-specific stale / very-stale thresholds
- Freshness lowers readiness and advisor confidence instead of presenting stale evidence as current
- Durable, deduplicated freshness alerts auto-resolve after source refresh

## Phase 7.30 — Evidence Provenance — implemented in PR #119
- Protected provenance API over the same canonical evidence loader
- Source-level record counts for Finance / Trader / Business evidence
- Last evidence timestamp and stale / very-stale state
- Economic Command Center provenance panel
- No raw private rows, provider secrets, or cross-user data are exposed

## Phase 7.31 — Explainability Links — implemented in PR #119
- Daily Priority actions carry an explicit `explainUrl`
- Explainability links identify the Finance / Trader / Business source groups behind the conclusion
- Evidence Provenance highlights the exact supporting workspaces when opened from an explanation link
- Specialist Advisor grounding includes the same `daily_priority_explain_url`
- Economic Command Center exposes a localized “Why this priority?” surface
- Deterministic conclusions remain authoritative; explainability adds traceability rather than a second recommendation engine

## Next — Phase 7.32 — Evidence Snapshot Trace
- Persist an immutable, privacy-safe evidence summary alongside material Daily Brief / priority history entries
- Record source groups, counts, freshness timestamps and readiness scores used at that time
- Allow historical briefs to explain what evidence was available when the conclusion was produced
- Never persist raw finance rows or provider secrets in the trace
- Keep current evidence and historical evidence snapshots clearly separated

### Validation gate
- Required GitHub checks and Vercel Preview build must pass before merge
- Auto-merge is authorized after repository-required checks pass
- No fake data, skipped required checks or lowered quality thresholds to force a merge

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete or stale data lowers confidence; it is never silently filled
- Forecasts and comparisons are simulations, not guarantees
- High-impact recommendations expose assumptions, reasons and supporting evidence
- All workspaces consume one canonical Economic Intelligence layer
- Advisors may explain evidence, scenarios and risks but may not invent market/user data, override deterministic finance constraints, or guarantee outcomes

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

## Phase 7.32 — Evidence Snapshot Trace — implemented in PR #119
- Material Daily Priority events persist a versioned privacy-safe evidence snapshot inside existing notification metadata
- Snapshot records source groups, source record counts, freshness state and readiness scores as they existed when the priority was created
- Historical archive reads the stored snapshot rather than rebuilding old explanations from current data
- Older records without a snapshot explicitly report historical evidence as unavailable
- Resolving or archiving a priority preserves its existing snapshot metadata
- No raw finance rows, provider secrets or cross-user data are persisted in the trace
- Unit coverage verifies the snapshot contains metadata only and handles pre-snapshot history safely

## Next — Phase 7.33 — Historical Evidence Drift
- Compare a stored historical evidence snapshot with current provenance using metadata only
- Show which workspace readiness, freshness or source coverage changed since the historical priority
- Keep drift descriptive and non-causal; do not claim a user action caused the change
- Refuse comparisons when the historical snapshot is unavailable
- Surface material evidence drift in the Economic Brief Archive without rewriting historical records

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

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

## Phase 7.33 — Historical Evidence Drift — implemented in PR #119
- Stored historical evidence snapshots are compared with current readiness/provenance using metadata only
- Drift reports readiness deltas plus source coverage and freshness changes
- Archive labels source changes as improved / degraded / unchanged / unavailable
- Historical records without a snapshot remain explicitly unavailable instead of being reconstructed
- Comparison is descriptive only and carries an explicit non-causal contract
- Unit coverage verifies drift direction and safe handling of pre-snapshot records

## Phase 7.34 — Economic Intelligence Integrity Audit — implemented in PR #119
- Audited production Economic Intelligence facts, deterministic metrics, heuristics, simulations and AI narrative boundaries
- Fixed empty income/expense inputs being treated as fully complete evidence
- Fixed legacy one-off decision amounts leaking into monthly cash-flow impact
- Encoded risk score methodology as `deterministic_policy_heuristic`
- Encoded Financial Twin scenario methodology as `fixed_assumption_sensitivity_simulation`
- Finance Dashboard now exposes scenario assumptions and states simulations are not forecasts or guarantees
- Verified Economic Intelligence API protection, provenance privacy, historical snapshot separation and non-causal drift semantics
- Added `docs/economic-intelligence-integrity-audit.md` with scope, findings, fixes and remaining semantic cleanup

## Next — Phase 7.35 — Production Hardening
- Audit authenticated/RLS isolation for Economic Intelligence source tables and durable notifications
- Verify server-only boundaries for secrets/provider credentials and admin clients
- Normalize cache/no-store behavior, rate limits, retries/timeouts and 401/403/429/5xx error contracts
- Verify workspace isolation and route/runtime resilience across Economic Intelligence APIs
- Remove semantic-debt inputs that could be mistaken for real evidence (for example implicit expected return placeholders)
- Produce a production-hardening report and fix confirmed issues before final release verification

### Validation gate
- Required GitHub checks, production build and targeted browser checks must pass before merge
- Per the owner's September 17, 2026 cost instruction, automatic Vercel deployment is limited to `main`. Validate branches locally/in CI and batch a release into one Production deployment; create a Preview only for a specific unresolved validation need.
- Auto-merge is authorized after repository-required checks pass
- No fake data, skipped required checks or lowered quality thresholds to force a merge

## Guardrails
- No fake/demo financial records in production analysis
- Incomplete or stale data lowers confidence; it is never silently filled
- Forecasts and comparisons are simulations, not guarantees
- High-impact recommendations expose assumptions, reasons and supporting evidence
- All workspaces consume one canonical Economic Intelligence layer
- Advisors may explain evidence, scenarios and risks but may not invent market/user data, override deterministic finance constraints, or guarantee outcomes

## September 2026 review — economic platform priorities

The saved August 2 development plan and the earlier global/Gulf economic-platform vision remain the product direction. Implemented code is not equivalent to complete market coverage or verified production readiness. See [the market readiness audit](market-readiness-audit-2026-09-18.md) for the observed production baseline and this release's scope.

| Order | Workstream | Release acceptance |
| --- | --- | --- |
| P0 — current | Market and trading reliability | Keep valid quotes when chart data fails; share category scans; preserve successful exchanges; expose directory versus selected-list coverage; verify quick analysis on phone and desktop. |
| P0 — next | Source coverage and operations | For each exchange, track expected versus imported listings, last successful sync, available quote ratio, source freshness, provider 429s and paid entitlement requirements. Prioritize Saudi/ADX/Qatar/Bahrain/Oman, then the disconnected Egypt/Jordan/Morocco directories. No implied full coverage from a six-stock list. |
| P0 — next | Production hardening, Phase 7.35 | Complete authenticated account-isolation checks, timeout/cache contracts, source failures and real-user performance checks; keep documented failures separate from accepted release gates. |
| P1 | Property market research | Use the four connected official contexts for searchable records. Enable valuation jurisdiction by jurisdiction only after rights, reliable area, arm's-length sales, comparable type, freshness, currency and historical backtesting pass. Kuwait reuse approval remains external work. |
| P1 | Investment and personal finance workflows | Complete asset identity/document/history flows, imports/exports, onboarding, finance calculations and zakat/khums methodology. Require evidence-linked results and private account ownership. |
| P1 | Economic command center and advisors | Consolidate news, market/portfolio context, cash flow, material events and scenario assumptions in one daily brief. Repair analyst streaming/duplicate requests before expanding advisor features. |
| P2 | Business planning | Structured feasibility templates, actual-versus-plan tracking and deterministic models with source-linked AI explanations. Keep investor matching behind a separately reviewed product and operating model. |
| P2 | Memberships and distribution | Companies/memberships, community, referrals and mobile/TV experiences after the reliability and performance gates. External social publishing still needs explicit authorization. |

Cost controls apply throughout: request only the data a view needs, reuse successful results, bound refreshes and provider concurrency, measure usage, and publish tested batches. In-memory request sharing reduces duplication within an instance; it is not a global quota guarantee across serverless instances.

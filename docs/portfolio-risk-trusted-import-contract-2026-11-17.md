# Trusted portfolio-history import contract — 2026-11-17

Status: **design and synthetic test examples only**. No production enablement, financial-data approval, connector authorization, or schema changes. This document supplements `docs/portfolio-risk-history-adapter-2026-11-13.md` and `docs/portfolio-risk-import-preflight-2026-11-13.md` in PR #355.

## 1. Existing data and trust boundaries

| Existing SFM facility | Reusable component | Not demonstrated by its existence |
| --- | --- | --- |
| `investment_items` and `investment_positions` | Owner-linked portfolio scope, current positions and identifiers | Historical broker NAV, cash and external-flow completeness |
| Investment migrations with a `VERIFIED` state | Legacy-to-canonical field reconciliation | Broker account ownership or authenticity of an external statement |
| Investment valuations, transactions and documents | Data structure for evidence-backed ingestion | An implemented approved-history producer or independent approvals |
| `/api/connect/v1/snapshots` | Authenticated scopes, request idempotence and owner isolation | Independent source authenticity; snapshots remain `user_connector_supplied` |
| Current market FX utilities | Formatting/current-rate display | Cutoff-specific historical FX, provider provenance or authorized historical redistribution |
| PR #355 `historyEvidence`, `importPreview.server`, `history.server`, `series` | Untrusted-file consistency check, source isolation and approved-history calculations | Trusted ingest, external ownership review, calendar independence or source rights |

A successful preview MUST return `requires_independent_review`; it is never a permission to compute certified metrics. Uploaded JSON MUST NOT declare owner, reviewer, source approval or protected verification state. Derive account scope and permissions from server-side authenticated records, not payload assertions.

## 2. Proposed contract: `portfolio-nav-ingest-v1`

Create a **server-built** immutable evidence envelope from broker/custodian statements or an authenticated integration. Do not accept this envelope as client-supplied proof.

- **Scope:** internal owner derived from auth; linked external account IDs and account-ownership evidence; portfolio scope/version; included accounts; base currency; requested analysis period; boundary of any unrepresented liabilities or positions.
- **Source:** integration channel and provider identifier; issuing institution; document/revision ID; issued time; retrieval time; original object hashes; parser version; pagination and completeness receipts; provenance of account link; data-use purpose and license/permission evidence.
- **Historical NAV:** each valuation cutoff as an ISO-8601 instant plus trading/valuation session date, total NAV in base currency, semantic meaning of NAV and source row/reference. Fund unit prices or an unexplained `equity` column cannot be silently treated as total portfolio NAV.
- **Cash and positions:** every included account and currency balance at each cutoff (original currency and base-currency conversion); position IDs, instrument identity, quantities and valuation values; cash and NAV reconciliation; explicit supported methodology for liabilities/unsettled items.
- **Movements:** immutable source transaction ID, effective time, settlement time when relevant, amount, currency, type, originating/destination accounts, linked internal transfers, evidence and classification as external-to-scope versus internal. No missing flow may be defaulted to zero without independent completeness evidence.
- **FX:** currency pair and quote direction, numerical rate, valuation cutoff, rate fixing/observed time, source, permitted lag/staleness policy and evidence. No `latest` rates or request-time timestamps may fill historical gaps. For base currency to itself, rate 1 may be declared with explicit policy.
- **Calendar:** separate policy/document identifier and version, timezone, valuation cutoff/time, session list and holiday/amendment policy, coverage period, `periodsPerYear` and its justification. This is a *portfolio valuation calendar* (which may combine markets), not automatically a single exchange calendar.
- **Transform:** raw-file digest, normalized-payload digest, normalization/parser version, instrument mapping version, flow/FX/calendar policy versions, transformation warnings/rejections, scope and source revision.

Use a stable dedupe key such as `(source, account, statement_id, statement_revision, raw_sha256, normalizer_version, scope_version)`. Repeated identical ingestion is idempotent. Same identity and revision with changed content is a conflict, not a silent overwrite. Provider corrections and parser changes create new immutable revisions.

## 3. External flows and portfolio return semantics

The portfolio boundary, **not the name of an account owner**, defines whether cash moves externally.

- Deposit entering scope: positive external flow; withdrawal leaving scope: negative external flow.
- Transfer between two included accounts: internal transfer, paired and reconciled; a transfer from an excluded account is external.
- Asset buys/sells, dividends/coupons, fees and taxes affect NAV and performance according to their economic meaning, not automatically external contributions.
- A zero flow requires complete source activity or explicit independently checked no-activity evidence for the interval.
- Existing series equation `r_t = (NAV_t - externalFlow_t) / NAV_(t-1) - 1` assumes **end-of-period** flows. Do not relabel intraday flows to satisfy the adapter. Intraday flows require subperiod valuations or a separately tested methodology.

Illustrative synthetic intervals:

| Start NAV | End NAV | End-period external flow | Return |
| ---: | ---: | ---: | ---: |
| 1000 | 1100 | +100 | 0% |
| 1000 | 900 | -100 | 0% |
| 1000 | 1120 | +100 | 2% |

The initial NAV point is the opening anchor; subsequent points represent the return intervals. At every cutoff, cash plus positions and other explicitly supported components must reconcile to reported NAV, without fabricating balancing cash. The current PR #355 end-of-series reconciliation is not evidence that all intermediate dates are reconciled.

## 4. Independent approval: `portfolio-history-approval-v1`

Persist approval **server-side** in a separate protected ledger. Never accept approval markers, reviewer IDs, proof of ownership or rights from the uploaded candidate.

A decision binds: owner and linked external account, portfolio scope version, raw and normalized hashes, statement revision, calendar evidence hash/version, FX evidence hash/version, instrument and transformation versions, transaction completeness proof, authorization/license purpose, reviewer and authority, validity window, decision time, status, reason and superseded/revoked dependencies.

Recommended states: `candidate` -> `validated` -> `awaiting_external_evidence` -> `approved` or `rejected`; an approval may become `superseded`, `expired` or `revoked`. Approval MUST specify permitted usage, e.g. `portfolio_risk_private_analysis`, separately from permissions to store/export/distribute data.

Approval requires separate corroboration of (1) account ownership or delegation, (2) issuer authenticity and completeness, (3) valuation calendar independent of submitted NAV rows, (4) historical FX, and (5) rights to ingest and use the source data. Distinct textual source names are **not** independent evidence. Hashes prove matching bytes, **not** origin or truth.

The risk read path must select a **currently active approved decision for the exact owner, account/scope, end date, data and policy versions**, not merely the last `observed_at` row or UUID sort order. Revalidate dependencies, rights and revocation at every sensitive read. A revoked newer approval MUST NOT silently fall back to an older record. On withdrawal of a calendar, rights grant, account authority or statement, invalidate affected approvals and controlled caches/exports. Previously downloaded files cannot be remotely revoked; outputs need as-of, approval, methodology and validity metadata.

A historical portfolio snapshot requires an immutable as-of scope; current holdings must not be assumed identical to historical holdings. Do not label a partial custodian account history as full SFM investment history.

## 5. Automated validation versus independent evidence

| Automatable proof | Independent verification required |
| --- | --- |
| Authenticated SFM row ownership and per-owner isolation | Legal/operational control of the external broker account |
| Raw and normalized SHA-256 integrity | That the document was issued by its claimed source |
| Structural/cutoff consistency against supplied calendar | Calendar completeness and independence of NAV rows |
| Reconciliation of supplied balances and NAV | Completeness of *all* assets, accounts and liabilities |
| Flow sums and classifications inside received extract | Whether omitted activity exists upstream |
| License/approval metadata in controlled ledger | Authenticity, permitted scope and continuing validity of rights |

Do not promote consistency to `verified` or claim authentic source data from green unit tests.

## 6. Executable synthetic examples

`src/__tests__/fixtures/portfolioRiskImportExamples.ts` and `src/lib/portfolio-risk/importContractExamples.test.ts` exercise the current untrusted preflight and end-period return logic. Expected behaviors:

- Review-only acceptance: synthetic deposits, withdrawals, mixed flows, one 2% return with a deposit, and a *claimed* FX policy (not certified provenance).
- Explicit reject: missing cash, missing flow, intraday convention, mismatched cutoff, missing NAV session against retained calendar, missing/duplicate position, incorrect asset identity, currency mismatch, incomplete flow coverage, absent FX policy, failed end NAV reconciliation, and client-supplied owner/approval.
- Trust-boundary demonstrations: deleting the **same** session from NAV and submitted calendar, or changing textual source references, may pass consistency preflight yet must remain `requires_independent_review`.
- Returns: synthetic 1000 -> 1120 with +100 at end of period yields 2% rather than 12%; deposits/withdrawals alone do not generate return risk.

These examples are not broker integration, a proof of external rights, or live-account test results. Existing preflight constraints must stay intact: protected auth/MFA, quotas, 2 MiB streaming limit, session/currency/scope checks and no financial metrics in preview.

## 7. Incremental implementation plan and release gates

1. **Choose one candidate custodian** only after validating availability of owner-authorized NAV, positions/cash, complete transactions, historical FX, calendar documents and contractual permitted uses. Existing named integrations are not evidence of coverage.
2. **Build an immutable capture adapter** with provider-specific parsing, completeness receipts, source digests, deterministic normalization, idempotence and corrections. Make it owner-scoped and auditable.
3. **Add independent evidence and approval ledger** behind RLS, MFA and server-only roles; explicitly version data, identity mapping, calendar, FX, rights and methodology. Verify revocation and no stale fallback.
4. **Integrate with PR #355 adapter** through one controlled promotion operation: reconcile each cutoff, bind final positions and cash to approved scope, store approval atomically, then allow read-only risk calculation. Keep previews untrusted.
5. **Test before release:** negative cases above; cross-owner access; impersonated account; page truncation; duplicate/corrected statements; mid-period/intraday flows; missing FX; calendar omission; timezone/DST; approval withdrawal; parser-version change; historic vs current scope; rollback safety and stale export/cache.
6. **Release gates:** passing current-head CI (including production build, migrations, unit/integration and authenticated browser tests), independent reviewer/rights verification for each real source, monitoring and rollback plan. Both `SFM_PORTFOLIO_RISK_ENABLED` and `NEXT_PUBLIC_SFM_PORTFOLIO_RISK_ENABLED` remain off until a separately approved launch.

No real NAV was imported or approved for this design. No production feature flag, source connector, approved-data ledger, migrations or deployment is implemented by this document/tests PR.

# Historical portfolio risk — read adapter checkpoint

PR #355 remains gated and draft. This continuation adds a real read/calculation/UI
path for **server-approved, whole recorded-portfolio, long-only NAV evidence**. It
does not create history, verify a user's imports, change feature flags, merge or
publish the feature. No production database writes or schema changes are needed.

## Implemented path

`GET /api/portfolio/risk/history` uses the same feature flag, verified session,
MFA policy, strict bearer handling and per-user quota as the current-risk endpoint.
It reads canonical verified positions, then the latest approved history batch and
its separately owner-filtered calendar from `sfm_integration_snapshots`.

The endpoint returns historical metrics only after validating currency/scope,
independent calendar evidence, exact per-date valuation cutoffs, explicit flow
convention, complete source coverage assertions, source rights/provenance,
approval timestamps, position identities and final positions-plus-cash NAV.
Historical returns use actual source-reported NAV, not today's weights or prices.
No missing day, flow or cash balance is silently replaced with zero. End-period
external flows are the only supported timing; intraday flows require another
method. Annualization is mandatory in the calendar, not defaulted to 252.

The UI displays source, calendar, timezone, annualization and method limitations.
It hides previous data synchronously on owner/credential changes, aborts old
requests, rejects malformed responses and clears state on logout. Missing evidence
has localized AR/EN/FR reasons, never a fabricated risk score. Current concentration
is still a separate partial snapshot; its API does not embed historical metrics.

## Protected source contract (not an ingestion approval API)

Existing database permissions allow authenticated accounts SELECT/DELETE, not
INSERT/UPDATE, on `sfm_integration_snapshots`. The public snapshots API writes a
fixed `verification: user_connector_supplied` payload and cannot set approval
markers. A privileged, independently verified import process is the trust boundary.

History row: `source=custom`, `payload.schema=portfolio-nav-history-v1`,
`payload.verification=server_verified_portfolio_history_v1`, `calendarId` references
a separate row owned by the same account. Its `scope` is
`all_recorded_investments_long_only`; `currency` matches canonical base currency.
`sourceName`, `sourceReference`, `rights=account_analytics_permitted`, `verifiedAt`
and `fxPolicy` are required. `observed_at` is the final actual valuation cutoff,
not the import/request time. `received_at` and approval times cannot be future.

Coverage must explicitly document positions=`complete_over_time`, cash=`included`,
externalFlows=`complete`, corporateActions=`accounted_for`, liabilities=`none`,
shortPositions=`none`, fx=`synchronized_to_valuation`. `flowTiming=end_of_period`.
The bounded `points` array contains date, at, nav and netExternalFlow. A zero flow
must be evidenced, not inferred from an empty transaction table. Internal trades,
dividends and fees must already be reflected in NAV, not misclassified as deposits.
`endPositions` includes each current canonical position ID, its exact canonical
asset identity and historical valueBase. Asset keys match the current-risk scheme:
JSON `[type, identifier]`, otherwise `[type, exchange, symbol]`, otherwise a private
position identity. Repeated lots are grouped. `endCashBase` is explicit and included
in period-end concentration. Final position values plus cash reconcile to final NAV.

Calendar row: `source=custom`, `payload.schema=portfolio-valuation-calendar-v1`,
`payload.verification=server_verified_portfolio_calendar_v1`. Same scope/currency,
with separate sourceName/sourceReference, rights, verifiedAt, timeZone,
valuationPolicy and integer periodsPerYear from 1 to 366. `sessions` has independent
ordered date/at pairs. Its source reference must differ from the NAV evidence.
The adapter cannot prove calendar independence by string comparison: an upstream
review must establish it before assigning the protected approval marker.

## What is still NOT implemented or established

A trusted broker/custodian importer and independent evidence-review process must
produce these records. **This change does not implement that producer**, approve
raw connector snapshots or establish provider licensing. Do not copy raw payloads
into this schema and add approval markers merely to make the panel show figures.
The existing empty history stores and pending canonical imports are not evidence
of a low-risk portfolio. No live history was imported in this continuation.

The first adapter excludes debt, leverage and short positions; it does not support
fund look-through. When position identities/scope have changed and cannot be
reconciled, it fails closed rather than labeling a partial account as complete.
There is no composite score, allocation recommendation or trade execution.

## Verification scope

- Local: strict TypeScript compilation of the exact fetched core/series source and
  the new pure evidence adapter; 56 Node checks on explicitly synthetic fixtures.
- CI additions: focused source-contract tests and full repository TypeScript;
  existing visual/maintainability guards remain unchanged.
- Disposable PostgreSQL: test protected history/calendar ownership, inability to
  forge/update approval markers, enrolled MFA and session revocation. No live
  credentials are used; all fixtures roll back.
- Isolated Chromium: mount the actual historical component with synthetic auth and
  intercepted HTTP. Test account switching, late responses, logout, credential
  rotation and invalid metrics. This is NOT a real Supabase login or an end-to-end
  production-account proof. The required authenticated Preview suite remains a
  separate release gate. Never report a scheduled/queued test as passed.

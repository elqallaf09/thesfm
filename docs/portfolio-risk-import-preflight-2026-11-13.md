# Historical file preflight — 13 November 2026

The gated risk workspace now offers an Arabic/English/French file checker.
It accepts a normalized SFM JSON candidate and compares it with the signed-in
account's verified canonical positions. This is **preflight only**, not a trusted
broker connector, import approval, or a write to financial storage.

## Flow and trust boundary

1. Choose a JSON file up to 2 MiB in /investments/risk.
2. POST /api/portfolio/risk/history/preview applies the existing feature flag,
   verified session, strict bearer policy, MFA and per-user quota before reading
   the request body. Streamed bytes are bounded even with a false Content-Length.
3. Canonical positions and base currency come only from the authenticated owner.
   The current historical reader and preflight share the same identity mapping.
4. Shared calculation validation checks calendar alignment/cutoffs, explicit
   external flows and cash, scope/currency, coverage claims, FX policy, final
   position identities and final positions-plus-cash NAV.
5. Only a review summary and the SHA-256 of the exact UTF-8 request text return.
   There are no risk metrics, approval markers or stored file records in this
   response. Account changes, credential changes and logout hide results and
   clear the file input; pending requests are aborted.
6. An independent reviewer must still establish source authenticity, usage rights,
   calendar independence, historical completeness, flow timing and account scope.
   Source names, references, coverage claims and a hash are not proof of authenticity.

No INSERT, UPDATE, approval endpoint, schema migration, flag change or production
deployment is part of this change. The existing reader still requires protected
server-approved history and calendar records. Passing preflight never makes the
candidate eligible for that reader.

## Candidate format

Root keys are exactly schema, history and calendar. schema must be
portfolio-history-review-v1. Unknown top-level and history/calendar fields are
rejected, including ownership, verification and approval fields.

history fields:
- currency: three uppercase letters matching the account base currency.
- scope: all_recorded_investments_long_only.
- sourceName, sourceReference, rights: account_analytics_permitted.
- observedAt: actual final valuation instant, not upload time.
- flowTiming: end_of_period.
- coverage: positions=complete_over_time, cash=included, externalFlows=complete,
  corporateActions=accounted_for, liabilities=none, shortPositions=none,
  fx=synchronized_to_valuation.
- fxPolicy: the source's documented conversion policy.
- points: 61–3660 ordered {date, at, nav, netExternalFlow} entries.
- endPositions: {positionId, assetId, valueBase} for each canonical position.
- endCashBase: an explicit nonnegative base-currency cash balance.

calendar fields:
- currency, scope, rights: the same required values as history.
- sourceName and sourceReference: separately evidenced calendar provenance.
- observedAt: when the calendar evidence was observed/issued.
- timeZone, valuationPolicy, integer periodsPerYear (1–366).
- sessions: independently obtained ordered {date, at} entries matching points.

Dates are YYYY-MM-DD. Instants include a timezone. Values are JSON numbers;
missing flows/cash may not be filled with zero. Current prices/FX must not be
used to construct historical NAV. Do not create the calendar by copying NAV
dates. The first version requires the entire recorded long-only portfolio and
does not handle debt, short positions or intraday external flows.

## Browser regression

The latest prior main-CI run 43322101113 had 1040 passing browser cases, 110
skipped and one failed mobile redirect case. Its broad waitForURL expression
also matched the pre-redirect ?view=map URL. The regression now waits for the
exact canonical URL and retains/adds single-workspace and single-surface
assertions. No hidden-element filter, .first(), retry increase or skip is added.

## Validation

The source/route tests and real-component isolated browser suite use explicitly
synthetic data. They do not establish a live authenticated Preview journey or
approve any user's financial history. Required whole-repository CI and real
source approval remain separate release gates. See PR #355 for current-head
results; never reuse older-head build success for this revision.

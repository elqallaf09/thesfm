# THE SFM watchlist data engine

## Incident and boundary

The embedded watchlist previously joined saved symbols against the selected market's
first recommendations page. Saving MSFT did not request MSFT, and changing the
market could hide a valid quote. The owned engine now requests the exact saved IDs
through the existing `/api/watchlist` endpoint, independently of market filters.

This is owned orchestration, **not an independent exchange feed**. Existing
server-only provider routing (including configured provider fallback), real
technical calculations, symbol metadata and quote normalization remain authoritative.
It does not execute orders. There are no invented production prices, targets or
confidence values, no provider credentials in browser code, and no new subscription.

## Components

`src/lib/trader/watchlistEngine.ts` resolves canonical/alias IDs across the global
catalog, coalesces matching request sets and keeps bounded snapshots. Ambiguous
aliases and currency mismatches fail explicitly. `watchlist-engine.js` is a
renderer-independent same-origin client scheduler. `watchlist-view.js` adapts the
existing compatibility shell and displays per-row source time and availability.

This is a correctness repair to an existing vanilla surface, not new feature
expansion. Per ADR 0001, retire the compatibility view when the authenticated native
Trader watchlist replaces that surface. Keep the server contract and renderer-
independent scheduler reusable; do not expand `app.js` or its market-feed join.

## Failure behavior and limits

The quote phase excludes history/news so prices can render before technical
analysis. Analysis is requested separately and must pass real sufficiency checks.
The browser batches 12 IDs with at most two active batches. The route accepts at
most 50 explicit validated IDs per request, preserves order and never silently
truncates the list. No watchlist request is made for an empty list.

Snapshots retain original observation time, currency and source. Server memory is
bounded to 500 entries, with best-effort persistence through the existing
`trader_cache` adapter; no migration is required. Optional session storage keeps up
to 200 public quote snapshots, not account/position data. Restored or fallback
prices are visibly last-known, never relabeled live, and lose actionable targets,
signals and confidence. Data older than seven days is no longer displayed.

The conservative freshness rule is 15 minutes of source age. It intentionally does
not claim an exchange-calendar-aware live status. A previous close may remain
useful but is labeled old/not live; stale evidence cannot publish a fresh analysis.
Cache freshness is distinct: quote orchestration 60 seconds, analysis 180 seconds;
existing provider caches may also apply. A manual refresh respects provider/route
cooldowns rather than forcing unbounded upstream requests.

Timeouts bound the browser request (30 seconds), provider orchestration (22 seconds),
catalog lookup (5 seconds) and individual cache reads/writes (700 milliseconds).
Existing provider requests have their own timeouts/coalescing; timing out an
orchestration wait does not claim to cancel every underlying provider operation.
Client retries use exponential backoff and jitter, then a five-minute cooldown
following three failures. Server failures have a 30-second per-symbol cooldown.
HTTP Retry-After constrains the whole client scheduler, including manual refresh.
Work pauses when the page is hidden, offline or outside the watchlist. Removed IDs
cannot reappear from late responses; older quotes cannot replace newer evidence.

There is no zero-outage guarantee: providers, entitlement, connectivity, service
availability and a total loss of all caches can still make a quote unavailable.
The engine preserves evidence when available and reports missing evidence honestly.

## Security and contract

Session/MFA middleware remains in force. The route additionally checks Trader
approval and applies rate limiting before quote work. Responses are private/no-store.
401/403 stops the client and clears snapshots until authentication is restored.
Unapproved users do not trigger provider or shared-cache operations. Shared cache
keys contain canonical symbol plus phase, not private watchlist membership.

A versioned response includes `engineVersion`, `phase`, exact `requestedSymbol`
rows, per-row quote/analysis state, `asOf`, `fetchedAt` and reason. A malformed or
partial response cannot wipe an already validated quote. Currency is never inferred
from the currently selected market. Cached and fresh analysis are separate phases.

## Verification and rollback

Node regression suites execute the actual client module and transpiled server/
route with explicit dependency fixtures. They cover the original missing-MSFT
failure, market-independent IDs, mixed currencies, cache survival, deduplication,
partial/malformed data, old/future/zero quotes, authorization, rate limits, timeout,
retry behavior, cancellation and late responses. These tests also run after the
existing Vitest run/coverage commands; no existing suite is replaced.

The browser suite serves actual embedded assets inside a same-origin iframe,
using deterministic contracts only (not evidence of live provider availability).
It checks three languages, desktop/mobile Chromium and mobile WebKit, price before
analysis, add/remove/reload, stale/partial results, outage retention and focus.
No retries are enabled in the focused workflow. Normal TypeScript, lint, build,
security and wider smoke gates remain required before deployment claims.

Rollback is a normal revert of the feature commit, without deleting user watchlists
or modifying provider credentials. Versioned snapshots may remain until expiry.

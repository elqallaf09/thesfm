# ADR 0001: contain and incrementally replace the legacy trader terminal

- Status: Accepted
- Date: 2026-07-31
- Owners: repository code owner

## Context

The protected `/thesfm-trader-own` workspace combines a Next.js access gate and
route shell with a large Vanilla JavaScript terminal served from
`src/trader-app/public`. The terminal runs in a same-origin iframe. Parent and
terminal exchange a small, versioned message contract for routes and theme.
Trader APIs remain in Next.js and server-only services.

This boundary isolates legacy CSS and global DOM state, but it duplicates
routing and rendering infrastructure, makes end-to-end accessibility harder,
and leaves `app.js` and its styles expensive to change safely. A big-bang
rewrite would create unacceptable product and financial-workflow risk.

## Decision

Contain the current terminal and migrate it route by route to native Next.js
components. Do not add new product surfaces to the Vanilla shell unless the
pull request documents why a native implementation is not yet viable and names
an expiry milestone.

The existing iframe remains an internal compatibility boundary while migration
is in progress:

- it must remain same-origin and protected by the server access gate;
- static asset path resolution must reject traversal;
- HTML must retain `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`;
- all messages must verify both `event.origin` and `event.source`;
- message payloads must be versioned, allow-listed, length-bounded, and parsed
  by the shared bridge modules;
- allowed messages are `SFM_TRADER_READY`, `SFM_TRADER_THEME_SET`,
  `SFM_TRADER_ROUTE_SET`, and `SFM_TRADER_ROUTE_CHANGE` version 1;
- tokens, provider keys, service-role keys, arbitrary URLs, HTML, and executable
  text must never cross the message bridge;
- business data must travel through authenticated `/api/trader/*` contracts,
  not through `postMessage` or browser-only provider calls.

## Migration sequence

1. Measure terminal route usage, errors, asset transfer size, and interaction
   latency without collecting portfolio values or ticker histories as analytics.
2. Extract shared domain types and authenticated APIs from legacy rendering.
3. Migrate one low-coupling route behind a server-controlled flag and preserve
   the public URL.
4. Compare authorization, keyboard access, RTL, mobile behavior, API output,
   performance, and error states against the legacy route.
5. Canary the native route, monitor it, and retain instant rollback to the iframe.
6. Remove the corresponding legacy view only after the success criteria hold;
   repeat until the terminal shell and static asset route can be deleted.

## Per-route exit criteria

- no authorization or data-contract regression;
- Arabic, English, French, RTL, mobile, and keyboard flows verified;
- client JavaScript and interaction latency do not regress beyond the checked-in
  performance budgets;
- error rate and task completion are no worse during the agreed canary window;
- rollback is tested and can be completed without a database rollback;
- deleted legacy code and assets are recorded in the migration pull request.

## Consequences

The team carries two renderers temporarily, but gains a reversible migration
path. The iframe is not the target architecture. New cross-boundary behavior is
an exception requiring owner review, contract tests, a threat assessment, and
an expiry milestone.

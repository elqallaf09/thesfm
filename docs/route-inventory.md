# THE SFM route inventory

This document intentionally does **not** contain a frozen route count or a copied route table.
The previous snapshot was dated 2026-07-12 and became misleading as new App Router pages,
API handlers, AI Analyst routes, Global Markets, and other product surfaces were added.

## Authoritative inventory

Generate the inventory from the exact commit being reviewed:

```bash
pnpm routes:inventory
```

The command scans:

- `src/app/**/page.*`
- `src/app/**/route.*`
- `src/middleware.ts`
- `src/lib/auth/accessPolicy.ts`

and emits CSV with the route, entry type, inferred access class, source file, dynamic-route
signal, and evidence. To keep an audit artifact for a release candidate:

```bash
pnpm routes:inventory > route-inventory.csv
```

Never copy an old route count forward into a release report. Route totals must be generated
from the exact release SHA.

## Access-control interpretation

The generated inventory is an audit aid, not an authorization mechanism.

- Page authentication is enforced by `src/middleware.ts` plus page-level Admin/Trader gates.
- API authentication is classified from `src/lib/auth/accessPolicy.ts` and handler-level checks.
- A handler that is not middleware-auth-gated is **not automatically unrestricted**; it may
  still validate a signature, share token, ownership, Admin role, cron secret, rate limit, or
  provider configuration.
- `src/config/workspaces/public-shell-routes.ts` controls presentation chrome only. It never
  grants access.

## Release review

For each release candidate:

1. Generate the inventory from the exact commit SHA.
2. Review newly added routes and route handlers against middleware/API policy.
3. Confirm compatibility redirects still point to canonical routes.
4. Smoke-test public, authenticated, Admin, Trader, cron, webhook, and share-token boundaries
   that changed in the release.
5. Record only the generated artifact or the exact SHA in release notes; do not treat this
   Markdown file as a frozen source of route counts.

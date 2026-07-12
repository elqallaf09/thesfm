# Workspace architecture (phase 3)

Snapshot date: 2026-07-12

## Model

Four workspaces organize the existing product areas. A workspace is a
**presentation-level** grouping: it decides what the sidebar/mobile menu show
and where the switcher navigates. It never grants access — authorization
stays exactly where phase 2.10 put it (`src/middleware.ts` for pages,
`src/lib/auth/accessPolicy.ts` for APIs, server-side admin/trader gates).

| Workspace | id | Default route | Arabic label |
| --- | --- | --- | --- |
| Personal Finance | `personal-finance` | `/dashboard` | الإدارة المالية |
| Markets & Trading | `markets-trading` | `/market-analysis` | الأسواق والتداول |
| Companies & Services | `companies-services` | `/investment-companies` | الشركات والخدمات |
| Administration | `administration` | `/sfm-admin-control` | الإدارة |

## Source of truth

```text
src/config/workspaces/
  workspace-types.ts        — typed model
  workspace-registry.ts     — the four definitions (labels ar/en/fr, icons,
                              route prefixes, nav-group ownership, access)
  workspace-resolver.ts     — pathname → workspace (longest prefix,
                              segment-aware, query/hash independent),
                              public-shell detection, switcher filtering
  workspace-navigation.ts   — filters the existing NAV_GROUPS per workspace
```

`NAV_GROUPS` in `src/components/navigationConfig.ts` remains the single
definition of every navigation item. The registry maps each group id to one
owning workspace; `account` is the one shared group (profile/security/logout
must never disappear). No navigation array was duplicated.

## Route → workspace mapping

- **personal-finance** — `/dashboard`, `/command-center`, `/decisions`,
  `/today`, `/tasks`, `/income`, `/expenses`, `/debts`, `/savings`,
  `/goals`, `/reports`, `/reports-center`, `/documents`, `/notifications`,
  `/projects`, `/business*`, `/investment-offers`, `/zakat`, `/khums`,
  `/charity*`, `/ai`, `/financial-theories`, `/ebooks`, `/education`,
  `/profile`, `/security`, `/settings`, `/invoices`, `/employees`,
  `/sales`, `/customers`, `/suppliers`, `/operating-expenses`.
  Unclaimed authenticated routes also fall back here
  (`resolveActiveWorkspace`), so the shell always renders a frame.
- **markets-trading** — `/market-analysis`, `/market-agent`,
  `/market-alerts`, `/market-watchlist`, `/watchlist`, `/alerts`,
  `/invest`, `/thesfm-trader-own`, and the eleven stock/news directories
  (`/tech-news` … `/dividend-stocks`).
- **companies-services** — the five service directories
  (`/investment-companies` … `/financial-consulting-companies`),
  `/companies/[id]`, `/company-listing/*`, `/profile/companies`
  (longest-prefix beats `/profile`).
- **administration** — `/sfm-admin-control/*` only. `/command-center` is a
  general authenticated page (no admin gate) and stays in Personal Finance.

Cross-listing exception (documented, test-enforced): the super-admin
`smart-trading-terminal` shortcut lives in the admin nav group while its
route belongs to Markets & Trading.

## Shell integration

- `WorkspaceSwitcher` (src/components/WorkspaceSwitcher.tsx): accessible
  disclosure (aria-expanded, Escape closes and restores focus, outside
  click closes, aria-current marks the active workspace, 44px targets,
  reduced-motion respected). Rendered in the Sidebar tools block (desktop)
  and MobileMenu (closes the drawer on selection). Administration is
  filtered out for non-admins — a courtesy filter only; the routes remain
  server-validated.
- Sidebar and MobileMenu now pipe `filterNavigationGroups` (unchanged
  view-mode/permission logic) through `filterGroupsForWorkspace`.
- `AppLayout` consumes `isPublicShellRoute()` from the resolver — the
  duplicated inline public-page list is gone.

## Trader terminal (specialized shell, by design)

`/thesfm-trader-own` keeps its full-viewport iframe terminal: a standard
sidebar would destroy the terminal layout, and its access gate
(`getTraderAccess`) is already server-side. Integration is an exit path
instead of a shell: a sidebar item and a topbar chip inside the SPA
(`العودة للمنصة` / "Back to platform" / « Retour à la plateforme ») link to
`/market-analysis` with `target="_top"` so they escape the iframe. They are
plain anchors (not `data-route-link`) so the SPA router ignores them.

## Deliberate non-changes

- **No routes moved, no URLs changed, no redirects needed.** The spec allows
  implementing the registry and shell without relocating files when moving
  would add risk; every existing URL, bookmark, loading/error boundary, and
  metadata file is untouched.
- **No new database state.** The active workspace derives from the route;
  nothing is persisted.
- **Middleware untouched.** Workspace access flags in the registry describe
  the existing enforcement; they do not replace it.

## Tests

`src/__tests__/unit/workspaceRegistry.test.ts` — registry validity (unique
ids, trilingual labels, English digits, default routes resolving to their
own workspace, unique prefixes, admin flag only on Administration),
resolution (real routes, longest-prefix nesting, query/hash/trailing-slash
independence, unknown-route safety), navigation ownership (every group
owned exactly once or shared, every owned href resolving to its owner,
per-workspace filtering, admin filtering in the switcher).

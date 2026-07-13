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
| Business & Projects | `business-projects` | `/business-hub` (`/investment-companies` for guests) | الأعمال والمشاريع |
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
  `/zakat`, `/khums`, `/charity*`, `/ai`, `/financial-theories`, `/ebooks`,
  `/education`, `/profile`, `/security`, and `/settings`.
  Unclaimed authenticated routes also fall back here
  (`resolveActiveWorkspace`), so the shell always renders a frame.
- **markets-trading** — `/market-analysis`, `/market-agent`,
  `/market-alerts`, `/market-watchlist`, `/watchlist`, `/alerts`,
  `/invest`, `/thesfm-trader-own`, and the eleven stock/news directories
  (`/tech-news` … `/dividend-stocks`).
- **business-projects** — `/projects*`, `/business*`, `/business-hub`,
  `/business-operations`, `/investment-offers`, the public `/investor/*`
  viewer, `/invoices`, `/employees`, `/sales`, `/customers`, `/suppliers`,
  `/operating-expenses`, the five service directories
  (`/investment-companies` … `/financial-consulting-companies`) and their
  `/services/*` aliases, `/companies/[id]`, `/company-listing/*`, and
  `/profile/companies` (longest-prefix beats `/profile`).
- **administration** — `/sfm-admin-control/*` only. `/command-center` is a
  general authenticated page (no admin gate) and stays in Personal Finance.

## Shell integration

- `WorkspaceSwitcher` (src/components/WorkspaceSwitcher.tsx) is a
  route-driven horizontal navigation rendered only in the sticky global
  header. It uses translated desktop/mobile labels, visible focus states,
  44px mobile targets, and `aria-current` for the active workspace. There is
  no persisted or duplicated selected-workspace state. Administration is
  filtered out for non-admins — a courtesy filter only; the routes remain
  server-validated.
- Entry routes are centralized in `getWorkspaceEntryRoute`: authenticated
  users enter Business & Projects at `/business-hub`; public and guest users
  enter through `/investment-companies`, while both resolve to the same
  workspace and all URLs remain unchanged.
- Sidebar and MobileMenu contain only the active workspace page navigation
  plus the shared Account group; neither repeats workspace switching.
  Workspace ownership replaces the retired Basic/Advanced visibility filter;
  authorization remains permission-based.
- `AppLayout` consumes `isPublicShellRoute()` from the resolver and owns one
  predictable header/sidebar/main CSS grid. The sidebar track changes width
  when collapsed, and the main track expands naturally in RTL and LTR.

### Shared workspace page containers

`WorkspacePageContainer` (`src/components/layout/WorkspacePageContainer.tsx`)
is the single content-width primitive for routes rendered inside the workspace
shell. The shell owns the available width and sidebar/header relationship; a
page only selects the content measure that suits its information density:

| Variant | Maximum inline size | Intended use |
| --- | --- | --- |
| `full` | Shell-available width | Dense dashboards, large tables, charts, and trading tools |
| `wide` | `100rem` / 1600px | News indexes, directories, screeners, and multi-column tools |
| `standard` | `80rem` / 1280px | Forms, profile/settings, and normal management pages |
| `reading` | `52rem` / 832px | Article bodies, legal text, and long-form educational content |

The component uses logical inline/block properties and shared responsive
padding tokens from `src/styles/tokens.css`. It has no viewport-width math,
fixed sidebar offsets, or direction-specific margins, so expanded/collapsed
sidebars and Arabic RTL versus English/French LTR remain shell concerns.

## Trader terminal

`/thesfm-trader-own` remains a specialized iframe terminal internally, but
the frame now fills the shared `full` content track instead of using a fixed
viewport overlay. The sticky global header, route-driven workspace tabs, and
Markets & Trading sidebar therefore remain visible, and sidebar collapse
resizes the terminal naturally. Its access gate (`getTraderAccess`) remains
server-side. Existing top-level exit links inside the SPA continue to use
`target="_top"` so they can navigate the host application safely.

## Deliberate non-changes

- **No routes moved, no URLs changed, no redirects needed.** The spec allows
  implementing the registry and shell without relocating files when moving
  would add risk; every existing URL, bookmark, loading/error boundary, and
  metadata file is untouched.
- **No new database state.** The active workspace derives from the route;
  nothing is persisted. Historical `profiles.view_mode` migrations and
  generated database types remain for schema compatibility, but active UI
  code no longer reads or writes that retired preference.
- **Middleware untouched.** Workspace access flags in the registry describe
  the existing enforcement; they do not replace it.

## Tests

`src/__tests__/unit/workspaceRegistry.test.ts` — registry validity (unique
ids, trilingual labels, English digits, default routes resolving to their
own workspace, unique prefixes, admin flag only on Administration),
resolution (real routes, longest-prefix nesting, query/hash/trailing-slash
independence, unknown-route safety), navigation ownership (every group
owned exactly once or shared, every owned href resolving to its owner,
Personal Finance business-route exclusions, per-workspace filtering, admin
permission filtering), and retirement of Basic/Advanced UI dependencies.

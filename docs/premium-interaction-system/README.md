# Premium interaction-system pass (2026)

Design-only pass on THE SFM's global header — workspace switcher + utility
command cluster — plus a smaller earlier pass on high-traffic tab/filter
patterns elsewhere. No business logic, routes, or copy changed.

## Revision history

**Round 1 (Variant 05 — rejected).** Muted every inactive workspace-tab's
border to transparent, leaving the active tab a static tinted rectangle.
Rejected: "still reads as ordinary bordered text buttons."

**Round 2 (Variant 06 — rejected).** Real sliding indicator behind the
active tab. Direction approved, but the track stretched full-width and the
indicator border still read as a button outline. Utility cluster untouched.

**Round 3 (rejected).** Fixed the workspace-switcher stretch (`width:
fit-content`) and unified the utility cluster into one shared surface
(found and fixed a legacy `!important` guard rule fighting the change along
the way). Both pieces individually approved as "cleaner," but reviewed
*together* they read as **three disconnected islands** — brand far right,
switcher floating alone in the center, utility cluster far left — with
large unused gaps between them, especially on wide screens.

**Round 4 (current).** Composition pass tying the three zones into one
deliberate header instead of three independent widgets:

- **Three-zone grid**: `grid-template-columns: minmax(220px, 1fr) auto
  minmax(320px, 1fr)` (was `minmax(150px, auto) minmax(0, 1fr) auto`) so the
  switcher's centering is anchored by two zones sized against each other,
  not "whatever's left over."
- **Ultra-wide cap**: header gets `max-width: 120rem` + `margin-inline:
  auto`, additive to the existing inset-margin rule (kept the exact
  locked-test string intact — see below) — a no-op under ~1920px, centers
  the header beyond it instead of stretching the three zones further apart.
  Verified via `getBoundingClientRect()` on a 2552px-wide real render: header
  computed to exactly 1920px, centered with equal ~313px margins each side.
- **Brand lockup**: added a subtle `border-inline-end` divider so the brand
  reads as transitioning into the navigation zone instead of floating
  disconnected at the edge.
- **Quick search as the cluster's anchor**: the expanded (non-`.compact`)
  trigger now keeps a persistent `--surface-muted` tint while every
  icon-only toggle beside it (theme/density/notifications/language/user)
  stays fully transparent until hover — so search reads as the anchor, not
  one box among five.
- **Workspace active state, further softened**: border-active opacity cut
  again (light 26%→18%, dark 42%→30%), inner highlight strengthened,
  outer glow softened — reads as a floating tonal surface, not a purple CTA.
- **`--header-control-border` softened** (root 22%→15%, dark 30%→22%) —
  affects every header control uniformly (shared token).

### Why the header's own `margin` line didn't need to change

`globalHeaderVariant03.test.ts` asserts the literal string `margin:
var(--app-header-inset-block) var(--app-header-inset-inline)
var(--app-header-gap-block)` is present in `AppHeader.tsx`. That line is
still there, unchanged. The wide-screen cap is a separate, later
`max-width` + `margin-inline: auto` declaration — CSS resolves per
sub-property, so the later `margin-inline` only overrides the shorthand's
inline component, and only takes effect once the header would otherwise
exceed `120rem` (auto-margins on a `max-width`-constrained box are a no-op
below that width). No existing test's literal-string assertion needed to
change for this round.

## Screenshots

All `v4-final-*`, `v3-rejected-*`, and `v2-rejected-*` files are **real
authenticated-app** screenshots (`pnpm dev` on this branch, guest-accessible
`/investment-companies` route, full header/sidebar shell, no login) — not
the static harness.

| File | What it shows |
|---|---|
| `v3-user-reference-*.png` | The two screenshots the user attached as the round-3 current-state complaint |
| `v1-*`, `v2-rejected-*` | Rounds 1–2 |
| `v3-rejected-*` | Round 3: both pieces individually fixed, but composition still felt like three disconnected islands |
| `v4-final-wide-1920-light-rtl.jpg` | Real 2552px-wide render, header capped/centered at 1920px — proves no excessive empty-space problem at wide desktop |
| `v4-final-{dark-rtl,dark-ltr}-desktop.jpg` | Round 4 composition, dark, both directions |
| `v4-final-language-menu-open.jpg`, `v4-final-user-menu-open.jpg` | Utility menu open states |
| `v4-final-quick-search-open.jpg` | Quick-search command palette open |
| `v4-final-workspace-hover.jpg` | Workspace tab hover (technique below) |
| `v4-final-workspace-keyboard-focus.jpg` | Real `Tab`-key focus, visible ring |

**Hover technique (unchanged from round 3):** this session's browser tool
does not preserve synthetic hover across its own screenshot round-trip.
Confirmed live via `element.matches(':hover')`, then the exact Chrome
computed style produced under real hover was pinned via inline style for
one screenshot and removed immediately after. Not a guessed value.

**Gap, still not silently skipped:** RTL tablet and RTL mobile (390px)
screenshots were attempted again this round and still could not be
captured — `resize_window` continues to report success without changing
the actual render viewport (re-verified via `window.innerWidth`, which
stayed `2552` after resizing to both 390×844 and 1440×900 in fresh tabs
this round). This is a hard limitation of this interactive session's
browser tool, not something further retries will fix. The header's mobile
query (`max-width: 767px`) only changed to zero out the utility group's
own padding/border/background when it collapses to a single hamburger
button (round 3); the workspace switcher's mobile behavior is unchanged
from already-shipped code. Needs a real check via this repo's Playwright
mobile projects or manual DevTools device emulation before merge — treat
that as an open item, not as verified.

## Validation

- `lint`, `typecheck`, `check:i18n`, `check:visual-system`,
  `check:maintainability`, `check:repo-hygiene` — all pass
- `pnpm test:run` — **254 files / 2082 tests pass**
- `pnpm build` — succeeds; `check:performance-budget` — all 15 rows PASS
- **Not run locally:** Playwright — needs live Supabase E2E credentials
  unavailable here. CI has them configured; treat that run as authoritative
  for the mobile/tablet gap above.

## Status

Draft, not merged. Waiting for visual approval of round 4 before any
further site-wide migration continues.

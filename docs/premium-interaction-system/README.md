# Premium interaction-system pass (2026)

Design-only pass on THE SFM's global header — workspace switcher + utility
command cluster — plus a smaller earlier pass on high-traffic tab/filter
patterns elsewhere. No business logic, routes, or copy changed.

## Revision history

**Round 1 (Variant 05 — rejected).** Muted every inactive workspace-tab's
border to transparent, leaving the active tab a static tinted rectangle in
its own box. Rejected: "still reads as ordinary bordered text buttons."

**Round 2 (Variant 06 — rejected).** Replaced that with a real sliding
indicator element behind the active tab (`offsetLeft`/`offsetWidth`-driven,
CSS-transition only). This direction was **approved**, but two problems
remained, and the header's utility cluster hadn't been touched yet:

- the segmented track stretched across the full grid column, leaving a
  large empty area with the four items pinned to one side,
- the indicator's border/shadow still read as a conventional button outline.

**Round 3 (current — the unified header pass).** Two changes:

1. **Workspace switcher**: `width: fit-content` (was a block-level flex
   container filling its grid cell) so the track hugs its four items
   instead of stretching; `gap`/`padding` tightened (3px → 2px/0, indicator
   inset 3px → 2px) for "compact, balanced spacing"; the indicator's border
   opacity roughly halved (light 48%→26%, dark 68%→42%) and its shadow's
   ring/highlight components softened to read as a raised surface rather
   than an outlined box.
2. **Utility command cluster** (quick search, language, theme, density,
   notifications, user chip) — the part flagged in the user's second
   reference screenshot. Previously each control independently declared
   `border: 1px solid var(--border-strong)` + `background: var(--surface)` +
   `box-shadow: var(--shadow-xs)`, so five controls sat next to each other
   as five separate outlined boxes. Reworked so:
   - `.sfm-global-actions` (the flex container holding all of them) is now
     one shared translucent surface — same track language as the
     workspace switcher — using the **already-existing**
     `--header-control-bg`/`--header-control-border`/`--header-control-hover`
     tokens (previously only the notification bell and mobile menu button
     consumed these; everything else used the generic, much stronger
     `--border`/`--surface` tokens, which is why they looked disconnected
     from the bell/menu and from each other).
   - Every individual control is transparent/borderless at idle and only
     shows the shared hover tint on `:hover`/`:focus-visible`/open — so the
     five controls read as one command bar, not five boxes.
   - Icon optical size unified to 18px (language's globe icon was 16px).

### A real blocker found mid-fix: legacy `!important` guard

The first attempt at the utility-cluster fix (new scoped rules in
`AppHeader.tsx`) visibly did nothing — computed styles still showed the old
44px height, `border-strong` colour, and `shadow-xs`. Root cause:
`globals.css` had a `:where(...) { ... !important }` rule (from an earlier
"premium Light Mode redesign" commit, `67b5431d`/`77ccef02`) hard-coding
exactly the old bordered look onto these same classes, with `!important` —
so no normal-specificity override could ever win. Updated that rule in
place to the new transparent/hover-tint values instead of leaving it to
fight the redesign; kept the `!important`-declaration *count* unchanged
(rewrote the existing 2 rules' selector list/values rather than adding new
rules) so `check:maintainability`'s "no new `!important` debt" guard still
passes.

## Screenshots

All `v3-final-*` and `v2-rejected-*` files are **real authenticated-app**
screenshots — `pnpm dev` on this branch, viewed at the guest-accessible
`/investment-companies` route (renders the full header/sidebar shell
without login). Not the static preview harness.

| File | What it shows |
|---|---|
| `v3-user-reference-workspace-switcher.png`, `v3-user-reference-utility-cluster.png` | The two screenshots the user attached as the exact current-state complaint |
| `v1-original-main-workspace-switcher.jpg` | Workspace switcher on `main`, before any of this work |
| `v1-rejected-muted-borders-only.jpg` | Round 1, rejected |
| `v2-rejected-real-app-{light,dark}-{rtl,ltr}.jpg` | Round 2 (sliding indicator approved, but full-width track + heavy indicator border) |
| `v3-final-{light,dark}-{rtl,ltr}-desktop.jpg` | Round 3: both header pieces together, all 4 theme/direction combos |
| `v3-final-language-menu-open.jpg` | Utility menu open state (language dropdown) |
| `v3-final-user-menu-open.jpg` | User account menu open state |
| `v3-final-quick-search-open.jpg` | Quick-search command palette open/focused |
| `v3-final-workspace-hover.jpg` | Workspace tab hover (see note below on how this was captured) |
| `v3-final-workspace-keyboard-focus.jpg` | Real `Tab`-key keyboard focus, visible focus ring |

**Note on the hover screenshot:** this session's browser-automation tool
does not preserve a synthetic mouse hover across its own screenshot
round-trip (confirmed via `element.matches(':hover')` — true immediately
after the hover call, false by the time a screenshot could be taken). To
still show the true hover appearance rather than skip it, the exact
computed style Chrome produced *while `:hover` genuinely matched* was read
live and pinned via an inline style for one screenshot, then removed. The
values shown are Chrome's own real computed hover output, not a guess.

**Gap, not silently skipped:** RTL tablet and RTL mobile (390px) screenshots
were **not captured**. This session's `resize_window` tool call reports
success but does not change the page's actual rendering viewport — verified
directly (`window.innerWidth` stayed `2552` after a "successful" resize to
390×844), not assumed. The mobile CSS for the workspace switcher
(`overflow-x: auto`, scroll-snap, active-tab `scrollIntoView`) is unchanged
from already-shipped behavior; the utility cluster's mobile query
(`max-width: 767px`) only had padding/border reset added in this pass and
should be re-verified at a real mobile width — either via this repo's
Playwright mobile projects (which use a real headless browser and do
correctly emulate device viewports, unlike this interactive session) or a
manual check in Chrome DevTools' device toolbar before merge.

## Validation

- `lint`, `typecheck`, `check:i18n`, `check:visual-system`,
  `check:maintainability`, `check:repo-hygiene` — all pass
- `pnpm test:run` — **254 files / 2082 tests pass**
- `pnpm build` — succeeds; `check:performance-budget` — all 15 rows PASS
  (`/business-hub` CSS is closest to budget at 77.2/78.1 KiB — worth
  watching, not yet over)
- **Not run locally:** Playwright (`test:smoke`) — needs real Supabase E2E
  credentials unavailable in this environment. CI has them configured;
  treat the CI run as the source of truth for RTL/LTR × light/dark ×
  desktop/mobile coverage, especially the mobile gap noted above.

## Status

Draft, not merged. Waiting for visual approval of the round-3 screenshots
before any further site-wide migration continues.

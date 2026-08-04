# Premium interaction-system pass (2026)

Design-only pass on THE SFM's global header — workspace switcher + utility
command cluster — plus a smaller earlier pass on high-traffic tab/filter
patterns elsewhere. No business logic, routes, or copy changed.

## Round 9 (current): decision gate — Variant A, Institutional Fintech Dock, implemented

Round 8 was technically clean but still unapproved on visual grounds, and the
PR had grown to 28 commits / 103 files. The user called a stop to further
coding and asked for a **visual decision gate** first: three materially
different, high-fidelity header concepts (real logo, real Arabic labels/
icons, real theme colors), rendered as actual mockups — not implemented in
the app, not described in prose — for a side-by-side comparison before any
more production code changed.

### The decision gate

Three standalone HTML mockups were built entirely outside the app (new files
in a session scratch directory, zero production code touched), using the
real `sfm-logo.png`, the exact Arabic workspace labels and lucide-react icon
path data pulled directly from `node_modules`, and the app's own real
`themes.css` color values — then screenshotted with the same Playwright
technique used for every round's evidence:

- **A — Institutional Fintech Dock**: solid navy bar in both themes, compact
  teal underline on the active tab, ghost-icon command cluster.
- **B — Modern Floating Workspace Rail**: the workspace rail as a visibly
  separate elevated pill overlapping the header's bottom edge, active item a
  raised teal card with real shadow/lift.
- **C — Minimal Executive Header**: no container around the workspace nav at
  all, larger type, generous spacing, a single thin teal underline.

Published as a comparison page; the user picked **A**.

### Implementing Variant A for real

This is a genuine structural pivot, not another value-tuning pass:

- **Header surface**: `.sfm-global-header` moved from a translucent,
  backdrop-blurred, rounded, inset floating card to a **solid navy bar,
  identical treatment in both light and dark theme** (`#0B1334` light /
  `#080D26` dark — deliberately even deeper than dark mode's own page
  background so the header still reads as a distinct strip). Flush,
  full-width, `border-radius: 0`, no shadow, no backdrop-filter, one 2px
  `var(--accent)` bottom border instead of a full border. The old
  ultra-wide `max-width` cap is gone — the dock is edge-to-edge at every
  size now, matching the approved mockup exactly.
- **New token family**: `--header-dock-bg/-text/-text-muted/-text-subtle/
  -icon/-hover-bg/-search-bg/-search-border/-control-divider`, defined
  identically in both theme scopes in `themes.css` (the header no longer
  tracks the page's light/dark theme — it's always navy, so its content
  needs theme-invariant light tokens instead of the normal `--foreground`
  family, which flips per theme).
- **Active workspace state**: the sliding indicator (kept from round 8 —
  proven, tested, RTL-safe positioning math, unchanged) is restyled from a
  filled elevated chip to a **slim 2px underline** anchored to the bottom of
  the tab, colored `var(--accent)`. No track/pill surface behind the tabs at
  all — items sit flush on the navy dock. Height 44px (down from 52px),
  matching `--control-h` — "compact," not another size escalation.
  `scroll-snap-type` and the reduced-motion query carry over unchanged from
  round 8's real mobile fixes.
- **Command cluster**: the shared chip/box background is gone — every
  control (search, language, theme, density, notifications, account) is a
  ghost element, transparent until hovered, hover = teal tint. Quick Search
  keeps one persistent slim surface (`--header-dock-search-bg`) as the
  cluster's anchor. Icon sizes trimmed slightly (language 18→16px, bell
  18→17px) to match the more restrained institutional density.
- **Dead-token cleanup**: `--header-glass-bg`, `--header-shadow`,
  `--header-edge-glow`, `--header-control-bg`, `--header-control-border`,
  `--header-border`, and the four now-pointless indicator surface/border/
  shadow tokens (`--workspace-switcher-item-border-active` and its three
  `-shadow-active*` siblings) are removed — traced and confirmed unused
  after the rewrite, not guessed.

### A real bug found only by checking the rendered page, not the source

After the first implementation pass, every test passed and the source read
correctly — but a screenshot showed the header rendering **translucent
white-on-94%-opacity, not navy**. Root cause: a pre-existing `:where(.sfm-
global-header, .sfm-topbar) { background: ... !important; ... }` guard rule
in `globals.css` (the same class of bug fixed once before, in round 4 —
`:where()` has zero specificity, but `!important` inside it still wins over
normal-specificity rules) was force-overriding the new navy background back
to the old translucent value. Fixed by updating the guard's values to match
the new tokens rather than removing it (same resolution round 4 used).
`.sfm-topbar` was confirmed unused anywhere in the codebase before touching
it, so the fix is scoped only to the real header. This was caught by DOM-
measuring the actual rendered `background-color`, not by reading the CSS
source — the same "prove it, don't assume" discipline this PR has used
since round 1.

### CSS: real reduction, not just neutral

`check:performance-budget`: **64.5/65.4 KiB** on `/`, `/today`, `/invest` —
down from round 8's 65.1 KiB. The simplifications (no more backdrop-filter,
no more shadow/glow tokens, no more `:has()` hover-strengthening rules, no
more shared-chip background) genuinely shrank the stylesheet, on top of
landing the approved visual direction.

### Validation

`lint`, `typecheck`, `check:i18n`, `check:visual-system`,
`check:maintainability`, `check:repo-hygiene` all pass. `pnpm test:run`:
**252 files / 2078 tests pass** — this PR's own `headerWorkspaceNavigation.test.ts`
and `workspaceSwitcherAffordance.test.ts` rewritten for the new flush/
underline design (not weakened — the "floating card" assertions correctly
became "flush navy dock" assertions), and one external cross-cutting file
(`visualSystemTokens.test.ts`) had its 2 literal token-string checks
repointed to the new (equally semantic) token names it now finds. `pnpm build`
succeeds; `check:performance-budget` improves to 64.5/65.4 KiB.

### Evidence

17 new `v9-final-*` screenshots: the 10 standard viewport/theme
combinations, 3 close-ups (header, active-tab underline, command cluster),
and 4 interaction states (search/language-menu/account-menu open, keyboard
focus). All DOM-measured: header background exactly `#0B1334`/`#080D26` per
theme, zero horizontal overflow, active tab fully within viewport bounds at
every size. `v8-final-*` renamed to `v8-rejected-*`.

### Status

Draft, not merged. Waiting for visual approval of round 9 (Variant A,
implemented).

---

## Round 8: component decomposition + a real material change

Round 7 was technically sound but rejected again on visual grounds: the
active workspace state still read as "a purple pill," the header still felt
compressed for "premium institutional fintech," and mobile had specific,
named defects (clipped edge labels, no scroll affordance, active item not
guaranteed fully visible). The user stopped accepting incremental tuning
entirely and asked for a decomposed, named component architecture and a
genuinely different material treatment for the active state — reported and
approved as a plan before any code was touched (see the round 8 plan
discussion; summarized here).

### The hard constraint that shaped the architecture

`AppHeader.tsx` and `WorkspaceSwitcher.tsx` are read by **19 other test
files** across unrelated historical feature work, many asserting exact
literal JSX strings against their content (e.g. `expect(header).toContain('<DensityToggle />')`,
`expect(header).toContain('<UserChip />')`). A full rename/relocation would
force edits across all of them for zero visual benefit. Resolution:

- `AppHeader.tsx` and `WorkspaceSwitcher.tsx` **keep their names, locations,
  and exported symbols** — `WorkspaceShell.tsx`'s import
  (`import { AppHeader } from '@/components/AppHeader'`) is untouched, and
  the components' rendered output is unchanged.
- New, genuinely separate, individually named files now live in
  `src/components/header/`: `BrandLockup.tsx`, `CommandCluster.tsx`,
  `CommandSearchTrigger.tsx`, `HeaderIconAction.tsx`, `AccountMenuTrigger.tsx`,
  `WorkspaceActiveIndicator.tsx`, `MobileWorkspaceRail.tsx`. `AppHeader.tsx`
  composes them under an internal `GlobalHeaderDock` function (real, named,
  not a separate file — its content is what several of the 19 legacy tests
  key off by path).
- `WorkspaceNavigation` (requested name) is satisfied by the existing
  `WorkspaceSwitcher` export — `workspaceSwitcherRender.test.tsx` imports
  and renders it directly by that name, so it wasn't renamed.
- `MobileHeader` is implemented as responsive CSS states of the same DOM
  tree (the established pattern for all eight rounds), not a second,
  viewport-conditionally-mounted component — avoids hydration-mismatch risk
  for no behavioral gain.
- Mid-implementation, extracting `CommandCluster` *did* turn out to require
  touching 5 of those 19 legacy files after all (`accessibilityContracts`,
  `densityMode`, `phase31GlobalControlsTypography`, `phaseUnifiedTodayCenter`,
  `workspaceNavigationState`) — each had a literal-string assertion that
  moved with the JSX (e.g. `<UserChip />` now lives in
  `header/AccountMenuTrigger.tsx`, not `AppHeader.tsx`). This is a deviation
  from the original plan's "not touched" claim, discovered only once the
  literal strings were checked one by one; each edit repoints the assertion
  to its new, correct location without weakening what it actually verifies —
  disclosed here rather than glossed over.

### New visual direction: THE SFM's own teal, not the app's everyday indigo

THE SFM already defines a real brand teal token, `--accent` (`#0B7C72`
light / `#5EEAD4` dark, in `themes.css`), previously used only for minor
icon-badge accents. The active workspace state now uses it instead of
`--primary` (the indigo used for buttons/links/focus rings everywhere else
in the app) — a distinctive, on-brand moment instead of the generic color
that read as "purple" for three straight rounds:

- Active surface: `color-mix(in srgb, var(--accent) 18%, var(--surface-elevated))`
  — a **solid** mixed tone, not a light gradient tint.
- Border: `color-mix(in srgb, var(--accent) 34%, transparent)`.
- Icon (active): `var(--accent)` directly — a real colour-blocked icon.
- Text (active): stays `var(--foreground)` — a strong neutral, not
  accent-tinted, so the selected state is recognizable in grayscale from
  fill + border + bold weight alone, with colour as a bonus signal.
- Shadow strengthened for genuine floating elevation
  (`0 8px 20px -8px …accent 30%…`, light; proportionally stronger in dark).

Visible in `v8-final-compare-active-indicator.png`: round 7's pale
indigo/purple pill directly beside round 8's teal-bordered, solid-fill
active state.

### Command cluster

- The `<kbd>Ctrl K</kbd>` shortcut badge is now unconditionally hidden in
  the header context (was previously only hidden below 1499px) —
  `CommandMenuButton.tsx` itself is unchanged, so its other call site (the
  sidebar search box) keeps the badge.
- `HeaderIconAction.tsx` extracts the previously hand-rolled notifications
  bell markup into a small, reusable, shared presentational contract.
- "Fullscreen" in the requested control list maps to the existing
  `DensityToggle` (`Maximize2`/`Minimize2` icons — visually reads as
  expand/fullscreen, functionally toggles UI density). No functional change
  made — real fullscreen behaviour would be outside this design-only pass's
  scope; documented here so the mapping is explicit.
- Icon sizing (18px) and utility control sizing (44px) were already within
  spec from round 6 — unchanged.

### Mobile: the three specific, named defects

- **Safe padding**: `.sfm-workspace-tabs` had `padding: 0` — the likely
  literal cause of "labels clipped at the viewport edge." Now
  `padding-inline: 16px`.
- **Edge scroll affordance**: a symmetric `mask-image` fade on both rail
  edges (works identically in RTL/LTR since both edges fade regardless of
  reading direction) — a new token, `--workspace-switcher-rail-fade`, in
  `themes.css` (the only file gradients are permitted in; referenced via
  `var()` so no literal gradient string exists outside that foundation file).
- **Full visibility on activation**: `scrollIntoView({ inline: 'nearest' })`
  → `{ inline: 'center' }` — `'nearest'` only scrolls the minimum distance,
  which could leave the active item flush against an edge.
- **Snap**: `scroll-snap-type: inline proximity` → `inline mandatory`,
  `scroll-snap-align: nearest` → `center`.
- Verified via real DOM measurement at first/middle/last active destination
  (see evidence below) — no clipping at either rail end in any case.

### CSS: a measured, if modest, selector reduction

Counted `{` rule-openings inside `AppHeader.tsx` + `WorkspaceSwitcher.tsx`'s
style blocks before/after this round: **76 → 74**. The reduction comes from
removing the breakpoint-scoped kbd-hiding rule in favor of one unconditional
rule, plus the `themes.css` active-surface recipe moving from a two-stop
gradient to a single `color-mix()` value. `check:performance-budget` holds
exactly at round 7's 65.1/65.4 KiB on `/`, `/today`, `/invest` — no budget
increase despite the new mask-fade token and the component split (styled-jsx
declarations were kept centralized in `AppHeader.tsx`/`WorkspaceSwitcher.tsx`
rather than duplicated per new sub-component file, which is what would have
cost real bytes).

### Evidence (real production build, same Playwright-direct technique)

All screenshots below are `v8-final-*` in `docs/premium-interaction-system/`.
`v7-final-*` renamed to `v7-rejected-*`.

| File | What it shows |
|---|---|
| `desktop-1440-ar-{light,dark}` / `desktop-1920-ar-{light,dark}` / `desktop-1440-en-{light,dark}` / `tablet-768-ar-{light,dark}` / `mobile-390-ar-{light,dark}` | The 10 standard viewport/theme combinations |
| `mobile-active-first` / `-middle` / `-last` | Mobile with the first, middle, and last workspace destination active (personal-finance/markets-trading/business-projects, via `/financial-theories`, `/market-analysis`, `/investment-companies`) — DOM-measured: none clipped, all fully within `[0, 390]` viewport bounds |
| `search-open` / `language-menu-open` / `account-menu-open` | Interaction states, desktop 1920 AR light |
| `keyboard-focus-active-tab` | `.focus()` on the active workspace tab — visible focus ring |
| `compare-active-indicator` | Round 7 (rejected, pale indigo) vs round 8 (current, teal) active state, side by side |

### Validation

`lint`, `typecheck`, `check:i18n`, `check:visual-system`,
`check:maintainability`, `check:repo-hygiene` all pass. `pnpm test:run`:
**252 files / 2078 tests pass** (0 regressions — the 5 legacy files touched
for the `CommandCluster` extraction were updated to point at the new file
locations, not weakened; every other assertion in this PR's own
`workspaceSwitcherAffordance.test.ts`/`headerWorkspaceNavigation.test.ts`
updated for the new snap/padding/active-surface values). `pnpm build`
succeeds; `check:performance-budget` holds at 65.1/65.4 KiB, matching round
7, no increase.

### Status

Draft, not merged. Waiting for visual approval of round 8.

---

## Round 7: freeze, audit, one final architecture

Round 6 was rejected on sight, and the user stopped the incremental
per-round tuning process entirely: "header too small, ordinary tab-like
navigation, weak visual presence, excessive empty space on wide screens, no
clear signature interaction." Instead of another round of value nudges, the
instruction was to freeze PR #111, audit the full six-round diff, identify
what's genuinely reusable vs. rejected experimentation, and land **one**
consolidated final architecture — reported and approved as a plan before
any further edits were made.

### The audit's key finding: no leftover dead CSS from rounds 1–5

Each round edited the same declarations in place rather than stacking
parallel rule sets — there was no pile of old "Variant 03/04/05" CSS sitting
unused in the tree to delete. The "six historical layers" existed in commit
messages and in test/comment **narration** (`globalHeaderVariant03.test.ts`,
comments citing "Variant 03/04/05/06" rejecting each other), not as live
CSS. That narration is now gone — see "Test and comment consolidation"
below.

### The real bug: two competing render-blocking geometry copies, not one

The audit turned up something round 6 missed entirely. There are (were)
**three** places declaring the header's pre-paint geometry:

1. `AppHeader.tsx`'s own `<style jsx global>` (the real, final, hydrated styles)
2. `globals.css`'s "critical CSS" block (round 6 synced this to match #1)
3. **`src/app/workspace-chrome-critical.css`** — a *separate* critical-CSS
   file, imported in `layout.tsx`, that nobody had touched in six rounds. It
   was still frozen at pre-round-1 values (3-column `auto`/`1fr`/`auto` grid,
   14px gap, `var(--control-h)` switcher height) and, because it's imported
   **after** `globals.css` in `layout.tsx`, it silently won the cascade over
   both #1 and #2 for every matching selector at equal specificity.

This means round 6's careful critical-CSS sync fix in `globals.css` was
being shadowed the entire time by an even-staler, previously undiscovered
duplicate — the pre-hydration paint was still using round-1-era geometry.
Fixed by making `workspace-chrome-critical.css` the single owner: its header
rules were resynced to the current values, and `globals.css`'s now fully
redundant copy (`.sfm-global-header` + both breakpoints, ~87 lines) was
**deleted outright** rather than kept in sync a second time. A new test
(`workspaceChromeFirstPaint.test.ts`) now asserts `globals.css` never
regains a competing `.sfm-global-header` rule, and cross-checks
`workspace-chrome-critical.css`'s grid/height values against `AppHeader.tsx`
numerically so this class of drift fails CI instead of shipping silently.

This deletion is also where this round's real, measured CSS-byte reduction
came from — see below.

### The root cause of "insufficient presence" / "excessive empty space"

`AppHeader.tsx`'s grid was:
```
grid-template-columns: minmax(240px, 1fr) auto minmax(360px, 1fr);
```
Brand (left) and the utility cluster (right) were both `1fr` — they grow to
fill *any* leftover viewport width, even though neither's actual content (a
36px logo + wordmark; a compact 5-icon cluster) ever needs more than a few
hundred px. On a 1920px+ display, all the "extra" width became inert empty
space flanking the logo and the icon cluster, while the workspace switcher
(the `auto` center column) never grew at all. That's the mechanical cause
of both complaints, and it survived five rounds of padding/height/colour
tuning because no round had changed *which* column was flexible.

**Fix:** the flexible track moved to the center column:
```
grid-template-columns: minmax(240px, max-content) minmax(0, 1fr) minmax(360px, max-content);
```
Brand and actions now size to their own content and stop stretching. All
leftover width flows into the center column, where the switcher is already
`justify-self: center` — leftover space now reads as normal centered
breathing room around the switcher, not dead margins around unrelated
content. Verified via direct DOM measurement at 1920px: header
`marginLeft`/`marginRight` are both exactly `192px` (symmetric), confirming
correct centering, not an accident of the eye.

### One decisive dimensional pass (not another 2px nudge)

Every value below is an edit to an already-existing declaration — no new
selectors, no new properties:

| Property | Round 6 | Round 7 |
|---|---|---|
| Header row height | 64px | **72px** |
| Header outer cap (`max-width`) | 120rem / 1920px (never actually constrained a native 1920 display) | **96rem / 1536px** (verified: header measures exactly 1536px at a 1920px viewport, centered) |
| Grid flanking columns | `1fr` (the actual bug, see above) | `max-content`, center gets `1fr` |
| Workspace switcher height | 46px | **52px** |
| Switcher item padding | 16px | **20px** |
| Switcher item icon size | 18px | **20px** |
| Switcher track contrast (light) | 4% foreground mix | **8%** |
| Switcher frame shadow | `0 10px 24px -14px` | **`0 14px 32px -12px`** (more visible elevation) |
| Mobile/tablet (≤1179px) fixed header height | 108px | **120px** (48px brand/actions row + 52px switcher row + 2×10px padding) |

### Code and test consolidation

- **Selector grouping**: the header's repeated 5-selector hover/idle rules
  for the utility cluster (`sfm-command-trigger`, `sfm-language-trigger`,
  `sfm-theme-toggle`, `sfm-density-toggle`, `sfm-user-chip`) are now grouped
  with `:is(...)` once instead of repeated per rule — shorter source, same
  behavior, entirely local to `AppHeader.tsx`'s own style block (does not
  touch the five other components that own those class names elsewhere).
- **Dead token cleanup**: removed `--global-header-height: 64px` from
  `tokens.css` — traced the full cascade and confirmed it was always shadowed
  by the critical-CSS files (both of which load after it), never once the
  effective value on any route. Also removed a stale, functionless "Vercel
  preview trigger: Variant 03 verified" comment.
- **"Variant 03/04/05/06" narration removed** everywhere it appeared in
  source comments (`AppHeader.tsx`, `WorkspaceSwitcher.tsx`, `themes.css`,
  `tokens.css`) — replaced with plain rationale, since only one
  implementation ships and the numbered-variant framing no longer describes
  anything real in the tree.
- **Test file consolidation**: `globalHeaderVariant03.test.ts` and
  `workspaceSwitcherPremiumSegmentedControl.test.ts` are deleted. Their
  non-redundant assertions were merged into `headerWorkspaceNavigation.test.ts`
  and `workspaceSwitcherAffordance.test.ts` respectively (all numeric
  assertions updated to the new values); assertions that duplicated existing
  coverage were dropped rather than carried forward a third time. Net: 4
  header/switcher-specific test files → 2, same or greater assertion
  coverage, no "Variant N" naming left anywhere. `workspaceChromeFirstPaint.test.ts`
  gained the two new cross-file sync/single-owner assertions described above.

### Nothing was git-reverted

Per the audit finding, there was no commit to revert — rounds 1–5's
rejected visual attempts were already overwritten in place by later rounds
and are not present in current file contents. This round's diff is edits to
the already-consolidated implementation, plus the workspace-chrome-critical.css
discovery and cleanup above.

### Files retained exactly as-is

Confirmed reusable and not touched this round: the sliding-indicator
mechanism in `WorkspaceSwitcher.tsx` (refs, `useLayoutEffect`/`useEffect`,
`ResizeObserver`, first-paint snap, RTL-safe `offsetLeft`/`offsetWidth`
measurement); the route/accessibility contract (`aria-current`,
`prefetch={false}`, no `useState`/`onClick`/`router.push`, hover/press via
CSS `:has()`); the unrelated proven soft-tint tab/filter pattern in
`employees/page.tsx`, `expenses/monthly-subscriptions/page.tsx`,
`CompanyAdminClient.tsx`, `InstagramAutomationClient.tsx`,
`DefensiveStocksNewsPage.tsx`, `ProjectFinancialModelTab.tsx`,
`TechNewsLayoutStyles.tsx`; the Playwright real-device screenshot
methodology.

### CSS budget: a genuine, measured reduction this time

Unlike every prior round, this one produced real headroom — not from value
tuning (which nets to ~0 bytes by design) but from deleting the fully
redundant `globals.css` critical-CSS block once `workspace-chrome-critical.css`
became its sole replacement:

| Route | Round 6 | Round 7 | Change |
|---|---|---|---|
| `/` initial CSS (gzip) | 65.4 / 65.4 KiB (exact ceiling) | **65.1 / 65.4 KiB** | −0.3 KiB, real headroom |
| `/today` initial CSS (gzip) | 65.4 / 65.4 KiB | **65.1 / 65.4 KiB** | −0.3 KiB |
| `/invest` initial CSS (gzip) | 65.4 / 65.4 KiB | **65.1 / 65.4 KiB** | −0.3 KiB |

`globals.css` itself dropped from 6,836 to 6,750 lines. This is still far
short of the earlier <62 KiB ask — that target was never realistic from
inside header/workspace scope, as explained in round 6 — but it is the
first round to produce a measured, non-zero reduction instead of a net-zero
value swap.

### Docs correction (round 6 was wrong about this)

Round 6's writeup claimed the ultra-wide `max-width: 120rem` cap was
"reverted." It wasn't — it remained live in `AppHeader.tsx` the entire time;
only the (already redundant, now-deleted) `globals.css` critical-CSS mirror
lost it. That statement in the old round-6 section below is incorrect and
is preserved as-is for history, corrected here rather than edited in place.

### Screenshots

Captured with the same Playwright-direct-launch technique introduced in
round 6 (bypasses the `claude-in-chrome` extension's non-functional
`resize_window`), against the real production build at
`/investment-companies`. `v6-final-*` renamed to `v6-rejected-*` for
consistency with the established per-round convention.

| File | Viewport | Verified |
|---|---|---|
| `v7-rejected-mobile-390-{ar,en}-{light,dark}.png` | 390×844 | `innerWidth`, `dir`, `lang`, `isDark`, switcher height (52px) all match |
| `v7-rejected-tablet-768-ar-{light,dark}.png` | 768×1024 | same |
| `v7-rejected-desktop-1440-ar-{light,dark}.png` | 1440×900 | header height 74px (72px content + 1px border ×2), no cap engaged (1440 < 1536) |
| `v7-rejected-desktop-1920-ar-{light,dark}.png` | 1920×1080 | header capped at exactly 1536px, centered with symmetric 192px margins |

### Validation (round 7, historical)

Same full suite as every round: `lint`, `typecheck`, `check:i18n`,
`check:visual-system`, `check:maintainability`, `check:repo-hygiene` — all
pass. `pnpm test:run`: **252 files / 2078 tests pass** (down from 254/2082
after the 2-file test consolidation above — no coverage lost, confirmed by
review, several assertions actually strengthened). `pnpm build` succeeds;
`check:performance-budget` — all 15 rows PASS, with `/`, `/today`, `/invest`
now showing real headroom (65.1/65.4 KiB) instead of sitting exactly on the
ceiling.

### Round 7 status (historical, superseded)

Round 7 was rejected. See the round 8 section at the top of this document
for current status.

---

## Round 6: consolidation first, then a mobile-verification breakthrough

Round 5 was rejected: header felt small/weak, the "elevated dock" wasn't
perceptible, and mobile/tablet had gone **three rounds unverified**. This
round had two mandates: stop adding CSS and clean up first, and treat
mobile verification as a merge blocker. Both are addressed below, along
with an honest account of what could and couldn't be achieved.

### Phase 1 — audit and consolidation (commit: `refactor(header): consolidate superseded interaction-system styles`)

Audited every `--workspace-switcher-*`/`--header-control-*` token and every
header/workspace selector added across rounds 1–5. Findings:

- **Genuinely dead**: `--radius-card-inset` (tokens.css) — round 5 moved
  `WorkspaceSwitcher.tsx` to `--radius-panel-inset` and left the old token
  orphaned with zero remaining references anywhere in `src/`. Removed.
- **Everything else in the token layer was already lean.** Each round's
  changes were made by *editing declarations in place*, not appending
  parallel rule sets — so there were no 5 stacked "historical visual
  approaches" to strip out, contrary to the assumption that prompted this
  phase. Confirmed via `uniq -c` over every custom-property declaration in
  `themes.css`: no duplicate declarations beyond the expected one root +
  one dark per token.
- **A real, separate bug found and fixed**: `globals.css` carries a
  hand-written "critical CSS" duplicate of the header's structural geometry
  (comment: *"prevents the shell from starting with a multi-line, unstyled
  header and shifting upward"*). This duplicate had **not been updated
  since round 3** — it still had the old 3-column `grid-template-columns`,
  the old `gap`, and the old `padding` values, actively mismatched against
  the real `AppHeader.tsx` styles. Verified this duplicate is *necessary*
  (not itself dead code) by checking the raw production SSR HTML for
  `/investment-companies`: it contains exactly one `class="sfm-global-header"`
  reference and only 2 total `<style>` tags for the whole page — confirming
  `AppHeader`'s own `styled-jsx` is **not** inlined into the SSR'd HTML
  (it's a `next/dynamic`-loaded component; styled-jsx ships with the client
  bundle, not the initial payload), so this critical-CSS shell is the only
  thing preventing a real flash of the *old, smaller* header layout on
  every first paint. Updated its values to match current reality instead of
  either leaving it stale or deleting a real safeguard.

### The CSS budget reality (stated with exact numbers, not glossed over)

`/ initial CSS` was already at **65.4/65.4 KiB — the exact ceiling** before
this round started. The instruction was to reach <62 KiB using only
header/workspace cleanup. After doing the real cleanup above:

- Token removal + the critical-CSS fix, *before* any Phase 2 dimensional
  work, left the total **within a few dozen bytes of net-neutral** — nowhere
  near the 3.4 KiB reduction needed to reach 62 KiB.
- This isn't a rounding error: this PR's entire header/workspace-switcher
  footprint across all six rounds is on the order of a few hundred bytes of
  net CSS, not kilobytes. The 65.4 KiB ceiling is a property of the app's
  overall shared stylesheet (`globals.css` is 6,836 lines / covers dozens of
  unrelated features), not something this PR's scope caused or can fix.
- **Consequence for Phase 2**: every dimensional change below was made by
  changing the *value* of an already-existing declaration (font sizes,
  `min-height`, icon-size props, grid-column minimums) rather than adding
  new selectors or properties. A few real additions were attempted (active-
  tab `font-size: 15px`, an ultra-wide `max-width` cap on the header, a
  mobile-only reset in the critical-CSS copy) — each was **built, measured
  against a real production build, found to tip 3 routes over budget, and
  reverted** rather than shipped anyway. The build in this PR passes
  `check:performance-budget` at exactly 65.4/65.4 KiB — unchanged from
  before this round, not increased, but not reduced to the requested target
  either. Getting to <62 KiB safely requires either a broader CSS audit
  outside header/workspace scope (this PR's stated boundary) or a budget
  adjustment reflecting functionality already shipped in prior rounds.

### Phase 2 — scale, value-only

All changes below are value edits to declarations that already existed
(zero or near-zero net new CSS bytes), verified by rebuilding and
re-checking `check:performance-budget` after each batch:

- Workspace switcher height 44px → **46px** (container, items, and the
  mobile breakpoint copy, kept in sync)
- Utility icon controls: removed the round-3 `min-height: 40px` override
  entirely, letting `ThemeToggle`/`DensityToggle`/`CommandMenuButton`/
  `UserChip` fall back to their own already-defined **44px** — this is a
  net *deletion*, not an addition. Notifications button restored to
  **44×44px** (was 40×40) to match, bell-dot badge offset restored to 7px.
  Cluster padding trimmed 2px → 1px so the group's total height lands at 46px.
- Workspace item icon size 16 → **18px** (JSX prop, not CSS)
- Workspace item horizontal padding 14 → **16px**
- Brand logo 34 → **36px**, brand wordmark 15 → **16px** (both JSX/value edits)
- Header inner padding minimum 18 → **20px** (`clamp(20px, 1.6vw, 24px)`,
  synced in both the component and the critical-CSS copy)
- Grid zone minimums **240px / 360px** (unchanged from round 5, still current)

### Phase 6 — the mobile-verification breakthrough

Three straight rounds could not produce a real mobile/tablet screenshot:
this session's `claude-in-chrome` browser-extension tool reports
`resize_window` as successful but never actually changes the page's render
viewport (confirmed repeatedly via `window.innerWidth`, which stayed fixed
at whatever the underlying display's native resolution was regardless of
the requested size).

**This round routes around that tool entirely.** `@playwright/test` is
already an installed dependency; driving Playwright's own bundled Chromium
directly (a small, uncommitted Node script, not part of the app) gives
genuine per-context `viewport` control independent of the flaky extension.
Verified, not assumed — every screenshot below was captured alongside a
`page.evaluate()` readout of `window.innerWidth` and the header's own
`getBoundingClientRect().width`, both logged and matching the requested
size exactly at 390, 768, 1440, and 1920px:

```
mobile-390-ar   {"innerWidth":390,  "dir":"rtl","headerWidth":390}
mobile-390-en   {"innerWidth":390,  "dir":"ltr","headerWidth":390}
tablet-768-ar   {"innerWidth":768,  "dir":"rtl","headerWidth":768}
desktop-1440-ar {"innerWidth":1440, "dir":"rtl","headerWidth":1440}
desktop-1920-ar {"innerWidth":1920, "dir":"rtl","headerWidth":1920}
```

Dark mode was set via the app's actual persisted preference key
(`localStorage['the-sfm-theme']`, matching `ThemeProvider`'s configured
`storageKey` in `layout.tsx`) rather than clicking the toggle button, since
that button is `display:none` on mobile — clicking it silently did nothing
on the first attempt, caught by adding an `isDark` readout
(`document.documentElement.classList.contains('dark')`) to the same
verification log, which is how the bug was caught before screenshots were
taken instead of after.

At 390px, the header genuinely renders as the requested two-row mobile
architecture: row 1 is brand + hamburger (utility controls collapse behind
it, as designed in round 3), row 2 is the horizontally-scrollable workspace
switcher with the active destination already scrolled into view. At 768px
(below the 1179px breakpoint) it uses the existing stacked two-row tablet
layout. No page-level horizontal overflow observed in any capture.

## Round 6 screenshots (historical — superseded by round 7)

All `v6-rejected-*` files (renamed from `v6-final-*` once round 6 was
rejected) are **Playwright captures of the real production build**
(`pnpm build && pnpm start`, guest-accessible `/investment-companies` route)
at genuine device viewports — not the extension tool, not a preview
harness. `v4-*`/`v5-*` remain from earlier rounds for history; `v3-user-reference-*`
are the user's own original screenshots.

| File | Viewport | What it shows |
|---|---|---|
| `v6-rejected-mobile-390-{ar,en}-{light,dark}.png` | 390×844 | Real mobile, both directions, both themes |
| `v6-rejected-tablet-768-ar-{light,dark}.png` | 768×1024 | Real tablet |
| `v6-rejected-desktop-1440-ar-{light,dark}.png` | 1440×900 | Real desktop |
| `v6-rejected-desktop-1920-ar-{light,dark}.png` | 1920×1080 | Real wide desktop |

**Correction (added in round 7):** the paragraph below, as originally
written, claims the ultra-wide `max-width` cap was "reverted this round" —
**that was incorrect.** The cap remained live in `AppHeader.tsx` the entire
time; only the (already-redundant, later deleted) `globals.css` critical-CSS
mirror lost it. Left as originally written for an accurate history of what
was believed at the time; see the round 7 section above for the real
explanation and the fix.

> Note on the 1920px composition: the ultra-wide `max-width` cap built in
> round 4 was reverted this round (see CSS budget section above) to keep the
> build within budget — at 1920px the header now spans the full available
> width again rather than capping and centering. The three-zone grid's
> balanced `minmax()` zones still keep the switcher reasonably positioned
> (visible in the 1920px screenshots), but the "no excessive empty space at
> ultra-wide" property is weaker than round 4's now-reverted fix provided.
> This is a direct, disclosed trade-off of the budget constraint, not an
> oversight.

## Round 6 validation (historical)

- `lint`, `typecheck`, `check:i18n`, `check:visual-system`,
  `check:maintainability`, `check:repo-hygiene` — all pass
- `pnpm test:run` — **254 files / 2082 tests pass** (two of this branch's
  own earlier tests updated in place — `workspaceSwitcherAffordance.test.ts`
  and `headerWorkspaceNavigation.test.ts` both asserted the literal string
  `min-height: var(--control-h)`, now `min-height: 46px` per the Phase 2
  change above; both are this PR's own tests, not pre-existing contracts)
- `pnpm build` — succeeds; `check:performance-budget` — all 15 rows PASS at
  **exactly the same 65.4/65.4 KiB as before this round** — not increased,
  target reduction not achieved (see CSS budget section)
- **Not run locally:** the repository's authenticated Playwright suite
  (needs live Supabase E2E credentials unavailable here). The ad hoc
  unauthenticated script above is a genuine, verified substitute for
  viewport/device coverage specifically — it is not a replacement for full
  auth-gated E2E coverage, which remains CI's responsibility.

## Round 6 status (historical, superseded)

Round 6 was rejected. See the round 7 section at the top of this document
for current status.

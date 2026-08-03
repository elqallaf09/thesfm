# Premium interaction-system pass (2026)

Design-only pass on THE SFM's button/tab/segmented-control language. No
business logic, routes, or copy changed — CSS custom-property values, one
component's positioning logic, and a handful of local `<style jsx>` rule
bodies.

## Revision history on this PR

**First attempt (Variant 05)** muted every inactive workspace-tab's
border/fill/shadow to transparent, leaving only the active tab with a
translucent tint. **The user reviewed real before/after screenshots and
rejected it**: "still reads as ordinary bordered text buttons... the visual
change is too subtle to qualify as a premium 2026 redesign." Muting borders
alone wasn't enough — every item was still its own independently-styled
rectangle, just a quieter one.

**Second attempt (Variant 06, current)** replaces that architecture
entirely: there is now exactly **one** indicator element — a sibling `<span
class="sfm-workspace-indicator">` — that slides behind whichever tab is
active. Items themselves carry no border, fill, or shadow at all, ever; they
are text + icon only. The indicator is positioned via two CSS custom
properties (`--indicator-x`, `--indicator-w`) written from the active tab's
own `offsetLeft`/`offsetWidth` (physical values, correct in RTL and LTR
without a direction branch), animated with a plain CSS `transition` (no JS
animation library), and disabled under `prefers-reduced-motion`. See
`src/components/WorkspaceSwitcher.tsx`.

This is a structural change, not a token tweak — the two attempts are not
comparable by tweaking one number, which is why the visual result differs
this much.

## Benchmark: global workspace navigation

The four flagged top-nav controls (الإدارة المالية / الأسواق والتداول /
الأعمال والمشاريع / الإدارة).

### Rejected first attempt vs. corrected second attempt

Rendered from the real token/component CSS via a static harness (not
mockups) — before (current `main`), rejected v1, and corrected v2:

| Before (main) | Rejected v1 (muted borders only) | Corrected v2 (sliding indicator) |
|---|---|---|
| ![Before](./workspace-switcher-before.jpg) | ![Rejected v1](./workspace-switcher-after.jpg) | see real-app screenshots below |

### Real authenticated app screenshots (this branch, live)

Per the acceptance-gate requirement, these are **not** the static harness —
they're `pnpm dev` running this branch, viewed at the guest-accessible
`/investment-companies` route (per `docs/workspace-architecture.md`, this
route renders the full authenticated shell — header, workspace switcher,
sidebar — without requiring a login), with the active workspace set to
"Business & Projects" / "الأعمال والمشاريع":

- Arabic RTL, light: `real-app-light-rtl.jpg`
- Arabic RTL, dark: `real-app-dark-rtl.jpg`
- English LTR, light: `real-app-light-ltr.jpg`
- English LTR, dark: `real-app-dark-ltr.jpg`

In all four, the active item is an unmistakable raised pill — layered
tonal-gradient surface, tinted border, soft shadow, bold high-contrast
text/icon — sliding independently of the three quiet, borderless inactive
items. This is the acceptance-gate bar: obvious at a glance, no explanation
needed.

**Mobile RTL screenshot: not captured.** The browser tool's `resize_window`
did not change the actual render viewport in this sandboxed session
(`window.innerWidth` stayed at 1530px after a "successful" resize to
390×844 — verified via direct JS query, not assumed). Rather than fabricate
or mislabel a screenshot, this is flagged as an open gap. The underlying
CSS/logic reasons it should still work correctly at mobile widths: the
indicator's position is derived from `offsetLeft`/`offsetWidth`, which are
resolution-agnostic by construction, and the mobile media query (`max-width:
900px`) and touch-target height (`var(--control-h)` = 44px) are unchanged
from the prior (already-shipped) behavior. This should be re-verified with a
real mobile viewport (device emulation or a physical/BrowserStack-style
device) before merge.

### What changed, precisely

`src/styles/themes.css` (`--workspace-switcher-*` tokens, both themes):

- Removed entirely: `--workspace-switcher-item-active`,
  `--workspace-switcher-item-active-hover`, `--workspace-switcher-item-border`,
  `--workspace-switcher-item-border-hover`, `--workspace-switcher-item-disabled`,
  `--workspace-switcher-shadow`, `--workspace-switcher-shadow-hover`,
  `--workspace-switcher-shadow-pressed`, `--workspace-switcher-indicator`
  (the old per-item / bottom-bar tokens — nothing in the component reads
  them anymore).
- Added: `--workspace-switcher-active-surface` (a restrained top-to-bottom
  `linear-gradient` tonal shift — still translucent, still not a flat
  single-colour block, still not the previously-rejected solid sidebar
  gradient reuse) and reused `--workspace-switcher-item-border-active` /
  `--workspace-switcher-shadow-active(-hover/-pressed)` as the indicator's
  own border/shadow.
- Added a new foundation token, `--radius-card-inset` (`tokens.css`), so the
  indicator's nested corner radius is token-driven rather than an inline
  `calc()` literal (required to pass `check:visual-system`'s raw-depth
  guard).

`src/components/WorkspaceSwitcher.tsx`:

- New `tabsRef`/`indicatorRef` + `positionIndicator()` (measures
  `activeEl.offsetLeft/offsetWidth`, writes `--indicator-x`/`--indicator-w`
  via `element.style.setProperty`, no `useState` — the component still
  stores no selected-workspace state, matching its existing contract).
- `useLayoutEffect` snaps into place with no transition on first paint, then
  animates on every subsequent active-tab or reflow change (`ResizeObserver`
  + `window resize`, tracked via a `hasPositionedRef` mount flag).
- Hover/press on the *active* tab is handled by `.sfm-workspace-tabs:has(...)`
  targeting the indicator directly — no JS hover state, no scale() ban to
  route around (a container-level `:has()` is well-supported in evergreen
  2026 browsers).
- Bottom-bar `::after` pseudo-element removed (the indicator itself is now
  the "connects the segmented group" element called for in the brief).

### Tests updated (old ones locked in the rejected look)

Per explicit authorization ("do not preserve an old test merely because it
locks the rejected appearance"):

- `workspaceSwitcherAffordance.test.ts` — rewritten for the indicator
  architecture; still asserts semantic `<Link>`s, `aria-current`,
  `prefetch={false}`, no `useState`/`router.push`, hover/press/focus/disabled/
  reduced-motion states, and RTL-safe positioning (`offsetLeft`/`offsetWidth`,
  explicitly *not* `getBoundingClientRect` + scroll-offset math).
- `globalHeaderVariant03.test.ts` — its workspace-switcher describe block
  now documents Variant 04 (rejected solid gradient) *and* Variant 05
  (rejected "still bordered buttons") as prior rejections, and asserts the
  Variant 06 indicator-surface/border/shadow token contract instead of the
  removed bottom-bar tokens.
- `workspaceSwitcherPremiumSegmentedControl.test.ts` — replaced with
  indicator-specific assertions (no per-item border/shadow, muted inactive
  icon, translucent indicator surface, `offsetLeft`-based positioning,
  first-paint snap vs. later animation, `:has()`-driven hover/press, reduced-
  motion, `ResizeObserver` reflow).
- Six other tests that reference `WorkspaceSwitcher.tsx` for unrelated
  reasons (route ownership, prefetch policy, typography, sidebar/mobile
  exclusivity) were re-run and pass unmodified — they never asserted the
  visual mechanics that changed.

## Site-wide audit (unchanged from the first pass in this PR)

Beyond the workspace-switcher benchmark, the same "solid `background:
var(--primary)` block for the active tab" anti-pattern (9 occurrences / 7
files, found via
`grep -rn '\.active{background:\s*var(--primary)'`) was migrated to the
shared soft-fill + tinted-border language in: business-hub employee view
toggle, project financial-model view/scenario toggles, admin company tabs,
admin Instagram-automation tabs, defensive-stocks category tabs, Tech News
filter chips + advanced-filters controls, monthly-subscriptions examples
tabs. All CSS-value-only changes — no class renames, no markup/behavior
changes. Full file list and intentionally-deferred surfaces (setup-page
selection cards, ~65 other chip/tab/pagination files that already pass
`check:visual-system` and didn't show either anti-pattern) are unchanged
from before; see the commit history for exact diffs.

## Validation

- `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `check:i18n`,
  `check:visual-system`, `check:maintainability`, `check:repo-hygiene` — all pass
- `pnpm test:run` — **249 files / 2061 tests pass**
- `pnpm build` — succeeds; `check:performance-budget` — all 15 rows PASS
- **Not run locally:** Playwright (`test:smoke`) needs real
  `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` against live Supabase, unavailable in
  this environment. CI has these secrets configured — treat the CI run on
  this PR as the source of truth for RTL/LTR × light/dark × desktop/mobile
  e2e coverage before merging.
- **Not verified:** true mobile-viewport rendering (see the mobile RTL note
  above) — re-check with real device emulation before merge.

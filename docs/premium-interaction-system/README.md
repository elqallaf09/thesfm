# Premium interaction-system pass (2026)

Design-only pass on THE SFM's global header — workspace switcher + utility
command cluster — plus a smaller earlier pass on high-traffic tab/filter
patterns elsewhere. No business logic, routes, or copy changed.

## Round 6 (current): consolidation first, then a mobile-verification breakthrough

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

## All screenshots

All `v6-final-*` files are **Playwright captures of the real production
build** (`pnpm build && pnpm start`, guest-accessible `/investment-companies`
route) at genuine device viewports — not the extension tool, not a preview
harness. `v4-*`/`v5-*` remain from earlier rounds for history; `v3-user-reference-*`
are the user's own original screenshots.

| File | Viewport | What it shows |
|---|---|---|
| `v6-final-mobile-390-{ar,en}-{light,dark}.png` | 390×844 | Real mobile, both directions, both themes |
| `v6-final-tablet-768-ar-{light,dark}.png` | 768×1024 | Real tablet |
| `v6-final-desktop-1440-ar-{light,dark}.png` | 1440×900 | Real desktop |
| `v6-final-desktop-1920-ar-{light,dark}.png` | 1920×1080 | Real wide desktop |

**Note on the 1920px composition:** the ultra-wide `max-width` cap built in
round 4 was reverted this round (see CSS budget section above) to keep the
build within budget — at 1920px the header now spans the full available
width again rather than capping and centering. The three-zone grid's
balanced `minmax()` zones still keep the switcher reasonably positioned
(visible in the 1920px screenshots), but the "no excessive empty space at
ultra-wide" property is weaker than round 4's now-reverted fix provided.
This is a direct, disclosed trade-off of the budget constraint, not an
oversight.

## Validation

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

## Status

Draft, not merged. Waiting for visual approval of round 6, with the CSS
budget and 1920px trade-off flagged above for an explicit decision.

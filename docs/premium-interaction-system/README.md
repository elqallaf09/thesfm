# Premium interaction-system pass (2026)

Design-only pass on THE SFM's global header — workspace switcher + utility
command cluster — plus a smaller earlier pass on high-traffic tab/filter
patterns elsewhere. No business logic, routes, or copy changed.

## Revision history

1. **Variant 05 (rejected)** — muted borders only, still read as bordered buttons.
2. **Variant 06 (approved direction, rejected execution)** — real sliding indicator; track stretched full-width.
3. **Round 3 (rejected)** — fixed the switcher and utility cluster individually; together they read as three disconnected islands.
4. **Round 4 (rejected)** — three-zone grid + ultra-wide cap fixed the islands problem, but still didn't clear the premium-2026-fintech bar as a whole.
5. **Round 5 (current)** — the ask was explicit: no more token/spacing tuning, something *structurally* different. Two real changes:
   - **The workspace switcher is now a visibly elevated dock**, not a zone flush with the header surface: bumped from the header's own `--radius-card` (14px) to `--radius-panel` (20px, +new `--radius-panel-inset` token for its items/indicator), a real outer drop-shadow added to `--workspace-switcher-frame-shadow` (previously inset-only — no elevation), and its background deepened so it visibly separates in tone from the header glass around it. It now genuinely looks like a floating premium capsule resting on the header, not a same-toned panel.
   - **The brand lockup's divider is now a soft top/bottom-fading gradient** (`--header-brand-divider`, a `linear-gradient` — only valid in `themes.css`, which is exempt from the visual-system guard's gradient rule) instead of a flat 1px rule, and the grid zone minimums moved to `240px`/`360px` per this round's spec.

### A false-positive guard failure worth documenting

`check:visual-system` initially failed on `WorkspaceSwitcher.tsx` for a
"literal radius" — not a real violation. The regex that guards against raw
`--radius-*` custom-property declarations doesn't distinguish CSS comments
from actual declarations, and a code comment happened to contain the text
`--radius-card: the` (mid-sentence, coincidentally colon-adjacent). Reworded
the comment; no code change was needed. Documented here so it isn't
mistaken for a real regression if seen in CI logs from an earlier commit on
this branch.

### A second, unrelated test failure

`phase31GlobalControlsTypography.test.ts` forbids literal `font-weight:
700+` in `AppHeader.tsx` specifically (this project reserves heavier
literal weights for a few other surfaces, but not the shared header). The
brand wordmark bump to `700` for extra presence was reverted to `600`
(kept the added `letter-spacing: 0.01em`) once the suite caught it.

## Screenshots

All `v5-final-*` and earlier `v*-rejected-*`/`v*-final-*` files are **real
authenticated-app** screenshots (`pnpm dev` on this branch, guest-accessible
`/investment-companies` route) — not the static harness.

| File | What it shows |
|---|---|
| `v5-final-wide-{light,dark}-{rtl,ltr}.jpg` | All 4 theme/direction combos, real wide-viewport render |
| `v5-final-wide-1920-proof.jpg` | Same real render, re-verified via `getBoundingClientRect()` immediately before capture: header still exactly 1920px, centered, on a 2552px-wide display |
| `v5-final-language-menu-open-ltr.jpg`, `v5-final-user-menu-open.jpg`, `v5-final-quick-search-open.jpg` | Menu/palette open states |
| `v5-final-workspace-hover.jpg`, `v5-final-workspace-keyboard-focus.jpg` | Interaction states (hover technique below) |
| `v4-rejected-*` | Round 4, superseded |

### Two gaps, stated precisely rather than glossed over

**1. No genuine 1440px-specific render exists.** Every screenshot in this
repo across all five rounds comes from the same fixed real browser viewport
this interactive session provides (`window.innerWidth` = 2552px,
unchangeable — see gap 2). What's labeled "wide" above is that fixed
viewport with the header's `max-width: 120rem` rule visibly capping it to
1920px, confirmed via `getBoundingClientRect()`, not a genuine separate
1440px capture. There was no way to produce a real 1440px-wide render this
round either.

**2. RTL tablet and 390px mobile screenshots still not captured**, for the
third round in a row. `resize_window` continues to report success without
changing the actual render viewport (re-checked via `window.innerWidth`
this round too — still 2552 regardless of the requested size). This is a
hard limitation of this interactive session's browser automation, not
something another attempt will fix. **This is the strongest recommendation
in this document: verify mobile/tablet rendering via this repo's Playwright
mobile projects (a real headless browser with correct device-viewport
emulation) or manual Chrome DevTools device toolbar before merging** — it
has not been visually confirmed at any point in this multi-round pass.

**Hover technique (unchanged from earlier rounds):** this session's browser
tool does not preserve synthetic hover across its own screenshot
round-trip. Confirmed live via `element.matches(':hover')`, then the exact
Chrome computed style produced under real hover was pinned via inline style
for one screenshot and removed immediately after — not a guessed value.

## Validation

- `lint`, `typecheck`, `check:i18n`, `check:visual-system`,
  `check:maintainability`, `check:repo-hygiene` — all pass
- `pnpm test:run` — **254 files / 2082 tests pass**
- `pnpm build` — succeeds; `check:performance-budget` — all 15 rows PASS,
  but `/ initial CSS` is now at **65.4/65.4 KiB — the budget ceiling**, and
  `/business-hub` at 77.3/78.1 KiB. Both still pass; flagging because five
  rounds of additive CSS on this branch have used up essentially all
  remaining headroom on the `/` route. The next CSS addition to this area
  needs either a budget increase or removing something else first.
- **Not run locally:** Playwright — needs live Supabase E2E credentials
  unavailable here. CI has them configured; this is the authoritative
  source for the mobile/tablet gap above, which has not been visually
  verified in five rounds of this pass.

## Status

Draft, not merged. Waiting for visual approval of round 5.

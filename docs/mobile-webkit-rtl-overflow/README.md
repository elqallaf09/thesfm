# Mobile WebKit + RTL horizontal-overflow investigation

## Summary

`tests/smoke/dashboard-executive-overview.spec.ts:181` ("populated executive
overview renders verified data across locales, themes, and widths") fails
consistently in CI, `mobile-webkit` project only, on the `ar/light` locale
pass, with a small horizontal overflow reported on `body` and
`.sfm-global-header`.

## Exact failure data (from CI, `mobile-webkit` project)

- **Route**: `/dashboard` (authenticated fixture — `installDashboardFixture`
  + `authenticateFixture`)
- **Viewport**: 390×844 (`devices['iPhone 13']` override in
  `playwright.config.ts`, `mobile-webkit` project)
- **Locale/theme**: `ar` / `light` (first combination the test iterates —
  may also affect others, untested since the suite fails on the first)
- **Failing assertion**: `expectNoHorizontalOverflow`,
  `tests/smoke/dashboard-executive-overview.spec.ts:176` —
  `expect(container.left).toBeGreaterThanOrEqual(-1)`
- **Measured**: `container.left = -5` (tolerance is `-1`, so 4px over)

Full measurement JSON from the CI failure:

```json
{
  "clientWidth": 390,
  "rootScrollWidth": 390,
  "bodyScrollWidth": 390,
  "containers": [
    { "selector": "body", "left": -5, "right": 385, "width": 390, "overflowX": "clip" },
    { "selector": ".sfm-global-header", "left": -5, "right": 385, "width": 390, "overflowX": "clip" },
    { "selector": ".sfm-global-workspaces", "left": 5, "right": 375, "width": 370, "overflowX": "hidden" },
    { "selector": ".sfm-workspace-navigation", "left": 5, "right": 375, "width": 370, "overflowX": "hidden" },
    { "selector": "[data-dashboard-executive=\"true\"]", "left": 11, "right": 369, "width": 358, "overflowX": "visible" }
  ]
}
```

`body` and `.sfm-global-header` are both shifted exactly 5px to the left of
the visible viewport (`left: -5`) while measuring the full 390px viewport
width — i.e. they're sized to `clientWidth` (390 as CI's WebKit reports it)
but positioned as if a 5px-wide element (most likely the vertical
scrollbar/scroll-gutter) needed to be accounted for and wasn't.

## What's ruled out

- **Not `100vw` usage**: the classic cause of exactly this symptom
  (`100vw` includes the scrollbar width that `100%`/`clientWidth` excludes)
  was checked. `AppHeader.tsx`/`workspace-chrome-critical.css` do use
  `100vw` in a couple of mobile-only rules
  (`.sfm-global-workspaces { width: calc(100vw - 24px); }`,
  `.sfm-global-header { max-width: 100vw; }`), but neither is the direct
  cause here: the CI measurement shows `.sfm-global-workspaces` well within
  bounds (`left: 5, right: 375`), and `.sfm-global-header`'s own
  `max-width: 100vw` is a no-op in practice (it's already constrained to
  `width: 100%`, which is always ≤ 100vw, so the max-width never actually
  clamps anything).
- **Not a round-9-specific regression**: reproduces identically (same
  selectors, same `-5`, same tolerance overshoot) on the commit immediately
  before round 9's navy-dock changes (`f5574643`), and on every other CI
  run recorded for this branch back to the earliest available run
  (`2e8dd641`) — see the branch's CI history below.
- **Not reproducible in this session's local environment**: the same
  measurement approach (Playwright's own WebKit launcher, 390×844, `ar`
  locale, guest-accessible route) run locally reports `clientWidth: 385`
  (not 390) with `body`/`.sfm-global-header` correctly sized to `385` and
  positioned at `left: 0` — i.e. this session's local WebKit binary already
  excludes scrollbar width from `clientWidth` and sizes elements to match,
  so it never hits the mismatch. This reproduced identically on both this
  branch and a clean checkout of `main`, meaning **local reproduction could
  not distinguish "pre-existing on main" from "introduced somewhere in PR
  #111"** — only a real CI run against `main` can. This PR is that control
  test: it carries no code changes, only this document, so its own CI run
  is a clean read of `main`'s behavior.

## Working theory

An `ar` (RTL) + WebKit-specific interaction with vertical-scrollbar-gutter
reservation: CI's specific WebKit build appears to report
`document.documentElement.clientWidth` as the *full* viewport width (390,
not scrollbar-adjusted), while `body`'s actual rendered box is also 390px
wide but rendered starting 5px before the visible viewport edge — consistent
with a scrollbar-gutter that's reserved in one calculation but not the
other. This is a well-documented category of WebKit quirk, and RTL
direction is known to affect which edge browsers reserve scrollbar gutters
on. Not yet confirmed against the exact CI WebKit build.

## CI history (branch `feat/premium-interaction-system-2026`)

Every recorded CI run on the PR #111 branch has failed
`CI/Playwright smoke tests` on this exact assertion (among others, in
earlier rounds — see PR #111's own history for the rounds where other,
now-fixed failures were also present):

| Date | Commit | Conclusion |
|---|---|---|
| 2026-08-03T09:53:57Z | 2e8dd641 | failure |
| 2026-08-03T13:52:04Z | 975eca8d | failure |
| 2026-08-03T15:43:11Z | 2833db12 | failure |
| 2026-08-03T17:40:31Z | be31e602 | failure |
| 2026-08-03T18:32:23Z | 1a172a0f | failure |
| 2026-08-03T20:57:26Z | 346d34ec | failure |
| 2026-08-03T21:31:10Z | 158c1a23 | failure |
| 2026-08-03T22:30:50Z | f5574643 | failure |
| 2026-08-04T08:44:43Z | a2644e2c | failure |
| 2026-08-04T09:26:44Z | deecf1c3 | failure |
| 2026-08-04T13:30:49Z | 6711223b | failure — only this test remains, all other smoke failures fixed |

## Next step

Once this PR's own CI run completes:

- **If it fails the same way on `main`**: confirms the bug predates PR #111
  entirely (not introduced by the header redesign), and the fix belongs
  here, scoped to whatever the real root cause turns out to be (likely
  something in the shared shell/layout CSS, not header-specific, since
  `body` itself is also offset).
- **If it passes on `main`**: the bug was introduced somewhere in PR #111's
  header work despite reproducing on multiple of its rounds, and PR #111
  itself needs the fix, not a separate PR.

Test intentionally left unmodified — no weakening, skipping, or bypassing.

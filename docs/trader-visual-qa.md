# Trader Visual QA — Phase 2.6 (Trading Dashboard Polish)

Date: 2026-07-12. Environment: local dev server (`SFM_LOCAL_TRADER_QA=1 npm run dev`),
Chrome (real browser), data provider unreachable from the sandbox for most of the
session — which made the degraded/unavailable states (a first-class part of this
phase's scope) fully visible. Partial quote data loaded in later rounds.

## Checklist and results

| Surface | Dark desktop | Light desktop | Arabic RTL | English LTR | French | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| Market Command Center (overview) | ✅ verified | ✅ verified | ✅ verified | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Recommendations table | ✅ verified | ✅ verified | ✅ verified | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Market Sessions timeline | ✅ verified | ✅ verified | ✅ verified | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Heatmap | ✅ verified | ✅ verified | — | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Smart Market Analysis | ✅ verified | — | — | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Ticker strip | ✅ verified | ✅ verified | ✅ verified | ✅ verified | ⚠️ not verified | ⚠️ not verified |
| Watchlist / Asset drawer | ⚠️ not verified (drawer needs live data) | — | — | — | — | — |

**Mobile visual QA was not performed interactively**: the browser window was
OS-maximized and `resize_window` could not shrink it, so 375/390/430px states were
not visually inspected in this pass. Responsive coverage relies on the existing
Playwright smoke specs (`tests/smoke/trader-workspace-visualization.spec.ts`) and
the pre-existing mobile CSS, which this phase did not restructure.

## Defects found and fixed (verified before/after in the browser)

1. **Ticker chip logo covered the price digits** — the chip's grid column was 32px
   while the unified logo block forces 44px; the logo overflowed onto the text.
   Fixed the column to 44px (both chip rules).
2. **Light-mode placeholders were invisible** — three rules used
   `:is(input::placeholder, …)`, which is invalid CSS (pseudo-elements cannot appear
   inside `:is()`), so browsers dropped them and the dark near-white placeholder
   color leaked into Light Mode. Rewritten as valid split selectors; verified
   computed color went from `rgba(211,231,244,0.46)` to the intended muted gray.
3. **Active workspace tab unreadable in Light Mode** — the light rule
   `html[data-theme="light"] .workspace-tabs button` outranks
   `.workspace-tabs button.is-active`, painting dark text over the dark active
   gradient. Added an explicit light `.is-active` rule; verified white text.
4. **"1-3 أسابيع" rendered as "1-3 أساSell"** — the UI-language fragment replacer
   substituted "بيع" (Sell) *inside* the word "أسابيع" (weeks). Fragment
   replacement is now word-boundary-aware (Arabic-letter-aware lookarounds), and
   the horizon phrase is registered as a whole translation pair.
5. **Repeated "unavailable" labels everywhere in the degraded state** — every ticker
   chip said "Price unavailable · Change unavailable", every session row ended with
   "Unavailable", heatmap tiles showed it three times. Replaced with a single
   compact state per element and muted "—" dashes that keep the full text in
   `title`/`aria-label`.
6. **Contradictory confidence presentation** — rows showed "65% confidence / target /
   High risk" while change data and technicals were unavailable. The
   recommendations table now gates confidence and AI score behind
   `assetDataState` (presentation only — calculations untouched): incomplete
   evidence renders a dash with the reason as tooltip, and a fully unavailable
   result shows the unavailable badge instead of a recommendation.
7. **Command Center empty panels looked broken** — a lone small line lost in a large
   grid area. Empty states are now centered, bordered (dashed) intentional boxes.

## Not addressed in this phase (recommended next)

- Trader SPA mobile pass at real 375/390/430px viewports (device-mode tooling).
- Asset quick drawer polish with live data (drawer content could not be exercised
  against a live provider from this environment).
- Smart Analysis "strategy agreement" wording when inputs are partial (needs a
  product decision on how agreement should read with incomplete strategies).
- French UI spot-check of the new dash tooltips.

# UI Consistency Audit — 2026-07-11

Scope: pure UI consistency pass. No backend, API, provider, engine, auth, schema, or business-rule changes.

## How the UI is styled today (three coexisting systems)

1. **Global element CSS** (`src/app/globals.css`) — styles every raw `<input>`, `<select>`, `<button>`, `<table>`:
   height `48px`, radius `var(--r-md)`, Tajawal, gold/blue focus. 130 files use raw `<button>`,
   81 raw `<input>`, 59 raw `<select>`, 22 raw `<table>`.
2. **shadcn/ui primitives** (`src/components/ui/*`) — Button/Input/Select at `h-11` (44px) light /
   `h-10` (40px) dark, `rounded-xl` (12px), tokenized focus ring.
3. **Page-local styled-jsx** — **108 files** carry their own `<style jsx>` blocks with hardcoded values.

A light-mode consistency layer already exists at the end of `globals.css`
(`:root:not(.dark) :where(...) { ... !important }`) that normalizes colors, borders, disabled and
focus states, and floors controls at `min-height: 42px`. Dark mode intentionally preserves the
legacy shadcn look and has no equivalent layer.

## Measured inconsistencies

| Area | Finding |
| --- | --- |
| Control heights | ~900 hardcoded `height:` declarations in styled-jsx spanning **30–56px** (44, 42, 40, 38, 48, 46, 36, 34, 52, 50, 54, 56 …). |
| Height standards conflict | Global base rule `48px` ≠ shadcn light `44px` ≠ shadcn dark `40px` ≠ light-layer floor `42px` ≠ mobile `50px !important`. |
| Border radius | ~2,600 hardcoded px radii in TSX + ~900 in CSS modules: 12/13/14/15/16/18/20/22/24px all in active use, ignoring the existing `--r-xs…--r-2xl` token scale. |
| Focus rings | Dozens of ad-hoc teal/cyan `box-shadow: 0 0 0 3-4px rgba(...)` focus styles in styled-jsx vs the tokenized ring (light layer overrides these in light mode only). |
| Fonts | Mostly unified via `!important` global rules; a few `system-ui` stragglers in styled-jsx. |
| Buttons | shadcn `Button` (h-11) vs `sfm-button-*` classes (min-height 42) vs hundreds of page-local `.xxx-btn` selectors with their own heights/radii. |
| Search toolbars | Layout/order is consistent per family (news pages share components) but heights of search inputs (44–52px) vs adjacent selects (38–48px) differ page to page. |

## Fix strategy applied in this pass

The heights/radii live in **hundreds of page-local selectors**, so per-page hand-editing does not
scale. Instead:

1. **Canonical control-size tokens** added to `:root` and `.dark`:
   `--control-h-sm: 36px`, `--control-h: 44px`, `--control-h-lg: 52px`.
2. **All height standards aligned to `--control-h` (44px)**: global base rule (was 48px), the light
   consistency-layer floors (were 42px), mobile override normalized to a single 48px standard
   (touch-target minimum). shadcn light primitives already sit at 44px — now everything matches.
3. **Mechanical tokenization sweep** (`scripts/normalize-ui-tokens.mjs`):
   - hardcoded px `border-radius` values mapped to the token scale
     (3–7→`--r-xs`, 8–10→`--r-sm`, 11–14→`--r-md`, 15–17→`--r-lg`, 18–20→`--r-xl`, 21–28→`--r-2xl`;
     pills `999px`/`50%` and 0–2px untouched);
   - `height:` on control-like selectors (input/select/textarea/combobox/button/btn/search/toolbar/
     pagination) mapped to the control tiers (≤38→sm, 39–47→default, ≥48→lg), skipping
     icon/avatar/spinner/progress-like selectors.
   - `src/trader-app/` excluded (static SPA that does not load `globals.css` tokens).

Radii and control heights are now theme-controlled: light renders 12/16/18/22px radii, dark renders
its own 12/16/20/28px scale, from the same declarations.

## Remaining inconsistencies (recommended next phase)

- **Dark mode consistency layer** — dark mode still shows the legacy look; mirroring the light
  `:where()` layer for dark is the single biggest remaining win.
- **Search toolbar layout order** (Search → Type → Market → Timeframe → Filters → Action → Reset)
  is markup-level and page-specific; unify by extracting a shared `<FilterToolbar>` component and
  migrating the ~15 list/news pages to it.
- **Ad-hoc focus rings in dark mode** — tokenize the teal rgba box-shadows to `--focus-ring`.
- **styled-jsx button colors/typography** — page-local `.xxx-btn` colors are normalized in light
  mode by the layer, raw in dark.
- Migrate raw `<input>`/`<select>` to the shadcn primitives page-by-page over time; the global
  element CSS now matches them, so migrations become invisible.
- Cleanup: `components/Wakeel.tsx.backup-*` files at the repo root should be deleted or gitignored.

## Theme scoping (2026-07-12)

The unification sweep above applied one global control/radius standard to every product area,
which unintentionally re-metered the approved Core Finance identity (42px button floor, 48px
fields, 50px touch fields, 9/18/22px dark radii on chips/panels/cards). Visual identity is now
split into product-area scopes — `core-finance`, `business`, `trader`, `admin`, `shariah`:

- `src/lib/navigation/themeScopes.ts` — route → scope map (pure, unit-tested).
- `src/components/AppLayout.tsx` — stamps `data-theme-scope` on `#main-content`.
- `src/styles/scopes.css` — per-scope token overrides; core-finance/business restore the
  approved finance metrics, trader/admin/shariah intentionally carry no overrides so their
  approved appearance is untouched.

Known gap: portal-rendered dialogs (Radix) mount outside `#main-content`, so modal controls on
finance pages keep the unified 44px standard rather than the 48px finance fields.

## Information density (2026-07-12)

Added a reusable density system: `comfortable` (default — renders exactly the approved
identity) and `compact` (opt-in, persisted per user).

- `src/lib/ui/density.ts` — preference model + safe storage (own key, mirrored into
  `sfm_settings` like the theme preference); `dense` mode reserved but rejected until
  its CSS tier exists.
- `src/hooks/useDensity.tsx` — `DensityProvider` stamps `data-density` on the root
  element after mount; `useDensity()` exposes set/toggle.
- `src/components/DensityToggle.tsx` — header toggle next to the theme toggle
  (Arabic/English/French labels, `aria-pressed`).
- `src/styles/density.css` — the compact tier: cards 22/24→14/16px, CardHeader/Content
  tightened, table cells 13/14→8/10px, KPI tiles/grids/heroes reduced (hero padding
  clamp 22–42→14–22px, h1 clamp 28–46→22–30px). Trader/admin scopes get a denser table
  tier (6/8px cells); Core Finance stays on the gentle base tier. Mobile guardrail
  restores approved card padding and roomier cells under 768px.

Hard guarantees (asserted in `src/__tests__/unit/densityMode.test.ts`): no color
declarations, no control metrics (44px+ touch floors survive), no font size below
12px, RTL-safe logical spacing only.

Remaining density work (next phase): the standalone trader SPA (`src/trader-app/`)
does not load `globals.css` and needs its own compact tier; per-page bespoke layouts
(reports-center grids, documents lists) could adopt summary strips; list
virtualization for very long tables.

# The SFM visual-system contract

The active application uses one semantic visual system. Literal palette values belong in
`src/styles/themes.css`; non-colour foundations such as typography, spacing, radii, shadows,
and workspace widths belong in `src/styles/tokens.css`.

The only non-CSS adapter is `src/styles/static-tokens.ts`. It exposes the canonical light values
needed by the web-app manifest and transactional email HTML, neither of which can reliably resolve
the application's CSS custom properties. It also owns one shared set of email-inline styles so API
routes do not repeat colours, fonts, radii, or button treatments. Focused contract tests keep the
adapter synchronized with `themes.css` and `tokens.css`; it is not an alternate browser-component
palette.

Application pages and components must consume semantic names such as `background`, `surface`,
`foreground`, `border`, `primary`, `accent`, `success`, `warning`, `danger`, `info`, and their
documented domain roles. New UI must not introduce page-local brand palettes, direct light/dark
font systems, or raw Tailwind colour scales. IBM Plex Sans Arabic is the UI font; IBM Plex Mono is
reserved for prices, percentages, tickers, and other financial data roles.

## Theme architecture

Light and dark mode are independently authored in `src/styles/themes.css`; dark mode is not a
mechanical inversion of the light palette. Both blocks expose the same complete role set for
canvas and layered surfaces, cards and overlays, application chrome, text and links, borders,
buttons, forms, tables, charts, status feedback, badges and tags, navigation, loading states,
scrollbars, and compound components such as tabs, calendars, switches, checkboxes, radios,
timelines, accordions, and pricing cards.

Light mode uses a white canvas, restrained gray secondary surfaces, dark navy text, and blue/teal
actions. Dark mode uses a deep neutral canvas with progressively lighter blue-gray surfaces and
luminance-balanced blue/teal accents. Component code must select a semantic role for its intent;
it must not assume that `surface`, `sidebar`, `hero`, or inverse text has a particular luminance.

The shared chart palette provides eight ordered series roles (`chart-1` through `chart-8`) plus
axis, grid, label, tooltip, and tooltip-border roles. Tables similarly use explicit header, row,
hover, selected, border, sort, filter, search, and pagination roles. Normal text/action pairs meet
WCAG AA, strong control boundaries meet the 3:1 non-text contrast requirement, and status meaning
is always paired with labels or icons rather than conveyed by color alone.

## Source guard

Run:

```bash
pnpm check:visual-system
```

The guard has zero tolerance across the active production source tree. It rejects raw colours,
bare presentation colour strings, non-semantic Tailwind palettes, pale cyan treatments, page-local
gradients, legacy/direct font declarations, direct `fontFace` strings, literal shadow objects,
drop-shadow filters, raw depth declarations, built-in Tailwind radius/shadow utilities, and raw
arbitrary Tailwind depth values. Semantic arbitrary forms such as
`rounded-[var(--radius-card)]` and `shadow-[var(--shadow-card)]` remain valid. Explicit zero-radius
corners and `shadow-none`/`drop-shadow-none` state resets are also valid because they remove visual
depth rather than define a competing depth scale.

The same scan rejects visual alias families (`--sfm-light-*`, `--r-*`, page-local news/landing/report
palettes, private sidebar/mobile palettes, and colour-named aliases). Layout and state properties
such as `--market-ticker-gap` remain valid when they do not redefine colour or depth. The production
scan covers the entire `src` tree and text-based assets under `public`, including JavaScript, JSON,
SVG, and web manifests, so generated email, report, presentation, and runtime configuration output
cannot bypass the same contract.
`scripts/visual-system-legacy-baseline.json` is intentionally empty;
the update command refuses to record findings, so legacy styles cannot be reintroduced as debt.

The standalone Trader iframe is not a second theme source. Its restricted asset route serves the
same `tokens.css` and `themes.css` files before the terminal compatibility layer. That final layer
may bridge historical terminal class names, but it must not redefine the palette, font families,
or component-state colours.

The obsolete Trader `styles.css` and `desktop-balance.css` bundles are removed. Both Trader HTML
documents and the asset route load the shared semantic source followed by token-only `cinema.css`;
the detail view then loads its semantic `detail.css`. The service-worker cache list follows the
same order and versions.

Standalone report windows use `src/lib/visual-system/standaloneDocument.ts`. It serializes the
resolved application custom properties and reuses the compiled stylesheet links so print views
receive the same IBM Plex faces and semantic palette without maintaining a report-only theme.

There is no active legacy visual allowance. Literal foundation values live only in the reviewed
semantic sources (`themes.css`, `tokens.css`, and the non-browser static adapter). Their exceptions
are rule-specific rather than whole-file exclusions: legacy alias declarations and other unrelated
debt are still scanned inside every foundation file. The shared `chartStyles.ts` helper owns the
intentional runtime conic-gradient syntax for semantic financial chart stops; route code supplies
token references rather than colours.

## New page contract

New workspace pages select `full`, `wide`, `standard`, or `reading` through the shared workspace
page-layout registry/container. They must not calculate around the sidebar, use `100vw` as a main
content width, or introduce their own centered application shell. Page and component styles use
semantic variables directly; UI copy uses `var(--font-ui)` and financial values use
`var(--font-data)`. Adding a production file with a raw palette or depth value has an allowance of
zero and fails `pnpm check:visual-system`.

Numeric fallbacks nested inside radius variables (for example `var(--radius-card, 14px)`) are also
treated as raw depth. Shared tokens are required to exist; production components should not carry
private geometry fallbacks that can silently diverge. Compound corners may combine shared radius
tokens with explicit zero corners, and semantic-to-semantic fallbacks remain valid.

Intentional exceptions must encode real meaning. Examples are a major branded hero, a financial
chart series, or a data-visualization pattern. Prefer a named semantic token even in those contexts;
document any unavoidable literal value next to the source and keep it out of ordinary cards,
buttons, forms, tables, dialogs, and navigation.

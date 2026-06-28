# perf/sfm-quick-wins — bundle size report

Generated after the perf cleanup landed on this branch. Use it as the
review reference; compare with the same `pnpm build` output on `main`.

## Per-route First Load JS — before vs after this branch
Measured with `pnpm build` on each commit (no optimizePackageImports baseline difference).

| route | before | after | delta |
|---|---:|---:|---:|
| `/reports` | 365 kB | **327 kB** | −38 kB |
| `/savings` | 364 kB | **326 kB** | −38 kB |
| `/goals` | 364 kB | **326 kB** | −38 kB |
| `/expenses` | 364 kB | **326 kB** | −38 kB |
| `/charity-projects` | 342 kB | **304 kB** | −38 kB |
| `/business-hub` | 342 kB | **304 kB** | −38 kB |
| `/business/subscriptions` | 335 kB | **297 kB** | −38 kB |
| `/ai` | 316 kB | **277 kB** | −39 kB |
| `/market-analysis` | 390 kB | 392 kB | +2 kB (intentional — TR_MARKET now ships only here) |

**Structural saving: ~38 kB First Load JS on every non-market page**, from
extracting `TR_MARKET` (163 KB source) into a dedicated chunk consumed only
by market pages via `useMarketLanguage`.

## Build configuration
- Next.js 15 + React 19
- `experimental.optimizePackageImports` enabled for 37 libraries
  (lucide-react, date-fns, recharts, framer-motion, embla, day-picker,
  vaul, cmdk, sonner, 25 @radix-ui/* primitives)

## Routes summary
- Static pages: **98**
- Dynamic routes (api + ƒ): **148**

## First Load JS — shared baseline
| pages | shared |
|---|---|
| app router | **103 kB** |
| pages router | 97.4 kB |

## Top 25 heaviest pages by First Load JS

| First Load JS | route |
|---:|---|
| 390 kB | `/market-analysis` |
| 365 kB | `/reports` |
| 364 kB | `/savings` |
| 364 kB | `/goals` |
| 364 kB | `/expenses` |
| 342 kB | `/charity-projects` |
| 342 kB | `/business-hub` |
| 335 kB | `/business/subscriptions/[clientId]` |
| 335 kB | `/business/subscriptions` |
| 334 kB | `/projects/[id]` |
| 333 kB | `/financial-theories` |
| 331 kB | `/reports-center` |
| 328 kB | `/setup` |
| 328 kB | `/cyclical-stocks` |
| 325 kB | `/profile` |
| 324 kB | `/suppliers` |
| 324 kB | `/operating-expenses` |
| 324 kB | `/invoices` |
| 324 kB | `/income` |
| 324 kB | `/energy-stocks` |
| 324 kB | `/dividend-stocks` |
| 324 kB | `/customers` |
| 323 kB | `/today` |
| 323 kB | `/invest` |
| 322 kB | `/banking-stocks` |

## What this branch shipped

### Net byte deltas
- **`public/` assets**: −878 KB dead (`brand/sfm-logo-full.png`,
  duplicate `the-sfm-logo.png`) + −125 KB compression on 3 referenced PNGs
- **`src/app/icon.png`**: 339 KB → 32 KB (**−90.5%**)
- **`globals.css`**: 141 KB → 132 KB (−7%, 93 dead class selectors removed
  via postcss surgery)
- **`src/components/`**: −274 KB (30 unused component files)
- **`src/hooks/`**: −5 KB (dead `use-toast.ts` chain)
- **`package.json`**: 7 unused deps removed (`react-hook-form`,
  `@hookform/resolvers`, `react-hot-toast`, `react-resizable-panels`,
  `input-otp`, `@zoerai/integration`, `zod`)

### Structural wins
- `/projects/[id]`: ~81 KB of tab modules (`ProjectKpisTab` 38 KB +
  `ProjectTasksTab` 43 KB) moved out of the initial bundle behind
  `next/dynamic`; data-builder helpers split into
  `src/components/projects/projectTabSummaryTypes.ts` (2 KB).
- `optimizePackageImports` enables per-named-export tree-shaking for the
  37 libraries above, reducing per-route footprint app-wide.

## Reusable tools added under `scripts/`
- `optimize-icon.mjs` / `optimize-public-assets.mjs` — reproducible
  asset compression via sharp
- `audit-globals-css.mjs` — per-page punch list of single-use selectors
  (writes `/tmp/globals-audit.json`)
- `find-dead-css-classes.mjs` — strict 3-stage dead-class detector
- `strip-dead-css.mjs` — postcss-based surgical class removal that
  preserves comma-grouped selectors and `:is()/:where()/:has()` lists

## Still on the table (separate PRs recommended)
1. **CSS architecture refactor** — `globals.css` uses heavy comma-grouped
   selectors (`.business-hero, .other-shared, …`) so the per-page class
   audit can't extract them without first restructuring the rule groups.
   Potential savings ~30–50 KB.
2. **i18n market.ts split** — `src/lib/translations/market.ts` (163 KB)
   is spread into the global `TR`, so it ships with every page. 1085
   `t('market_*')` call sites + prop-drilled `t` + 24 template strings
   make this codemod-resistant; needs an async-`t()` semantics change or
   a file-by-file migration with browser QA.
3. **Inline component extraction** in the giant `'use client'` pages
   (setup 148 KB, reports-center 133 KB, profile 126 KB, income 123 KB).
   Their bulk is inline functional components — splitting them requires
   real refactoring with visual regression checks.

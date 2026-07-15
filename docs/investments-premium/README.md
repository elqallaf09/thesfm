# Investments premium redesign QA

This redesign preserves the existing investment data model, calculations, routes, and actions. It reuses the merged luxury sidebar's semantic glass tokens for card surfaces, borders, reflection, blur, depth, and motion.

## Visual matrix

| State | Before | After |
| --- | --- | --- |
| Desktop, dark, English | [before-desktop-dark-en.png](./before-desktop-dark-en.png) | [after-desktop-dark-en.png](./after-desktop-dark-en.png) |
| Mobile, dark, Arabic RTL | [before-mobile-dark-ar.png](./before-mobile-dark-ar.png) | [after-mobile-dark-ar.png](./after-mobile-dark-ar.png) |
| Desktop, light, French | — | [after-desktop-light-fr.png](./after-desktop-light-fr.png) |
| Mobile, light, French | — | [after-mobile-light-fr.png](./after-mobile-light-fr.png) |

The browser capture pass reported zero horizontal overflow and zero console errors in every after state.

## Accessibility

- Semantic article, heading, button, progress, and labelled region structure.
- Keyboard-operable actions with visible token-based focus rings.
- `aria-expanded` and `aria-controls` connect each expansion trigger to its detail region.
- Decorative Lucide icons and asset imagery are hidden from assistive technology; readable identity text remains available.
- Reduced-motion rules disable expansion, hover, and reflection motion when requested.
- Existing typography remains unchanged and the visual-system guard rejects raw colors and non-semantic depth values.

## Performance

- Investment rows and identity components are memoized.
- Holding calculations remain in the existing calculation helper and are memoized per investment.
- Platform-directory identity data is fetched once for the rendered collection.
- Mini charts are lightweight SVG paths generated from existing purchase/current values; no charting runtime or fabricated history is introduced.
- Optimized build output: `/invest` 27.1 kB route payload, 359 kB first-load JavaScript.

## Verification

- TypeScript: passed.
- ESLint: passed.
- Translation completeness (Arabic, English, French): passed.
- Token-only visual-system guard: passed with zero findings.
- Unit suite: passed.
- Production Next.js build: passed.
- Playwright: desktop Chromium, mobile Chromium, and mobile WebKit passed.
- Explicit responsive sweep: 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 px passed with no clipping or horizontal overflow.

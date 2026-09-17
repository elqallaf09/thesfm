# Stock-category scanner validation

Before merge, CI must pass TypeScript, ESLint, i18n, maintainability, unit/integration tests, production build and smoke coverage.

Runtime validation should confirm that each category reports:
- scanned universe count
- matched count
- returned count
- quote-enriched count
- scanner mode/source/update time

A small returned list is acceptable only when the matched count is genuinely small or the response is explicitly marked degraded. The UI must not silently present the configured fallback watchlist as full market coverage.

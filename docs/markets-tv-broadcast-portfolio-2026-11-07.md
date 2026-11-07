# SFM TV: broadcast layout and private portfolio

World market hours previously showed three cards across 27 pages while the overview sidebar pushed news below the TV viewport. The full 81-exchange selection now uses five balanced pages (17/17/17/17/13), advances every 40 seconds, and supports pause, next/previous, saved subsets, and select-all. Scheduled-open cards use the positive theme color. Local clocks and second-by-second opening/closing countdowns remain visible; selecting a card opens its complete schedule, Kuwait target time, and source QR. The existing reference limits for holidays, Ramadan, and exceptional closures still apply.

News, scene movers, and the overview session summary have separate bounded panels. Their pages rotate automatically rather than requiring sidebar scrolling. Font and row measurements follow the allocated panel, including panels mounted after a network response. Overnight chart labels include the changed date. Long navigation labels and quote evidence fit alongside the additional portfolio tab. Existing invalid-measurement ticker recovery remains covered.

## My investments

The additional TV view displays the same `investment_items` records and normalization as the website's Investments Center. It refreshes the authenticated snapshot every 15 seconds and also recovers after visibility/network changes. It shows recorded value, capital, valuation coverage, position count, asset allocation, filters, display currency, source, and valuation time. Position pages rotate every 40 seconds and follow on-screen and TV media pause/resume. No portfolio values are placed in persistent browser storage or the shared public snapshot cache.

The TV is a read-only portfolio display. Polling synchronizes saved website records; it is not an exchange-price streaming entitlement and does not create new valuations. Missing values and FX conversions remain unavailable. Recorded totals include only values in the selected currency and label partial coverage. Older valuations retain their recorded time. The website and TV now share the recorded-value helpers, which also prevent absent values from becoming zero or native values from being relabeled as a reporting currency.

`GET /api/tv/portfolio` requires an active, unexpired paired-device token. The owner is resolved server-side; every investment page and profile query is constrained to that owner. Client-supplied owner selectors are rejected. Responses are private/no-store and project only display fields, excluding notes, AI analysis, snapshots, and user identifiers. Missing/revoked authorization clears displayed values. Pairing and unlink copy includes investments. No database migration or investment write is introduced.

## Validation and distribution

- Node 22.13.0 / pnpm 11.1.3; frozen installation, TypeScript, ESLint, translations, maintainability, repository hygiene, API policy, and visual token checks.
- Full unit/integration run: 4,426 passed, plus 107 engine tests. Private route tests cover two owners, invalid tokens and owner selectors, empty/error distinctions, partial currencies, missing values, and pagination beyond 500 records.
- Packaged Chromium coverage: 46 checks, including Arabic/English/French, 540p through 4K, all 81 markets, exact 40-second paging, second-by-second transitions, full news/movers, portfolio capacity after authenticated loading, refresh/revocation, and media controls. Test financial data exists only in fixtures.
- Production build and all route budgets pass; initial TV JavaScript is 200.0 KiB gzip against 200.2 KiB, and CSS is 77.7 KiB against 78.1 KiB. Ten production-server TV smoke checks pass across desktop and mobile Chromium, including the updated market-hours region contract.
- Huawei test update: `com.thesfm.marketstv.huaweitest`, versionCode 18, versionName `1.0.12-huawei-test`. The certificate matches builds 16/17; three native DEX files are unchanged. All 36 active web assets match the tested standalone build, with stale entry scripts removed. Signature and alignment verification pass.
- APK SHA-256: `73797ee6fbc95a6d8297cfabc7933e52a5fa195808c2c4c97fb61375067f94c3`.

This is signed test distribution, not a store release. No physical television or the user's private holdings were used as a browser fixture. The deployed portfolio endpoint must accompany the APK; the previous production revision does not implement it. Application rollback is the previous immutable production deployment; build 17 remains the prior test artifact. No financial database rollback is needed.

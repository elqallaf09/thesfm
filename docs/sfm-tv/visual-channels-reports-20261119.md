# SFM TV — Visual channels, reports and account profiles

Implementation brief approved 2026-11-19. This branch is a staging area; no production UI changes are implied by this document.

## Navigation
- Move all channel entries from the «قنواتي» modal to the RTL right sidebar. Remove the redundant modal after migration.
- Distinct labels and icons for: live, all stocks, global markets, Kuwait, tech news, commodities, forex, market hours, my stocks, investments, analysis, reports, settings.
- D-pad focus, back navigation, readable TV-safe typography, responsive Huawei tablet layout.

## Profiles and startup
- After splash ends automatically (no Skip), show profile chooser if multiple previously authenticated profiles are available on this device.
- Show only real linked profiles; add-account and guest options. Require authentication before accessing private portfolios; do not treat local profile selection as authorization.
- Sign in/out, switch profile, unlink TV; ensure logout clears sensitive cached data.

## Media cards
- Editorial images for news and channels, with permitted source image or branded fallback. Do not invent video playback; only display Play when playable media exists.
- News headline, source, published time, image, linked article. Accessible alt text and image-loading fallbacks.

## Analysis and reports
- Analysis dashboard: global and Kuwait index performance, sector heatmap, asset classes, portfolio concentration and allocation, provenance and freshness.
- Reports: daily and weekly summaries; only show download for an existing generated report. No mock prices, synthetic portfolio balances or unsupported PDF buttons in production.
- Data authorization and provider licensing enforced server-side.

## Quality gates
- Test RTL Arabic/English, dark/light, 1080p and Huawei layouts, remote navigation, image failures, API empty/stale/error states, guest privacy, profile switching, startup, and no-duplicate channel navigation.
- Keep deployment and APK publishing gated on build, integration tests, security checks and device verification.

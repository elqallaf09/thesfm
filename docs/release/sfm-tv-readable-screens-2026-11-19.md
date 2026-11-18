# SFM TV readable market screens — 19 November 2026

## Scope and candidate

Follow-up to the owner's photographed TV: overlapping quote status/date text,
market headings extending into the quote area, repeated sparse listings,
cropped customization controls, and unclear icon-only header actions.

The focused changes cover the shared web/Android/Tizen/webOS UI. Android preview
version is reserved as 1.0.21/build 27, above the parallel build 26 in PR #372.
Retain the companion news/session improvements when integrating that PR.
No schema, provider, authentication, recorded financial value, or account change.

- Header actions retain their localized names on TV widths, with distinct icons
  for strip mode and My channels. Directional focus stays in the action row.
- Quote metadata stacks provider/status above observation time. Old observations
  retain their date and freshness. Market summaries have their own grid cell.
- Sparse quote sets display once without a scrolling duplicate. Their batches
  still advance, respecting pause/focus/reduced motion and provider cooldown.
- Market customization shows four readable rows per page and an independently
  scrollable editor. Save and view remains in the fixed footer. Directional
  targets connect market selection, editing, pagination and Save.
- Existing remote improvements are preserved: OK/Select/Accept/Space activation,
  bounded directional repeat, focus restoration, grid boundaries and modal scope.
- The unchanged SheetJS tarball has its verified SHA-512 recorded, matching #372;
  no dependency version changes.

## Verification

Completed locally:

- TV packaged production build.
- 313 focused TV unit tests across 53 files.
- Targeted ESLint, aligned AR/EN/FR translations, maintainability guard, diff check.

Pending on the current GitHub head before release:

- Pinned Node 22.13.0/pnpm 11.1.3 frozen installation and all protected-main checks.
- Full packaged Playwright suite, including 22 new readability/picker/remote cases.
- Visual review of 720p/1080p AR/EN/FR light/dark screenshots retained by CI.
- Android compile/lint and installable preview artifact verification.

Local full TypeScript was killed with exit 137 before diagnostics. Local Chromium
could not start because the execution environment denied socket creation. No
local full TypeScript/browser pass is claimed. Connected/cloud browser inspection
was unavailable; UI assertions and captures must run in GitHub's environment.

## Release and rollback

Risk: UI/navigation regression on smaller TV viewports. Preserve existing stored
settings, pairing and provider data. Do not merge a failed required check or
bypass repository rules. Inspect the exact candidate after concurrent #372 work.

Use the standard main-push Markets TV workflow to build and publish the tested
Huawei/Android TV preview. It is debug-signed, not a store release. Physical
television/remote testing must still be reported separately from browser tests.
Rollback is a reviewed source revert or redeployment of the prior verified web
artifact; there is no database rollback. Do not erase user settings.

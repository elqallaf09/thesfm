# SFM TV illustrated news — 19 November 2026

## User request and scope

The owner supplied a visual reference for rounded news cards with a thumbnail
beside a clear headline, arranged in rows or columns. This update carries real
provider images through the TV feed and shows received stories together in the
hall, sidebars, Kuwait channel and dedicated news channels.

The latest market customization request also requires one TV page. The picker
now shows the complete filtered directory and its editor, with a fixed Save and
view footer. This supersedes the four-market pagination in the build 27 release
record. The six named header controls and readable price strips are retained.

## Implementation

- Optional HTTPS thumbnails are preserved in the TV route, dedicated public
  feed DTOs, payload compaction and receiver normalization. The existing URL
  policy rejects embedded credentials; missing images do not remove a story.
- A shared card reserves image space, displays the original source and clock,
  preserves previous-day dates, and uses a neutral news icon if a photograph is
  absent or fails to load. No synthetic articles or replacement photos are used.
- Multiple stories remain visible together; headlines no longer advance behind
  a single-story pager. Remote OK opens the complete headline and source, and
  Back returns to its card. Channel rotation and quote playback remain separate.
- Layouts adapt to available TV space; portrait uses stacked cards. Long titles
  can truncate on dense boards while remaining complete in the accessible name
  and story dialog.
- Superseded headline/lead-queue styles are removed. Existing performance limits
  are unchanged. Android reserves version 1.0.22 / build 28.

## Verification status

The base candidate `3b0824459becda70343c814b7c9c93e17e1ab880` passed all eight
protected checks, 133 packaged TV browser tests, and Android compilation/lint.
Its full website smoke had 1,041 passed, 3 unrelated landing-layout cases that
passed their first retry, 110 skipped and no failures; performance had 39 passed
and 2 skipped. These results establish the base, not this changed UI.

For the new changes, focused image/data tests, scoped ESLint, translations,
maintainability and the standalone TV asset build passed locally. Full local
TypeScript exceeded the execution environment's default 2 GiB heap; the pinned
CI check remains required. Local Chromium failed before page navigation because
the environment disallows its socket operation. No local visual pass is claimed.

An attempted source upload to a temporary Vercel QA sandbox was rejected by
automatic approval review. The sandbox was stopped and no new source was
uploaded. Browser and production verification use the existing repository CI.

Current-candidate browser, TypeScript, full build, budgets and required CI
results must be recorded before merge and deployment.

## Release and recovery

The old build 27 APK remains immutable and does not contain this news update.
Any build 28 APK must be taken from a passing current-candidate workflow and
checked for package identity, version and signature. The separate Preview app
has its own settings and account pairing; do not imply signer continuity or
physical-device testing without evidence.

No provider requests, prices, permissions, authentication or database schema are
changed. Existing news caches can retain image-free responses until their normal
180-second refresh. Existing production observability gaps are not marked as
resolved by UI tests. The prior READY deployment is the rollback baseline; use
the main-push deployment of the actual squash-merge SHA and verify public TV
routes before reporting publication complete.

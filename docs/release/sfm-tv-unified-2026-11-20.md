# SFM TV unified delivery — 20 November 2026

Owner: `elqallaf09`. Operator: Codex under the owner's instruction to complete the
reviewed TV work. Risk: moderate; TV presentation, account navigation, portfolio
valuation and public exchange-directory caching. Source branch:
`fix/sfm-tv-unified-delivery-20261120`. The pull request and its Actions runs record
the exact candidate SHA; this document does not claim a completed deployment.

## Included behavior

- Preserve all reviewed work from #393, including explicit account selection,
  direct sidebar channels, readable settings, original/selected portfolio
  currencies and twelve-position layouts. Portfolio risk flags remain off.
- Integrate #394 company identity and movement, #396 independent stock-page
  playback, #397 approved SFM NEWS fallback artwork, #398 strip-card spacing,
  and #399 European exchange-directory recovery and venue-specific quote keys.
- Retain current main #395's verified twenty-stock European selected sample and
  expanded Gulf/index/commodity coverage. A selected sample is still identified
  as incomplete; it does not become a full exchange directory.
- Resolve the overlapping stock header, playback, coverage and quote-row changes
  together. Company icons remain available when prices are unavailable.
- Use the same venue-aware quote lookup for rows and priced coverage. Ambiguous
  bare symbols, duplicate listing responses and off-page venues cannot inflate
  coverage or attach another exchange's price.
- Keep provider, status and observation as three compact grid rows rather than
  an extra wrapping flex row. The existing minimum font size, full observation
  metadata, source text and layout assertions remain intact.
- Prepare Android version `1.0.26`, build `32`. The separate 45-minute cached
  debug workflow remains independent of packaged browser/release validation.
- Preserve the later #393 build repair (`b29c7c0`): separate 45-minute browser,
  debug APK and release/lint jobs, with pnpm/Gradle caches and debug artifacts
  uploaded before the independent checks finish. The original required
  aggregate check runs even after a failed/skipped dependency and explicitly
  requires all three results to be `success`; skipped work cannot pass it.
- Keep TV stock paging and playback on one header row, restoring the reading
  space needed by all six quote rows; mobile controls still stack.
- Load article details/QR and the legacy balanced headlines panel when needed,
  keeping the existing initial-JavaScript budget unchanged.

## Verification

Frozen root and Expo dependencies were installed with Node `22.13.0` and pnpm
`11.1.3`. Initial combined TypeScript, ESLint, translations, maintainability,
visual-system guard and standalone TV packaging passed locally. The initial
focused suite passed 742 cases and caught one obsolete three-stock European
sample expectation, updated to the exact twenty verified symbols in current
main. Full candidate unit/build results and the final browser/Android evidence
must be recorded in the pull request before promotion.

The first GitHub integration revision `eeb0413` compiled the whole application
but exceeded the unchanged TV initial-JavaScript budget (201.2 KiB versus
200.2 KiB). Its focused presentation workflow exposed the vertical space used
by stacked stock controls. Both causes are addressed in the follow-up revision;
their failed observations remain available in the prior Actions runs. The
missing-price rotation regression now asserts six named unavailable rows,
six exact dash placeholders and 0/6 coverage, retaining all eight-second and
provider-cooldown assertions required by the combined directory contract.

The local system Chromium cannot create its process-singleton socket in this
execution environment (`Operation not permitted`). No local browser pass is
claimed. GitHub's pinned Chromium must run the complete packaged suite, including
Arabic/English/French, light/dark, compact heatmap focus, stock-row containment,
stock rotation, fallback-image recovery, account isolation and portfolio FX.
The combined European rotation regression also checks company badges, movement,
coverage and page-only exchange-qualified quote requests.

Do not weaken, skip or mark the required site-wide smoke, authenticated Preview,
migration, security, accessibility or performance checks as passed. Do not publish
an APK as fully verified before the final packaged-browser and Android jobs pass.

## Release and recovery

No production migration, authorization-policy change, credential change, paid
plan change, risk flag enablement, or FMP synchronization from excluded #363 is
part of this delivery. Existing production migration-ledger and continuous
observability gaps remain recorded, under the owner's previously accepted scope;
a clean CI migration chain does not reconcile the live ledger.

Immediately before any promotion, capture the actual READY production deployment
and SHA as the immutable application rollback target. Require the exact final
candidate checks, then verify the resulting main SHA, READY deployment and both
domain aliases. Perform a five-minute read-only observation of `/tv`,
`/tv/all-stocks`, `/tv/strips` and changed public TV endpoints. Compare runtime
errors with the pre-release provider-unavailability baseline. Abort for a new
attributable application 5xx, incorrect quote/currency identity, auth/private-data
exposure or critical navigation failure; restore the captured application
deployment. No database rollback is included.

Physical TV/Huawei installation, a signed store release and TestFlight delivery
are separate evidence. The preview flavor uses
`com.thesfm.marketstv.preview`; it does not claim signature continuity with the
previous main-package debug APK.

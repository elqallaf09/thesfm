# Markets TV — worldwide release programme

Owner direction: begin the proposed expansion plan (2026-09-19). Distribution
targets supported operating systems, model years and countries; this is not a
claim of universal installation or manufacturer preinstallation.

## First implementation increment

- Three densities keep identity, price/change and original source evidence visible.
- Batch coverage distinguishes directory listings from returned prices. Retained,
  daily reference and unknown-time prices do not count as recent prices.
- Optional priced-only display scans empty batches after eight seconds, only while
  visible, online and unpaused. It does not fetch an entire exchange at once.
- Up to eight locally saved channels preserve market order, selected instruments,
  language, theme, density, visibility filters and per-market speeds. Storage
  failures do not silently overwrite saved channels. Device credentials are never
  serialized into channels. Channels and large instrument selections remain local
  to each screen; cross-device channel sync is not implemented in this increment.
- Optional idle controls hide after 12 seconds away from focused toolbar controls;
  pointer/remote activity restores them. The SFM identity remains visible.
- Packaged clients start on the strip wall. Android CI now also produces an
  unsigned release Android App Bundle (`bundleRelease`) for the Play release path.

## Platform release sequence

| Stage | Target | Packaging available | Remaining release gates |
| --- | --- | --- | --- |
| 1 | Samsung Tizen, initially 6.5+ | Bundled web assets and manifest | Owner seller account, certificate/signing, WGT packaging, model tests, submission and regional approval |
| 1 | Google TV / Android TV, including compatible TCL models | Native host with bundled client; debug APK, unsigned APK/AAB CI targets | Upload key/signing, Play Console setup, device qualification, policy declarations and review |
| 2 | LG webOS | Bundled web assets and manifest | Model/browser qualification, IPK packaging, Seller Lounge documents and review |
| 2 | Apple TV / tvOS | Not implemented | Native TV client, signing, device qualification and App Store review |
| 3 | Fire TV, Roku, VIDAA and other regional platforms | Not implemented | Current platform/SDK assessment, separate implementation and store acceptance |
| Additional access | Compatible television browser or supported external HDMI device | Web strip wall | Publish an explicitly tested compatibility matrix; no universal browser claim |

The first-party Android requirements call for Android App Bundles, D-pad access,
TV launcher assets, accurate store screenshots and current architecture/page-size
compatibility. The Java/WebView host has no application-owned native `.so` files;
release qualification must still inspect the final dependencies/artifact and test
32-/64-bit devices and a 16 KB environment. Do not equate a successful web build
with Play acceptance. See [Android TV quality](https://developer.android.com/docs/quality-guidelines/tv-app-quality).

Samsung requires a conforming package and self-testing before submission through
[TV Seller Office](https://developer.samsung.com/tv-seller-office). LG follows
[submission, QA and approval](https://webostv.developer.lge.com/distribute/app-approval-process).
Apple TV development follows the [tvOS platform](https://developer.apple.com/tvos/).

## Acceptance before store submission

Record exact artifact/commit, firmware, OS, model, WebView version where relevant,
remote type, locale, display resolution, duration and observed result for each run.

1. Install and cold start; reach the public strip wall without entering credentials.
2. Navigate every setting, market and modal by remote only; Back returns correctly.
3. Verify AR/RTL, English/French, 720p/1080p/4K, readable text and safe screen edges.
4. Run a 24-hour soak on entry-level hardware; record memory and visible animation
   stalls, network reconnect, sleep/wake and source outage recovery.
5. Pair an isolated account, apply/revoke access, ensure another owner cannot read
   devices or private watchlists, and verify no account-wide token reaches the TV.
6. Verify all displayed values retain their actual source and observation time.
   Confirm intended personal/public-display and redistribution rights with suppliers.
7. Capture actual released UI for store screenshots, finalize privacy/support URLs,
   app descriptions and country availability; complete vendor review.

No physical-device soak, signing or store approval is asserted by this document.
The website release follows the existing protected CI and release checklist.

## Following increments

1. Phone control: owner-scoped remote editing of settings and selections, revisioned
   updates to prevent stale TV writes overwriting phone changes, and expiry/revoke tests.
2. Channels: account synchronization, optional rotation and time-zone-aware schedules.
3. Data coverage: provider entitlement inventory per exchange/asset class; streaming
   only where supported and licensed, with explicit quote delay and session status.
4. Multi-screen administration: separately named screens, permissions, read-only
   presentation mode and health monitoring without collecting displayed portfolios.
5. Broader platforms and manufacturer distribution discussions after first releases.

Factory preinstallation is a separate partnership workstream, not an app-store
publishing outcome. No vendor contact or store submission has been made here.

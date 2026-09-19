# The SFM Markets TV

An independent television client sharing The SFM's existing market-data,
watchlist, alerts and saved-intelligence contracts. Development is mandatory in
[the platform roadmap](platform-master-roadmap.md), and was brought forward by
the owner's instruction to build it now. Store publication is a separate gate.

## Delivered implementation

| Area | Implementation | Boundary |
| --- | --- | --- |
| Display | `/tv`, remote directional navigation, modal focus/Back, 720p/1080p/4K scaling, Arabic/English/French, dark/light, two layouts | Physical TV acceptance remains required |
| Markets | Curated US, six Gulf countries, Europe, Asia, global indices, crypto, FX and commodities | Selected assets; not every exchange listing |
| Evidence | Canonical SFM market engine; source, observation time, missing/unknown/delayed/stale states on cards and ticker | Provider rights and coverage remain those of the upstream sources; no generated prices |
| News | Existing financial-news aggregator, source/time and phone QR | Headlines are not relabeled as verified breaking news |
| Map / hours | Region clocks/map; official regular cash-equity hours for Kuwait, Saudi Arabia, NYSE and Tokyo, reviewed 2026-09-19 | No verified holiday/exception feed; deliberately no fabricated “open now” assertion |
| Brief | Coverage and top three gainers/losers within the displayed, timestamped sample | Not a scheduled delivered Daily Brief or a claim to rank the entire market |
| AI | Reads existing saved analyses; only complete, unexpired, sufficient-evidence results; asset QR | Does not generate paid AI work in a polling loop |
| Account | Phone approval, short-lived QR code, device list and revocation, watchlist sync and device settings | No Supabase session or account-wide token on the TV |
| Alerts | Existing saved/active alerts, currency checks, screen banner and optional sound | While screen is open and for the loaded assets; not background push delivery |
| Rotation | Timed cycling through selected markets; pauses for interaction/dialogs | Automatic news/analysis storytelling remains a later extension |
| Samsung | Packaged classic-script web build and Tizen manifest, minimum Tizen 6.5 / 2022 target | WGT signing, seller account and real-device certification required |
| Google / Android / TCL | Android TV application with bundled assets, Leanback launcher/banner, remote Back, secure WebView asset loader | TCL support is for Google/Android TV models; updated WebView required; store signing/device QA pending |
| LG | Prepared webOS web package | CLI packaging, model qualification and store certification pending |
| Apple TV | Remains in the explicitly later platform phase | No tvOS application is claimed implemented |

## Code and API

- UI: `src/components/markets-tv`, shared contracts: `src/lib/markets-tv`.
- Server-only account/device operations: `src/lib/server/markets-tv`.
- `GET /api/tv/snapshot?group=global`: fixed public groups. `watchlist` requires a device token, and uses up to 50 owner-selected symbols.
- `GET /api/tv/news?language=ar`: source-backed headlines.
- `POST /api/tv/pair`: creates a pending request; `GET` polls/claims it with the secret in `x-sfm-tv-token`.
- `GET/POST/DELETE /api/tv/account`: authenticated, MFA-complete owner only; mutations require same-origin requests.
- `GET/PATCH/DELETE /api/tv/device`: device-scoped data, settings and revocation. These tokens never authorize other APIs.
- `GET /api/intelligence/latest`: existing read-only analysis contract.

Pair codes contain 48 random bits and expire after ten minutes. Poll/device
secrets contain 256 random bits. Only SHA-256 hashes are stored. Owner approval
is a conditional update that consumes the code. Claim atomically rotates the
poll secret to a 30-day TV token. Concurrent/replayed claims fail. Loss of the
single successful response requires a new pairing. Codes travel in the QR URL
fragment, and phone session storage preserves them across login without placing
them in login query parameters. Settings and private device responses are
`private, no-store`; private watchlist ownership never enters the shared quote
cache. RLS denies client access to the device table; server-only queries are
scoped by the verified user ID or hashed device token.

Public sources reuse the canonical SFM market engine and its provider cache. The TV preserves closing/daily reference prices with a stale label; they never enter current-price movers or alerts. The engine excludes the platform's prohibited fallback providers. Four quote workers share a 40-second request budget; unavailable assets remain explicit missing states. Quote/device polling is once per
minute, news once per three minutes, and saved analyses once per five minutes.
Polls do not overlap and suspend in hidden screens. Missing prices remain missing;
retained prices age in place. Screen state never substitutes a retrieval time for
the provider's observation time. Pair creation also has a PostgreSQL advisory-lock
rate limit across server instances. Records seven days past expiry are cleaned
opportunistically on subsequent pair creation.

CORS is restricted to the packaged-client APIs and the Android asset origin or
opaque packaged origin. Cookie-based owner approval never receives packaged CORS.
There is no `Access-Control-Allow-Credentials` grant and no native JavaScript bridge.

## Build and run

Use the repository's Node 22.13.0 and pnpm 11.1.3.

```sh
pnpm install --frozen-lockfile
pnpm dev
# Open /tv; use /tv/pair on the phone.
pnpm build:tv
# Optional isolated backend: SFM_TV_ORIGIN=https://your-preview.example pnpm build:tv
```

`.tv-build/tizen` and `.tv-build/webos` contain offline-bundled UI assets. Data
continues to require the configured HTTPS backend. API keys never enter these
packages. Generated bundles are ignored by Git. The Android asset directory is
prepared by the same command; compile with JDK 17 / Gradle 8.13:

```sh
cd apps/markets-tv/android
gradle assembleDebug assembleRelease lint
```

The `Markets TV packages` workflow performs the web/native builds and retains
APK/web-package artifacts. Release APKs are unsigned; debug APKs are test builds.
Use the owner's Samsung certificate profile to package the Tizen directory with
Tizen Studio. Use the LG developer CLI to package the webOS directory. Vendor
accounts, signing keys and store approvals are not provided by this repository.

## Database and deployment

`20260919064721_markets_tv_devices.sql` is additive. It creates the device table,
indexes and service-only pairing RPC. Apply it through the established release
migration process after the full clean-chain gate passes. Do not reset or replay
Production to resolve unrelated historical migration drift. Both the existing
public Supabase settings and `SUPABASE_SERVICE_ROLE_KEY` are needed by the server;
only the public settings may use a `NEXT_PUBLIC_` prefix.

The previous application does not depend on this new table, so application
rollback remains compatible with an applied migration. Preserve the new table
on rollback; do not reverse it after device records exist. Expiry/revocation
remains authoritative if the feature is disabled.

Read-only preflight found the hosted project reports an existing
`MIGRATIONS_FAILED` branch state and has no TV table yet. This document does not
claim that Production migration or deployment has completed. The normal release
checklist still requires an exact deployment SHA, authenticated isolated smoke,
monitoring ownership, canary evidence and explicit acceptance of any open gaps.

## Verification and remaining acceptance

- Unit tests cover source-time/price validity, stale ranking exclusion, bounded
  catalogs, settings, remote geometry, CORS, no-account-token fallbacks, MFA,
  foreign-origin rejection, limited JSON bodies and private response caching.
- The clean-chain CI job also runs `markets-tv-validation.sql` in disposable
  PostgreSQL: one-use approval/claim, owner isolation, token expiry/revocation,
  durable rate limit and denied client table/RPC privileges. Fixtures roll back.
- Local packaged-browser checks exercised 1280×720, 1920×1080, 3840×2160, mobile width,
  remote navigation, dialog Back, QR rendering, AR/EN/FR and theme switching.
  Synthetic data used for these geometry tests is confined to QA and never
  shipped as a provider fallback.
- Run the repository's full quality/build/performance gates before release.
- Complete a real isolated account/phone/TV pairing on the release preview and
  test provider outage/reconnect, suspend/resume and a prolonged device session.
- Qualify concrete Samsung, Google/Android and LG models, screen-reader behavior,
  WebView/firmware versions and retailer packaging. Browser tests alone do not
  establish physical-device certification.
- Provider/exchange redistribution rights, full exchange coverage and verified
  session/holiday feeds must be resolved before a commercial public-display SLA.

Official platform references: [Samsung engine matrix](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html),
[Samsung remote keys](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html),
[Android TV entry requirements](https://developer.android.com/training/tv/get-started/create),
[Android Gradle Plugin 8.13](https://developer.android.com/build/releases/agp-8-13-0-release-notes).

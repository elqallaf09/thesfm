# The SFM Markets TV

## Display and global release increment

See [the worldwide release programme](markets-tv-global-release.md) for current
scope and remaining store gates. Strip display now offers three densities, batch
price coverage, a priced-only filter, market ordering, independent motion speeds,
optional idle controls and eight locally saved channels. These channels preserve
instrument selections and display settings; phone channel editing/sync remains a
following increment. Packaged clients open the strip wall, and the Android CI job
also builds an unsigned AAB alongside APKs. Vendor signing and publication remain pending.

## Per-market instrument choices

Display settings expose an AR/EN/FR language selector and a direct market-customization entry. Each market supports all instruments or individually selected symbols, with Arabic/English name and ticker search across its full directory. `/api/tv/instruments` returns 50 identity-only rows per page; browsing does not fetch prices. Selected strips send only their current batch (at most 12 symbols) to `/api/tv/snapshot`, which resolves those symbols within the specified market before fetching any quote. Empty selection stays empty; choosing all restores ordinary directory pagination.

Instrument choices persist locally per TV/screen, independently of the linked device's small synchronized settings payload. They do not change the account watchlist. Names reuse existing exchange-scoped Arabic metadata, including `NBK.KW` → `NBK` / `بنك الكويت الوطني`; the original provider symbol still controls quotes. Moving cards display the asset icon, symbol and name, price/currency, direction/percentage, and original source/time evidence in both themes. Unknown translations or logos use the existing name/generic icon rather than an invented identity.

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
gradle assembleDebug assembleRelease bundleRelease lint
```

The `Markets TV packages` workflow performs the web/native builds and retains
APK/web-package artifacts. Release APKs are unsigned; debug APKs are test builds.
Use the owner's Samsung certificate profile to package the Tizen directory with
Tizen Studio. Use the LG developer CLI to package the webOS directory. Vendor
accounts, signing keys and store approvals are not provided by this repository.

## Database and deployment

`20260919064721_markets_tv_devices.sql` is additive. It creates the device table,
indexes and service-only pairing RPC. `20260919085912_markets_tv_source_read_access.sql`
grants the server role SELECT on only the watchlist/alert columns the TV uses;
owner filters remain mandatory and client RLS/grants are unchanged. Apply both through the established release
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

## Complete listing discovery and exchange strips

The strip wall now includes the official bundled SFM logo, market-by-market
search/selection (persisted locally and through the existing owned device settings),
compact/comfortable density, three motion speeds, pause and manual refresh. Quote
tiles show asset identity/icons, direction arrows, short price-change highlights
only on a newer source observation, and source/time evidence. Unknown overseas
logos use an identity badge instead of a same-ticker US company logo.

Visible crypto strips poll every 15 seconds and other strips every 30 seconds,
after the preceding request completes; this is a refresh cadence, not a promise
of upstream real-time entitlement. A four-request client queue bounds fanout.
Failed refreshes preserve the last same-exchange/currency quote without rewriting
its source clock. Date/number formatters are reused. The public snapshot budget
supports 120 requests/minute for a multi-row display; owned watchlists retain 30.

Crypto discovery uses all active Binance Spot trading pairs from exchangeInfo,
and each page uses one batch 24-hour ticker request. USDT, USDC, BTC and other
quote denominations remain explicit and are never relabelled USD. Forex discovery
uses the entire Twelve Data forex_pairs directory. Quotes use matching provider
pairs; the fallback is an explicitly dated daily ECB reference cross rate where
both currencies are published, never labelled live. This does not promise every
coin on every venue or price entitlement for every discovered pair.

Exchange snapshots fetch only their own MIC-scoped directory, with persistent
directory caches, instead of downloading the 42 MB global list per visible row.
Counts are cached separately. Quote requests carry the already verified listing.
Market-specific access failures do not disable unrelated exchanges. Foreign
equities require matching MIC, symbol and currency; unsupported Finnhub index/
commodity fallback is excluded to prevent lookalike equity prices.

Source contracts: [Binance market data](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints),
[Twelve Data forex directory](https://api.twelvedata.com/forex_pairs),
[ECB daily reference history](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml).

`/tv/strips` is a dedicated full-height market-strip page, linked from `/tv` by
“Strips only”. It keeps a compact toolbar for the dashboard, pairing, settings
and fullscreen; the remaining viewport belongs to stacked independently scrolling
market rows. The page retains language, theme and market preferences, always
shows its strips even if the dashboard ticker is disabled, and avoids dashboard
snapshot/news requests and automatic group rotation. Offscreen rows still pause
polling. Packaged TV clients switch to this view in place without leaving the app.

`/world-stocks` now browses the full synchronized US universe alongside the
checked-in Kuwait, Dubai, Shanghai and Shenzhen directories. All-market browse
includes US rows, search no longer inherits the 20-result autocomplete limit,
and pagination can reach beyond the former 200-page ceiling. The server also
synchronizes the Twelve Data worldwide stock directory and exposes each returned
MIC as its own filter. Directory availability and quote access remain separate;
failed worldwide synchronization is visible and retains available directories.
This does not assert that every exchange or every live price is licensed.

`/api/tv/catalog` supplies market identities and counts. `/api/tv/snapshot` takes
`group`, `market`, zero-based `page` and `pageSize` (at most 12). It fetches only
the visible page from the full directory. Selecting a market resets the page,
changes the main panel and promotes its strip. Each exchange has a separate
stacked strip with constant 32 px/s motion, source/observation time, unavailable
rows, manual next-page control and automatic advancement after each pass.
Only visible strips poll; hidden rows and duplicate animation copies do not
consume remote focus. Scrolling stays inside the TV layout at 720p/1080p/4K.

World-stock quote keys include exchange and symbol, preventing a dual-listed
symbol from receiving another exchange's currency/price. Observation times come
from upstream evidence, never the time our HTTP request completed. Extended
exchange quotes validate symbol, MIC and currency and require a server-side
Twelve Data key. Missing access produces an unavailable price. The standalone
TV package opens the world-stock browser via QR; its embedded directory and
remote market selection work without Next.js routing.

Worldwide discovery requests `type=Common Stock` explicitly. A source probe
returned 161,581 rows across 87 MICs/58 countries (42.5 MB); the unfiltered feed
exceeded the old 40 MB budget. The streamed equity response now has a 64 MB
limit, a 35-second source timeout, and a daily single-flight process cache. TV
quote work shares a 50-second total deadline with directory loading. These
source counts precede identity validation, deduplication and primary-directory
replacement; they are not a claim that every returned row has quote access.

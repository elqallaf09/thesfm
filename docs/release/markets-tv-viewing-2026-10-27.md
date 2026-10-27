# Markets TV viewing experience

## Scope and behavior

`/tv` and the packaged television client now start in viewing mode. A scene has
at most four summaries, six main instruments, a small coverage panel, two news
headlines, and one controllable ticker. The existing full market browser and
`/tv/strips` remain available. Scenes, language, rotation, theme, market order,
instrument choices, and channels retain their existing storage and device sync.
Legacy saved channels open in strips mode so their selected instruments remain
visible; new channels explicitly save their display mode and scene.

The five scenes are overview, Kuwait/Gulf, world, currencies/commodities, and the
device owner's watchlist. Overview deliberately includes three indices and
BTC/USDT; the world scene keeps its four index summaries. Curated scene identity
does not imply that every configured provider can return a price for it.

## Data contract

- The scene API resolves at most ten instruments without downloading the global
  stock directory. Summaries and rows have separate counts; displayed coverage
  deduplicates instrument identities. Catalogue size never means price coverage.
- Source, source observation time, unit, change period, and quote state stay
  visible. UI times use Kuwait time and Latin numerals across Arabic, English,
  and French. Missing prices remain absent rather than becoming zero.
- Explicit exchange-close observations are `closed`; date-only observations are
  reference values. An unverified delay is `unknown_delay`, not a live claim.
- Failed refreshes preserve the last valid observation and its original source
  and receive times. Retained prices are stale and excluded from the change map.
- Instrument matching checks symbol, currency and market/MIC where available.
  A spot-metal alias cannot replace a futures contract, and USD and USDT pairs
  are distinct. Metadata-free watchlist failures can retain a quote only when
  one prior identity is unambiguous and no supplied field contradicts it.
- Owned watchlists recognize explicit USDT pairs whose base is present in the
  local crypto registry. Both slash and compact forms retain the saved symbol
  and use the Binance batch with USDT units; duplicate provider symbols are
  fetched once. Unknown or bare symbols retain the existing resolver, with
  denomination checks on crypto results and no USD substitute for a failed
  USDT quote.
- Provider failures expose bounded reason codes, never provider credentials or
  raw responses. The shared World Stocks adapter marks retained failures
  unavailable for its older consumers, while TV can label the retained value.

## Request and interaction behavior

Public scene snapshots are cached for 15 seconds on the server with singleflight
for identical concurrent requests. The price resolver uses at most four ordinary
workers and a nine-second work deadline; selected crypto pairs use one batch.
The client retains at most 32 public snapshots, deduplicates in-flight requests,
and prefetches only the next public scene when rotation is enabled. Foreground
scenes refresh every 30 seconds, or 15 seconds for the assets scene. Retry
cooldown respects rate limits. Hidden, offline, and unmounted consumers cancel
their work without cancelling another active consumer of a shared request.

Watchlist responses and device tokens never enter shared response caches.
Invalid scene/group combinations are rejected, and the private scene requires a
valid device before owned data is loaded. A 401/403 removes retained private data
in the same render, including the independent strips cache.

Remote arrows, OK, Back, and media keys preserve focus through quote updates.
Dialogs return to their opener. Rotation waits after activity and remains paused
while the viewer is reading focused scene content. The ticker has its own pause
control and respects reduced-motion preferences. Form inputs retain their normal
keyboard behavior.

## Validation and release boundary

The automated coverage includes scene bounds, private access, source timestamp
retention, identity mismatch, close/reference timing, request deduplication,
cancellation, cache eviction, rate limits, old channels, and remote input.
Browser smoke covers 720p, 1080p and 4K containment, mobile overflow, AR/EN/FR,
source details, focus restoration, short watchlists, and the original browsing
and strips flows. Row containment is checked separately from page overflow.

Local verification of the initial feature on 2026-10-27 used Node 22.13.0 and
pnpm 11.1.3:

| Gate | Result |
| --- | --- |
| Frozen root and Expo dependency installation | Passed; lockfiles unchanged |
| TypeScript and ESLint guard | Passed; no warning-debt growth |
| Translation, maintainability, visual-system, repository-hygiene, public-env and API/page policy guards | Passed |
| Vitest | 4,043 passed; 23 existing test skips and 5 skipped files |
| Engine tests | 102 passed |
| Production build and packaged TV web build | Passed |
| Chromium smoke against the production build | 13 passed |
| Performance budget | Passed, including new TV route budgets |

For both TV routes, the initial build-manifest measurement including shared
layout assets was 185,041 bytes of initial JavaScript and 71,605 bytes of CSS
after gzip. New ceilings of 205,000 and 80,000 bytes allow roughly 11% headroom
and make future growth visible in CI. These are transfer-size measurements,
not observed network latency or real-user Web Vitals.

A subsequent caption-only adjustment establishes a 12px minimum and relative
line heights. It passed all six layout fixtures: 720p, 1080p and 4K against both
the existing typography and the parallel shared-font update in PR #315, with
the actual Cairo and IBM Plex Mono fonts loaded. All six quote rows remained
inside their bounds. The browser regression test now asserts the caption floor.
The local full rebuild of this adjustment was terminated by shared-worker
memory pressure (exit 137); the exact final revision must pass the isolated CI
production build and browser gates before merging.

A subsequent focused watchlist correction covers owned-symbol loading, both
USDT symbol forms, scene and paged snapshots, batch deduplication, and provider
failure without a USD fallback. Its final revision also requires the full CI
gates; the initial validation counts above are not claimed for later revisions.

Run the repository release gates and `pnpm build:tv` before merging. CI must
validate the exact PR head; production verification must identify the merged
commit and its ready Vercel deployment. This change does not alter database
schemas, provider subscriptions, billing, or the Trader protected boundary.

## Deployment observation

PR #316 records the final candidate SHA, required-check results, merge SHA and
READY deployment identity. The existing main-branch deployment applies to all
production visitors; this change does not create a separate canary audience.
The release operator observes the changed public routes for five minutes after
deployment, checks their real snapshots and layouts, and checks filtered runtime
errors. Changed-route 5xx, broken authorization, private-data disclosure or a
critical viewing failure requires reverting to the immediately preceding READY
immutable deployment. Its identity is captured again immediately before merging.

This supervised observation is not evidence of continuous RUM, alert delivery,
or physical-device validation. Those controls are recorded separately as proven
or unverified in the PR release record; no monitoring control is marked passed
solely because a build or browser fixture passes.

Provider coverage must be assessed from real source responses after deployment.
Earlier public production probes returned Binance and some US prices but no
price for the sampled Kuwait instrument or S&P 500 index. That observation alone
does not establish an entitlement or symbol-mapping cause. No complete-market
coverage, real-user Web Vitals improvement, or physical television/remote testing
is claimed by this change. Vendor signing and store submission remain separate.

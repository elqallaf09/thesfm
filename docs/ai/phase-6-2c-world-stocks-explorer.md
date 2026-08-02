# Phase 6.2C — World Stocks Explorer

A global-equities discovery workspace at `/world-stocks` that lets users
search, filter, and inspect real listed companies from the exchanges this
repository's providers actually cover — with no fabricated prices, market
metadata, rankings, or availability.

## Supported providers and markets

This section is the ground truth for what "real coverage" means in this
feature. It was established by auditing the repository's existing data
infrastructure before any code was written, not assumed.

| Exchange | Region ID | Coverage | Source |
|---|---|---|---|
| Boursa Kuwait | `BOURSA_KUWAIT` | `bundled_official` — real, synced | `scripts/sync-market-symbols.mjs` → `src/data/market-symbols/boursa-kuwait.json` |
| Dubai Financial Market | `DFM` | `bundled_official` — real, synced | same script → `dfm-listed.json` |
| Nasdaq Dubai | `NASDAQ_DUBAI` | `bundled_official` — real, synced | same bundled catalog |
| US markets | `US` | `dynamic_official` — real, live | NasdaqTrader symbol directory, 24h cache (`src/lib/market/usSymbolResolver.ts`) |
| Saudi Exchange / Tadawul | `TADAWUL` | **not supported** | labeled in `marketExchangeOptions.ts` (`coverage: 'requires_sync'`) but `scripts/sync-market-symbols.mjs` never fetches it — zero real data anywhere in the repo |
| Abu Dhabi Securities Exchange | `ADX` | **not supported** | same as above |
| Qatar Stock Exchange | `QSE` | **not supported** | same as above |
| Bahrain Bourse | `BAHRAIN_BOURSE` | **not supported** | same as above |
| Muscat Stock Exchange | `MUSCAT` | **not supported** | same as above |

The five "not supported" exchanges are **excluded from the region list
entirely** (`src/lib/world-stocks/regions.ts` filters
`MARKET_EXCHANGE_OPTIONS` to `coverage !== 'requires_sync'`) — not shown as
a region that silently returns nothing. If real sync coverage for any of
them is added later, they appear automatically; no World Stocks code needs
to change.

Quotes are fetched through the existing multi-provider chain in
`src/lib/market/marketDataProviders.ts` (`getQuoteWithFallback`): TwelveData
→ Finnhub → EODHD → Marketstack → Yahoo, in that fallback order, whichever
provider is configured and returns data first. OpenBB is **not** integrated
in this repository (evidently removed — see
`src/__tests__/unit/obsoleteProviderRecovery.test.ts`) and is not a data
source here.

## Normalized data contract

`src/lib/world-stocks/types.ts` — `WorldStock`. Every field preserves
provenance; nothing is inferred from the symbol string when the underlying
catalog/provider did not supply it.

- **Always populated when a match exists**: `canonicalSymbol`,
  `providerSymbol`, `displayName`, `exchangeCode`, `exchangeName`,
  `region`, `assetType`, `logoKey`.
- **Populated when the source provides it, `null` otherwise — never
  guessed**: `countryCode`/`countryName` (localized only through a small
  verified map for the three actually-supported countries: KW/AE/US — an
  unmapped code is passed through as-is, not translated),
  `currency`, `dataSource`.
- **Always `null` today**: `sector`, `industry`, `marketCap`. Neither the
  bundled-directory nor the Supabase `market_symbols` search path carries
  these through into `MarketSearchItem` yet, even though
  `MarketSymbolRecord` has a raw `sector` column. Rather than fabricate
  them or silently drop the fields, they're kept in the type as real,
  honestly-`null` fields — a UI or filter that depends on them (e.g. the
  spec's optional sector filter) is simply not built until the data
  actually flows through, to avoid a control that can never return a
  match.
- **Metadata vs. quote availability are tracked independently**:
  `metadataStatus` (`'available' | 'unavailable'`) and `quoteStatus`
  (`'available' | 'unavailable' | 'not_fetched'`). A stock always has
  `quoteStatus: 'not_fetched'` immediately after search, before its quote
  has actually been requested — this is distinct from `'unavailable'`,
  which means a quote fetch was attempted and the provider chain failed
  or returned nothing. The UI never invents a price for either state.

## API boundary

- `GET /api/world-stocks/search` — zod-validated `query` / `region` /
  `assetType` / `page` / `pageSize` (max 30) / `lang`. Composes
  `searchBundledMarketSymbols` / `listBundledMarketSymbols` (Kuwait/DFM/
  Nasdaq Dubai, small in-memory catalogs, ~286 records combined) and
  `searchUSSymbols` / `getUSSymbolUniverse` (US, 24h-cached, sliced
  server-side — the full multi-thousand-row universe is never sent to the
  browser). Deduplicated by `region:canonicalSymbol`, paginated
  server-side.
- `POST /api/world-stocks/quotes` — zod-validated array of up to 30
  symbols (matching the max page size — this endpoint only ever quotes
  the current visible page, never a bulk list). Deduplicated by canonical
  symbol before fetching. A provider failure or unconfigured provider
  yields `quoteStatus: 'unavailable'` with `price: null`, never a
  fabricated fallback value, and sets `partialFailure: true` on the
  response.
- `GET /api/world-stocks/detail` — zod-validated `symbol` + `region` +
  `lang`. Region is required because canonical symbols are only unique
  *within* an exchange — `MKHZN` (Agility) is a genuine dual listing on
  both Boursa Kuwait (`MKHZN.KW`) and DFM (`MKHZN.DU`) with different
  provider symbols, verified directly against the bundled JSON files, not
  assumed. Does an exact-match lookup, not the fuzzy/ranked search used on
  the explorer page.

All three routes are rate-limited via the existing shared
`rateLimitRequest` (`src/lib/server/rateLimiter.ts`), reject malformed
input with a 400 before doing any provider work, and never expose a raw
provider error or a provider API key to the client.

## Caching and freshness

- Bundled catalogs (Kuwait/DFM/Nasdaq Dubai): held in memory, refreshed
  only by re-running `scripts/sync-market-symbols.mjs` (out of scope for
  this PR).
- US symbol universe: 24h in-process cache
  (`src/lib/market/usSymbolResolver.ts`), falls back to a small bundled
  static catalog if the live NasdaqTrader fetch fails.
- Search API response: `s-maxage=120, stale-while-revalidate=300`.
- Quotes: never cached at the World Stocks layer — always a fresh
  `getQuoteWithFallback` call per request, since a stale quote is the one
  thing this feature must not silently serve as if it were current.
  (The underlying provider clients may apply their own short-lived
  internal caching; that is unchanged existing behavior, not something
  this feature added.)

## Rate limits

60 requests/minute per client IP, per route (`prefix: 'world-stocks-search'`
/ `'world-stocks-quotes'` / `'world-stocks-detail'`), matching the existing
convention used by `/api/tech-news`.

## Known coverage limitations

- Saudi/ADX/QSE/Bahrain/Muscat: no real data, intentionally excluded (see
  table above).
- Sector, industry, and market cap: always `null` today (see "Normalized
  data contract"). No sector filter is exposed in the UI as a result — it
  would never return a match.
- No historical price/chart data is wired into this pipeline. The detail
  page shows an explicit "chart data is not currently available for this
  symbol" state rather than an empty or synthetic chart. Wiring
  `fetchYahooHistory.ts`/candle data into a real chart is out of scope for
  this PR.
- This is an equities/ETF explorer specifically (`assetType: 'stock' |
  'etf'`) — crypto, forex, commodity, gold, and index results from the
  underlying search functions are filtered out, not shown.
- US-region browsing (no search query) sorts alphabetically and paginates
  server-side over the cached NasdaqTrader universe; the combined
  "All markets" browse (no region, no query) intentionally shows only the
  bundled catalogs, not the full US universe, so it doesn't functionally
  collapse into "browse the US only."

## Security model

- Every query parameter is validated with a strict zod schema before any
  provider call; malformed input gets a 400, never a best-effort parse.
- `pageSize` is capped at 30 server-side regardless of what a client
  requests.
- The quotes endpoint caps the request body at 30 symbols and validates
  each one's `exchangeCode` against the same supported-region list the
  search endpoint uses — a client cannot request a quote scoped to an
  unsupported exchange.
- No client-side code calls a secret-backed provider directly; every
  provider call goes through the existing server-side
  `marketDataProviders.ts` chain.
- Provider errors are logged server-side and never forwarded verbatim to
  the client — the client only ever sees the small, fixed
  `WorldStock*Response` error shape.

## Handoffs

- **Market Analysis**: `/market-analysis?symbol=<canonicalSymbol>` — the
  same query-param convention already used elsewhere in the app (e.g.
  `CryptoNewsPage.tsx`, `CyclicalStocksNewsPage.tsx`).
- **AI Analyst**: `/ai-analyst/overview?symbol=<canonicalSymbol>&assetType=<stock|etf>`.
- **Investments Center**: `/investments?symbol=<canonicalSymbol>` — no
  existing convention was found for this handoff before this PR; the same
  `?symbol=` pattern was adopted for consistency with Market Analysis
  rather than inventing a different one.
- **Watchlist**: inserts directly into the real, RLS-scoped Supabase
  `market_watchlist` table — the same pattern
  `AiAnalystPersonalSurfaces.tsx` already uses for the AI Analyst's own
  watchlist surface. There is no dedicated `POST /api/watchlist` route to
  reuse; that path already exists as an unrelated live-quote endpoint used
  by the trader app. A signed-out or guest user is given a real
  `loginHrefForCurrentLocation()` sign-in link in place of the Add button
  — never a button that would silently fail or attempt a write without a
  session.

## Deferred: Phase 6.2D site-wide logo refactor

This PR reuses the existing canonical logo/identity resolver
(`AssetIdentity` / `resolveAssetIdentity` in `src/lib/assetVisuals.ts`)
exactly as-is, including its truthful initials/category-icon fallback when
no real logo exists. No new logo source, no site-wide logo migration, and
no third-party image guessing were introduced. A broader logo-system
refactor, if one is planned, is explicitly out of scope here (Phase 6.2D).

## Test evidence

- Focused unit tests (no network, run entirely against real in-memory
  bundled data or explicitly mocked provider boundaries):
  `src/__tests__/unit/worldStocksData.test.ts` (region truth table,
  normalization, no-fabricated-fields, in-memory pagination, quote
  deduplication and truthful failure state),
  `src/__tests__/unit/worldStocksSort.test.ts` (gainers/losers ranking
  restricted to actually-fetched quotes), and
  `src/__tests__/unit/worldStocksDetail.test.ts` (exact-match lookup,
  region-scoping including the real Kuwait/DFM dual-listing case,
  not-found behavior).
- Playwright (`tests/smoke/world-stocks-explorer.spec.ts`): real search
  results with asynchronously-arriving live quotes, the region list never
  offering an unsupported market, no duplicate search request on
  hydration, the advanced-filters dialog's focus-trap/Escape/inert-
  background behavior and active-filter chips, table column sorting via
  `aria-sort`, truthful empty and provider-error states, detail-page
  rendering with truthful unavailable states and a real (not fake) chart-
  unavailable message, all three handoff link targets, the guest sign-in
  link in place of a watchlist button, Arabic RTL with zero horizontal
  overflow, and reduced-motion handling for the loading skeleton.
- Manually verified in-browser (both Arabic RTL and English LTR): live
  search against the real bundled catalogs, region filtering, a live
  "apple" search returning genuine US-listed matches (Apple Inc. alongside
  unrelated real symbols like Apple Hospitality REIT and Maui Land &
  Pineapple Co — never fabricated results), real fetched prices/changes
  rendering in both the table and detail views with real provider
  attribution (Yahoo Finance), and truthful "Unavailable"/"Price
  unavailable" states throughout.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## OpenBB Market Data Service

THE SFM market analysis uses a separate FastAPI OpenBB service deployed outside Vercel. Do not install OpenBB in the Next.js app.

Required Vercel environment variable:

```text
OPENBB_SERVICE_URL=https://the-sfm-openbb-service.onrender.com
```

Render deployment settings for the OpenBB service:

- Branch: `main`
- Auto Deploy: On
- Root Directory: `openbb-service`
- Runtime: `Docker`
- Dockerfile Path: `Dockerfile`
- Health Check Path: `/health`

The repository also includes a root-level `render.yaml` blueprint with these settings. If Render reports that `openbb-service` does not exist, verify the Render service is connected to this repository and the `main` branch, because `openbb-service` is a tracked top-level folder in this repo.

Setup:

1. Open the Vercel Project.
2. Go to Settings.
3. Open Environment Variables.
4. Add `OPENBB_SERVICE_URL`.
5. Choose Production.
6. Save.
7. Redeploy.

The browser should call the local Next.js proxy routes, such as `/api/market/health` and `/api/market/analyze?symbol=AAPL&assetType=stock`. Client components should not call the Render URL directly.

## Economic Calendar

The Market Analysis page uses `/api/market/economic-calendar` for real high-impact economic events. The route runs server-side only and never exposes provider keys to the browser.

Set these Vercel environment variables:

```text
ECONOMIC_CALENDAR_PROVIDER=finnhub
ECONOMIC_CALENDAR_API_KEY=your_finnhub_key
```

If `ECONOMIC_CALENDAR_API_KEY` is empty, the route falls back to the existing server-only `FINNHUB_API_KEY`. If no provider key is configured, the API returns an empty event list with `ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED`, and the UI shows a polished empty state instead of raw deployment or environment-variable errors.

## Market Analysis News and Sentiment Providers

The Market Analysis page uses server-only routes for central bank news and market sentiment. Provider keys are read only on the server and are never exposed to the browser.

Set these Vercel environment variables as needed:

```text
NEWS_PROVIDER=newsapi
NEWS_API_KEY=your_newsapi_key
CENTRAL_BANK_NEWS_PROVIDER=newsapi
CENTRAL_BANK_NEWS_API_KEY=optional_dedicated_newsapi_key

MARKET_SENTIMENT_PROVIDER=finnhub
MARKET_SENTIMENT_API_KEY=optional_dedicated_sentiment_key
FINNHUB_API_KEY=your_finnhub_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Forex and metals trader sentiment
MYFXBOOK_EMAIL=your_myfxbook_email
MYFXBOOK_PASSWORD=your_myfxbook_password
MYFXBOOK_API_BASE_URL=https://www.myfxbook.com/api
```

Central bank news uses `CENTRAL_BANK_NEWS_API_KEY` first, then falls back to `NEWS_API_KEY`. If provider variables are empty, it defaults to `newsapi`.

Market sentiment uses `MARKET_SENTIMENT_API_KEY` first for news-style providers. Forex and supported metals sentiment uses Myfxbook through the server-only variables `MYFXBOOK_EMAIL`, `MYFXBOOK_PASSWORD`, and optional `MYFXBOOK_API_BASE_URL`. If `MYFXBOOK_API_BASE_URL` is omitted, the app safely defaults to `https://www.myfxbook.com/api`. Credentials and Myfxbook session tokens are never exposed to browser code or API responses.

After adding or changing provider keys in Vercel, redeploy the project so the runtime can read the updated variables. If a provider is connected but returns no usable data, the UI shows a professional unavailable state and does not invent sentiment values or news.

An optional protected diagnostics route is available at `/api/market/provider-health`. Set `MARKET_PROVIDER_HEALTH_TOKEN` or use the existing `ADMIN_ACCESS_CODE`, then call the route with `Authorization: Bearer <token>` or `x-admin-diagnostics-token`. The response reports provider names and key-presence booleans only; it never returns actual key values.

## Gulf Market News Sources

The `/gulf-news` page uses free server-side RSS feeds and delayed/free market data only. It does not use paid APIs, client-side keys, fake news, or fake index values.

RSS feeds currently configured in `src/lib/gulf/rssFeeds.ts`:

- Mubasher Kuwait: `http://feeds.mubasher.info/ar/KSE/news`
- Mubasher Saudi Arabia: `http://feeds.mubasher.info/ar/TDWL/news`
- Mubasher Oman: `http://feeds.mubasher.info/ar/MSM/news`
- Mubasher Bahrain: `http://feeds.mubasher.info/ar/BB/news`
- Mubasher Dubai Financial Market: `http://feeds.mubasher.info/ar/DFM/news`
- Mubasher Abu Dhabi Securities Exchange: `http://feeds.mubasher.info/ar/ADX/news`
- Mubasher Qatar: `http://feeds.mubasher.info/ar/QE/news`

Feeds are fetched through `/api/gulf-news` with a 5-minute revalidation window. If a feed blocks or fails, it is skipped gracefully. Delayed index data is attempted only where a reliable free Yahoo-compatible symbol is configured; otherwise the UI shows the market value as unavailable.

## Market Symbols Directory

Market search uses a server-side directory so global symbols are not bundled into the frontend. Apply `supabase/migrations/010_create_market_symbols.sql` and the latest `097_upgrade_market_symbols_exchange_coverage.sql` migration to support the structured `market_symbols` schema.

Search order:

1. Bundled official snapshots for Boursa Kuwait and DFM/Nasdaq Dubai in `src/data/market-symbols`
2. Supabase `market_symbols`, filtered by selected exchange
3. Official US symbol directories via NasdaqTrader when US markets are searched
4. OpenBB service `/market/search` when no exchange filter is selected and `OPENBB_SERVICE_URL` is configured
5. Local curated fallback in `openbb-service/data/symbols.json`

Boursa Kuwait symbols are synced from the official Boursa Kuwait market-watch data feed and use KWD with `price_unit=fils`. DFM and Nasdaq Dubai listed equities/funds are synced from the official DFM listed securities API. Saudi Exchange, ADX, Qatar, Bahrain, and Muscat are configured as supported exchanges but require an official exchange export/import into Supabase before the UI should claim complete coverage.

Refresh the bundled official snapshots and optionally upsert them into Supabase:

```bash
npm run symbols:sync -- --write-local
```

Use `--no-supabase` when only refreshing local snapshots. The sync/upsert path requires `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` on a trusted machine only. Do not expose the service role key to the browser.

Validate coverage:

```bash
npm run symbols:validate
```

Future official CSV imports can use `scripts/import-market-symbols.ts`.

CSV columns:

```csv
exchange,market,symbol,display_symbol,provider_symbol,name,company_name_ar,company_name_en,asset_type,sector,currency,country,price_unit,is_active,source,last_synced_at
BOURSA_KUWAIT,Premier Market,NBK,NBK,NBK.KW,National Bank of Kuwait,بنك الكويت الوطني,National Bank of Kuwait,stock,Banks,KWD,KW,fils,true,boursa_import,2026-06-08T00:00:00.000Z
```

Run later with:

```bash
SUPABASE_URL=https://YOUR-PROJECT.supabase.co SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY pnpm dlx tsx scripts/import-market-symbols.ts ./symbols.csv
```

## Tech Market News

The `/tech-news` page uses the server-only route `/api/tech-news` to fetch real company news and stock quotes from Finnhub. The browser never receives the API key. If Finnhub company news has no recent articles, `/api/tech-news` falls back to public RSS feeds. If a Finnhub quote is empty or unavailable, the API tries Yahoo Finance server-side before marking that ticker unavailable.

Required Vercel environment variable:

```text
FINNHUB_API_KEY=your_finnhub_key
```

News cards only show headlines and short excerpts with links to the original source. The app does not show fake news, fake translations, or fake prices; unavailable prices are displayed as unavailable.

## Optional News Translation

Market news pages support optional server-side translation for headlines and short excerpts only:

- `/tech-news`
- `/gulf-news`
- `/europe-news`

Set these server-only variables in Vercel to enable LibreTranslate:

```text
LIBRETRANSLATE_URL=https://your-libretranslate-host
LIBRETRANSLATE_API_KEY=optional_key
```

Translation is optional. If `LIBRETRANSLATE_URL` is not configured, THE SFM shows RSS/Finnhub news in the original source language and marks the card as original language. When configured, LibreTranslate translates only news headlines and short excerpts for Arabic and French pages, and for English only when the detected original language is not English. The app never translates full articles, never modifies original links, and never exposes translation keys to the browser.

Create a key from the Finnhub dashboard, add it to `.env.local` for development and to Vercel Environment Variables for production, then redeploy. If the key is missing or Finnhub fails, THE SFM uses the configured real fallbacks where available, and otherwise shows unavailable states instead of fake articles or fake prices.



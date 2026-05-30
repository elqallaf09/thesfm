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

Market search uses a server-side directory so global symbols are not bundled into the frontend. Apply `supabase/migrations/010_create_market_symbols.sql` to create and seed the public read-only `market_symbols` table.

Search order:

1. Supabase `market_symbols`
2. OpenBB service `/market/search` when `OPENBB_SERVICE_URL` is configured
3. Local curated fallback in `openbb-service/data/symbols.json`

Future CSV imports can use `scripts/import-market-symbols.ts` with a Supabase service role key on a trusted machine only. Do not expose the service role key to the browser.

CSV columns:

```csv
symbol,provider_symbol,name,asset_type,exchange,country,currency,source
AAPL,AAPL,Apple Inc.,stock,NASDAQ,US,USD,nasdaq_import
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



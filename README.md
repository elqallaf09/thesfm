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



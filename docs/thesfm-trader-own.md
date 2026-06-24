# thesfm trader private route

The private trader app is mounted inside the main THE SFM site at:

```text
/thesfm-trader-own
```

The page reuses the main site authentication cookie (`sfm_access_token`). Admin users listed in `ADMIN_EMAILS` can open it immediately. Non-admin users must have an approved row in `public.trader_access`.

## Access model

- Admin access: email must exist in `ADMIN_EMAILS`.
- Subscriber access: create or update `public.trader_access` with `status = 'approved'`.
- Expiring access: set `expires_at`; expired approvals are rejected.
- Future admin workflow: the admin panel can manage `trader_access` rows without changing the route.

## Static app hosting

The Vanilla JS trader shell is copied into:

```text
src/trader-app/public
```

It is served through:

```text
/thesfm-trader-own/app/*
```

The static route checks access before serving any asset, then rewrites static asset URLs so the trader shell stays inside the protected path. API calls remain relative, for example `/api/trader/status`, so they target the current Vercel deployment and preserve authentication cookies.

## Trader API routes

The browser calls:

```text
/api/trader/*
```

The main Next.js application owns these endpoints directly. They call server-only trader services and data providers; they do not proxy to a local development server.

```text
/api/trader/status
/api/trader/us-stocks
/api/trader/scanner/results
/api/trader/scanner/run
```

The legacy `/api/thesfm-trader/*` route remains only as a protected compatibility layer for older cached assets and health checks. It dispatches to internal services and must never fall back to `localhost`, `127.0.0.1`, or another private machine address in production.

If a separate trader backend is added later, deploy it to a public HTTPS service and wire it through a server-only variable after explicit validation. Keep provider keys server-side only.

## Data providers

Supported or planned provider environment variables:

```text
FINNHUB_API_KEY=
TWELVE_DATA_API_KEY=
POLYGON_API_KEY=
REFINITIV_API_KEY=
BLOOMBERG_API_KEY=
OFFICIAL_EXCHANGE_API_URL=
OFFICIAL_EXCHANGE_API_KEY=
THE_SFM_TRADER_REALTIME_WS_URL=
TRADER_MACHINE_LEARNING_MODEL_URL=
```

Bloomberg and Refinitiv require commercial contracts and approved API access. Do not expose these keys to the browser.

## Database tables

Migration `108_create_thesfm_trader_access_and_logs.sql` adds:

- `trader_access`: private access approvals.
- `trader_recommendation_history`: recommendation snapshots for auditing and future model training.
- `trader_alerts`: price, signal, target, stop-loss, and news-risk alerts.
- `trader_notification_log`: delivered notifications history.

All user tables have RLS enabled. Users can only read or manage their own rows. Server-side admin routes can manage approvals via the service role key.

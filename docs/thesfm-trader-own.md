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

The static route checks access before serving any asset, then rewrites local app URLs so the trader shell stays inside the protected path.

## Trader API proxy

The browser calls:

```text
/api/thesfm-trader/*
```

The proxy validates the same private access rules, then forwards to:

```text
THE_SFM_TRADER_API_BASE_URL=http://127.0.0.1:4173
```

In production, point `THE_SFM_TRADER_API_BASE_URL` at the deployed trader API service. Keep provider keys server-side only.

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

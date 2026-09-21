-- TV credentials are device-scoped and never carry a user's Supabase session.
-- The server verifies the device, then filters these reads by its bound owner.
-- Grant only the source columns used by that server path; client RLS/grants stay
-- unchanged and the TV backend receives no new source-table write privileges.
grant select (user_id, symbol, created_at)
  on public.market_watchlist to service_role;
grant select (id, user_id, symbol, alert_type, threshold, currency, status)
  on public.market_price_alerts to service_role;

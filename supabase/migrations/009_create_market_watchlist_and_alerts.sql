CREATE TABLE IF NOT EXISTS public.market_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'stock',
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol, asset_type)
);

CREATE TABLE IF NOT EXISTS public.market_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'stock',
  alert_type text NOT NULL,
  threshold numeric NOT NULL,
  status text NOT NULL DEFAULT 'saved',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_watchlist_user_created_idx
  ON public.market_watchlist (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS market_price_alerts_user_created_idx
  ON public.market_price_alerts (user_id, created_at DESC);

ALTER TABLE public.market_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own market watchlist" ON public.market_watchlist;
CREATE POLICY "Users can select own market watchlist"
  ON public.market_watchlist FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own market watchlist" ON public.market_watchlist;
CREATE POLICY "Users can insert own market watchlist"
  ON public.market_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own market watchlist" ON public.market_watchlist;
CREATE POLICY "Users can update own market watchlist"
  ON public.market_watchlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own market watchlist" ON public.market_watchlist;
CREATE POLICY "Users can delete own market watchlist"
  ON public.market_watchlist FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own market alerts" ON public.market_price_alerts;
CREATE POLICY "Users can select own market alerts"
  ON public.market_price_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own market alerts" ON public.market_price_alerts;
CREATE POLICY "Users can insert own market alerts"
  ON public.market_price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own market alerts" ON public.market_price_alerts;
CREATE POLICY "Users can update own market alerts"
  ON public.market_price_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own market alerts" ON public.market_price_alerts;
CREATE POLICY "Users can delete own market alerts"
  ON public.market_price_alerts FOR DELETE
  USING (auth.uid() = user_id);

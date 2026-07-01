CREATE TABLE IF NOT EXISTS public.market_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  market text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  action text NOT NULL CHECK (action IN ('buy', 'sell', 'wait', 'watch')),
  action_label_ar text NOT NULL,
  confidence integer NOT NULL CHECK (confidence >= 0 AND confidence <= 95),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  current_price numeric,
  target_price numeric,
  stop_loss numeric,
  timeframe text NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text NOT NULL,
  data_quality text NOT NULL CHECK (data_quality IN ('live', 'delayed', 'partial', 'unavailable')),
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  technical_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.user_signal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  min_confidence integer NOT NULL DEFAULT 70 CHECK (min_confidence >= 0 AND min_confidence <= 95),
  risk_profile text NOT NULL DEFAULT 'balanced' CHECK (risk_profile IN ('conservative', 'balanced', 'aggressive')),
  enabled_markets jsonb NOT NULL DEFAULT '["US","Kuwait","Saudi","UAE","Qatar","Bahrain","Oman","Forex","Crypto","Commodities"]'::jsonb,
  buy_alerts_enabled boolean NOT NULL DEFAULT true,
  sell_alerts_enabled boolean NOT NULL DEFAULT true,
  wait_alerts_enabled boolean NOT NULL DEFAULT false,
  email_alerts_enabled boolean NOT NULL DEFAULT false,
  in_app_alerts_enabled boolean NOT NULL DEFAULT true,
  telegram_alerts_enabled boolean NOT NULL DEFAULT false,
  push_alerts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.signal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id uuid REFERENCES public.market_signals(id) ON DELETE SET NULL,
  symbol text NOT NULL,
  action text NOT NULL CHECK (action IN ('buy', 'sell', 'wait', 'watch')),
  event text,
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'in-app',
  status text NOT NULL DEFAULT 'created',
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signal_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  old_action text CHECK (old_action IN ('buy', 'sell', 'wait', 'watch')),
  new_action text NOT NULL CHECK (new_action IN ('buy', 'sell', 'wait', 'watch')),
  old_confidence integer CHECK (old_confidence >= 0 AND old_confidence <= 95),
  new_confidence integer NOT NULL CHECK (new_confidence >= 0 AND new_confidence <= 95),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_signals_symbol_created_idx
  ON public.market_signals (symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS market_signals_action_confidence_idx
  ON public.market_signals (action, confidence DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS market_signals_market_created_idx
  ON public.market_signals (market, created_at DESC);

CREATE INDEX IF NOT EXISTS user_signal_preferences_user_idx
  ON public.user_signal_preferences (user_id);

CREATE INDEX IF NOT EXISTS signal_notifications_user_created_idx
  ON public.signal_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS signal_notifications_user_read_idx
  ON public.signal_notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS signal_history_symbol_created_idx
  ON public.signal_history (symbol, created_at DESC);

ALTER TABLE public.market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_signal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read market signals" ON public.market_signals;
CREATE POLICY "Authenticated users can read market signals"
  ON public.market_signals
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can read own signal preferences" ON public.user_signal_preferences;
CREATE POLICY "Users can read own signal preferences"
  ON public.user_signal_preferences
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own signal preferences" ON public.user_signal_preferences;
CREATE POLICY "Users can insert own signal preferences"
  ON public.user_signal_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own signal preferences" ON public.user_signal_preferences;
CREATE POLICY "Users can update own signal preferences"
  ON public.user_signal_preferences
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own signal preferences" ON public.user_signal_preferences;
CREATE POLICY "Users can delete own signal preferences"
  ON public.user_signal_preferences
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can read own signal notifications" ON public.signal_notifications;
CREATE POLICY "Users can read own signal notifications"
  ON public.signal_notifications
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own signal notifications" ON public.signal_notifications;
CREATE POLICY "Users can update own signal notifications"
  ON public.signal_notifications
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Authenticated users can read signal history" ON public.signal_history;
CREATE POLICY "Authenticated users can read signal history"
  ON public.signal_history
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON TABLE public.market_signals TO authenticated;
GRANT SELECT ON TABLE public.signal_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_signal_preferences TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.signal_notifications TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_signals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_signal_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signal_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.signal_history TO service_role;

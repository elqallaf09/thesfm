CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount numeric NOT NULL,
  interest_amount numeric NOT NULL DEFAULT 0,
  principal_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KWD',
  expense_id uuid NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.debt_payments
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS debt_id uuid REFERENCES public.debts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principal_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD',
  ADD COLUMN IF NOT EXISTS expense_id uuid NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.debt_payments
SET
  id = COALESCE(id, gen_random_uuid()),
  amount = COALESCE(amount, 0),
  interest_amount = COALESCE(interest_amount, 0),
  principal_amount = COALESCE(principal_amount, 0),
  currency = COALESCE(NULLIF(btrim(currency), ''), 'KWD'),
  created_at = COALESCE(created_at, now());

ALTER TABLE public.debt_payments
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN amount SET DEFAULT 0,
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN interest_amount SET DEFAULT 0,
  ALTER COLUMN interest_amount SET NOT NULL,
  ALTER COLUMN principal_amount SET DEFAULT 0,
  ALTER COLUMN principal_amount SET NOT NULL,
  ALTER COLUMN currency SET DEFAULT 'KWD',
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS debt_payments_user_debt_date_idx
  ON public.debt_payments (user_id, debt_id, payment_date);

CREATE INDEX IF NOT EXISTS debt_payments_user_debt_idx
  ON public.debt_payments (user_id, debt_id, payment_date DESC);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own debts" ON public.debts;
DROP POLICY IF EXISTS "Users can view own debts" ON public.debts;
CREATE POLICY "Users can view own debts"
  ON public.debts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own debts" ON public.debts;
CREATE POLICY "Users can insert own debts"
  ON public.debts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own debts" ON public.debts;
CREATE POLICY "Users can update own debts"
  ON public.debts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own debts" ON public.debts;
CREATE POLICY "Users can delete own debts"
  ON public.debts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can select own debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can view own debt payments" ON public.debt_payments;
CREATE POLICY "Users can view own debt payments"
  ON public.debt_payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own debt payments" ON public.debt_payments;
CREATE POLICY "Users can insert own debt payments"
  ON public.debt_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own debt payments" ON public.debt_payments;
CREATE POLICY "Users can update own debt payments"
  ON public.debt_payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own debt payments" ON public.debt_payments;
CREATE POLICY "Users can delete own debt payments"
  ON public.debt_payments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.debt_payments TO authenticated;

CREATE TABLE IF NOT EXISTS public.site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  language text,
  device_type text,
  browser text,
  os text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  page_path text NOT NULL,
  page_title text,
  section_name text,
  referrer text,
  language text,
  device_type text,
  browser text,
  os text,
  country text,
  city text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_sessions
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.site_events
  ADD COLUMN IF NOT EXISTS page_title text,
  ADD COLUMN IF NOT EXISTS section_name text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.site_events
SET metadata = COALESCE(metadata, '{}'::jsonb);

ALTER TABLE public.site_events
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS site_events_created_at_idx ON public.site_events (created_at DESC);
CREATE INDEX IF NOT EXISTS site_events_event_type_idx ON public.site_events (event_type);
CREATE INDEX IF NOT EXISTS site_events_page_path_idx ON public.site_events (page_path);
CREATE INDEX IF NOT EXISTS site_events_section_name_idx ON public.site_events (section_name);
CREATE INDEX IF NOT EXISTS site_events_session_id_idx ON public.site_events (session_id);
CREATE INDEX IF NOT EXISTS site_sessions_session_id_idx ON public.site_sessions (session_id);
CREATE INDEX IF NOT EXISTS site_sessions_last_seen_at_idx ON public.site_sessions (last_seen_at DESC);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No browser reads site events" ON public.site_events;
CREATE POLICY "No browser reads site events"
  ON public.site_events
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "No browser writes site events" ON public.site_events;
CREATE POLICY "No browser writes site events"
  ON public.site_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No browser reads site sessions" ON public.site_sessions;
CREATE POLICY "No browser reads site sessions"
  ON public.site_sessions
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "No browser writes site sessions" ON public.site_sessions;
CREATE POLICY "No browser writes site sessions"
  ON public.site_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_sessions TO service_role;

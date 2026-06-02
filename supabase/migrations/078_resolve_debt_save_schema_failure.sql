CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  creditor_name text NOT NULL,
  original_amount numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KWD',
  start_date date NOT NULL,
  monthly_payment numeric NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 0,
  interest_type text NOT NULL DEFAULT 'annual',
  payment_day integer NOT NULL DEFAULT 1,
  auto_add_to_expenses boolean NOT NULL DEFAULT true,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS creditor_name text,
  ADD COLUMN IF NOT EXISTS original_amount numeric,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS monthly_payment numeric,
  ADD COLUMN IF NOT EXISTS interest_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_type text DEFAULT 'annual',
  ADD COLUMN IF NOT EXISTS payment_day integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_add_to_expenses boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.debts
SET
  id = COALESCE(id, gen_random_uuid()),
  name = COALESCE(NULLIF(btrim(name), ''), 'Unnamed debt'),
  creditor_name = COALESCE(NULLIF(btrim(creditor_name), ''), 'Unspecified creditor'),
  original_amount = COALESCE(original_amount, 1),
  remaining_amount = COALESCE(remaining_amount, 0),
  currency = COALESCE(NULLIF(btrim(currency), ''), 'KWD'),
  start_date = COALESCE(start_date, CURRENT_DATE),
  monthly_payment = COALESCE(monthly_payment, 1),
  interest_rate = LEAST(GREATEST(COALESCE(interest_rate, 0), 0), 100),
  interest_type = CASE
    WHEN interest_type IN ('none', 'annual', 'monthly') THEN interest_type
    ELSE 'annual'
  END,
  payment_day = CASE
    WHEN payment_day BETWEEN 1 AND 31 THEN payment_day
    ELSE 1
  END,
  auto_add_to_expenses = COALESCE(auto_add_to_expenses, true),
  status = CASE
    WHEN status IN ('active', 'paid', 'paused') THEN status
    ELSE 'active'
  END,
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE public.debts
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN creditor_name SET NOT NULL,
  ALTER COLUMN original_amount SET NOT NULL,
  ALTER COLUMN remaining_amount SET NOT NULL,
  ALTER COLUMN currency SET DEFAULT 'KWD',
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN start_date SET NOT NULL,
  ALTER COLUMN monthly_payment SET NOT NULL,
  ALTER COLUMN interest_rate SET DEFAULT 0,
  ALTER COLUMN interest_rate SET NOT NULL,
  ALTER COLUMN interest_type SET DEFAULT 'annual',
  ALTER COLUMN interest_type SET NOT NULL,
  ALTER COLUMN payment_day SET DEFAULT 1,
  ALTER COLUMN payment_day SET NOT NULL,
  ALTER COLUMN auto_add_to_expenses SET DEFAULT true,
  ALTER COLUMN auto_add_to_expenses SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.debts'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.debts ADD CONSTRAINT debts_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.debts WHERE user_id IS NULL) THEN
    ALTER TABLE public.debts ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_interest_type_check;
ALTER TABLE public.debts
  ADD CONSTRAINT debts_interest_type_check
  CHECK (interest_type IN ('none', 'annual', 'monthly'));

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_status_check;
ALTER TABLE public.debts
  ADD CONSTRAINT debts_status_check
  CHECK (status IN ('active', 'paid', 'paused'));

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_payment_day_check;
ALTER TABLE public.debts
  ADD CONSTRAINT debts_payment_day_check
  CHECK (payment_day BETWEEN 1 AND 31);

ALTER TABLE public.debts DROP CONSTRAINT IF EXISTS debts_amounts_check;
ALTER TABLE public.debts
  ADD CONSTRAINT debts_amounts_check
  CHECK (
    original_amount > 0
    AND remaining_amount >= 0
    AND monthly_payment > 0
    AND interest_rate >= 0
    AND interest_rate <= 100
  ) NOT VALID;

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
  ADD COLUMN IF NOT EXISTS amount numeric,
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
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN interest_amount SET DEFAULT 0,
  ALTER COLUMN interest_amount SET NOT NULL,
  ALTER COLUMN principal_amount SET DEFAULT 0,
  ALTER COLUMN principal_amount SET NOT NULL,
  ALTER COLUMN currency SET DEFAULT 'KWD',
  ALTER COLUMN currency SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.debt_payments'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.debt_payments ADD CONSTRAINT debt_payments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.debt_payments
    WHERE user_id IS NULL OR debt_id IS NULL OR payment_date IS NULL
  ) THEN
    ALTER TABLE public.debt_payments
      ALTER COLUMN user_id SET NOT NULL,
      ALTER COLUMN debt_id SET NOT NULL,
      ALTER COLUMN payment_date SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS debt_payments_user_debt_date_idx
  ON public.debt_payments (user_id, debt_id, payment_date);

CREATE INDEX IF NOT EXISTS debts_user_status_idx
  ON public.debts (user_id, status);

CREATE INDEX IF NOT EXISTS debts_user_payment_day_idx
  ON public.debts (user_id, payment_day);

CREATE INDEX IF NOT EXISTS debt_payments_user_debt_idx
  ON public.debt_payments (user_id, debt_id, payment_date DESC);

ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS debt_id uuid NULL REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS expense_items_debt_month_idx
  ON public.expense_items (user_id, debt_id, date)
  WHERE source = 'debt' AND debt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS expense_items_source_idx
  ON public.expense_items (source);

CREATE OR REPLACE FUNCTION public.set_debts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS debts_set_updated_at ON public.debts;
CREATE TRIGGER debts_set_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_debts_updated_at();

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

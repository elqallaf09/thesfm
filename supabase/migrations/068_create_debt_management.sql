CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  creditor_name text,
  original_amount numeric NOT NULL CHECK (original_amount >= 0),
  remaining_amount numeric NOT NULL CHECK (remaining_amount >= 0),
  currency text NOT NULL DEFAULT 'KWD',
  start_date date NOT NULL,
  monthly_payment numeric NOT NULL CHECK (monthly_payment >= 0),
  interest_rate numeric DEFAULT 0 CHECK (interest_rate >= 0),
  interest_type text DEFAULT 'annual' CHECK (interest_type IN ('none', 'annual', 'monthly')),
  payment_day integer DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
  category text DEFAULT 'debt',
  notes text,
  auto_add_to_expenses boolean DEFAULT true,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paid', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  payment_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  interest_amount numeric DEFAULT 0,
  principal_amount numeric DEFAULT 0,
  expense_id uuid NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS debt_id uuid NULL REFERENCES public.debts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS debt_payments_user_debt_date_idx
  ON public.debt_payments (user_id, debt_id, payment_date);

CREATE UNIQUE INDEX IF NOT EXISTS expense_items_debt_month_idx
  ON public.expense_items (user_id, debt_id, date)
  WHERE source = 'debt' AND debt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS debts_user_status_idx
  ON public.debts (user_id, status);

CREATE INDEX IF NOT EXISTS debts_user_payment_day_idx
  ON public.debts (user_id, payment_day);

CREATE INDEX IF NOT EXISTS debt_payments_user_debt_idx
  ON public.debt_payments (user_id, debt_id, payment_date DESC);

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
CREATE POLICY "Users can select own debts"
  ON public.debts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own debts" ON public.debts;
CREATE POLICY "Users can insert own debts"
  ON public.debts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own debts" ON public.debts;
CREATE POLICY "Users can update own debts"
  ON public.debts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own debts" ON public.debts;
CREATE POLICY "Users can delete own debts"
  ON public.debts
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own debt payments" ON public.debt_payments;
CREATE POLICY "Users can select own debt payments"
  ON public.debt_payments
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own debt payments" ON public.debt_payments;
CREATE POLICY "Users can insert own debt payments"
  ON public.debt_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own debt payments" ON public.debt_payments;
CREATE POLICY "Users can update own debt payments"
  ON public.debt_payments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own debt payments" ON public.debt_payments;
CREATE POLICY "Users can delete own debt payments"
  ON public.debt_payments
  FOR DELETE
  USING (auth.uid() = user_id);

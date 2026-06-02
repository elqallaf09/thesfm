ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS first_payment_date date,
  ADD COLUMN IF NOT EXISTS calculated_remaining_amount numeric,
  ADD COLUMN IF NOT EXISTS total_paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_interest_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_principal_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz;

UPDATE public.debts
SET
  first_payment_date = COALESCE(first_payment_date, start_date),
  calculated_remaining_amount = COALESCE(calculated_remaining_amount, remaining_amount),
  total_paid_amount = COALESCE(total_paid_amount, 0),
  total_interest_paid = COALESCE(total_interest_paid, 0),
  total_principal_paid = COALESCE(total_principal_paid, 0)
WHERE
  first_payment_date IS NULL
  OR calculated_remaining_amount IS NULL
  OR total_paid_amount IS NULL
  OR total_interest_paid IS NULL
  OR total_principal_paid IS NULL;

ALTER TABLE public.debts
  ALTER COLUMN total_paid_amount SET DEFAULT 0,
  ALTER COLUMN total_interest_paid SET DEFAULT 0,
  ALTER COLUMN total_principal_paid SET DEFAULT 0;

ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS debt_id uuid NULL REFERENCES public.debts(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'debt_payments_unique_month'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, debt_id, date_trunc('month', payment_date::timestamp)::date AS payment_month, count(*) AS row_count
      FROM public.debt_payments
      GROUP BY user_id, debt_id, date_trunc('month', payment_date::timestamp)::date
      HAVING count(*) > 1
    ) duplicates
  ) THEN
    CREATE UNIQUE INDEX debt_payments_unique_month
      ON public.debt_payments (user_id, debt_id, (date_trunc('month', payment_date::timestamp)::date));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'expense_items_debt_unique_month_idx'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, debt_id, date_trunc('month', date::timestamp)::date AS expense_month, count(*) AS row_count
      FROM public.expense_items
      WHERE source = 'debt' AND debt_id IS NOT NULL
      GROUP BY user_id, debt_id, date_trunc('month', date::timestamp)::date
      HAVING count(*) > 1
    ) duplicates
  ) THEN
    CREATE UNIQUE INDEX expense_items_debt_unique_month_idx
      ON public.expense_items (user_id, debt_id, (date_trunc('month', date::timestamp)::date))
      WHERE source = 'debt' AND debt_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS debts_user_first_payment_idx
  ON public.debts (user_id, first_payment_date);

CREATE INDEX IF NOT EXISTS expense_items_debt_source_idx
  ON public.expense_items (user_id, debt_id, source);

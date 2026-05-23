ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD';

CREATE INDEX IF NOT EXISTS expense_items_currency_idx
  ON public.expense_items (currency);

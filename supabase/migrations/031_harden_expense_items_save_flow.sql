ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS receipt_image_url text,
  ADD COLUMN IF NOT EXISTS receipt_file_name text,
  ADD COLUMN IF NOT EXISTS ai_extracted_data jsonb,
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS expense_items_user_date_idx
  ON public.expense_items (user_id, date DESC);

CREATE INDEX IF NOT EXISTS expense_items_user_category_idx
  ON public.expense_items (user_id, category);

CREATE INDEX IF NOT EXISTS expense_items_currency_idx
  ON public.expense_items (currency);

ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own expenses" ON public.expense_items;
CREATE POLICY "Users can select own expenses"
  ON public.expense_items
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expense_items;
CREATE POLICY "Users can insert own expenses"
  ON public.expense_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own expenses" ON public.expense_items;
CREATE POLICY "Users can update own expenses"
  ON public.expense_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expense_items;
CREATE POLICY "Users can delete own expenses"
  ON public.expense_items
  FOR DELETE
  USING (auth.uid() = user_id);

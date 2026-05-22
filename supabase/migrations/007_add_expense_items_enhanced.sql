ALTER TABLE public.expense_items
ADD COLUMN IF NOT EXISTS enhanced jsonb DEFAULT '{}'::jsonb;

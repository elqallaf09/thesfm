ALTER TABLE public.financial_goals
ADD COLUMN IF NOT EXISTS current_amount numeric DEFAULT 0;


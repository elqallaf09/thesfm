ALTER TABLE public.monthly_income_sources
ADD COLUMN IF NOT EXISTS recurrence_start_date date,
ADD COLUMN IF NOT EXISTS recurrence_end_date date,
ADD COLUMN IF NOT EXISTS parent_recurring_income_id uuid,
ADD COLUMN IF NOT EXISTS generated_for_date date,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS monthly_income_sources_recurring_generated_unique
ON public.monthly_income_sources(parent_recurring_income_id, generated_for_date)
WHERE parent_recurring_income_id IS NOT NULL AND generated_for_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS monthly_income_sources_parent_recurring_idx
  ON public.monthly_income_sources (parent_recurring_income_id);

CREATE INDEX IF NOT EXISTS monthly_income_sources_generated_for_date_idx
  ON public.monthly_income_sources (generated_for_date);

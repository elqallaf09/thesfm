ALTER TABLE public.monthly_income_sources
ADD COLUMN IF NOT EXISTS income_type text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'received',
ADD COLUMN IF NOT EXISTS received_date date,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'KWD',
ADD COLUMN IF NOT EXISTS source_name text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frequency text;

CREATE INDEX IF NOT EXISTS monthly_income_sources_income_type_idx
  ON public.monthly_income_sources (income_type);

CREATE INDEX IF NOT EXISTS monthly_income_sources_status_idx
  ON public.monthly_income_sources (status);

CREATE INDEX IF NOT EXISTS monthly_income_sources_received_date_idx
  ON public.monthly_income_sources (received_date);

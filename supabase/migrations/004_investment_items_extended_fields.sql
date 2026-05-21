ALTER TABLE investment_items
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS current_value numeric,
  ADD COLUMN IF NOT EXISTS monthly_contribution numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS expected_annual_return numeric,
  ADD COLUMN IF NOT EXISTS notes text;

UPDATE investment_items
SET current_value = COALESCE(current_value, amount),
    start_date = COALESCE(start_date, created_at::date),
    type = COALESCE(type, 'stocks'),
    risk_level = COALESCE(risk_level, 'medium')
WHERE current_value IS NULL
   OR start_date IS NULL
   OR type IS NULL
   OR risk_level IS NULL;


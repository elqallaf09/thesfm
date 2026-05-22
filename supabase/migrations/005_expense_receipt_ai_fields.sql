ALTER TABLE expense_items
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS receipt_image_url text,
  ADD COLUMN IF NOT EXISTS receipt_file_name text,
  ADD COLUMN IF NOT EXISTS ai_extracted_data jsonb,
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

CREATE INDEX IF NOT EXISTS expense_items_user_date_idx ON expense_items(user_id, date DESC);
CREATE INDEX IF NOT EXISTS expense_items_user_category_idx ON expense_items(user_id, category);

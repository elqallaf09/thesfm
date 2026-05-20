ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_lang text DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'KWD',
  ADD COLUMN IF NOT EXISTS preferred_theme text DEFAULT 'light';

ALTER TABLE expense_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS necessity text;

ALTER TABLE investment_items
  ADD COLUMN IF NOT EXISTS ai_analysis text;

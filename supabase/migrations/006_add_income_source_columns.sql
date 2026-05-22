-- Ensure monthly_income_sources has the columns the income page reads/writes.
-- Additive and idempotent; safe to run on an existing table.

ALTER TABLE monthly_income_sources ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE monthly_income_sources ADD COLUMN IF NOT EXISTS category text;

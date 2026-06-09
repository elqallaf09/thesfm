-- Migration 102: Admin company review system
-- Adds admin_notes, reviewed_at, reviewed_by columns and needs_changes status to company_listings

-- 1. Add new columns
ALTER TABLE company_listings
  ADD COLUMN IF NOT EXISTS admin_notes   TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by   TEXT;

-- 2. Add needs_changes to status check constraint
-- First drop existing constraint if any, then recreate
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'company_listings'
      AND constraint_name = 'company_listings_status_check'
  ) THEN
    ALTER TABLE company_listings DROP CONSTRAINT company_listings_status_check;
  END IF;
  -- Add updated constraint
  ALTER TABLE company_listings
    ADD CONSTRAINT company_listings_status_check
    CHECK (status IN ('pending_review', 'approved', 'rejected', 'inactive', 'needs_changes'));
END $$;

-- 3. Index for fast admin queries by status
CREATE INDEX IF NOT EXISTS idx_company_listings_status ON company_listings (status);
CREATE INDEX IF NOT EXISTS idx_company_listings_reviewed_at ON company_listings (reviewed_at DESC);

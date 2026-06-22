ALTER TABLE public.company_listings
  ADD COLUMN IF NOT EXISTS update_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pending_update jsonb NULL,
  ADD COLUMN IF NOT EXISTS deletion_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_owner_update_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'company_listings_update_status_check'
      AND conrelid = 'public.company_listings'::regclass
  ) THEN
    ALTER TABLE public.company_listings
      ADD CONSTRAINT company_listings_update_status_check
      CHECK (update_status IN ('none', 'pending_update', 'deletion_requested'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS company_listings_owner_update_status_idx
  ON public.company_listings(user_id, update_status, created_at DESC);

CREATE INDEX IF NOT EXISTS company_listings_deletion_requested_idx
  ON public.company_listings(deletion_requested, created_at DESC)
  WHERE deletion_requested = true;

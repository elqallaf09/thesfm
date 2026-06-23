ALTER TABLE public.company_listings
  ADD COLUMN IF NOT EXISTS full_address text NULL,
  ADD COLUMN IF NOT EXISTS google_maps_url text NULL,
  ADD COLUMN IF NOT EXISTS latitude numeric NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric NULL;

CREATE INDEX IF NOT EXISTS company_listings_location_idx
  ON public.company_listings(country, city);

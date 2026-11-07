-- Investment access is a separate, explicit grant made by the signed-in owner
-- during pairing. Existing devices deliberately remain without consent.
ALTER TABLE public.markets_tv_devices
  ADD COLUMN portfolio_consent_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.markets_tv_devices.portfolio_consent_at IS
  'Owner opt-in to recorded investment display during pairing; NULL denies access. Not device settings.';

-- Existing service-only grants and RLS remain unchanged. No backfill or public
-- grant endpoint: devices without consent must be paired again by their owner.

ALTER TABLE public.market_watchlist
  ADD COLUMN IF NOT EXISTS provider_symbol text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.market_price_alerts
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS country text;

UPDATE public.market_watchlist
SET provider_symbol = symbol
WHERE provider_symbol IS NULL;

-- Keep the shared FMP Retry-After marker monotonic across concurrent
-- serverless instances. A normal read-then-upsert can let a shorter cooldown
-- overwrite a longer one after a race or a delayed read.
CREATE OR REPLACE FUNCTION public.extend_trader_cache_cooldown(
  p_cache_key text,
  p_candidate_until timestamptz,
  p_reason text DEFAULT 'provider_rate_limited'
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  effective_until timestamptz;
BEGIN
  IF p_cache_key <> 'market_provider_cooldown:fmp' THEN
    RAISE EXCEPTION 'Unsupported cooldown cache key';
  END IF;
  IF p_candidate_until <= now() THEN
    RAISE EXCEPTION 'Cooldown must be in the future';
  END IF;

  INSERT INTO public.trader_cache AS cache (cache_key, payload, expires_at, updated_at)
  VALUES (
    p_cache_key,
    jsonb_build_object(
      'version', 1,
      'until', p_candidate_until,
      'reason', p_reason
    ),
    p_candidate_until,
    now()
  )
  ON CONFLICT (cache_key) DO UPDATE
    SET expires_at = GREATEST(cache.expires_at, EXCLUDED.expires_at),
        payload = jsonb_build_object(
          'version', 1,
          'until', GREATEST(cache.expires_at, EXCLUDED.expires_at),
          'reason', p_reason
        ),
        updated_at = CASE
          WHEN EXCLUDED.expires_at > cache.expires_at THEN EXCLUDED.updated_at
          ELSE cache.updated_at
        END
  RETURNING expires_at INTO effective_until;

  RETURN effective_until;
END;
$function$;

REVOKE ALL ON FUNCTION public.extend_trader_cache_cooldown(text, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_trader_cache_cooldown(text, timestamptz, text)
  TO service_role;

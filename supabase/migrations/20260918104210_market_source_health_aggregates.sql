-- Aggregate operational counts only: no user IDs, IPs, symbols or searches.
CREATE TABLE public.market_source_health_daily (
  day date NOT NULL,
  mic text NOT NULL CHECK (mic IN ('XSAU', 'XADS', 'DSMD', 'XCAI')),
  provider text NOT NULL CHECK (provider IN ('twelve_data', 'yahoo')),
  outcome text NOT NULL CHECK (outcome IN ('available', 'rate_limited', 'access_required', 'stale', 'invalid', 'unavailable')),
  checks bigint NOT NULL DEFAULT 0 CHECK (checks >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, mic, provider, outcome)
);
ALTER TABLE public.market_source_health_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_source_health_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_source_health_daily TO service_role;

CREATE FUNCTION public.record_market_source_health(p_checks jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $function$
DECLARE
  item jsonb;
BEGIN
  IF jsonb_typeof(p_checks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_checks) > 24 THEN
    RAISE EXCEPTION 'Invalid aggregate batch';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_checks) LOOP
    IF (item->>'checks')::integer NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'Invalid check count'; END IF;
    INSERT INTO public.market_source_health_daily(day, mic, provider, outcome, checks)
    VALUES ((now() AT TIME ZONE 'UTC')::date, item->>'mic', item->>'provider', item->>'outcome', (item->>'checks')::integer)
    ON CONFLICT (day, mic, provider, outcome) DO UPDATE
      SET checks = public.market_source_health_daily.checks + excluded.checks, updated_at = now();
  END LOOP;
  DELETE FROM public.market_source_health_daily WHERE day < (now() AT TIME ZONE 'UTC')::date - 30;
END;
$function$;
REVOKE ALL ON FUNCTION public.record_market_source_health(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_market_source_health(jsonb) TO service_role;

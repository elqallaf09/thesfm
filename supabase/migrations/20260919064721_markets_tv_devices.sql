-- TV capabilities are deliberately separate from Supabase login sessions.
-- Clients never receive an account JWT, refresh token, or service credential.
CREATE TABLE public.markets_tv_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  secret_hash text NOT NULL UNIQUE CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  code_hash text UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','approved','active','revoked')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object' AND octet_length(settings::text) <= 4096),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  approved_at timestamptz,
  CHECK ((state = 'pending' AND user_id IS NULL) OR (state <> 'pending')),
  CHECK (state NOT IN ('approved','active') OR user_id IS NOT NULL)
);
CREATE INDEX markets_tv_devices_owner ON public.markets_tv_devices(user_id, created_at DESC);
CREATE INDEX markets_tv_devices_requests ON public.markets_tv_devices(request_hash, created_at DESC);
CREATE INDEX markets_tv_devices_expiry ON public.markets_tv_devices(expires_at);
ALTER TABLE public.markets_tv_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.markets_tv_devices FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.markets_tv_devices TO service_role;

-- Atomic, durable abuse limit across serverless instances. SECURITY INVOKER:
-- only the service role can reach the table or execute this function.
CREATE FUNCTION public.create_markets_tv_pair(p_name text, p_secret_hash text, p_code_hash text, p_request_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE device_id uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_hash, 71));
  IF (SELECT count(*) FROM public.markets_tv_devices WHERE request_hash = p_request_hash
      AND created_at > now() - interval '1 hour') >= 8 THEN
    RAISE EXCEPTION 'TV_PAIR_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  -- Opportunistic retention: remove records seven days after expiry.
  DELETE FROM public.markets_tv_devices WHERE expires_at < now() - interval '7 days';
  INSERT INTO public.markets_tv_devices(name, secret_hash, code_hash, request_hash)
  VALUES(p_name, p_secret_hash, p_code_hash, p_request_hash) RETURNING id INTO device_id;
  RETURN device_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_markets_tv_pair(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_markets_tv_pair(text,text,text,text) TO service_role;

-- Owner approval is a single conditional update; a code can bind only once.
-- Service-only table writes are always constrained by secret_hash or verified
-- user_id in the TV routes. No permissive authenticated/anon RLS policies exist.

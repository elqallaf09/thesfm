-- Synthetic CI-only proof of the history store's approval boundary, never live data.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_setting('sfm.disposable_ci', true) IS DISTINCT FROM '1'
     OR position('select null::uuid' IN pg_get_functiondef('auth.uid()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'DISPOSABLE_CI_DATABASE_REQUIRED';
  END IF;
END $$;
BEGIN;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated, anon;
CREATE FUNCTION pg_temp.history_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERTION_FAILED: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.history_denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
  RAISE EXCEPTION 'EXPECTED_DENIAL: %', statement;
END $$;
INSERT INTO auth.users(id) VALUES ('00000000-0000-4000-8000-000000000601'), ('00000000-0000-4000-8000-000000000602');
INSERT INTO auth.sessions(id,user_id) VALUES ('00000000-0000-4000-8000-000000000611','00000000-0000-4000-8000-000000000601');
INSERT INTO public.sfm_integration_snapshots(id,user_id,source,external_id,observed_at,payload) VALUES
 ('00000000-0000-4000-8000-000000000621','00000000-0000-4000-8000-000000000601','custom','synthetic-approved-history-a',now(),'{"verification":"server_verified_portfolio_history_v1"}'),
 ('00000000-0000-4000-8000-000000000622','00000000-0000-4000-8000-000000000602','custom','synthetic-calendar-b',now(),'{"verification":"server_verified_portfolio_calendar_v1"}');
SELECT pg_temp.history_assert((SELECT relrowsecurity FROM pg_class WHERE oid='public.sfm_integration_snapshots'::regclass),'history store has RLS');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000601',true);
SELECT set_config('request.jwt.claims','{"aal":"aal1","session_id":"00000000-0000-4000-8000-000000000611"}',true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.history_assert((SELECT count(*)=1 FROM public.sfm_integration_snapshots),'A sees only its own source evidence');
SELECT pg_temp.history_assert((SELECT count(*)=0 FROM public.sfm_integration_snapshots WHERE id='00000000-0000-4000-8000-000000000622'),'A cannot read B calendar by explicit ID');
SELECT pg_temp.history_denied($q$INSERT INTO public.sfm_integration_snapshots(user_id,source,external_id,observed_at,payload) VALUES ('00000000-0000-4000-8000-000000000601','custom','forged',now(),'{"verification":"server_verified_portfolio_history_v1"}')$q$);
SELECT pg_temp.history_denied($q$UPDATE public.sfm_integration_snapshots SET payload='{"verification":"server_verified_portfolio_history_v1"}' WHERE user_id='00000000-0000-4000-8000-000000000601'$q$);
WITH removed AS (DELETE FROM public.sfm_integration_snapshots WHERE id='00000000-0000-4000-8000-000000000622' RETURNING id)
SELECT pg_temp.history_assert((SELECT count(*)=0 FROM removed),'A cannot delete B calendar');
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,factor_type,status) VALUES ('00000000-0000-4000-8000-000000000631','00000000-0000-4000-8000-000000000601','totp','verified');
SET LOCAL ROLE authenticated;
SELECT pg_temp.history_assert((SELECT count(*)=0 FROM public.sfm_integration_snapshots),'enrolled first factor cannot read history');
SELECT set_config('request.jwt.claims','{"aal":"aal2","session_id":"00000000-0000-4000-8000-000000000611"}',true);
SELECT pg_temp.history_assert((SELECT count(*)=1 FROM public.sfm_integration_snapshots),'MFA restores only own history');
RESET ROLE;
DELETE FROM auth.sessions WHERE id='00000000-0000-4000-8000-000000000611';
SET LOCAL ROLE authenticated;
SELECT pg_temp.history_assert((SELECT count(*)=0 FROM public.sfm_integration_snapshots),'revocation removes access to approved history');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.history_denied('SELECT * FROM public.sfm_integration_snapshots');
RESET ROLE;
ROLLBACK;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000602')) THEN
    RAISE EXCEPTION 'HISTORY_FIXTURE_CLEANUP_FAILED';
  END IF;
  IF position('select null::uuid' IN pg_get_functiondef('auth.uid()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'AUTH_STAND_IN_NOT_RESTORED';
  END IF;
END $$;
\echo 'Historical evidence approval and ownership assertions passed; all synthetic records rolled back.'

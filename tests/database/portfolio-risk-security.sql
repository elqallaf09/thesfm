-- Synthetic fixtures on the disposable CI Postgres ONLY. Never run on a live
-- Supabase project. Every fixture and the auth.uid stand-in are rolled back.
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
CREATE FUNCTION pg_temp.check_true(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERTION_FAILED: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement; EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
  RAISE EXCEPTION 'EXPECTED_DENIAL: %', statement;
END $$;
CREATE FUNCTION pg_temp.no_visible_rows(relation_name text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE visible bigint;
BEGIN
  BEGIN EXECUTE format('SELECT count(*) FROM public.%I', relation_name) INTO visible;
  EXCEPTION WHEN insufficient_privilege THEN RETURN; END;
  IF visible <> 0 THEN RAISE EXCEPTION 'UNEXPECTED_VISIBLE_ROWS: %', relation_name; END IF;
END $$;

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-4000-8000-000000000501'),
  ('00000000-0000-4000-8000-000000000502');
INSERT INTO auth.sessions(id, user_id) VALUES
  ('00000000-0000-4000-8000-000000000511', '00000000-0000-4000-8000-000000000501'),
  ('00000000-0000-4000-8000-000000000512', '00000000-0000-4000-8000-000000000502');
INSERT INTO public.investment_positions(id, user_id, asset_type, migration_state, current_total_value) VALUES
  ('00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000501', 'STOCK', 'VERIFIED', 100),
  ('00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000502', 'STOCK', 'VERIFIED', 200);
INSERT INTO public.investment_valuations(id, position_id, user_id, valuation_type, total_value, currency) VALUES
  ('00000000-0000-4000-8000-000000000531', '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000501', 'OFFICIAL_MARKET_PRICE', 100, 'KWD'),
  ('00000000-0000-4000-8000-000000000532', '00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000502', 'OFFICIAL_MARKET_PRICE', 200, 'KWD');
INSERT INTO public.investment_transactions(id, position_id, user_id, transaction_type, total_amount, currency) VALUES
  ('00000000-0000-4000-8000-000000000541', '00000000-0000-4000-8000-000000000521', '00000000-0000-4000-8000-000000000501', 'BUY', 100, 'KWD'),
  ('00000000-0000-4000-8000-000000000542', '00000000-0000-4000-8000-000000000522', '00000000-0000-4000-8000-000000000502', 'BUY', 200, 'KWD');

SELECT pg_temp.check_true((SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN (
  'public.investment_positions'::regclass, 'public.investment_valuations'::regclass,
  'public.investment_transactions'::regclass)), 'all risk source tables enforce RLS');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000501', true);
SELECT set_config('request.jwt.claims', '{"aal":"aal1","session_id":"00000000-0000-4000-8000-000000000511"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(current_total_value) = 100 FROM public.investment_positions), 'A sees only its own position');
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(total_value) = 100 FROM public.investment_valuations), 'A sees only its own valuation');
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(total_amount) = 100 FROM public.investment_transactions), 'A sees only its own transaction');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_positions WHERE user_id = '00000000-0000-4000-8000-000000000502'), 'explicit B selector cannot override A identity');
WITH changed AS (UPDATE public.investment_positions SET current_total_value = 999 WHERE id = '00000000-0000-4000-8000-000000000522' RETURNING id)
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM changed), 'A cannot update B position');
WITH removed AS (DELETE FROM public.investment_transactions WHERE id = '00000000-0000-4000-8000-000000000542' RETURNING id)
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM removed), 'A cannot delete B history');
SELECT pg_temp.denied($q$UPDATE public.investment_positions SET user_id = '00000000-0000-4000-8000-000000000502' WHERE id = '00000000-0000-4000-8000-000000000521'$q$);
SELECT pg_temp.denied($q$INSERT INTO public.investment_valuations(position_id,user_id,valuation_type) VALUES ('00000000-0000-4000-8000-000000000522','00000000-0000-4000-8000-000000000501','USER_ENTERED')$q$);
SELECT pg_temp.denied($q$INSERT INTO public.investment_transactions(position_id,user_id,transaction_type) VALUES ('00000000-0000-4000-8000-000000000522','00000000-0000-4000-8000-000000000501','BUY')$q$);
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000502', true);
SELECT set_config('request.jwt.claims', '{"aal":"aal1","session_id":"00000000-0000-4000-8000-000000000512"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(current_total_value) = 200 FROM public.investment_positions), 'B sees only its own unchanged position');
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(total_value) = 200 FROM public.investment_valuations), 'B sees only its own valuation');
SELECT pg_temp.check_true((SELECT count(*) = 1 AND sum(total_amount) = 200 FROM public.investment_transactions), 'B history was not deleted by A');
RESET ROLE;

INSERT INTO auth.mfa_factors(id,user_id,factor_type,status) VALUES
  ('00000000-0000-4000-8000-000000000551','00000000-0000-4000-8000-000000000501','totp','verified');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000501', true);
SELECT set_config('request.jwt.claims', '{"aal":"aal1","session_id":"00000000-0000-4000-8000-000000000511"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_positions), 'enrolled MFA blocks first-factor positions');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_valuations), 'enrolled MFA blocks first-factor valuations');
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_transactions), 'enrolled MFA blocks first-factor transactions');
SELECT set_config('request.jwt.claims', '{"aal":"aal2","session_id":"00000000-0000-4000-8000-000000000511"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.investment_positions), 'completed MFA restores own positions');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.investment_valuations), 'completed MFA restores own valuations');
SELECT set_config('request.jwt.claims', '{"aal":"aal2","session_id":"00000000-0000-4000-8000-000000000512"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_positions), 'another account session cannot satisfy MFA');
RESET ROLE;
DELETE FROM auth.sessions WHERE id = '00000000-0000-4000-8000-000000000511';
SELECT set_config('request.jwt.claims', '{"aal":"aal2","session_id":"00000000-0000-4000-8000-000000000511"}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.investment_positions), 'revoked enrolled session cannot read positions');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.no_visible_rows('investment_positions');
SELECT pg_temp.no_visible_rows('investment_valuations');
SELECT pg_temp.no_visible_rows('investment_transactions');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.no_visible_rows('investment_positions');
SELECT pg_temp.no_visible_rows('investment_valuations');
SELECT pg_temp.no_visible_rows('investment_transactions');
RESET ROLE;
ROLLBACK;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000502')) THEN
    RAISE EXCEPTION 'RISK_TEST_FIXTURE_CLEANUP_FAILED';
  END IF;
  IF position('select null::uuid' IN pg_get_functiondef('auth.uid()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'AUTH_STAND_IN_NOT_RESTORED';
  END IF;
END $$;
\echo 'Portfolio risk source isolation checks passed; synthetic fixtures rolled back.'

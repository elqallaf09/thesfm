-- CI ONLY. Run after bootstrap-supabase-stubs.sql, BEFORE any migrations.
-- This models database roles/claim access, not GoTrue or JWT verification.
-- Actual PostgreSQL grants, RLS policies and RPC transactions are exercised.
\set ON_ERROR_STOP on

do $$
begin
  if current_database() <> 'sfm_property_isolation_ci'
     or current_setting('sfm.disposable_ci', true) is distinct from '1'
     or current_user <> 'postgres' then
    raise exception 'This bootstrap requires the disposable property CI database';
  end if;
end;
$$;

alter role anon nosuperuser nobypassrls;
alter role authenticated nosuperuser nobypassrls;
alter role service_role nosuperuser bypassrls;
grant usage on schema public, auth to anon, authenticated, service_role;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )
$$;

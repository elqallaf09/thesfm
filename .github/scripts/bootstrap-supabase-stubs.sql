-- Minimal, additive stand-ins for the Supabase-managed schemas/roles/functions
-- that repository migrations reference (auth.*, storage.*, net.*, vault.*, cron.*)
-- but that do not exist on a bare Postgres instance. This lets CI prove the
-- migration chain applies cleanly end-to-end without needing a live Supabase
-- project. It is used ONLY against the disposable CI Postgres service
-- container (see .github/workflows/ci.yml, job "migrations-clean-chain") and
-- is never run against Preview or Production.

create extension if not exists pgcrypto;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_super_admin boolean,
  banned_until timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select null::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select 'authenticated'::text
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end $$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (regexp_split_to_array(name, '/'))[1:array_length(regexp_split_to_array(name, '/'), 1) - 1]
$$;
create or replace function storage.filename(name text) returns text language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;
create or replace function storage.extension(name text) returns text language sql immutable as $$
  select reverse(split_part(reverse(name), '.', 1))
$$;

create schema if not exists net;
create or replace function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int)
  returns bigint language sql as $$ select 1::bigint $$;

create schema if not exists vault;
create table if not exists vault.secrets (
  id uuid primary key default gen_random_uuid(),
  name text,
  secret text
);

create schema if not exists cron;
create or replace function cron.schedule(job_name text, schedule text, command text)
  returns bigint language sql as $$ select 1::bigint $$;
create or replace function cron.unschedule(job_name text)
  returns boolean language sql as $$ select true $$;

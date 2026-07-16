-- Phase 4.2A: privacy-safe shared purchase/custody platform directory.
-- This migration is additive. Existing investment rows intentionally remain null.

create or replace function public.normalize_investment_platform_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(
    regexp_replace(
      regexp_replace(btrim(value), '[.,!?]+$', '', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

revoke all on function public.normalize_investment_platform_name(text) from public, anon, authenticated;
grant execute on function public.normalize_investment_platform_name(text) to service_role;

create table if not exists public.investment_platforms (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  normalized_name text not null,
  slug text not null,
  platform_type text not null,
  website_url text,
  logo_url text,
  country_code text,
  aliases text[] not null default '{}'::text[],
  status text not null default 'pending',
  is_seeded boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_platforms_canonical_name_length
    check (char_length(btrim(canonical_name)) between 2 and 80),
  constraint investment_platforms_normalized_name_match
    check (normalized_name = public.normalize_investment_platform_name(canonical_name)),
  constraint investment_platforms_normalized_name_length
    check (char_length(normalized_name) between 2 and 80),
  constraint investment_platforms_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 100),
  constraint investment_platforms_platform_type_check
    check (platform_type in (
      'stock_broker',
      'bank_brokerage',
      'multi_asset_broker',
      'crypto_exchange',
      'fund_platform',
      'robo_advisor',
      'precious_metals_dealer',
      'real_estate_platform',
      'private_investment_provider',
      'other'
    )),
  constraint investment_platforms_status_check
    check (status in ('approved', 'pending', 'rejected', 'disabled')),
  constraint investment_platforms_website_url_check
    check (website_url is null or (char_length(website_url) <= 300 and website_url ~ '^https://[^[:space:]]+$')),
  constraint investment_platforms_logo_url_check
    check (logo_url is null or (char_length(logo_url) <= 300 and logo_url ~ '^https://[^[:space:]]+$')),
  constraint investment_platforms_country_code_check
    check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint investment_platforms_aliases_count_check
    check (cardinality(aliases) <= 30),
  constraint investment_platforms_approval_state_check
    check (
      (status = 'approved' and approved_at is not null and approved_by is not null)
      or status <> 'approved'
      or is_seeded = true
    )
);

create unique index if not exists investment_platforms_normalized_name_unique
  on public.investment_platforms (normalized_name);

create unique index if not exists investment_platforms_slug_unique
  on public.investment_platforms (slug);

create index if not exists investment_platforms_status_type_name_idx
  on public.investment_platforms (status, platform_type, normalized_name);

create index if not exists investment_platforms_created_by_status_idx
  on public.investment_platforms (created_by, status)
  where created_by is not null;

create or replace function public.set_investment_platform_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_investment_platform_updated_at() from public, anon, authenticated;
grant execute on function public.set_investment_platform_updated_at() to service_role;

drop trigger if exists set_investment_platform_updated_at on public.investment_platforms;
create trigger set_investment_platform_updated_at
before update on public.investment_platforms
for each row execute function public.set_investment_platform_updated_at();

alter table public.investment_items
  add column if not exists purchase_platform_id uuid,
  add column if not exists purchase_platform_name text,
  add column if not exists purchase_platform_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'investment_items_purchase_platform_id_fkey'
      and conrelid = 'public.investment_items'::regclass
  ) then
    alter table public.investment_items
      add constraint investment_items_purchase_platform_id_fkey
      foreign key (purchase_platform_id)
      references public.investment_platforms(id)
      on delete restrict;
  end if;
end $$;

alter table public.investment_items
  drop constraint if exists investment_items_purchase_platform_name_length,
  add constraint investment_items_purchase_platform_name_length
    check (purchase_platform_name is null or char_length(btrim(purchase_platform_name)) between 2 and 80),
  drop constraint if exists investment_items_purchase_platform_type_check,
  add constraint investment_items_purchase_platform_type_check
    check (purchase_platform_type is null or purchase_platform_type in (
      'stock_broker',
      'bank_brokerage',
      'multi_asset_broker',
      'crypto_exchange',
      'fund_platform',
      'robo_advisor',
      'precious_metals_dealer',
      'real_estate_platform',
      'private_investment_provider',
      'other'
    ));

create index if not exists investment_items_user_purchase_platform_idx
  on public.investment_items (user_id, purchase_platform_id)
  where purchase_platform_id is not null;

alter table public.investment_platforms enable row level security;

drop policy if exists "Approved investment platforms are publicly readable" on public.investment_platforms;
create policy "Approved investment platforms are publicly readable"
on public.investment_platforms
for select
to anon, authenticated
using (status = 'approved');

-- Pending and moderated rows remain server-only. The moderation API uses the
-- service role after checking the existing administrator permission system.
-- Authenticated clients receive only the approved-directory policy above.
drop policy if exists "Admins can read investment platforms" on public.investment_platforms;

revoke all on table public.investment_platforms from anon, authenticated;
grant select (
  id,
  canonical_name,
  normalized_name,
  slug,
  platform_type,
  website_url,
  logo_url,
  country_code,
  aliases,
  status,
  is_seeded,
  approved_at,
  created_at,
  updated_at
) on table public.investment_platforms to anon, authenticated;
grant select, insert, update, delete on table public.investment_platforms to service_role;

-- Reassert explicit authenticated ownership policies for investments. No catalog
-- policy can grant access to another user's holdings.
drop policy if exists "investment_items_policy" on public.investment_items;
drop policy if exists "Users can select own investments" on public.investment_items;
drop policy if exists "Users can insert own investments" on public.investment_items;
drop policy if exists "Users can update own investments" on public.investment_items;
drop policy if exists "Users can delete own investments" on public.investment_items;

create policy "Users can select own investments"
on public.investment_items for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own investments"
on public.investment_items for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own investments"
on public.investment_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own investments"
on public.investment_items for delete to authenticated
using ((select auth.uid()) = user_id);

-- Atomic merge: safe references move to the approved target while each user's
-- purchase_platform_name snapshot is deliberately preserved.
create or replace function public.merge_investment_platforms(
  source_platform_id uuid,
  target_platform_id uuid,
  actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_row public.investment_platforms%rowtype;
  target_row public.investment_platforms%rowtype;
begin
  if source_platform_id = target_platform_id then
    raise exception 'source and target platform must differ';
  end if;

  select * into source_row
  from public.investment_platforms
  where id = source_platform_id
  for update;

  select * into target_row
  from public.investment_platforms
  where id = target_platform_id and status = 'approved'
  for update;

  if source_row.id is null or target_row.id is null then
    raise exception 'platform not found';
  end if;

  update public.investment_items
  set purchase_platform_id = target_platform_id
  where purchase_platform_id = source_platform_id;

  update public.investment_platforms
  set
    status = 'disabled',
    aliases = (
      select array(
        select distinct alias_value
        from unnest(target_row.aliases || source_row.aliases || array[source_row.canonical_name]) alias_value
        where nullif(btrim(alias_value), '') is not null
        order by alias_value
      )
    ),
    approved_by = coalesce(approved_by, actor_user_id),
    approved_at = coalesce(approved_at, now())
  where id = source_platform_id;

  update public.investment_platforms
  set aliases = (
    select array(
      select distinct alias_value
      from unnest(target_row.aliases || source_row.aliases || array[source_row.canonical_name]) alias_value
      where nullif(btrim(alias_value), '') is not null
      order by alias_value
    )
  )
  where id = target_platform_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    old_value,
    new_value
  ) values (
    actor_user_id,
    'investment_platform_merged',
    jsonb_build_object('source_platform_id', source_platform_id, 'source_name', source_row.canonical_name),
    jsonb_build_object('target_platform_id', target_platform_id, 'target_name', target_row.canonical_name)
  );
end;
$$;

revoke all on function public.merge_investment_platforms(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.merge_investment_platforms(uuid, uuid, uuid) to service_role;

-- Controlled, neutral starter directory. These are options, not recommendations.
insert into public.investment_platforms (
  id, canonical_name, normalized_name, slug, platform_type, status, is_seeded, approved_at
) values
  ('10000000-0000-4000-8000-000000000001', 'XTB', 'xtb', 'xtb', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000002', 'Interactive Brokers', 'interactive brokers', 'interactive-brokers', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000003', 'eToro', 'etoro', 'etoro', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000004', 'Trading 212', 'trading 212', 'trading-212', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000005', 'Saxo', 'saxo', 'saxo', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000006', 'Swissquote', 'swissquote', 'swissquote', 'multi_asset_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000007', 'Charles Schwab', 'charles schwab', 'charles-schwab', 'stock_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000008', 'Fidelity', 'fidelity', 'fidelity', 'stock_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000009', 'DEGIRO', 'degiro', 'degiro', 'stock_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000010', 'Robinhood', 'robinhood', 'robinhood', 'stock_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000011', 'Binance', 'binance', 'binance', 'crypto_exchange', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000012', 'Coinbase', 'coinbase', 'coinbase', 'crypto_exchange', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000013', 'Kraken', 'kraken', 'kraken', 'crypto_exchange', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000014', 'Local bank brokerage', 'local bank brokerage', 'local-bank-brokerage', 'bank_brokerage', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000015', 'Local investment company', 'local investment company', 'local-investment-company', 'private_investment_provider', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000016', 'Other broker', 'other broker', 'other-broker', 'stock_broker', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000017', 'Other cryptocurrency exchange', 'other cryptocurrency exchange', 'other-cryptocurrency-exchange', 'crypto_exchange', 'approved', true, now()),
  ('10000000-0000-4000-8000-000000000018', 'Other platform or provider', 'other platform or provider', 'other-platform-or-provider', 'other', 'approved', true, now())
on conflict (normalized_name) do nothing;

comment on table public.investment_platforms is
  'Public platform metadata only. User holdings and platform usage are never stored in this directory.';
comment on column public.investment_platforms.created_by is
  'Private moderation metadata. Not granted to public client roles and never returned by directory APIs.';
comment on column public.investment_items.purchase_platform_name is
  'User-owned purchase/custody platform snapshot; independent from market, exchange and price/data providers.';

notify pgrst, 'reload schema';

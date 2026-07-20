-- Phase 6.4: additive Investments Center foundation.
--
-- Migration sequence (deliberately no dual writes):
-- legacy read -> this additive import -> background verification -> canonical
-- read switch -> legacy retirement.  The legacy investment_items table is not
-- altered or removed here, and every copied position retains its legacy UUID.

create table if not exists public.investment_asset_catalog (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  canonical_asset_identifier text not null,
  symbol text,
  display_name text,
  country_code text,
  exchange_code text,
  sector_or_category text,
  logo_url text,
  image_url text,
  market_data_provider text,
  provider_asset_identifier text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_asset_catalog_asset_type_check check (asset_type in (
    'STOCK', 'REAL_ESTATE', 'GOLD', 'SILVER', 'CRYPTO', 'FUND', 'BOND', 'COMMODITY', 'OTHER'
  )),
  constraint investment_asset_catalog_identifier_not_blank check (char_length(btrim(canonical_asset_identifier)) between 1 and 160),
  constraint investment_asset_catalog_status_check check (status in ('active', 'inactive', 'retired')),
  constraint investment_asset_catalog_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint investment_asset_catalog_logo_url_check check (logo_url is null or (char_length(logo_url) <= 500 and logo_url ~ '^https://[^[:space:]]+$')),
  constraint investment_asset_catalog_image_url_check check (image_url is null or (char_length(image_url) <= 500 and image_url ~ '^https://[^[:space:]]+$')),
  unique (asset_type, canonical_asset_identifier)
);

-- catalog_asset_id is intentionally nullable. Private property, private
-- business, collectible, and custom records must remain fully supported when
-- no public catalog identity exists.
create table if not exists public.investment_positions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  legacy_investment_item_id uuid unique references public.investment_items(id) on delete set null,
  catalog_asset_id uuid references public.investment_asset_catalog(id) on delete set null,
  asset_type text,
  canonical_asset_identifier text,
  symbol text,
  display_name text,
  country_code text,
  exchange_code text,
  sector_or_category text,
  quantity numeric,
  ownership_percentage numeric,
  unit_type text,
  purchase_date date,
  purchase_unit_price numeric,
  purchase_currency text,
  total_cost numeric,
  fees numeric,
  current_unit_price numeric,
  current_total_value numeric,
  valuation_currency text,
  user_base_currency text,
  converted_value_in_base_currency numeric,
  valuation_method text,
  valuation_source text,
  source_quality text,
  valuation_confidence text,
  valued_at timestamptz,
  fx_rate_to_base_currency numeric,
  fx_source text,
  fx_valued_at timestamptz,
  unrealized_gain_loss numeric,
  realized_gain_loss numeric,
  return_percentage numeric,
  income_or_distributions numeric,
  total_return numeric,
  purchase_platform_id uuid references public.investment_platforms(id) on delete set null,
  purchase_platform_name text,
  purchase_platform_type text,
  asset_logo_url text,
  asset_image_url text,
  notes text,
  legacy_asset_type text,
  legacy_snapshot jsonb not null default '{}'::jsonb,
  migration_state text not null default 'PENDING_VERIFICATION',
  migration_note text,
  imported_at timestamptz not null default now(),
  created_at timestamptz,
  updated_at timestamptz,
  constraint investment_positions_asset_type_check check (asset_type is null or asset_type in (
    'STOCK', 'REAL_ESTATE', 'GOLD', 'SILVER', 'CRYPTO', 'FUND', 'BOND', 'COMMODITY', 'OTHER'
  )),
  constraint investment_positions_migration_state_check check (migration_state in (
    'PENDING_VERIFICATION', 'VERIFIED', 'EXCLUDED', 'ERROR'
  )),
  constraint investment_positions_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint investment_positions_purchase_currency_check check (purchase_currency is null or purchase_currency ~ '^[A-Z]{3}$'),
  constraint investment_positions_valuation_currency_check check (valuation_currency is null or valuation_currency ~ '^[A-Z]{3}$'),
  constraint investment_positions_base_currency_check check (user_base_currency is null or user_base_currency ~ '^[A-Z]{3}$'),
  constraint investment_positions_asset_logo_url_check check (asset_logo_url is null or (char_length(asset_logo_url) <= 500 and asset_logo_url ~ '^https://[^[:space:]]+$')),
  constraint investment_positions_asset_image_url_check check (asset_image_url is null or (char_length(asset_image_url) <= 500 and asset_image_url ~ '^https://[^[:space:]]+$'))
);

create table if not exists public.investment_position_migration_checks (
  position_id uuid primary key references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_table text not null default 'investment_items',
  source_row_id uuid not null unique,
  source_row_updated_at timestamptz,
  verification_state text not null default 'PENDING',
  verification_note text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_position_migration_checks_source_table_check check (source_table = 'investment_items'),
  constraint investment_position_migration_checks_state_check check (verification_state in ('PENDING', 'VERIFIED', 'EXCLUDED', 'ERROR'))
);

create table if not exists public.investment_valuations (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  valuation_type text not null,
  unit_price numeric,
  total_value numeric,
  currency text,
  source_name text,
  source_url text,
  source_quality text,
  confidence_level text,
  valued_at timestamptz,
  is_manual boolean not null default false,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint investment_valuations_type_check check (valuation_type in (
    'OFFICIAL_MARKET_PRICE', 'OFFICIAL_TRANSACTION', 'OFFICIAL_REPORT',
    'BROKER_ESTIMATE', 'LISTING_PRICE', 'MODEL_ESTIMATE', 'USER_ENTERED', 'UNAVAILABLE'
  )),
  constraint investment_valuations_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint investment_valuations_source_url_check check (source_url is null or (char_length(source_url) <= 500 and source_url ~ '^https://[^[:space:]]+$'))
);

create table if not exists public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null,
  occurred_on date,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  currency text,
  fees numeric,
  source_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_transactions_type_check check (transaction_type in (
    'BUY', 'SELL', 'DIVIDEND', 'COUPON', 'FEE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'OTHER'
  )),
  constraint investment_transactions_currency_check check (currency is null or currency ~ '^[A-Z]{3}$')
);

create table if not exists public.investment_property_details (
  position_id uuid primary key references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_type text,
  country_code text,
  city text,
  municipality text,
  address text,
  latitude numeric,
  longitude numeric,
  land_area numeric,
  land_area_unit text,
  built_area numeric,
  built_area_unit text,
  price_per_square_meter numeric,
  developer_or_broker text,
  property_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_property_details_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint investment_property_details_image_url_check check (property_image_url is null or (char_length(property_image_url) <= 500 and property_image_url ~ '^https://[^[:space:]]+$'))
);

create table if not exists public.investment_ownership_sources (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_role text not null,
  platform_id uuid references public.investment_platforms(id) on delete set null,
  source_name text,
  source_logo_url text,
  account_reference text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_ownership_sources_role_check check (source_role in (
    'BROKER', 'BANK', 'PLATFORM', 'DEVELOPER', 'CUSTODIAN', 'SELLER', 'OTHER'
  )),
  constraint investment_ownership_sources_logo_url_check check (source_logo_url is null or (char_length(source_logo_url) <= 500 and source_logo_url ~ '^https://[^[:space:]]+$'))
);

-- Separate from Investment Offers / project_documents. This private bucket is
-- dedicated to position evidence such as deeds, contracts and statements.
create table if not exists public.investment_documents (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_kind text not null default 'OTHER',
  title text not null,
  storage_bucket text,
  storage_path text,
  external_url text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  source_name text,
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_documents_kind_check check (document_kind in (
    'DEED', 'CONTRACT', 'PDF', 'VALUATION_REPORT', 'BROKER_STATEMENT', 'PROPERTY_IMAGE', 'OWNERSHIP_EVIDENCE', 'OTHER'
  )),
  constraint investment_documents_title_not_blank check (char_length(btrim(title)) between 1 and 240),
  constraint investment_documents_reference_check check (
    (storage_bucket is not null and storage_path is not null and external_url is null)
    or (storage_bucket is null and storage_path is null and external_url is not null)
  ),
  constraint investment_documents_storage_bucket_check check (storage_bucket is null or storage_bucket = 'investment-documents'),
  constraint investment_documents_external_url_check check (external_url is null or (char_length(external_url) <= 500 and external_url ~ '^https://[^[:space:]]+$')),
  constraint investment_documents_file_size_check check (file_size_bytes is null or file_size_bytes >= 0)
);

create index if not exists investment_asset_catalog_type_identifier_idx
  on public.investment_asset_catalog (asset_type, canonical_asset_identifier);
create index if not exists investment_positions_user_updated_idx
  on public.investment_positions (user_id, updated_at desc nulls last);
create index if not exists investment_positions_user_type_idx
  on public.investment_positions (user_id, asset_type);
create index if not exists investment_positions_catalog_asset_idx
  on public.investment_positions (catalog_asset_id) where catalog_asset_id is not null;
create index if not exists investment_position_migration_checks_user_state_idx
  on public.investment_position_migration_checks (user_id, verification_state);
create index if not exists investment_valuations_position_valued_idx
  on public.investment_valuations (position_id, valued_at desc nulls last);
create index if not exists investment_transactions_position_occurred_idx
  on public.investment_transactions (position_id, occurred_on desc nulls last);
create index if not exists investment_ownership_sources_position_idx
  on public.investment_ownership_sources (position_id, is_primary desc);
create index if not exists investment_documents_user_position_uploaded_idx
  on public.investment_documents (user_id, position_id, uploaded_at desc);

alter table public.investment_asset_catalog enable row level security;
alter table public.investment_positions enable row level security;
alter table public.investment_position_migration_checks enable row level security;
alter table public.investment_valuations enable row level security;
alter table public.investment_transactions enable row level security;
alter table public.investment_property_details enable row level security;
alter table public.investment_ownership_sources enable row level security;
alter table public.investment_documents enable row level security;

revoke all on table public.investment_asset_catalog from anon, authenticated;
grant select on table public.investment_asset_catalog to anon, authenticated;
grant all on table public.investment_asset_catalog to service_role;

drop policy if exists "Active investment catalog assets are publicly readable" on public.investment_asset_catalog;
create policy "Active investment catalog assets are publicly readable"
on public.investment_asset_catalog for select to anon, authenticated
using (status = 'active');

revoke all on table public.investment_positions from anon;
revoke all on table public.investment_position_migration_checks from anon;
revoke all on table public.investment_valuations from anon;
revoke all on table public.investment_transactions from anon;
revoke all on table public.investment_property_details from anon;
revoke all on table public.investment_ownership_sources from anon;
revoke all on table public.investment_documents from anon;
grant select, insert, update, delete on table public.investment_positions to authenticated;
grant select on table public.investment_position_migration_checks to authenticated;
grant select, insert, update, delete on table public.investment_valuations to authenticated;
grant select, insert, update, delete on table public.investment_transactions to authenticated;
grant select, insert, update, delete on table public.investment_property_details to authenticated;
grant select, insert, update, delete on table public.investment_ownership_sources to authenticated;
grant select, insert, update, delete on table public.investment_documents to authenticated;
grant all on table public.investment_positions, public.investment_position_migration_checks,
  public.investment_valuations, public.investment_transactions, public.investment_property_details,
  public.investment_ownership_sources, public.investment_documents to service_role;

drop policy if exists "Users manage their own investment positions" on public.investment_positions;
create policy "Users manage their own investment positions"
on public.investment_positions for all to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users read their own investment migration checks" on public.investment_position_migration_checks;
create policy "Users read their own investment migration checks"
on public.investment_position_migration_checks for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users manage their own investment valuations" on public.investment_valuations;
create policy "Users manage their own investment valuations"
on public.investment_valuations for all to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
);

drop policy if exists "Users manage their own investment transactions" on public.investment_transactions;
create policy "Users manage their own investment transactions"
on public.investment_transactions for all to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
);

drop policy if exists "Users manage their own property details" on public.investment_property_details;
create policy "Users manage their own property details"
on public.investment_property_details for all to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
);

drop policy if exists "Users manage their own investment ownership sources" on public.investment_ownership_sources;
create policy "Users manage their own investment ownership sources"
on public.investment_ownership_sources for all to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
);

drop policy if exists "Users manage their own investment documents" on public.investment_documents;
create policy "Users manage their own investment documents"
on public.investment_documents for all to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (select 1 from public.investment_positions position where position.id = position_id and position.user_id = (select auth.uid()))
);

insert into storage.buckets (id, name, public)
values ('investment-documents', 'investment-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload own investment documents" on storage.objects;
create policy "Users can upload own investment documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'investment-documents'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'investments'
);

drop policy if exists "Users can read own investment documents" on storage.objects;
create policy "Users can read own investment documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'investment-documents'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'investments'
);

drop policy if exists "Users can update own investment documents" on storage.objects;
create policy "Users can update own investment documents"
on storage.objects for update to authenticated
using (
  bucket_id = 'investment-documents'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'investments'
)
with check (
  bucket_id = 'investment-documents'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'investments'
);

drop policy if exists "Users can delete own investment documents" on storage.objects;
create policy "Users can delete own investment documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'investment-documents'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'investments'
);

-- Additive copy only. No legacy row is updated, deleted, normalized in place,
-- or used to fabricate a valuation, transaction, ownership percentage, FX
-- rate, canonical identifier, catalog relation, or confidence level.
insert into public.investment_positions (
  id, user_id, legacy_investment_item_id, asset_type, symbol, display_name,
  exchange_code, quantity, unit_type, purchase_date, purchase_unit_price,
  purchase_currency, total_cost, current_unit_price, current_total_value,
  valuation_currency, valuation_source, valued_at, purchase_platform_id,
  purchase_platform_name, purchase_platform_type, notes, legacy_asset_type,
  legacy_snapshot, migration_state, created_at, updated_at
)
select
  item.id,
  item.user_id,
  item.id,
  case lower(regexp_replace(coalesce(nullif(btrim(item.asset_type), ''), nullif(btrim(item.type), '')), '[^a-z]', '', 'g'))
    when 'stock' then 'STOCK'
    when 'stocks' then 'STOCK'
    when 'realestate' then 'REAL_ESTATE'
    when 'gold' then 'GOLD'
    when 'silver' then 'SILVER'
    when 'crypto' then 'CRYPTO'
    when 'fund' then 'FUND'
    when 'funds' then 'FUND'
    when 'bond' then 'BOND'
    when 'bonds' then 'BOND'
    when 'commodity' then 'COMMODITY'
    when 'commodities' then 'COMMODITY'
    when 'other' then 'OTHER'
    else null
  end,
  nullif(btrim(item.symbol), ''),
  nullif(btrim(item.name), ''),
  nullif(btrim(item.exchange), ''),
  item.quantity,
  nullif(btrim(item.unit), ''),
  item.purchase_date,
  item.purchase_price,
  nullif(upper(btrim(item.currency)), ''),
  item.purchase_total,
  item.current_price,
  item.current_market_value,
  nullif(upper(btrim(item.price_currency)), ''),
  nullif(btrim(item.valuation_source), ''),
  item.valuation_last_updated_at,
  item.purchase_platform_id,
  nullif(btrim(item.purchase_platform_name), ''),
  nullif(btrim(item.purchase_platform_type), ''),
  item.notes,
  coalesce(nullif(btrim(item.asset_type), ''), nullif(btrim(item.type), '')),
  to_jsonb(item),
  'PENDING_VERIFICATION',
  item.created_at,
  item.updated_at
from public.investment_items item
on conflict (id) do nothing;

insert into public.investment_position_migration_checks (
  position_id, user_id, source_table, source_row_id, source_row_updated_at, verification_state
)
select
  position.id,
  position.user_id,
  'investment_items',
  position.legacy_investment_item_id,
  position.updated_at,
  'PENDING'
from public.investment_positions position
where position.legacy_investment_item_id is not null
on conflict (position_id) do nothing;

comment on table public.investment_asset_catalog is
  'Optional public-asset catalog. Private assets are represented by investment_positions without a catalog_asset_id.';
comment on table public.investment_positions is
  'Canonical portfolio positions. Phase 6.4 imports preserve legacy investment_items UUIDs and snapshots; no dual-write synchronization is created.';
comment on table public.investment_position_migration_checks is
  'Background verification ledger for the additive legacy-to-canonical read migration.';
comment on table public.investment_documents is
  'Private position documents (deeds, contracts, reports, statements and evidence). Deliberately separate from project and Investment Offers documents.';

notify pgrst, 'reload schema';

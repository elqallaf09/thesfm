-- Investments Intelligence 2.0: evidence-first valuation foundation.
-- Additive only. Existing Phase 6.4 position/valuation tables remain canonical compatibility surfaces.

begin;

create table if not exists public.investment_valuation_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  evidence_type text not null,
  source_name text not null,
  source_url text,
  source_authority text not null default 'OTHER',
  source_record_identifier text,
  observed_on date,
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  country_code text,
  region text,
  city text,
  district text,
  asset_match_quality text not null default 'UNKNOWN',
  geography_match_quality text not null default 'UNKNOWN',
  value_amount numeric,
  value_currency text,
  unit_value numeric,
  unit_code text,
  raw_evidence jsonb not null default '{}'::jsonb,
  limitations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investment_valuation_evidence_type_check check (evidence_type in (
    'OFFICIAL_TRANSACTION','OFFICIAL_REGISTRY','OFFICIAL_STATISTIC','OFFICIAL_REPORT',
    'MARKET_TRANSACTION','BROKER_RESEARCH','LISTING_ASK','MODEL_INPUT','USER_ENTERED','OTHER'
  )),
  constraint investment_valuation_evidence_authority_check check (source_authority in (
    'GOVERNMENT','REGULATOR','EXCHANGE','OFFICIAL_STATISTICS','ESTABLISHED_DATA_PROVIDER',
    'BROKER','LISTING_PLATFORM','USER','OTHER'
  )),
  constraint investment_valuation_evidence_asset_match_check check (asset_match_quality in ('EXACT','STRONG','PARTIAL','WEAK','UNKNOWN')),
  constraint investment_valuation_evidence_geo_match_check check (geography_match_quality in ('EXACT','STRONG','PARTIAL','WEAK','UNKNOWN')),
  constraint investment_valuation_evidence_country_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint investment_valuation_evidence_currency_check check (value_currency is null or value_currency ~ '^[A-Z]{3}$'),
  constraint investment_valuation_evidence_url_check check (source_url is null or (char_length(source_url) <= 1000 and source_url ~ '^https://[^[:space:]]+$'))
);

create index if not exists investment_valuation_evidence_position_idx
  on public.investment_valuation_evidence(position_id, observed_on desc, retrieved_at desc);
create index if not exists investment_valuation_evidence_user_idx
  on public.investment_valuation_evidence(user_id, retrieved_at desc);

create table if not exists public.investment_valuation_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.investment_positions(id) on delete cascade,
  valuation_kind text not null default 'EVIDENCE_RANGE',
  currency text,
  low_value numeric,
  midpoint_value numeric,
  high_value numeric,
  confidence_level text not null default 'INSUFFICIENT',
  confidence_reasons jsonb not null default '[]'::jsonb,
  evidence_count integer not null default 0,
  official_evidence_count integer not null default 0,
  freshest_evidence_at timestamptz,
  methodology_version text not null,
  limitations jsonb not null default '[]'::jsonb,
  valued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint investment_valuation_snapshots_kind_check check (valuation_kind in ('EVIDENCE_RANGE','MARKET_PRICE','MANUAL','UNAVAILABLE')),
  constraint investment_valuation_snapshots_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint investment_valuation_snapshots_confidence_check check (confidence_level in ('HIGH','MEDIUM','LOW','INSUFFICIENT')),
  constraint investment_valuation_snapshots_evidence_count_check check (evidence_count >= 0 and official_evidence_count >= 0 and official_evidence_count <= evidence_count),
  constraint investment_valuation_snapshots_range_check check (
    (low_value is null and midpoint_value is null and high_value is null)
    or (low_value is not null and midpoint_value is not null and high_value is not null and low_value <= midpoint_value and midpoint_value <= high_value)
  )
);

create index if not exists investment_valuation_snapshots_position_idx
  on public.investment_valuation_snapshots(position_id, valued_at desc);
create index if not exists investment_valuation_snapshots_user_idx
  on public.investment_valuation_snapshots(user_id, valued_at desc);

create table if not exists public.investment_snapshot_evidence (
  snapshot_id uuid not null references public.investment_valuation_snapshots(id) on delete cascade,
  evidence_id uuid not null references public.investment_valuation_evidence(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric,
  inclusion_reason text,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, evidence_id),
  constraint investment_snapshot_evidence_weight_check check (weight is null or (weight >= 0 and weight <= 1))
);

alter table public.investment_valuation_evidence enable row level security;
alter table public.investment_valuation_snapshots enable row level security;
alter table public.investment_snapshot_evidence enable row level security;

create policy investment_valuation_evidence_owner_select on public.investment_valuation_evidence for select using (auth.uid() = user_id);
create policy investment_valuation_evidence_owner_insert on public.investment_valuation_evidence for insert with check (auth.uid() = user_id and exists (select 1 from public.investment_positions p where p.id = position_id and p.user_id = auth.uid()));
create policy investment_valuation_evidence_owner_update on public.investment_valuation_evidence for update using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.investment_positions p where p.id = position_id and p.user_id = auth.uid()));
create policy investment_valuation_evidence_owner_delete on public.investment_valuation_evidence for delete using (auth.uid() = user_id);

create policy investment_valuation_snapshots_owner_select on public.investment_valuation_snapshots for select using (auth.uid() = user_id);
create policy investment_valuation_snapshots_owner_insert on public.investment_valuation_snapshots for insert with check (auth.uid() = user_id and exists (select 1 from public.investment_positions p where p.id = position_id and p.user_id = auth.uid()));
create policy investment_valuation_snapshots_owner_update on public.investment_valuation_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.investment_positions p where p.id = position_id and p.user_id = auth.uid()));
create policy investment_valuation_snapshots_owner_delete on public.investment_valuation_snapshots for delete using (auth.uid() = user_id);

create policy investment_snapshot_evidence_owner_select on public.investment_snapshot_evidence for select using (auth.uid() = user_id);
create policy investment_snapshot_evidence_owner_insert on public.investment_snapshot_evidence for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.investment_valuation_snapshots s where s.id = snapshot_id and s.user_id = auth.uid())
  and exists (select 1 from public.investment_valuation_evidence e where e.id = evidence_id and e.user_id = auth.uid())
);
create policy investment_snapshot_evidence_owner_delete on public.investment_snapshot_evidence for delete using (auth.uid() = user_id);

comment on table public.investment_valuation_evidence is 'Auditable evidence used by Investments Intelligence specialist valuation engines. Asking prices and transactions remain explicitly distinct.';
comment on table public.investment_valuation_snapshots is 'Immutable-style historical valuation outputs. Missing evidence is represented as INSUFFICIENT/UNAVAILABLE rather than fabricated values.';
comment on table public.investment_snapshot_evidence is 'Exact evidence lineage for each valuation snapshot.';

commit;

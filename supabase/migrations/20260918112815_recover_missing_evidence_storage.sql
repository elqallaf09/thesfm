-- Recover confirmed hosted-schema drift without rewriting published migrations.
-- Production inspection on 2026-09-18 found all three property evidence tables,
-- their atomic writer, and the market observation store absent. Fresh databases
-- already contain them; this migration must preserve that path and all data.
-- Embedded definitions are the existing, clean-chain/RLS-tested canonical SQL.
DO $recovery$
DECLARE
  missing_property_tables integer;
  target regclass;
  target_name text;
BEGIN
  SELECT count(*) INTO missing_property_tables
  FROM unnest(ARRAY['public.investment_valuation_evidence', 'public.investment_valuation_snapshots', 'public.investment_snapshot_evidence']) AS names(name)
  WHERE to_regclass(name) IS NULL;
  IF missing_property_tables = 3 THEN
    EXECUTE $foundation$
-- Investments Intelligence 2.0: evidence-first valuation foundation.
-- Additive only. Existing Phase 6.4 position/valuation tables remain canonical compatibility surfaces.


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

$foundation$;
  ELSIF missing_property_tables <> 0 THEN
    RAISE EXCEPTION 'Partial property evidence schema requires review; no data was changed';
  END IF;

  IF to_regprocedure('public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)') IS NULL THEN
    EXECUTE $snapshot$
-- Append-only hardening for the property analyst release.
-- A snapshot and all of its evidence links commit or roll back together.

alter table public.investment_valuation_snapshots
  add column if not exists subject_asset jsonb not null default '{}'::jsonb;

-- Personal reads still use the existing owner RLS policies. Verified evidence
-- and historical outputs are not writable directly by a browser client.
revoke insert, update, delete on public.investment_valuation_evidence from anon, authenticated;
revoke insert, update, delete on public.investment_valuation_snapshots from anon, authenticated;
revoke insert, update, delete on public.investment_snapshot_evidence from anon, authenticated;
grant select, insert on public.investment_valuation_evidence, public.investment_valuation_snapshots, public.investment_snapshot_evidence to service_role;

create or replace function public.persist_investment_valuation_snapshot(
  p_user_id uuid,
  p_position_id uuid,
  p_valuation jsonb,
  p_evidence jsonb,
  p_subject_asset jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot_id_value uuid := gen_random_uuid();
  evidence_id_value uuid;
  item jsonb;
  evidence_total integer;
  official_total integer;
  freshest_observed_at timestamptz;
  preserved_limitations jsonb;
begin
  if jsonb_typeof(p_valuation) is distinct from 'object'
     or p_valuation->>'status' is distinct from 'VALUED'
     or jsonb_typeof(p_valuation->'evidenceIds') is distinct from 'array'
     or jsonb_typeof(p_evidence) is distinct from 'array'
     or jsonb_typeof(p_subject_asset) is distinct from 'object' then
    raise exception 'Invalid valuation payload' using errcode = '22023';
  end if;
  evidence_total := jsonb_array_length(p_evidence);
  if evidence_total < 2 or evidence_total > 500
     or jsonb_array_length(p_valuation->'evidenceIds') <> evidence_total then
    raise exception 'Incomplete valuation evidence' using errcode = '22023';
  end if;
  if (select count(distinct e->>'id') from jsonb_array_elements(p_evidence) e) <> evidence_total
     or (select count(distinct id) from jsonb_array_elements_text(p_valuation->'evidenceIds') id) <> evidence_total
     or exists (
       select 1 from jsonb_array_elements_text(p_valuation->'evidenceIds') expected(id)
       where not exists (select 1 from jsonb_array_elements(p_evidence) e where e->>'id' = expected.id)
     ) then
    raise exception 'Invalid evidence lineage' using errcode = '22023';
  end if;
  if jsonb_typeof(p_valuation->'lowValue') is distinct from 'number'
     or jsonb_typeof(p_valuation->'midpointValue') is distinct from 'number'
     or jsonb_typeof(p_valuation->'highValue') is distinct from 'number'
     or coalesce(p_valuation->>'currency', '') !~ '^[A-Z]{3}$'
     or coalesce(p_valuation->>'confidence', '') not in ('HIGH', 'MEDIUM', 'LOW')
     or nullif(btrim(p_valuation->>'methodologyVersion'), '') is null then
    raise exception 'Invalid valuation result' using errcode = '22023';
  end if;
  if (p_valuation->>'lowValue')::numeric <= 0
     or (p_valuation->>'lowValue')::numeric > (p_valuation->>'midpointValue')::numeric
     or (p_valuation->>'midpointValue')::numeric > (p_valuation->>'highValue')::numeric then
    raise exception 'Invalid valuation range' using errcode = '22023';
  end if;

  -- Recheck ownership inside the same transaction, not only in the HTTP route.
  perform 1 from public.investment_positions p
    where p.id = p_position_id and p.user_id = p_user_id
      and p.asset_type = 'REAL_ESTATE' and p.migration_state = 'VERIFIED'
    for share;
  if not found then
    raise exception 'Owned verified property required' using errcode = '42501';
  end if;

  select count(*) filter (where e->>'authority' in ('GOVERNMENT', 'REGULATOR', 'EXCHANGE', 'OFFICIAL_STATISTICS')),
         max(nullif(e->>'observedOn', '')::date)::timestamptz,
         coalesce(jsonb_agg(e->>'limitations') filter (where nullif(btrim(e->>'limitations'), '') is not null), '[]'::jsonb)
    into official_total, freshest_observed_at, preserved_limitations
    from jsonb_array_elements(p_evidence) e;

  insert into public.investment_valuation_snapshots (
    id, user_id, position_id, valuation_kind, currency,
    low_value, midpoint_value, high_value, confidence_level,
    confidence_reasons, evidence_count, official_evidence_count,
    freshest_evidence_at, methodology_version, limitations, subject_asset
  ) values (
    snapshot_id_value, p_user_id, p_position_id, 'EVIDENCE_RANGE', p_valuation->>'currency',
    (p_valuation->>'lowValue')::numeric, (p_valuation->>'midpointValue')::numeric, (p_valuation->>'highValue')::numeric,
    p_valuation->>'confidence', coalesce(p_valuation->'reasons', '[]'::jsonb), evidence_total, official_total,
    freshest_observed_at, p_valuation->>'methodologyVersion', preserved_limitations, p_subject_asset
  );

  for item in select value from jsonb_array_elements(p_evidence) loop
    if nullif(btrim(item->>'sourceName'), '') is null then
      raise exception 'Evidence source is required' using errcode = '22023';
    end if;
    insert into public.investment_valuation_evidence (
      user_id, position_id, evidence_type, source_name, source_url,
      source_authority, source_record_identifier, observed_on, retrieved_at,
      asset_match_quality, geography_match_quality, value_amount,
      value_currency, unit_value, unit_code, raw_evidence, limitations
    ) values (
      p_user_id, p_position_id, item->>'type', item->>'sourceName', item->>'sourceUrl',
      item->>'authority', item->>'id', nullif(item->>'observedOn', '')::date, (item->>'retrievedAt')::timestamptz,
      item->>'assetMatch', item->>'geographyMatch', (item->>'amount')::numeric,
      item->>'currency', (item->>'unitValue')::numeric, item->>'unitCode', item, item->>'limitations'
    ) returning id into evidence_id_value;
    insert into public.investment_snapshot_evidence (snapshot_id, evidence_id, user_id, inclusion_reason)
      values (snapshot_id_value, evidence_id_value, p_user_id, 'Server-authored evidence used by the valuation engine.');
  end loop;
  return jsonb_build_object('snapshotId', snapshot_id_value, 'evidenceCount', evidence_total);
end;
$$;

revoke all on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) to service_role;
comment on function public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb) is 'Server-only atomic write of an owned verified property valuation and exact evidence lineage. Browser payloads are not evidence authority.';

$snapshot$;
  END IF;

  -- Preserve the published access contract even under permissive default grants.
  EXECUTE $access$
-- Explicit exposure: do not depend on a project's default table grants.
-- Owner RLS remains in force; a browser may read, never author, valuations.

revoke all privileges on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
from public, anon, authenticated;

grant select on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
to authenticated;

grant select, insert on table
  public.investment_valuation_evidence,
  public.investment_valuation_snapshots,
  public.investment_snapshot_evidence
to service_role;

revoke all privileges on function
  public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb)
from public, anon, authenticated;
grant execute on function
  public.persist_investment_valuation_snapshot(uuid, uuid, jsonb, jsonb, jsonb)
to service_role;

$access$;

  IF to_regclass('public.sfm_market_observations') IS NULL THEN
    EXECUTE $observations$
-- THE SFM canonical raw market observation store.
-- Stores only observed market facts plus source lineage. Derived indicators and
-- recommendations intentionally live outside this table.

create table if not exists public.sfm_market_observations (
  id uuid primary key default gen_random_uuid(),
  observation_key text not null,
  schema_version text not null,
  engine_version text not null,
  symbol text not null,
  asset_type text not null,
  market text,
  exchange text,
  country text,
  currency text,
  price numeric not null,
  change numeric,
  change_percent numeric,
  open numeric,
  high numeric,
  low numeric,
  previous_close numeric,
  volume numeric,
  quality_state text not null,
  quality_score integer not null,
  completeness_percent integer not null,
  source_class text not null,
  upstream_provider text not null,
  upstream_provider_name text,
  provider_symbol text,
  observed_at timestamptz not null,
  received_at timestamptz not null,
  delay_type text,
  cached boolean not null default false,
  cache_age_seconds integer,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sfm_market_observations_key_unique unique (observation_key),
  constraint sfm_market_observations_price_positive check (price > 0),
  constraint sfm_market_observations_quality_state_check
    check (quality_state in ('complete', 'usable', 'partial', 'stale')),
  constraint sfm_market_observations_quality_score_check
    check (quality_score between 0 and 100),
  constraint sfm_market_observations_completeness_check
    check (completeness_percent between 0 and 100),
  constraint sfm_market_observations_source_class_check
    check (source_class in ('primary_exchange', 'regulator', 'issuer', 'licensed_feed', 'aggregator', 'derived')),
  constraint sfm_market_observations_volume_nonnegative
    check (volume is null or volume >= 0)
);

create index if not exists sfm_market_observations_symbol_observed_idx
  on public.sfm_market_observations (symbol, observed_at desc);

create index if not exists sfm_market_observations_provider_observed_idx
  on public.sfm_market_observations (upstream_provider, observed_at desc);

create index if not exists sfm_market_observations_market_symbol_idx
  on public.sfm_market_observations (market, symbol, observed_at desc);

alter table public.sfm_market_observations enable row level security;

drop policy if exists "Service role manages SFM market observations" on public.sfm_market_observations;
create policy "Service role manages SFM market observations"
  on public.sfm_market_observations
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.sfm_market_observations from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert on table public.sfm_market_observations to service_role;

comment on table public.sfm_market_observations is
  'Immutable provider observations accepted by THE SFM. No synthetic prices or derived recommendations.';
comment on column public.sfm_market_observations.observation_key is
  'Deterministic SHA-256 identity used to deduplicate the same upstream observation.';
$observations$;
  END IF;
  REVOKE ALL ON public.sfm_market_observations FROM PUBLIC, anon, authenticated;

  FOREACH target_name IN ARRAY ARRAY['public.investment_valuation_evidence', 'public.investment_valuation_snapshots', 'public.investment_snapshot_evidence', 'public.sfm_market_observations'] LOOP
    target := to_regclass(target_name);
    IF target IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = target) THEN
      RAISE EXCEPTION 'Recovered table must exist with RLS: %', target_name;
    END IF;
    IF has_table_privilege('anon',target,'SELECT')
       OR has_table_privilege('authenticated',target,'INSERT')
       OR has_table_privilege('authenticated',target,'UPDATE')
       OR has_table_privilege('authenticated',target,'DELETE')
       OR has_table_privilege('authenticated',target,'TRUNCATE')
       OR NOT has_table_privilege('service_role',target,'SELECT')
       OR NOT has_table_privilege('service_role',target,'INSERT') THEN
      RAISE EXCEPTION 'Recovered table privileges do not match the service-write contract: %', target_name;
    END IF;
    IF target_name <> 'public.sfm_market_observations' AND NOT has_table_privilege('authenticated',target,'SELECT') THEN
      RAISE EXCEPTION 'Owner read privilege missing: %', target_name;
    END IF;
  END LOOP;
  IF has_table_privilege('authenticated','public.sfm_market_observations','SELECT')
     OR has_function_privilege('anon','public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE')
     OR has_function_privilege('authenticated','public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE')
     OR (SELECT prosecdef FROM pg_proc WHERE oid='public.persist_investment_valuation_snapshot(uuid,uuid,jsonb,jsonb,jsonb)'::regprocedure) THEN
    RAISE EXCEPTION 'Recovered API must remain service-only and SECURITY INVOKER';
  END IF;
END;
$recovery$;

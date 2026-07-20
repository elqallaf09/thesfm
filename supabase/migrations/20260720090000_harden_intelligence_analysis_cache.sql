-- Additive cache-key hardening for immutable intelligence analyses.
-- Rollback: deploy the prior application build first; these nullable columns and
-- indexes can then be removed in a separate, reviewed migration if required.
begin;

alter table public.intelligence_analyses
  add column if not exists cache_scope_key text,
  add column if not exists cache_key text;

-- Backfill legacy immutable rows without changing the snapshot itself. The new
-- application treats these legacy keys as read-only compatibility records.
update public.intelligence_analyses
set cache_scope_key = concat_ws(':',
  'v1', scope,
  case when scope = 'private' then coalesce(user_id::text, 'MISSING_OWNER') else 'PUBLIC' end,
  upper(canonical_symbol), upper(asset_type), coalesce(upper(market), 'GLOBAL'), upper(horizon)
)
where cache_scope_key is null;

update public.intelligence_analyses
set cache_key = concat_ws(':',
  cache_scope_key,
  coalesce(nullif(result_snapshot #>> '{providerProvenance,selectedProvider}', ''), 'UNAVAILABLE'),
  engine_version, rules_version, weighting_version, generated_at::text
)
where cache_key is null;

alter table public.intelligence_analyses
  alter column cache_scope_key set not null,
  alter column cache_key set not null;

create index if not exists intelligence_analyses_cache_scope_latest_idx
  on public.intelligence_analyses (cache_scope_key, generated_at desc);

create unique index if not exists intelligence_analyses_cache_key_unique_idx
  on public.intelligence_analyses (cache_key);

comment on column public.intelligence_analyses.cache_scope_key is
  'Owner/shared scope, normalized asset, type, market, and horizon lookup key. Private rows include their owner UUID.';
comment on column public.intelligence_analyses.cache_key is
  'Immutable cache record key including provider, engine/rule/weight versions, and generation timestamp.';

commit;

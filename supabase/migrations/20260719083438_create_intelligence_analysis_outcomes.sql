-- Phase 6.2A: immutable, reproducible intelligence outcome history.
--
-- Operational rollback notes:
-- 1. Roll back the application and scheduled evaluator before changing this table.
-- 2. Export outcome records if audit history must be retained.
-- 3. Drop public.intelligence_analysis_outcomes and its trigger/function only after
--    confirming no deployment still reads it. No prior migration is modified.
-- This migration is forward-only and must be validated on an isolated Preview project.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.intelligence_analysis_outcomes (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.intelligence_analyses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('shared', 'private')),
  canonical_symbol text not null check (char_length(canonical_symbol) between 1 and 32),
  provider_symbol text not null check (char_length(provider_symbol) between 1 and 64),
  display_symbol text not null check (char_length(display_symbol) between 1 and 64),
  asset_type text not null check (asset_type in ('STOCK', 'CRYPTO', 'FOREX', 'INDEX', 'COMMODITY', 'FUND')),
  exchange text check (exchange is null or char_length(exchange) between 1 and 80),
  market text check (market is null or char_length(market) between 1 and 80),
  quote_currency text check (quote_currency is null or quote_currency ~ '^[A-Z0-9]{3,8}$'),
  horizon text not null check (horizon in ('INTRADAY', 'SHORT_TERM', 'SWING', 'POSITION', 'LONG_TERM')),
  original_recommendation text not null check (original_recommendation in ('BUY', 'SELL', 'WAIT', 'INSUFFICIENT_DATA')),
  original_confidence smallint not null check (original_confidence between 0 and 100),
  original_confidence_quality text not null check (original_confidence_quality in (
    'STRONG_EVIDENCE', 'MODERATE_EVIDENCE', 'LIMITED_EVIDENCE', 'INSUFFICIENT_EVIDENCE'
  )),
  original_engine_version text not null check (char_length(original_engine_version) between 1 and 80),
  original_rules_version text not null check (char_length(original_rules_version) between 1 and 80),
  original_weighting_version text not null check (char_length(original_weighting_version) between 1 and 80),
  confidence_bucket text not null check (confidence_bucket in ('0_39', '40_59', '60_79', '80_100')),
  evaluation_status text not null check (evaluation_status in ('pending', 'evaluated', 'insufficient_data', 'invalidated', 'failed')),
  evaluation_window_start timestamptz not null,
  evaluation_window_end timestamptz not null,
  evaluation_reference_at timestamptz not null,
  entry_reference_price numeric,
  entry_reference_at timestamptz,
  entry_currency text check (entry_currency is null or entry_currency ~ '^[A-Z0-9]{3,8}$'),
  final_reference_price numeric,
  final_reference_at timestamptz,
  final_currency text check (final_currency is null or final_currency ~ '^[A-Z0-9]{3,8}$'),
  maximum_favorable_excursion numeric,
  maximum_adverse_excursion numeric,
  directional_return numeric,
  benchmark_return numeric,
  outcome_classification text not null check (outcome_classification in ('CORRECT', 'INCORRECT', 'NEUTRAL', 'NOT_APPLICABLE')),
  evaluation_data_source text check (evaluation_data_source is null or char_length(evaluation_data_source) between 1 and 120),
  price_data_as_of timestamptz,
  price_data_received_at timestamptz,
  provider_provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_provenance) = 'object'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  methodology_version text not null check (char_length(methodology_version) between 1 and 80),
  methodology_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(methodology_snapshot) = 'object'),
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint intelligence_analysis_outcomes_scope_owner_check check (
    (scope = 'shared' and user_id is null)
    or (scope = 'private' and user_id is not null)
  ),
  constraint intelligence_analysis_outcomes_window_check check (evaluation_window_end >= evaluation_window_start),
  constraint intelligence_analysis_outcomes_entry_price_check check (entry_reference_price is null or entry_reference_price > 0),
  constraint intelligence_analysis_outcomes_final_price_check check (final_reference_price is null or final_reference_price > 0),
  constraint intelligence_analysis_outcomes_mfe_check check (maximum_favorable_excursion is null or maximum_favorable_excursion >= 0),
  constraint intelligence_analysis_outcomes_mae_check check (maximum_adverse_excursion is null or maximum_adverse_excursion <= 0),
  constraint intelligence_analysis_outcomes_terminal_timestamp_check check (
    (evaluation_status = 'pending' and evaluated_at is null)
    or (evaluation_status <> 'pending' and evaluated_at is not null)
  )
);

create index intelligence_analysis_outcomes_timeline_idx
  on public.intelligence_analysis_outcomes (canonical_symbol, asset_type, horizon, evaluation_window_end desc);

create index intelligence_analysis_outcomes_pending_idx
  on public.intelligence_analysis_outcomes (evaluation_window_end asc, created_at asc)
  where evaluation_status = 'pending';

create index intelligence_analysis_outcomes_private_timeline_idx
  on public.intelligence_analysis_outcomes (user_id, canonical_symbol, asset_type, horizon, created_at desc)
  where scope = 'private';

comment on table public.intelligence_analysis_outcomes is
  'Phase 6.2A immutable evaluation records. Terminal rows never change; only a pending record may transition once to a terminal state.';
comment on column public.intelligence_analysis_outcomes.directional_return is
  'Signed return in recommendation direction. It is null for WAIT and INSUFFICIENT_DATA recommendations.';
comment on column public.intelligence_analysis_outcomes.benchmark_return is
  'Null until a verified benchmark and same-currency methodology are implemented.';
comment on column public.intelligence_analysis_outcomes.methodology_snapshot is
  'Versioned evaluation configuration snapshot. No raw provider payloads, credentials, or personal data are permitted.';

create function public.validate_intelligence_analysis_outcome_parent()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  parent_analysis public.intelligence_analyses%rowtype;
begin
  select *
  into parent_analysis
  from public.intelligence_analyses
  where id = new.analysis_id;

  if not found then
    raise exception 'intelligence outcome parent analysis is required';
  end if;

  if new.user_id is distinct from parent_analysis.user_id
    or new.scope is distinct from parent_analysis.scope
    or new.canonical_symbol is distinct from parent_analysis.canonical_symbol
    or new.provider_symbol is distinct from parent_analysis.provider_symbol
    or new.display_symbol is distinct from parent_analysis.display_symbol
    or new.asset_type is distinct from parent_analysis.asset_type
    or new.exchange is distinct from parent_analysis.exchange
    or new.market is distinct from parent_analysis.market
    or new.quote_currency is distinct from parent_analysis.quote_currency
    or new.horizon is distinct from parent_analysis.horizon
    or new.original_recommendation is distinct from parent_analysis.recommendation
    or new.original_confidence is distinct from parent_analysis.confidence
    or new.original_confidence_quality is distinct from parent_analysis.confidence_quality
    or new.original_engine_version is distinct from parent_analysis.engine_version
    or new.original_rules_version is distinct from parent_analysis.rules_version
    or new.original_weighting_version is distinct from parent_analysis.weighting_version then
    raise exception 'intelligence outcome must match immutable parent analysis provenance';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_intelligence_analysis_outcome_parent() from public, anon, authenticated;

create trigger intelligence_analysis_outcomes_parent_consistency
  before insert on public.intelligence_analysis_outcomes
  for each row execute function public.validate_intelligence_analysis_outcome_parent();

create function public.enforce_intelligence_analysis_outcome_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    -- Preserve parent cleanup semantics only for cascading referential deletes.
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    raise exception 'intelligence analysis outcomes are immutable';
  end if;

  if old.evaluation_status <> 'pending' then
    raise exception 'evaluated intelligence analysis outcomes are immutable';
  end if;

  if new.evaluation_status not in ('evaluated', 'insufficient_data', 'invalidated', 'failed') then
    raise exception 'only pending intelligence analysis outcomes may transition to a terminal status';
  end if;

  if new.evaluated_at is null then
    raise exception 'terminal intelligence analysis outcomes require evaluated_at';
  end if;

  if new.analysis_id is distinct from old.analysis_id
    or new.user_id is distinct from old.user_id
    or new.scope is distinct from old.scope
    or new.canonical_symbol is distinct from old.canonical_symbol
    or new.provider_symbol is distinct from old.provider_symbol
    or new.display_symbol is distinct from old.display_symbol
    or new.asset_type is distinct from old.asset_type
    or new.exchange is distinct from old.exchange
    or new.market is distinct from old.market
    or new.quote_currency is distinct from old.quote_currency
    or new.horizon is distinct from old.horizon
    or new.original_recommendation is distinct from old.original_recommendation
    or new.original_confidence is distinct from old.original_confidence
    or new.original_confidence_quality is distinct from old.original_confidence_quality
    or new.original_engine_version is distinct from old.original_engine_version
    or new.original_rules_version is distinct from old.original_rules_version
    or new.original_weighting_version is distinct from old.original_weighting_version
    or new.confidence_bucket is distinct from old.confidence_bucket
    or new.evaluation_window_start is distinct from old.evaluation_window_start
    or new.evaluation_window_end is distinct from old.evaluation_window_end
    or new.evaluation_reference_at is distinct from old.evaluation_reference_at
    or new.methodology_version is distinct from old.methodology_version
    or new.methodology_snapshot is distinct from old.methodology_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception 'intelligence analysis outcome provenance is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_intelligence_analysis_outcome_immutability() from public, anon, authenticated;

create trigger intelligence_analysis_outcomes_immutable
  before update or delete on public.intelligence_analysis_outcomes
  for each row execute function public.enforce_intelligence_analysis_outcome_immutability();

alter table public.intelligence_analysis_outcomes enable row level security;
alter table public.intelligence_analysis_outcomes force row level security;

revoke all on table public.intelligence_analysis_outcomes from public, anon, authenticated;
grant select on table public.intelligence_analysis_outcomes to authenticated;
grant select, insert, update, delete on table public.intelligence_analysis_outcomes to service_role;

create policy "Authenticated users can read allowed intelligence analysis outcomes"
  on public.intelligence_analysis_outcomes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.intelligence_analyses analysis
      where analysis.id = intelligence_analysis_outcomes.analysis_id
        and (
          analysis.scope = 'shared'
          or (analysis.scope = 'private' and analysis.user_id = (select auth.uid()))
        )
    )
  );

commit;

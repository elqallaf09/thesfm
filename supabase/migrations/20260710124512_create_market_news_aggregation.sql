begin;

-- The migration only adds new market-news storage and nullable linkage columns.
-- A rollback can safely drop the market_news_* tables in reverse dependency order
-- and remove the nullable market-news columns from news_translations.

create table if not exists public.market_news_sources (
  source_id text primary key,
  source_name text not null,
  source_type text not null check (char_length(source_type) between 1 and 64),
  source_domain text,
  publisher_network text,
  reliability_score numeric(5,4) not null default 0.5 check (reliability_score between 0 and 1),
  priority smallint not null default 4 check (priority between 1 and 5),
  official_source boolean not null default false,
  supported_markets text[] not null default '{}',
  enabled boolean not null default true,
  terms_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_news_source_health (
  source_id text primary key references public.market_news_sources(source_id) on delete cascade,
  health_status text not null default 'unknown'
    check (health_status in ('healthy', 'degraded', 'unhealthy', 'rate_limited', 'disabled', 'unknown')),
  last_successful_fetch timestamptz,
  last_failed_fetch timestamptz,
  last_latency_ms integer check (last_latency_ms is null or last_latency_ms >= 0),
  average_latency_ms integer check (average_latency_ms is null or average_latency_ms >= 0),
  success_count bigint not null default 0 check (success_count >= 0),
  failure_count bigint not null default 0 check (failure_count >= 0),
  consecutive_failure_count integer not null default 0 check (consecutive_failure_count >= 0),
  rate_limit_state text,
  rate_limit_remaining integer check (rate_limit_remaining is null or rate_limit_remaining >= 0),
  rate_limit_resets_at timestamptz,
  disabled_until timestamptz,
  latest_error_code text,
  latest_error_summary text,
  updated_at timestamptz not null default now()
);

create table if not exists public.market_news_source_health_history (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.market_news_sources(source_id) on delete cascade,
  health_status text not null
    check (health_status in ('healthy', 'degraded', 'unhealthy', 'rate_limited', 'disabled', 'unknown')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  successful boolean not null,
  http_status integer check (http_status is null or http_status between 100 and 599),
  rate_limit_state text,
  error_code text,
  error_summary text,
  checked_at timestamptz not null default now()
);

create table if not exists public.market_news_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  run_id text,
  source_id text not null references public.market_news_sources(source_id) on delete restrict,
  fetch_kind text not null default 'background'
    check (fetch_kind in ('background', 'on_demand', 'health_check', 'manual')),
  status text not null check (status in ('started', 'completed', 'partial', 'failed', 'rate_limited', 'skipped')),
  request_market_codes text[] not null default '{}',
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  articles_fetched integer not null default 0 check (articles_fetched >= 0),
  articles_rejected integer not null default 0 check (articles_rejected >= 0),
  articles_deduplicated integer not null default 0 check (articles_deduplicated >= 0),
  articles_saved integer not null default 0 check (articles_saved >= 0),
  response_status integer check (response_status is null or response_status between 100 and 599),
  rate_limit_state text,
  error_code text,
  error_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.market_news_story_clusters (
  id text primary key,
  primary_source_id text not null references public.market_news_sources(source_id) on delete restrict,
  primary_article_id text,
  best_title text not null,
  normalized_title text not null,
  summary text,
  original_language text not null default 'en',
  earliest_published_at timestamptz not null,
  latest_updated_at timestamptz not null,
  verification_status text not null default 'single_source'
    check (verification_status in ('official', 'confirmed', 'single_source', 'conflicting', 'unverified')),
  corroborating_source_count integer not null default 0 check (corroborating_source_count >= 0),
  supporting_source_count integer not null default 0 check (supporting_source_count >= 0),
  has_conflicts boolean not null default false,
  conflict_summary text,
  event_type text not null default 'unknown',
  market_codes text[] not null default '{}',
  exchange_codes text[] not null default '{}',
  countries text[] not null default '{}',
  sectors text[] not null default '{}',
  industries text[] not null default '{}',
  symbols text[] not null default '{}',
  company_names text[] not null default '{}',
  asset_types text[] not null default '{}',
  currencies text[] not null default '{}',
  source_ids text[] not null default '{}',
  source_types text[] not null default '{}',
  source_names text[] not null default '{}',
  is_official boolean not null default false,
  relevance_score numeric(5,2) not null default 0 check (relevance_score between 0 and 100),
  importance_score numeric(5,2) not null default 0 check (importance_score between 0 and 100),
  verification_confidence numeric(5,4) not null default 0 check (verification_confidence between 0 and 1),
  entity_match_confidence numeric(5,4) not null default 0 check (entity_match_confidence between 0 and 1),
  sentiment text not null default 'unknown'
    check (sentiment in ('positive', 'negative', 'neutral', 'mixed', 'unknown')),
  expected_impact text not null default 'unknown'
    check (expected_impact in ('high', 'medium', 'low', 'unknown')),
  impact_horizon text not null default 'unknown'
    check (impact_horizon in ('immediate', 'short_term', 'medium_term', 'long_term', 'unknown')),
  impact_reason text,
  why_it_matters text,
  story_payload jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  processing_version text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(best_title, '') || ' ' || coalesce(normalized_title, '') || ' ' ||
      coalesce(summary, '') || ' ' || coalesce(why_it_matters, '')
    )
  ) stored
);

create table if not exists public.market_news_articles (
  id text primary key,
  provider_item_id text,
  canonical_url text,
  original_url text not null check (original_url ~* '^https?://'),
  title text not null,
  normalized_title text not null,
  summary text,
  original_language text not null,
  source_id text not null references public.market_news_sources(source_id) on delete restrict,
  source_name text not null,
  source_type text not null,
  source_domain text,
  source_reliability numeric(5,4) not null check (source_reliability between 0 and 1),
  is_official boolean not null default false,
  published_at timestamptz not null,
  provider_updated_at timestamptz,
  fetched_at timestamptz not null,
  market_codes text[] not null default '{}',
  exchange_codes text[] not null default '{}',
  countries text[] not null default '{}',
  sectors text[] not null default '{}',
  industries text[] not null default '{}',
  symbols text[] not null default '{}',
  company_names text[] not null default '{}',
  asset_types text[] not null default '{}',
  currencies text[] not null default '{}',
  event_type text not null default 'unknown',
  relevance_score numeric(5,2) not null default 0 check (relevance_score between 0 and 100),
  importance_score numeric(5,2) not null default 0 check (importance_score between 0 and 100),
  confidence_score numeric(5,4) not null default 0 check (confidence_score between 0 and 1),
  entity_match_confidence numeric(5,4) not null default 0 check (entity_match_confidence between 0 and 1),
  sentiment text not null default 'unknown'
    check (sentiment in ('positive', 'negative', 'neutral', 'mixed', 'unknown')),
  expected_impact text not null default 'unknown'
    check (expected_impact in ('high', 'medium', 'low', 'unknown')),
  impact_horizon text not null default 'unknown'
    check (impact_horizon in ('immediate', 'short_term', 'medium_term', 'long_term', 'unknown')),
  verification_status text not null default 'single_source'
    check (verification_status in ('official', 'confirmed', 'single_source', 'conflicting', 'unverified')),
  corroborating_source_count integer not null default 0 check (corroborating_source_count >= 0),
  duplicate_group_id text references public.market_news_story_clusters(id) on delete set null,
  content_hash text,
  event_fingerprint text,
  ingestion_run_id text,
  processing_status text not null default 'completed'
    check (processing_status in ('pending', 'processing', 'completed', 'rejected', 'failed')),
  processing_version text not null default '1',
  is_published boolean not null default true,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' || coalesce(normalized_title, '') || ' ' || coalesce(summary, '')
    )
  ) stored
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'market_news_story_clusters_primary_article_fkey'
  ) then
    alter table public.market_news_story_clusters
      add constraint market_news_story_clusters_primary_article_fkey
      foreign key (primary_article_id) references public.market_news_articles(id) on delete set null;
  end if;
end
$$;

create table if not exists public.market_news_article_symbols (
  article_id text not null references public.market_news_articles(id) on delete cascade,
  symbol text not null,
  exchange_code text not null default '',
  market_symbol_id uuid references public.market_symbols(id) on delete set null,
  company_name text,
  match_confidence numeric(5,4) not null default 0 check (match_confidence between 0 and 1),
  match_method text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (article_id, symbol, exchange_code)
);

create table if not exists public.market_news_article_markets (
  article_id text not null references public.market_news_articles(id) on delete cascade,
  market_code text not null,
  exchange_code text not null default '',
  country_code text,
  match_confidence numeric(5,4) not null default 0 check (match_confidence between 0 and 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (article_id, market_code, exchange_code)
);

create table if not exists public.market_news_article_sectors (
  article_id text not null references public.market_news_articles(id) on delete cascade,
  sector text not null,
  industry text not null default '',
  match_confidence numeric(5,4) not null default 0 check (match_confidence between 0 and 1),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (article_id, sector, industry)
);

create table if not exists public.market_news_story_sources (
  cluster_id text not null references public.market_news_story_clusters(id) on delete cascade,
  article_id text not null references public.market_news_articles(id) on delete cascade,
  source_id text not null references public.market_news_sources(source_id) on delete restrict,
  source_role text not null default 'supporting'
    check (source_role in ('primary', 'supporting', 'conflicting')),
  independent_confirmation boolean not null default false,
  publisher_network text,
  source_rank smallint check (source_rank is null or source_rank between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (cluster_id, article_id)
);

create table if not exists public.market_news_conflicts (
  id uuid primary key default gen_random_uuid(),
  conflict_key text not null unique,
  cluster_id text not null references public.market_news_story_clusters(id) on delete cascade,
  conflict_type text not null,
  description text not null,
  differing_claims jsonb not null default '[]'::jsonb,
  official_source_id text references public.market_news_sources(source_id) on delete set null,
  resolution_status text not null default 'open'
    check (resolution_status in ('open', 'resolved', 'dismissed')),
  resolved_by_article_id text references public.market_news_articles(id) on delete set null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_news_processing_results (
  id uuid primary key default gen_random_uuid(),
  article_id text not null references public.market_news_articles(id) on delete cascade,
  processing_version text not null,
  status text not null check (status in ('pending', 'completed', 'rejected', 'failed')),
  classification_result jsonb not null default '{}'::jsonb,
  entity_resolution_result jsonb not null default '{}'::jsonb,
  scoring_result jsonb not null default '{}'::jsonb,
  conflict_result jsonb not null default '{}'::jsonb,
  input_hash text,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, processing_version)
);

create table if not exists public.market_news_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cluster_id text not null references public.market_news_story_clusters(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cluster_id)
);

alter table public.news_translations
  add column if not exists article_id text,
  add column if not exists source_language text,
  add column if not exists input_hash text,
  add column if not exists processing_version text not null default '1',
  add column if not exists confidence_score numeric(5,4),
  add column if not exists translation_provider text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'news_translations_market_news_article_fkey'
  ) then
    alter table public.news_translations
      add constraint news_translations_market_news_article_fkey
      foreign key (article_id) references public.market_news_articles(id) on delete cascade;
  end if;
end
$$;

create index if not exists market_news_sources_enabled_priority_idx
  on public.market_news_sources (enabled, priority, reliability_score desc);
create index if not exists market_news_source_health_status_idx
  on public.market_news_source_health (health_status, updated_at desc);
create index if not exists market_news_source_health_history_source_idx
  on public.market_news_source_health_history (source_id, checked_at desc);
create index if not exists market_news_fetch_logs_source_started_idx
  on public.market_news_fetch_logs (source_id, started_at desc);
create index if not exists market_news_fetch_logs_run_idx
  on public.market_news_fetch_logs (run_id) where run_id is not null;

create index if not exists market_news_articles_published_idx
  on public.market_news_articles (published_at desc) where is_published = true and rejected_at is null;
create index if not exists market_news_articles_source_idx
  on public.market_news_articles (source_id, published_at desc);
create index if not exists market_news_articles_verification_idx
  on public.market_news_articles (verification_status, published_at desc);
create index if not exists market_news_articles_importance_idx
  on public.market_news_articles (importance_score desc, published_at desc);
create index if not exists market_news_articles_event_idx
  on public.market_news_articles (event_type, published_at desc);
create index if not exists market_news_articles_group_idx
  on public.market_news_articles (duplicate_group_id, published_at desc);
create index if not exists market_news_articles_normalized_title_idx
  on public.market_news_articles (normalized_title);
create index if not exists market_news_articles_canonical_url_idx
  on public.market_news_articles (canonical_url) where canonical_url is not null;
create index if not exists market_news_articles_content_hash_idx
  on public.market_news_articles (content_hash) where content_hash is not null;
create index if not exists market_news_articles_event_fingerprint_idx
  on public.market_news_articles (event_fingerprint) where event_fingerprint is not null;
create index if not exists market_news_articles_market_codes_idx
  on public.market_news_articles using gin (market_codes);
create index if not exists market_news_articles_exchange_codes_idx
  on public.market_news_articles using gin (exchange_codes);
create index if not exists market_news_articles_symbols_idx
  on public.market_news_articles using gin (symbols);
create index if not exists market_news_articles_search_idx
  on public.market_news_articles using gin (search_vector);

create index if not exists market_news_clusters_published_idx
  on public.market_news_story_clusters (earliest_published_at desc) where is_published = true;
create index if not exists market_news_clusters_verification_idx
  on public.market_news_story_clusters (verification_status, earliest_published_at desc);
create index if not exists market_news_clusters_importance_idx
  on public.market_news_story_clusters (importance_score desc, earliest_published_at desc);
create index if not exists market_news_clusters_relevance_idx
  on public.market_news_story_clusters (relevance_score desc, earliest_published_at desc);
create index if not exists market_news_clusters_official_idx
  on public.market_news_story_clusters (is_official desc, earliest_published_at desc);
create index if not exists market_news_clusters_event_idx
  on public.market_news_story_clusters (event_type, earliest_published_at desc);
create index if not exists market_news_clusters_market_codes_idx
  on public.market_news_story_clusters using gin (market_codes);
create index if not exists market_news_clusters_exchange_codes_idx
  on public.market_news_story_clusters using gin (exchange_codes);
create index if not exists market_news_clusters_symbols_idx
  on public.market_news_story_clusters using gin (symbols);
create index if not exists market_news_clusters_company_names_idx
  on public.market_news_story_clusters using gin (company_names);
create index if not exists market_news_clusters_sectors_idx
  on public.market_news_story_clusters using gin (sectors);
create index if not exists market_news_clusters_countries_idx
  on public.market_news_story_clusters using gin (countries);
create index if not exists market_news_clusters_industries_idx
  on public.market_news_story_clusters using gin (industries);
create index if not exists market_news_clusters_asset_types_idx
  on public.market_news_story_clusters using gin (asset_types);
create index if not exists market_news_clusters_currencies_idx
  on public.market_news_story_clusters using gin (currencies);
create index if not exists market_news_clusters_source_types_idx
  on public.market_news_story_clusters using gin (source_types);
create index if not exists market_news_clusters_source_ids_idx
  on public.market_news_story_clusters using gin (source_ids);
create index if not exists market_news_clusters_source_names_idx
  on public.market_news_story_clusters using gin (source_names);
create index if not exists market_news_clusters_language_idx
  on public.market_news_story_clusters (original_language, earliest_published_at desc);
create index if not exists market_news_clusters_impact_idx
  on public.market_news_story_clusters (expected_impact, earliest_published_at desc);
create index if not exists market_news_clusters_sentiment_idx
  on public.market_news_story_clusters (sentiment, earliest_published_at desc);
create index if not exists market_news_clusters_search_idx
  on public.market_news_story_clusters using gin (search_vector);

create index if not exists market_news_article_symbols_symbol_idx
  on public.market_news_article_symbols (symbol, exchange_code, match_confidence desc);
create index if not exists market_news_article_symbols_market_symbol_idx
  on public.market_news_article_symbols (market_symbol_id) where market_symbol_id is not null;
create index if not exists market_news_article_markets_market_idx
  on public.market_news_article_markets (market_code, article_id);
create index if not exists market_news_article_markets_exchange_idx
  on public.market_news_article_markets (exchange_code, article_id);
create index if not exists market_news_article_sectors_sector_idx
  on public.market_news_article_sectors (sector, industry, article_id);
create index if not exists market_news_story_sources_source_idx
  on public.market_news_story_sources (source_id, cluster_id);
create index if not exists market_news_conflicts_cluster_idx
  on public.market_news_conflicts (cluster_id, resolution_status, detected_at desc);
create index if not exists market_news_processing_article_idx
  on public.market_news_processing_results (article_id, processed_at desc);
create index if not exists market_news_bookmarks_user_idx
  on public.market_news_bookmarks (user_id, created_at desc);
create index if not exists news_translations_market_news_article_idx
  on public.news_translations (article_id, language, updated_at desc) where article_id is not null;
create unique index if not exists news_translations_market_news_cache_key
  on public.news_translations (article_id, language, input_hash)
  where article_id is not null and input_hash is not null;

drop trigger if exists market_news_sources_set_updated_at on public.market_news_sources;
create trigger market_news_sources_set_updated_at before update on public.market_news_sources
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_source_health_set_updated_at on public.market_news_source_health;
create trigger market_news_source_health_set_updated_at before update on public.market_news_source_health
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_clusters_set_updated_at on public.market_news_story_clusters;
create trigger market_news_clusters_set_updated_at before update on public.market_news_story_clusters
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_articles_set_updated_at on public.market_news_articles;
create trigger market_news_articles_set_updated_at before update on public.market_news_articles
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_conflicts_set_updated_at on public.market_news_conflicts;
create trigger market_news_conflicts_set_updated_at before update on public.market_news_conflicts
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_processing_set_updated_at on public.market_news_processing_results;
create trigger market_news_processing_set_updated_at before update on public.market_news_processing_results
  for each row execute function public.set_updated_at();
drop trigger if exists market_news_bookmarks_set_updated_at on public.market_news_bookmarks;
create trigger market_news_bookmarks_set_updated_at before update on public.market_news_bookmarks
  for each row execute function public.set_updated_at();

alter table public.market_news_sources enable row level security;
alter table public.market_news_source_health enable row level security;
alter table public.market_news_source_health_history enable row level security;
alter table public.market_news_fetch_logs enable row level security;
alter table public.market_news_story_clusters enable row level security;
alter table public.market_news_articles enable row level security;
alter table public.market_news_article_symbols enable row level security;
alter table public.market_news_article_markets enable row level security;
alter table public.market_news_article_sectors enable row level security;
alter table public.market_news_story_sources enable row level security;
alter table public.market_news_conflicts enable row level security;
alter table public.market_news_processing_results enable row level security;
alter table public.market_news_bookmarks enable row level security;
alter table public.news_translations enable row level security;

drop policy if exists "Public can read enabled market news sources" on public.market_news_sources;
drop policy if exists "Public can read published market news articles" on public.market_news_articles;
drop policy if exists "Public can read published market news clusters" on public.market_news_story_clusters;

drop policy if exists "Users can read own market news bookmarks" on public.market_news_bookmarks;
create policy "Users can read own market news bookmarks"
  on public.market_news_bookmarks for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own market news bookmarks" on public.market_news_bookmarks;
create policy "Users can create own market news bookmarks"
  on public.market_news_bookmarks for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own market news bookmarks" on public.market_news_bookmarks;
create policy "Users can update own market news bookmarks"
  on public.market_news_bookmarks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own market news bookmarks" on public.market_news_bookmarks;
create policy "Users can delete own market news bookmarks"
  on public.market_news_bookmarks for delete to authenticated
  using ((select auth.uid()) = user_id);

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'market_news_sources',
    'market_news_source_health',
    'market_news_source_health_history',
    'market_news_fetch_logs',
    'market_news_story_clusters',
    'market_news_articles',
    'market_news_article_symbols',
    'market_news_article_markets',
    'market_news_article_sectors',
    'market_news_story_sources',
    'market_news_conflicts',
    'market_news_processing_results',
    'market_news_bookmarks'
  ] loop
    execute format('drop policy if exists "Service role manages market news" on public.%I', relation_name);
    execute format(
      'create policy "Service role manages market news" on public.%I for all to service_role using (true) with check (true)',
      relation_name
    );
  end loop;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

revoke all privileges on table public.market_news_sources from public, anon, authenticated;
revoke all privileges on table public.market_news_source_health from public, anon, authenticated;
revoke all privileges on table public.market_news_source_health_history from public, anon, authenticated;
revoke all privileges on table public.market_news_fetch_logs from public, anon, authenticated;
revoke all privileges on table public.market_news_story_clusters from public, anon, authenticated;
revoke all privileges on table public.market_news_articles from public, anon, authenticated;
revoke all privileges on table public.market_news_article_symbols from public, anon, authenticated;
revoke all privileges on table public.market_news_article_markets from public, anon, authenticated;
revoke all privileges on table public.market_news_article_sectors from public, anon, authenticated;
revoke all privileges on table public.market_news_story_sources from public, anon, authenticated;
revoke all privileges on table public.market_news_conflicts from public, anon, authenticated;
revoke all privileges on table public.market_news_processing_results from public, anon, authenticated;
revoke all privileges on table public.market_news_bookmarks from public, anon, authenticated;
revoke all privileges on table public.news_translations from public, anon, authenticated;

grant select, insert, update, delete on table public.market_news_bookmarks to authenticated;

grant select, insert, update, delete on table public.market_news_sources to service_role;
grant select, insert, update, delete on table public.market_news_source_health to service_role;
grant select, insert, update, delete on table public.market_news_source_health_history to service_role;
grant select, insert, update, delete on table public.market_news_fetch_logs to service_role;
grant select, insert, update, delete on table public.market_news_story_clusters to service_role;
grant select, insert, update, delete on table public.market_news_articles to service_role;
grant select, insert, update, delete on table public.market_news_article_symbols to service_role;
grant select, insert, update, delete on table public.market_news_article_markets to service_role;
grant select, insert, update, delete on table public.market_news_article_sectors to service_role;
grant select, insert, update, delete on table public.market_news_story_sources to service_role;
grant select, insert, update, delete on table public.market_news_conflicts to service_role;
grant select, insert, update, delete on table public.market_news_processing_results to service_role;
grant select, insert, update, delete on table public.market_news_bookmarks to service_role;
grant select, insert, update, delete on table public.news_translations to service_role;

comment on table public.market_news_sources is
  'Provider-independent source registry. Direct client access is denied; server APIs expose an allow-listed view.';
comment on table public.market_news_source_health is
  'Current provider health and circuit-breaker state. Operational and service-role only.';
comment on table public.market_news_fetch_logs is
  'Sanitized provider ingestion telemetry. Credentials and raw provider responses are never stored.';
comment on table public.market_news_articles is
  'Normalized article metadata and concise summaries only; full copyrighted article bodies are not stored.';
comment on table public.market_news_story_clusters is
  'Consolidated financial-news stories with evidence, verification, and impact dimensions kept separate.';
comment on table public.market_news_bookmarks is
  'Private user-owned bookmarks protected by row-level ownership policies.';

notify pgrst, 'reload schema';

commit;

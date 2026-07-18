-- Phase 5.0B: privacy-safe, service-role-only operational telemetry.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table if not exists public.observability_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('web_vital','route_transition','hydration','long_task','memory','client_error','api_metric','provider_metric','session_stability')),
  metric_name text not null check (char_length(metric_name) between 1 and 80),
  metric_value double precision not null check (metric_value >= 0 and metric_value <= 9007199254740991),
  rating text check (rating is null or rating in ('good','needs-improvement','poor','unknown')),
  route_template text not null check (route_template like '/%' and char_length(route_template) <= 240),
  session_id text not null check (char_length(session_id) between 8 and 80),
  authenticated boolean not null default false,
  locale text not null check (locale in ('ar','en','fr','unknown')),
  theme text not null check (theme in ('light','dark','system','unknown')),
  viewport_class text not null check (viewport_class in ('small','medium','large','unknown')),
  device_class text not null check (device_class in ('mobile','tablet','desktop','unknown')),
  browser_family text not null check (browser_family in ('Chrome','Safari','Firefox','Edge','Other','Unknown')),
  network_class text not null check (network_class in ('slow-2g','2g','3g','4g','offline','unknown')),
  deployment_sha text not null check (char_length(deployment_sha) between 1 and 80),
  build_version text not null check (char_length(build_version) between 1 and 80),
  environment text not null check (environment in ('production','preview','development')),
  occurred_at timestamptz not null,
  status_class text check (status_class is null or status_class in ('2xx','3xx','4xx','5xx','unknown')),
  method text check (method is null or method in ('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS')),
  cache_status text check (cache_status is null or cache_status in ('hit','miss','stale','unknown')),
  provider text check (provider is null or char_length(provider) <= 80),
  endpoint_class text check (endpoint_class is null or char_length(endpoint_class) <= 80),
  asset_class text check (asset_class is null or asset_class in ('stock','crypto','forex','commodity','index','fund','unknown')),
  fallback_used boolean,
  failure_class text check (failure_class is null or char_length(failure_class) <= 80),
  retry_count integer check (retry_count is null or retry_count between 0 and 20),
  event_count integer check (event_count is null or event_count between 0 and 10000),
  total_duration double precision check (total_duration is null or total_duration between -9007199254740991 and 9007199254740991),
  longest_duration double precision check (longest_duration is null or longest_duration between 0 and 86400000),
  support_state text check (support_state is null or support_state in ('supported','unsupported','denied','failed')),
  navigation_kind text check (navigation_kind is null or navigation_kind in ('normal','auth_redirect','guest_redirect','cancelled','prefetch_cancelled','offline','hard_reload','failed','redirect')),
  cached boolean,
  is_proxy boolean,
  error_signature text check (error_signature is null or error_signature ~ '^err_[0-9a-f]{8}$'),
  correlation_id text check (correlation_id is null or char_length(correlation_id) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists observability_events_time_idx on public.observability_events (occurred_at desc);
create index if not exists observability_events_route_time_idx on public.observability_events (route_template, occurred_at desc);
create index if not exists observability_events_metric_time_idx on public.observability_events (event_type, metric_name, occurred_at desc);
create index if not exists observability_events_deployment_time_idx on public.observability_events (deployment_sha, environment, occurred_at desc);
create index if not exists observability_events_provider_time_idx on public.observability_events (provider, occurred_at desc) where provider is not null;
create index if not exists observability_events_error_time_idx on public.observability_events (error_signature, occurred_at desc) where error_signature is not null;

create table if not exists public.observability_rollups (
  id bigint generated always as identity primary key,
  bucket_start timestamptz not null,
  period text not null check (period in ('hour','day')),
  event_type text not null,
  metric_name text not null,
  route_template text not null default '*',
  provider text not null default '*',
  browser_family text not null default '*',
  deployment_sha text not null,
  environment text not null check (environment in ('production','preview','development')),
  sample_count integer not null check (sample_count >= 0),
  p50 double precision,
  p75 double precision,
  p90 double precision,
  p95 double precision,
  p99 double precision,
  good_count integer not null default 0,
  needs_improvement_count integer not null default 0,
  poor_count integer not null default 0,
  failure_count integer not null default 0,
  fallback_count integer not null default 0,
  cache_hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (bucket_start, period, event_type, metric_name, route_template, provider, browser_family, deployment_sha, environment)
);

create index if not exists observability_rollups_time_idx on public.observability_rollups (bucket_start desc, period);
create index if not exists observability_rollups_metric_idx on public.observability_rollups (event_type, metric_name, environment, bucket_start desc);

create table if not exists public.observability_alerts (
  id bigint generated always as identity primary key,
  alert_key text not null check (char_length(alert_key) between 1 and 120),
  severity text not null check (severity in ('warning','critical')),
  metric_name text not null,
  route_template text not null default '*',
  provider text not null default '*',
  deployment_sha text not null,
  environment text not null check (environment in ('production','preview','development')),
  observed_value double precision not null,
  threshold_value double precision not null,
  sample_count integer not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  cooldown_until timestamptz not null,
  resolved_at timestamptz,
  unique (alert_key, route_template, provider, deployment_sha, environment)
);

create index if not exists observability_alerts_active_idx on public.observability_alerts (last_seen_at desc) where resolved_at is null;

create table if not exists public.observability_error_fingerprints (
  id bigint generated always as identity primary key,
  error_signature text not null check (error_signature ~ '^err_[0-9a-f]{8}$'),
  metric_name text not null,
  route_template text not null,
  browser_family text not null,
  deployment_sha text not null,
  environment text not null check (environment in ('production','preview','development')),
  frequency bigint not null default 1,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique (error_signature, metric_name, route_template, browser_family, deployment_sha, environment)
);

create index if not exists observability_error_fingerprints_last_seen_idx on public.observability_error_fingerprints (last_seen_at desc);

alter table public.observability_events enable row level security;
alter table public.observability_rollups enable row level security;
alter table public.observability_alerts enable row level security;
alter table public.observability_error_fingerprints enable row level security;

revoke all on table public.observability_events from public, anon, authenticated;
revoke all on table public.observability_rollups from public, anon, authenticated;
revoke all on table public.observability_alerts from public, anon, authenticated;
revoke all on table public.observability_error_fingerprints from public, anon, authenticated;
grant select, insert, delete on table public.observability_events to service_role;
grant select, insert, update, delete on table public.observability_rollups to service_role;
grant select, insert, update, delete on table public.observability_alerts to service_role;
grant select, insert, update, delete on table public.observability_error_fingerprints to service_role;
grant usage, select on sequence public.observability_events_id_seq to service_role;
grant usage, select on sequence public.observability_rollups_id_seq to service_role;
grant usage, select on sequence public.observability_alerts_id_seq to service_role;
grant usage, select on sequence public.observability_error_fingerprints_id_seq to service_role;

create or replace function public.aggregate_observability_error_fingerprint()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.event_type = 'client_error' and new.error_signature is not null then
    insert into public.observability_error_fingerprints (
      error_signature, metric_name, route_template, browser_family, deployment_sha, environment,
      frequency, first_seen_at, last_seen_at
    ) values (
      new.error_signature, new.metric_name, new.route_template, new.browser_family, new.deployment_sha,
      new.environment, 1, new.occurred_at, new.occurred_at
    )
    on conflict (error_signature, metric_name, route_template, browser_family, deployment_sha, environment)
    do update set
      frequency = public.observability_error_fingerprints.frequency + 1,
      first_seen_at = least(public.observability_error_fingerprints.first_seen_at, excluded.first_seen_at),
      last_seen_at = greatest(public.observability_error_fingerprints.last_seen_at, excluded.last_seen_at);
  end if;
  return new;
end;
$$;

drop trigger if exists observability_error_fingerprint_trigger on public.observability_events;
create trigger observability_error_fingerprint_trigger
after insert on public.observability_events
for each row execute function public.aggregate_observability_error_fingerprint();

create or replace function public.rollup_observability_events(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
begin
  insert into public.observability_rollups (
    bucket_start, period, event_type, metric_name, route_template, provider, browser_family,
    deployment_sha, environment, sample_count, p50, p75, p90, p95, p99,
    good_count, needs_improvement_count, poor_count, failure_count, fallback_count, cache_hit_count
  )
  select
    date_trunc('hour', occurred_at), 'hour', event_type, metric_name, route_template,
    coalesce(provider, '*'), browser_family, deployment_sha, environment, count(*)::integer,
    percentile_cont(0.50) within group (order by metric_value),
    percentile_cont(0.75) within group (order by metric_value),
    percentile_cont(0.90) within group (order by metric_value),
    percentile_cont(0.95) within group (order by metric_value),
    percentile_cont(0.99) within group (order by metric_value),
    count(*) filter (where rating = 'good')::integer,
    count(*) filter (where rating = 'needs-improvement')::integer,
    count(*) filter (where rating = 'poor')::integer,
    count(*) filter (where failure_class is not null or status_class = '5xx')::integer,
    count(*) filter (where fallback_used is true)::integer,
    count(*) filter (where cache_status = 'hit')::integer
  from public.observability_events
  where occurred_at >= p_now - interval '48 hours' and occurred_at < date_trunc('hour', p_now)
  group by 1, event_type, metric_name, route_template, coalesce(provider, '*'), browser_family, deployment_sha, environment
  on conflict (bucket_start, period, event_type, metric_name, route_template, provider, browser_family, deployment_sha, environment)
  do update set
    sample_count = excluded.sample_count, p50 = excluded.p50, p75 = excluded.p75,
    p90 = excluded.p90, p95 = excluded.p95, p99 = excluded.p99,
    good_count = excluded.good_count, needs_improvement_count = excluded.needs_improvement_count,
    poor_count = excluded.poor_count, failure_count = excluded.failure_count,
    fallback_count = excluded.fallback_count, cache_hit_count = excluded.cache_hit_count,
    created_at = now();
  get diagnostics affected = row_count;

  insert into public.observability_rollups (
    bucket_start, period, event_type, metric_name, route_template, provider, browser_family,
    deployment_sha, environment, sample_count, p50, p75, p90, p95, p99,
    good_count, needs_improvement_count, poor_count, failure_count, fallback_count, cache_hit_count
  )
  select
    date_trunc('day', occurred_at), 'day', event_type, metric_name, route_template, coalesce(provider, '*'), browser_family,
    deployment_sha, environment, count(*)::integer,
    percentile_cont(0.50) within group (order by metric_value),
    percentile_cont(0.75) within group (order by metric_value),
    percentile_cont(0.90) within group (order by metric_value),
    percentile_cont(0.95) within group (order by metric_value),
    percentile_cont(0.99) within group (order by metric_value),
    count(*) filter (where rating = 'good')::integer,
    count(*) filter (where rating = 'needs-improvement')::integer,
    count(*) filter (where rating = 'poor')::integer,
    count(*) filter (where failure_class is not null or status_class = '5xx')::integer,
    count(*) filter (where fallback_used is true)::integer,
    count(*) filter (where cache_status = 'hit')::integer
  from public.observability_events
  where occurred_at >= p_now - interval '8 days' and occurred_at < date_trunc('day', p_now)
  group by 1, event_type, metric_name, route_template, coalesce(provider, '*'), browser_family, deployment_sha, environment
  on conflict (bucket_start, period, event_type, metric_name, route_template, provider, browser_family, deployment_sha, environment)
  do update set
    sample_count = excluded.sample_count, p50 = excluded.p50, p75 = excluded.p75,
    p90 = excluded.p90, p95 = excluded.p95, p99 = excluded.p99, good_count = excluded.good_count,
    needs_improvement_count = excluded.needs_improvement_count, poor_count = excluded.poor_count,
    failure_count = excluded.failure_count, fallback_count = excluded.fallback_count,
    cache_hit_count = excluded.cache_hit_count, created_at = now();

  return affected;
end;
$$;

create or replace function public.cleanup_observability_data(
  p_raw_days integer default 14,
  p_rollup_days integer default 180,
  p_alert_days integer default 90
)
returns table(raw_deleted bigint, rollups_deleted bigint, alerts_deleted bigint, error_fingerprints_deleted bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  raw_count bigint;
  rollup_count bigint;
  alert_count bigint;
  error_count bigint;
begin
  if p_raw_days not between 7 and 30 or p_rollup_days not between 30 and 365 or p_alert_days not between 30 and 180 then
    raise exception 'retention outside approved bounds';
  end if;
  delete from public.observability_events where occurred_at < now() - make_interval(days => p_raw_days);
  get diagnostics raw_count = row_count;
  delete from public.observability_rollups where bucket_start < now() - make_interval(days => p_rollup_days);
  get diagnostics rollup_count = row_count;
  delete from public.observability_alerts where last_seen_at < now() - make_interval(days => p_alert_days);
  get diagnostics alert_count = row_count;
  delete from public.observability_error_fingerprints where last_seen_at < now() - make_interval(days => p_alert_days);
  get diagnostics error_count = row_count;
  return query select raw_count, rollup_count, alert_count, error_count;
end;
$$;

revoke all on function public.rollup_observability_events(timestamptz) from public, anon, authenticated;
revoke all on function public.cleanup_observability_data(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.rollup_observability_events(timestamptz) to service_role;
grant execute on function public.cleanup_observability_data(integer, integer, integer) to service_role;
revoke all on function public.aggregate_observability_error_fingerprint() from public, anon, authenticated;

commit;

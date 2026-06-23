-- Daily AI usage limits per account.
-- Apply this migration before enabling paid OpenAI / AI Gateway usage in production.

create table if not exists public.ai_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'all',
  daily_limit integer not null default 20 check (daily_limit >= 0),
  is_enabled boolean not null default true,
  is_blocked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_usage_limits_feature_check check (
    feature in (
      'all',
      'receipt_scan',
      'market_ai_insight',
      'market_agent_explanation',
      'project_ai_advisor',
      'project_expense_analysis',
      'project_pitch_deck',
      'project_pitch_deck_export',
      'projects_chat',
      'daily_tip'
    )
  ),
  constraint ai_usage_limits_user_feature_unique unique (user_id, feature)
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  units integer not null default 1 check (units > 0),
  usage_date date not null default ((now() at time zone 'Asia/Kuwait')::date),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_feature_check check (
    feature in (
      'receipt_scan',
      'market_ai_insight',
      'market_agent_explanation',
      'project_ai_advisor',
      'project_expense_analysis',
      'project_pitch_deck',
      'project_pitch_deck_export',
      'projects_chat',
      'daily_tip'
    )
  )
);

create index if not exists ai_usage_limits_user_id_idx
  on public.ai_usage_limits (user_id);

create index if not exists ai_usage_events_user_date_idx
  on public.ai_usage_events (user_id, usage_date);

create index if not exists ai_usage_events_user_feature_date_idx
  on public.ai_usage_events (user_id, feature, usage_date);

create or replace function public.set_ai_usage_limits_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_usage_limits_updated_at on public.ai_usage_limits;
create trigger set_ai_usage_limits_updated_at
before update on public.ai_usage_limits
for each row
execute function public.set_ai_usage_limits_updated_at();

alter table public.ai_usage_limits enable row level security;
alter table public.ai_usage_events enable row level security;

drop policy if exists "Users can view their own AI limits" on public.ai_usage_limits;
create policy "Users can view their own AI limits"
on public.ai_usage_limits
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own AI usage events" on public.ai_usage_events;
create policy "Users can view their own AI usage events"
on public.ai_usage_events
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.ai_usage_limits from anon, authenticated;
revoke all on public.ai_usage_events from anon, authenticated;
grant select on public.ai_usage_limits to authenticated;
grant select on public.ai_usage_events to authenticated;

comment on table public.ai_usage_limits is 'Per-user daily AI usage limits. Server-side admin routes manage writes.';
comment on table public.ai_usage_events is 'Server-recorded AI usage events used to enforce daily account limits.';

-- Example admin SQL for a specific registered user:
-- insert into public.ai_usage_limits (user_id, feature, daily_limit, notes)
-- select id, 'all', 20, 'Launch beta daily AI allowance'
-- from auth.users
-- where lower(email) = lower('elqalla4747@gmail.com')
-- on conflict (user_id, feature)
-- do update set daily_limit = excluded.daily_limit, notes = excluded.notes, updated_at = now();

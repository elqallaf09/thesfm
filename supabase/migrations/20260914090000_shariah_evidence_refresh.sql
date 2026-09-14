-- Additive, service-role-only refresh bookkeeping. Existing manual opinions are never rewritten.
alter table public.sharia_screening_results add column if not exists persistence_status text not null default 'legacy';
alter table public.sharia_financial_values add column if not exists validation_metadata jsonb;
alter table public.market_symbols
  add column if not exists shariah_last_attempted_at timestamptz,
  add column if not exists shariah_next_refresh_at timestamptz,
  add column if not exists shariah_refresh_run_id uuid,
  add column if not exists shariah_lease_until timestamptz,
  add column if not exists shariah_refresh_error text;

create table if not exists public.shariah_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','partial','failed')),
  result jsonb not null default '{}'::jsonb
);
alter table public.shariah_refresh_runs enable row level security;
revoke all on public.shariah_refresh_runs from public, anon, authenticated;
grant select, insert, update on public.shariah_refresh_runs to service_role;
create index if not exists market_symbols_shariah_due_idx on public.market_symbols(shariah_next_refresh_at,shariah_last_attempted_at)
where is_active and asset_type='stock' and not shariah_manual_override;

create or replace function public.claim_shariah_refresh_batch(p_run_id uuid, p_limit integer default 3, p_force boolean default false, p_symbol_id uuid default null)
returns setof public.market_symbols
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.shariah_refresh_runs where id=p_run_id and status='running') then
    raise exception 'INVALID_REFRESH_RUN';
  end if;
  return query
  with candidates as (
    select m.id from public.market_symbols m
    where m.is_active and m.asset_type='stock' and not m.shariah_manual_override
      and (p_symbol_id is null or m.id=p_symbol_id)
      and (m.shariah_refresh_run_id is distinct from p_run_id)
      and (m.shariah_lease_until is null or m.shariah_lease_until < clock_timestamp())
      and (p_force or m.shariah_next_refresh_at is null or m.shariah_next_refresh_at <= clock_timestamp())
      -- Fund metadata must be corrected, never screened with corporate equity rules.
      and coalesce(m.name,'') !~* '\mETF\M|exchange.traded fund'
    order by m.shariah_last_attempted_at asc nulls first, m.id
    limit greatest(1,least(coalesce(p_limit,3),10)) for update skip locked
  )
  update public.market_symbols m set shariah_refresh_run_id=p_run_id,
    shariah_last_attempted_at=clock_timestamp(), shariah_lease_until=clock_timestamp()+interval '90 seconds'
  from candidates c where m.id=c.id returning m.*;
end;
$$;

create or replace function public.finish_shariah_refresh(p_run_id uuid, p_symbol_id uuid, p_expected_updated_at timestamptz, p_patch jsonb default null, p_error text default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if p_error is null and (p_patch is null or p_patch #>> '{shariah_screening_data,evidenceVersion}' is distinct from 'sfm-evidence-v2'
    or coalesce(p_patch->>'shariah_status','') not in ('compliant','non_compliant','needs_review')) then
    raise exception 'INVALID_SCREENING_PATCH';
  end if;
  update public.market_symbols m set
    shariah_status=case when p_error is null then p_patch->>'shariah_status' else m.shariah_status end,
    shariah_reason=case when p_error is null then p_patch->>'shariah_reason' else m.shariah_reason end,
    shariah_source=case when p_error is null then p_patch->>'shariah_source' else m.shariah_source end,
    shariah_last_reviewed_at=case when p_error is null then (p_patch->>'shariah_last_reviewed_at')::timestamptz else m.shariah_last_reviewed_at end,
    shariah_reviewed_by=case when p_error is null then p_patch->>'shariah_reviewed_by' else m.shariah_reviewed_by end,
    shariah_screening_data=case when p_error is null then p_patch->'shariah_screening_data' else m.shariah_screening_data end,
    shariah_refresh_error=left(p_error,250), shariah_lease_until=null,
    shariah_next_refresh_at=clock_timestamp()+case when p_error is null then interval '24 hours' else interval '1 hour' end,
    updated_at=clock_timestamp()
  where m.id=p_symbol_id and m.shariah_refresh_run_id=p_run_id and not m.shariah_manual_override
    and m.updated_at=p_expected_updated_at and m.shariah_lease_until>clock_timestamp();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.claim_shariah_refresh_batch(uuid,integer,boolean,uuid) from public,anon,authenticated;
revoke all on function public.finish_shariah_refresh(uuid,uuid,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.claim_shariah_refresh_batch(uuid,integer,boolean,uuid) to service_role;
grant execute on function public.finish_shariah_refresh(uuid,uuid,timestamptz,jsonb,text) to service_role;

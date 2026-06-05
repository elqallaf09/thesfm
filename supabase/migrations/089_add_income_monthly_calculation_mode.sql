alter table public.monthly_income_sources
  add column if not exists calculation_mode text default 'full_month',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists is_active boolean default true;

update public.monthly_income_sources
set
  calculation_mode = coalesce(nullif(btrim(calculation_mode), ''), 'full_month'),
  start_date = coalesce(start_date, recurrence_start_date, received_date, created_at::date, current_date),
  end_date = coalesce(end_date, recurrence_end_date),
  is_active = coalesce(is_active, true)
where calculation_mode is null
   or btrim(calculation_mode) = ''
   or start_date is null
   or is_active is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_income_sources_calculation_mode_check'
      and conrelid = 'public.monthly_income_sources'::regclass
  ) then
    alter table public.monthly_income_sources
      add constraint monthly_income_sources_calculation_mode_check
      check (calculation_mode in ('full_month', 'prorated_current_month'));
  end if;
end $$;

create index if not exists monthly_income_sources_user_active_idx
  on public.monthly_income_sources (user_id, is_active);

create index if not exists monthly_income_sources_start_end_idx
  on public.monthly_income_sources (start_date, end_date);

notify pgrst, 'reload schema';

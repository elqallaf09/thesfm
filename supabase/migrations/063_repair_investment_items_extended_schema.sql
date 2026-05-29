alter table public.investment_items
  add column if not exists type text default 'investment',
  add column if not exists current_value numeric default 0,
  add column if not exists monthly_contribution numeric default 0,
  add column if not exists start_date date,
  add column if not exists risk_level text default 'medium',
  add column if not exists expected_annual_return numeric default 0,
  add column if not exists notes text;

update public.investment_items
set
  type = coalesce(nullif(btrim(type), ''), 'investment'),
  current_value = coalesce(current_value, amount, 0),
  monthly_contribution = coalesce(monthly_contribution, 0),
  risk_level = coalesce(nullif(btrim(risk_level), ''), 'medium'),
  expected_annual_return = coalesce(expected_annual_return, 0);

alter table public.investment_items
  alter column type set default 'investment',
  alter column current_value set default 0,
  alter column monthly_contribution set default 0,
  alter column risk_level set default 'medium',
  alter column expected_annual_return set default 0;

notify pgrst, 'reload schema';

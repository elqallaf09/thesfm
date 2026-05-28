alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists essential_expenses numeric default 0,
  add column if not exists first_goal_name text,
  add column if not exists first_goal_amount numeric default 0,
  add column if not exists first_goal_deadline date;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;

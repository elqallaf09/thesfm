alter table public.profiles
  add column if not exists onboarding_completed boolean default false,
  add column if not exists default_currency text default 'KWD',
  add column if not exists financial_focus text,
  add column if not exists monthly_income_target numeric default 0;

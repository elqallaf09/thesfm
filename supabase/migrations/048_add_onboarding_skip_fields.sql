alter table public.profiles
  add column if not exists onboarding_skipped boolean default false,
  add column if not exists onboarding_skipped_at timestamptz;

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists age integer,
  add column if not exists phone_country_code text,
  add column if not exists phone_number text,
  add column if not exists profession text,
  add column if not exists gender text,
  add column if not exists country text,
  add column if not exists default_currency text default 'KWD',
  add column if not exists preferred_currency text,
  add column if not exists currency text,
  add column if not exists preferred_lang text,
  add column if not exists language text,
  add column if not exists preferred_theme text,
  add column if not exists theme text,
  add column if not exists charity_enabled boolean default false,
  add column if not exists dashboard_prefs jsonb default '{}'::jsonb,
  add column if not exists notification_prefs jsonb default '{}'::jsonb,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists financial_focus text,
  add column if not exists monthly_income_target numeric,
  add column if not exists city text,
  add column if not exists profession_other text,
  add column if not exists email_2fa_enabled boolean default false,
  add column if not exists security_question_2 text,
  add column if not exists security_answer_2 text,
  add column if not exists security_question_3 text,
  add column if not exists security_answer_3 text,
  add column if not exists view_mode text default 'simple',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.profiles
set
  view_mode = coalesce(view_mode, 'simple'),
  default_currency = coalesce(default_currency, preferred_currency, 'KWD'),
  preferred_currency = coalesce(preferred_currency, default_currency, 'KWD'),
  currency = coalesce(currency, preferred_currency, default_currency, 'KWD'),
  preferred_lang = coalesce(preferred_lang, language, 'ar'),
  language = coalesce(language, preferred_lang, 'ar'),
  preferred_theme = coalesce(preferred_theme, theme, 'light'),
  theme = coalesce(theme, preferred_theme, 'light'),
  onboarding_completed = coalesce(onboarding_completed, false),
  charity_enabled = coalesce(charity_enabled, false),
  email_2fa_enabled = coalesce(email_2fa_enabled, false),
  updated_at = coalesce(updated_at, now())
where view_mode is null
   or default_currency is null
   or preferred_currency is null
   or currency is null
   or preferred_lang is null
   or language is null
   or preferred_theme is null
   or theme is null
   or onboarding_completed is null
   or charity_enabled is null
   or email_2fa_enabled is null
   or updated_at is null;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant select, insert, update on public.profiles to authenticated;

notify pgrst, 'reload schema';

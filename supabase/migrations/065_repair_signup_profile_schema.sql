alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists country text,
  add column if not exists default_currency text default 'KWD',
  add column if not exists preferred_currency text,
  add column if not exists preferred_lang text,
  add column if not exists security_question text,
  add column if not exists security_answer_hash text,
  add column if not exists view_mode text default 'simple',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.profiles
set
  view_mode = coalesce(view_mode, 'simple'),
  default_currency = coalesce(default_currency, preferred_currency, 'KWD'),
  preferred_currency = coalesce(preferred_currency, default_currency, 'KWD'),
  updated_at = coalesce(updated_at, now())
where view_mode is null
   or default_currency is null
   or preferred_currency is null
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

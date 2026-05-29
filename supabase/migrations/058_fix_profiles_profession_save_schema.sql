alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists email text,
  add column if not exists age integer,
  add column if not exists phone_country_code text,
  add column if not exists phone_number text,
  add column if not exists profession text,
  add column if not exists gender text,
  add column if not exists preferred_lang text,
  add column if not exists preferred_currency text,
  add column if not exists preferred_theme text,
  add column if not exists default_currency text,
  add column if not exists city text,
  add column if not exists profession_other text,
  add column if not exists updated_at timestamptz default now();

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

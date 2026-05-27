alter table public.profiles
  add column if not exists city text,
  add column if not exists profession_other text;


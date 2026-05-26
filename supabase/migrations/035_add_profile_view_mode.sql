alter table public.profiles
add column if not exists view_mode text default 'professional';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_view_mode_check'
  ) then
    alter table public.profiles
    add constraint profiles_view_mode_check
    check (view_mode in ('simple', 'professional'));
  end if;
end $$;


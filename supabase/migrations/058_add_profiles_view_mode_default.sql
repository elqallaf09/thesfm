alter table public.profiles
add column if not exists view_mode text default 'simple';

update public.profiles
set view_mode = 'simple'
where view_mode is null;

alter table public.profiles
alter column view_mode set default 'simple';

notify pgrst, 'reload schema';

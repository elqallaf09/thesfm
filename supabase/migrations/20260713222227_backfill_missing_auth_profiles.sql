-- Backfill real auth accounts that were created before the profile trigger was
-- installed (or while it was unavailable). The trigger remains responsible
-- for all new accounts; this repair only restores its intended invariant.

insert into public.profiles (id, email, created_at)
select
  auth_user.id,
  auth_user.email,
  coalesce(auth_user.created_at, now())
from auth.users as auth_user
where not exists (
  select 1
  from public.profiles as profile
  where profile.id = auth_user.id
)
on conflict (id) do nothing;

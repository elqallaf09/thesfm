-- Phase 5.0D: remediate only the release-blocking privileged-function and
-- avatar-enumeration findings. No data changes or performance remediation.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- These functions are invoked only by auth.users triggers. Keep their existing
-- behavior, resolve every referenced object explicitly, and remove direct API roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, created_at)
  values (new.id, new.email, pg_catalog.now())
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all privileges on function public.handle_new_user()
from public, anon, authenticated, service_role;

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    update public.profiles
    set
      email = pg_catalog.lower(new.email),
      updated_at = pg_catalog.now()
    where id = new.id
      and email is distinct from pg_catalog.lower(new.email);
  end if;

  return new;
end;
$$;

revoke all privileges on function public.sync_profile_email_from_auth()
from public, anon, authenticated, service_role;

-- Keep privileged admin-role lookup outside the exposed public API schema. The
-- authenticated role needs schema usage and function execution only because RLS
-- evaluates this helper as the querying role.
create schema app_private;

revoke all privileges on schema app_private
from public, anon, authenticated, service_role;
grant usage on schema app_private to authenticated, service_role;

create function app_private.is_current_user_admin_role(required_role text default 'admin')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles as role_row
    where role_row.user_id = (select auth.uid())
      and role_row.is_active = true
      and (
        (required_role = 'admin' and role_row.role in ('admin', 'super_admin'))
        or (required_role = 'super_admin' and role_row.role = 'super_admin')
      )
  );
$$;

revoke all privileges on function app_private.is_current_user_admin_role(text)
from public, anon, authenticated, service_role;
grant execute on function app_private.is_current_user_admin_role(text)
to authenticated, service_role;

alter policy "Super admins can read all admin roles"
on public.admin_roles
using (app_private.is_current_user_admin_role('super_admin'));

alter policy "Super admins can insert admin roles"
on public.admin_roles
with check (app_private.is_current_user_admin_role('super_admin'));

alter policy "Super admins can update admin roles"
on public.admin_roles
using (app_private.is_current_user_admin_role('super_admin'))
with check (app_private.is_current_user_admin_role('super_admin'));

alter policy "Super admins can delete admin roles"
on public.admin_roles
using (app_private.is_current_user_admin_role('super_admin'));

alter policy "Super admins can read admin audit logs"
on public.admin_audit_logs
using (app_private.is_current_user_admin_role('super_admin'));

revoke all privileges on function public.is_current_user_admin_role(text)
from public, anon, authenticated, service_role;

-- Public object delivery uses the bucket URL and does not require a broad SELECT
-- policy. Retain SELECT only for the owner's folder so avatar upsert still works.
drop policy "Authenticated users can read avatars" on storage.objects;

create policy "Users can read own avatar objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

notify pgrst, 'reload schema';

commit;

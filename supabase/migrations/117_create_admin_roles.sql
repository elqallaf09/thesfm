create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin',
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_roles_role_check check (role in ('admin', 'super_admin')),
  constraint admin_roles_user_id_unique unique (user_id)
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_roles_user_id_idx
  on public.admin_roles (user_id);

create index if not exists admin_roles_email_lower_idx
  on public.admin_roles (lower(email));

create index if not exists admin_roles_active_role_idx
  on public.admin_roles (is_active, role);

create index if not exists admin_audit_logs_target_created_idx
  on public.admin_audit_logs (target_user_id, created_at desc);

create index if not exists admin_audit_logs_actor_created_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);

create or replace function public.set_admin_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_roles_updated_at on public.admin_roles;
create trigger set_admin_roles_updated_at
before update on public.admin_roles
for each row
execute function public.set_admin_roles_updated_at();

create or replace function public.is_current_user_admin_role(required_role text default 'admin')
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles role_row
    where role_row.user_id = (select auth.uid())
      and role_row.is_active = true
      and (
        required_role = 'admin'
        or role_row.role = 'super_admin'
      )
      and role_row.role in ('admin', 'super_admin')
  );
$$;

revoke all on function public.is_current_user_admin_role(text) from public;
revoke all on function public.is_current_user_admin_role(text) from anon;
grant execute on function public.is_current_user_admin_role(text) to authenticated;
grant execute on function public.is_current_user_admin_role(text) to service_role;

alter table public.admin_roles enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can read own admin role" on public.admin_roles;
create policy "Admins can read own admin role"
on public.admin_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Super admins can read all admin roles" on public.admin_roles;
create policy "Super admins can read all admin roles"
on public.admin_roles
for select
to authenticated
using (public.is_current_user_admin_role('super_admin'));

drop policy if exists "Super admins can insert admin roles" on public.admin_roles;
create policy "Super admins can insert admin roles"
on public.admin_roles
for insert
to authenticated
with check (public.is_current_user_admin_role('super_admin'));

drop policy if exists "Super admins can update admin roles" on public.admin_roles;
create policy "Super admins can update admin roles"
on public.admin_roles
for update
to authenticated
using (public.is_current_user_admin_role('super_admin'))
with check (public.is_current_user_admin_role('super_admin'));

drop policy if exists "Super admins can delete admin roles" on public.admin_roles;
create policy "Super admins can delete admin roles"
on public.admin_roles
for delete
to authenticated
using (public.is_current_user_admin_role('super_admin'));

drop policy if exists "Super admins can read admin audit logs" on public.admin_audit_logs;
create policy "Super admins can read admin audit logs"
on public.admin_audit_logs
for select
to authenticated
using (public.is_current_user_admin_role('super_admin'));

revoke all on public.admin_roles from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.admin_roles to authenticated;
grant select on table public.admin_audit_logs to authenticated;
grant select, insert, update, delete on table public.admin_roles to service_role;
grant select, insert, update, delete on table public.admin_audit_logs to service_role;

comment on table public.admin_roles is 'Server-authorized admin roles and permissions for THE SFM.';
comment on table public.admin_audit_logs is 'Server-written audit log for admin role and permission changes.';

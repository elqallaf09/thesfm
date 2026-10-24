-- Additive prerequisite: deploy before code that records email MFA completion.
-- No client can write this evidence, and refresh does not extend its lifetime.
begin;
create table public.email_mfa_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint email_mfa_bounded_expiry check (expires_at <= created_at + interval '12 hours')
);
alter table public.email_mfa_sessions enable row level security;
revoke all on public.email_mfa_sessions from public, anon, authenticated;
grant select on public.email_mfa_sessions to authenticated;
grant all on public.email_mfa_sessions to service_role;
create policy own_active_email_mfa_session on public.email_mfa_sessions
for select to authenticated using (
  user_id = (select auth.uid())
  and session_id::text = (select auth.jwt()->>'session_id')
  and expires_at > now()
);
commit;

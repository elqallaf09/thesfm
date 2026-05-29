create table if not exists public.email_2fa_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  purpose text not null default 'login_2fa',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table public.email_2fa_codes enable row level security;

drop policy if exists "Users can view own email 2fa code metadata" on public.email_2fa_codes;
create policy "Users can view own email 2fa code metadata"
on public.email_2fa_codes
for select
using (auth.uid() = user_id);

create index if not exists email_2fa_codes_user_purpose_idx
on public.email_2fa_codes(user_id, purpose, expires_at desc);

create index if not exists email_2fa_codes_unused_idx
on public.email_2fa_codes(user_id, purpose)
where used_at is null;

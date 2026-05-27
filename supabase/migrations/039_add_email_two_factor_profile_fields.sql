alter table public.profiles
  add column if not exists email_2fa_enabled boolean not null default false,
  add column if not exists email_2fa_enabled_at timestamptz;

comment on column public.profiles.email_2fa_enabled is
  'Whether the user enabled email-based two-factor authentication.';

comment on column public.profiles.email_2fa_enabled_at is
  'Timestamp when email-based two-factor authentication was enabled.';

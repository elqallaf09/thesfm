create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  whatsapp text,
  email text,
  address text,
  notes text,
  color_tag text,
  avatar_url text,
  profile_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(14,3) not null default 0,
  currency text not null default 'KWD',
  subscription_type text not null default 'monthly',
  custom_interval_days integer,
  start_date date not null default current_date,
  next_payment_date date not null default current_date,
  automatic_renewal boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_amount_non_negative check (amount >= 0),
  constraint subscriptions_type_check check (subscription_type in ('monthly', 'weekly', 'quarterly', 'semi_annual', 'yearly', 'custom')),
  constraint subscriptions_status_check check (status in ('active', 'paused', 'cancelled', 'expired')),
  constraint subscriptions_custom_interval_check check (
    subscription_type <> 'custom'
    or (custom_interval_days is not null and custom_interval_days > 0)
  )
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  amount_due numeric(14,3) not null default 0,
  amount_paid numeric(14,3) not null default 0,
  currency text not null default 'KWD',
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amounts_non_negative check (amount_due >= 0 and amount_paid >= 0),
  constraint payments_status_check check (status in ('pending', 'paid', 'partial', 'advance', 'missed', 'late', 'refunded', 'overdue'))
);

create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  action text not null,
  amount numeric(14,3),
  currency text not null default 'KWD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscription_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  channel text not null default 'in_app',
  reminder_type text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'scheduled',
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subscription_notifications_channel_check check (channel in ('in_app', 'email', 'telegram', 'whatsapp', 'push')),
  constraint subscription_notifications_status_check check (status in ('scheduled', 'sent', 'failed', 'skipped'))
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists clients_user_created_idx on public.clients(user_id, created_at desc);
create index if not exists clients_user_name_idx on public.clients(user_id, full_name);
create index if not exists clients_user_phone_idx on public.clients(user_id, phone);

create index if not exists subscriptions_user_status_due_idx on public.subscriptions(user_id, status, next_payment_date);
create index if not exists subscriptions_client_idx on public.subscriptions(client_id);

create index if not exists payments_user_due_status_idx on public.payments(user_id, due_date, status);
create index if not exists payments_subscription_due_idx on public.payments(subscription_id, due_date desc);
create index if not exists payments_client_due_idx on public.payments(client_id, due_date desc);

create index if not exists payment_history_user_created_idx on public.payment_history(user_id, created_at desc);
create index if not exists payment_history_payment_idx on public.payment_history(payment_id);

create unique index if not exists subscription_notifications_user_dedupe_idx
  on public.subscription_notifications(user_id, dedupe_key);
create index if not exists subscription_notifications_user_status_scheduled_idx
  on public.subscription_notifications(user_id, status, scheduled_for);

create index if not exists client_notes_client_created_idx on public.client_notes(client_id, created_at desc);
create index if not exists client_files_client_created_idx on public.client_files(client_id, created_at desc);
create index if not exists activity_logs_user_created_idx on public.activity_logs(user_id, created_at desc);
create index if not exists activity_logs_client_created_idx on public.activity_logs(client_id, created_at desc);

create or replace function public.set_subscription_manager_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_subscription_manager_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_subscription_manager_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_subscription_manager_updated_at();

drop trigger if exists set_client_notes_updated_at on public.client_notes;
create trigger set_client_notes_updated_at
before update on public.client_notes
for each row execute function public.set_subscription_manager_updated_at();

alter table public.clients enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_history enable row level security;
alter table public.subscription_notifications enable row level security;
alter table public.client_notes enable row level security;
alter table public.client_files enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "Users can select own clients" on public.clients;
create policy "Users can select own clients" on public.clients
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients" on public.clients
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients" on public.clients
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients" on public.clients
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own subscriptions" on public.subscriptions;
create policy "Users can select own subscriptions" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own subscriptions" on public.subscriptions;
create policy "Users can insert own subscriptions" on public.subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own subscriptions" on public.subscriptions;
create policy "Users can update own subscriptions" on public.subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own subscriptions" on public.subscriptions;
create policy "Users can delete own subscriptions" on public.subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own payments" on public.payments;
create policy "Users can select own payments" on public.payments
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own payments" on public.payments;
create policy "Users can insert own payments" on public.payments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own payments" on public.payments;
create policy "Users can update own payments" on public.payments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own payments" on public.payments;
create policy "Users can delete own payments" on public.payments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own payment history" on public.payment_history;
create policy "Users can select own payment history" on public.payment_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own payment history" on public.payment_history;
create policy "Users can insert own payment history" on public.payment_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can select own subscription notifications" on public.subscription_notifications;
create policy "Users can select own subscription notifications" on public.subscription_notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own subscription notifications" on public.subscription_notifications;
create policy "Users can insert own subscription notifications" on public.subscription_notifications
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own subscription notifications" on public.subscription_notifications;
create policy "Users can update own subscription notifications" on public.subscription_notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can select own client notes" on public.client_notes;
create policy "Users can select own client notes" on public.client_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own client notes" on public.client_notes;
create policy "Users can insert own client notes" on public.client_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own client notes" on public.client_notes;
create policy "Users can update own client notes" on public.client_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own client notes" on public.client_notes;
create policy "Users can delete own client notes" on public.client_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own client files" on public.client_files;
create policy "Users can select own client files" on public.client_files
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own client files" on public.client_files;
create policy "Users can insert own client files" on public.client_files
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own client files" on public.client_files;
create policy "Users can delete own client files" on public.client_files
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own activity logs" on public.activity_logs;
create policy "Users can select own activity logs" on public.activity_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own activity logs" on public.activity_logs;
create policy "Users can insert own activity logs" on public.activity_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.clients,
  public.subscriptions,
  public.payments,
  public.client_notes,
  public.client_files
to authenticated;
grant select, insert, update on table public.subscription_notifications to authenticated;
grant select, insert on table public.payment_history, public.activity_logs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'subscription-client-assets',
  'subscription-client-assets',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own subscription client assets" on storage.objects;
create policy "Users can read own subscription client assets"
on storage.objects for select
to authenticated
using (
  bucket_id = 'subscription-client-assets'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can upload own subscription client assets" on storage.objects;
create policy "Users can upload own subscription client assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'subscription-client-assets'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own subscription client assets" on storage.objects;
create policy "Users can update own subscription client assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'subscription-client-assets'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'subscription-client-assets'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own subscription client assets" on storage.objects;
create policy "Users can delete own subscription client assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'subscription-client-assets'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

notify pgrst, 'reload schema';

-- كاش دائم للتريدر: يعيش عبر جميع نسخ serverless بدل ذاكرة السيرفر المؤقتة
create table if not exists public.trader_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists trader_cache_expires_idx on public.trader_cache (expires_at);

alter table public.trader_cache enable row level security;

grant select, insert, update, delete on table public.trader_cache to service_role;

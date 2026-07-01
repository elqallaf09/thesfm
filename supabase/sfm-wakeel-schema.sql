-- sfm-wakeel-schema.sql
-- شغّله في Supabase ← SQL Editor. هذا الشكل المُفترض — عدّله لو جداولك مختلفة.

-- 1) الملف المالي: صف واحد لكل مستخدم
create table if not exists public.financial_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  currency     text    not null default 'د.إ',
  cash         numeric not null default 0,   -- نقد + حسابات
  gold         numeric not null default 0,   -- قيمة الذهب
  receivables  numeric not null default 0,   -- ديون مستحقة لك
  liabilities  numeric not null default 0,   -- التزامات عليك
  nisab        numeric not null default 24000,
  updated_at   timestamptz not null default now()
);

-- 2) الحيازات (أسهم/استثمارات) — investments = SUM(market_value)
create table if not exists public.holdings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  market_value numeric not null default 0,
  updated_at   timestamptz not null default now()
);
create index if not exists holdings_user_idx on public.holdings(user_id);

-- 3) تفعيل RLS + سياسات: كل مستخدم يصل لصفوفه فقط (حماية أساسية لبيانات مالية)
alter table public.financial_profiles enable row level security;
alter table public.holdings           enable row level security;

create policy "own financial profile"
  on public.financial_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own holdings"
  on public.holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4) (اختياري) صف تجريبي — بدّل المعرّف بـ user id حقيقي من auth.users
-- insert into public.financial_profiles (user_id, cash, gold, receivables, liabilities)
-- values ('00000000-0000-0000-0000-000000000000', 50000, 30000, 10000, 20000);

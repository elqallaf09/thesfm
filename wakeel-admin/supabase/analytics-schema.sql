-- analytics-schema.sql  → شغّله في Supabase › SQL Editor
-- عدّل أسماء الجداول لو عندك جداول مشابهة (مثلاً orders قد تكون subscriptions).

-- 1) زيارات الصفحات (للزوار + أكثر صفحة)
create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  session_id  text,
  path        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists page_views_path_idx    on public.page_views(path);
create index if not exists page_views_created_idx  on public.page_views(created_at);

-- 2) الأحداث (لأكثر ميزة استُخدمت) — سجّل category='feature' عند استخدام ميزة
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  category    text,
  created_at  timestamptz not null default now()
);
create index if not exists events_name_idx on public.events(name);

-- 3) الطلبات/المشتريات (لعدد المشترين)
create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  status      text not null default 'pending',  -- paid | completed | pending ...
  amount      numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- 4) دالة التجميع (تقرأ كل البيانات) — تُستدعى من السيرفر بمفتاح service_role فقط
create or replace function public.get_site_analytics()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'visitors_total',  (select count(distinct coalesce(session_id, user_id::text)) from page_views),
    'visitors_30d',    (select count(distinct coalesce(session_id, user_id::text)) from page_views where created_at > now() - interval '30 days'),
    'buyers_total',    (select count(distinct user_id) from orders where status in ('paid','completed')),
    'top_page',        (select path from page_views group by path order by count(*) desc limit 1),
    'top_page_views',  (select count(*)::int from page_views group by path order by count(*) desc limit 1),
    'top_feature',     (select name from events where category = 'feature' group by name order by count(*) desc limit 1),
    'top_feature_uses',(select count(*)::int from events where category = 'feature' group by name order by count(*) desc limit 1)
  );
$$;

-- 5) امنع الوصول العام للدالة (تُستدعى بـ service_role من السيرفر فقط)
revoke execute on function public.get_site_analytics() from public, anon, authenticated;

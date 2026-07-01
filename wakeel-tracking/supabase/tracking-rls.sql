-- tracking-rls.sql → شغّله في Supabase بعد analytics-schema.sql
-- يقفل جداول التتبّع: لا قراءة/كتابة مباشرة للمستخدمين.
-- الكتابة تتم عبر service_role (راوت /api/track)، والقراءة عبر دالة get_site_analytics.
-- (service_role يتجاوز RLS، فالسيرفر يشتغل عادي.)

alter table public.page_views enable row level security;
alter table public.events     enable row level security;
alter table public.orders     enable row level security;

-- بدون أي policy → المستخدم العادي/الزائر ما يقدر يقرأ أو يكتب مباشرة.
-- لو تبي المستخدم يشوف طلباته فقط، أضف:
-- create policy "own orders read" on public.orders
--   for select using (auth.uid() = user_id);

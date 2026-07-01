# إضافة وكيل — تحليلات الأدمن

تعطي وكيل القدرة (للأدمن فقط) يجاوب صوتياً على:
- كم زائر دخل الموقع؟  (visitors_total / visitors_30d)
- كم واحد اشترى من خدماتي؟  (buyers_total)
- أكثر صفحة زيارة؟  (top_page)
- أكثر ميزة استُخدمت؟  (top_feature)

محصور بحساب الأدمن المحدّد في `ADMIN_EMAILS` — أي مستخدم ثاني يسأل، وكيل يرفض بأدب.

## الملفات (الصقها فوق مشروع وكيل/THE SFM — تستبدل ملفين وتضيف الباقي)
```
lib/wakeel.ts                          (مُحدّث — يستبدل القديم)
app/api/wakeel/route.ts                (مُحدّث — يستبدل القديم)
lib/admin.ts                           (جديد)
lib/analytics.ts                       (جديد)
lib/supabase/admin.ts                  (جديد)
app/api/admin/analytics/route.ts       (جديد)
supabase/analytics-schema.sql          (شغّله في Supabase)
```

## الخطوات
1. الصق الملفات بأماكنها (تستبدل `lib/wakeel.ts` و `app/api/wakeel/route.ts`).
2. أضف سطور `.env.additions.txt` إلى `.env.local` (مفتاح service_role + إيميل الأدمن).
3. في Supabase › SQL Editor شغّل `supabase/analytics-schema.sql`.
4. أعد تشغيل `npm run dev`.

## مهم
- التحليلات تحتاج **بيانات**: لازم يسجّل موقعك زيارات في `page_views`،
  واستخدام الميزات في `events` (category='feature')، والمشتريات في `orders`.
  لو ما عندك تتبّع بعد، الأرقام = أصفار. (نقدر نضيف تتبّع تلقائي لاحقاً.)
- لو عندك جداول مشتريات باسم ثاني (مثل subscriptions)، عدّل دالة
  `get_site_analytics` لتقرأ منها.
- مفتاح `service_role` يبقى في السيرفر فقط — لا تضعه أبداً في NEXT_PUBLIC.

## تجربة سريعة بدون تسجيل دخول/بيانات
- في `lib/admin.ts`: فعّل سطر `return "elqallaf09@gmail.com";`
- في `lib/analytics.ts`: فعّل بلوك الأرقام التجريبية.
ثم اسأل وكيل: "كم زائر دخل الموقع؟" — بيجاوبك بالأرقام التجريبية.

# تتبّع وكيل — تعبئة بيانات التحليلات

يخلّي أرقام التحليلات حقيقية: يسجّل زيارات الصفحات، استخدام الميزات، والمشتريات.

## الملفات
```
app/api/track/route.ts        (جديد) نقطة استقبال الأحداث
components/Analytics.tsx      (جديد) يتتبّع زيارات الصفحات تلقائياً
lib/track.ts                  (جديد) دالة track() لتتبّع الميزات (عميل)
lib/track-server.ts           (جديد) recordPurchase() لتسجيل المشتريات (سيرفر)
app/layout.snippet.txt        كيف تركّب <Analytics/> في layout
supabase/tracking-rls.sql     قفل جداول التتبّع (شغّله في Supabase)
```

يعتمد على `lib/supabase/admin.ts` و `lib/supabase/server.ts` (موجودة من حزمة التحليلات).

## الخطوات
1. الصق الملفات بأماكنها فوق المشروع.
2. في `app/layout.tsx` أضف `<Analytics />` داخل `<body>` (شوف layout.snippet.txt)
   → من الحين كل زيارة صفحة تتسجّل تلقائياً.
3. لتتبّع الميزات: في أي زر/ميزة:
   ```tsx
   import { track } from "@/lib/track";
   <button onClick={() => track("حاسبة الزكاة")}>احسب</button>
   ```
4. للمشتريات: من Webhook الدفع (بعد نجاح الدفع) نادِ:
   ```ts
   import { recordPurchase } from "@/lib/track-server";
   await recordPurchase({ userId, amount: 99 });
   ```
   (أو لو عندك جدول مشتريات جاهز، خلّ get_site_analytics يقرأ منه بدلاً من orders)
5. في Supabase شغّل `supabase/tracking-rls.sql`.
6. أعد تشغيل `npm run dev`.

## كيف تتأكد إنه يشتغل
- تصفّح بعض صفحات موقعك ← في Supabase › Table Editor › `page_views` بتشوف صفوف جديدة.
- اضغط ميزة فيها track() ← `events` يمتلئ.
- بعدها اسأل وكيل: "كم زائر دخل الموقع؟" / "أكثر صفحة زيارة؟" ← أرقام حقيقية.

## ملاحظات
- الزائر غير المسجّل يُعدّ عبر كوكي `sfm_sid` (زائر مميّز واحد).
- لا تسجّل بيانات شخصية حسّاسة في `path` أو `name`.
- الكتابة عبر service_role في السيرفر فقط — آمنة ومحدودة بالراوت.

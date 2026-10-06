# منتجات THE SFM للجوال

THE SFM ليس تطبيقًا واحدًا يُغلّف الموقع، بل أربعة منتجات مستقلة تشترك في الحساب وواجهة الخدمات الخلفية وسياسة الصلاحيات.

| المنتج | نطاق الجوال | المنصات الأولى | نقاط الدخول |
| --- | --- | --- | --- |
| THE SFM Finance | المال الشخصي، الميزانية، الالتزامات، الزكاة والتقارير | iPhone، Android، Huawei | `/today` و`/expenses` و`/income` و`/debts` و`/savings` و`/goals` و`/zakat` و`/reports` |
| THE SFM Investor | المحفظة والأسواق والتحليل والتنبيهات | iPhone، Android، Huawei | `/ai-analyst/overview` و`/market-watchlist` و`/market-analysis` و`/invest` و`/investments` و`/alerts` |
| THE SFM Business | المشاريع والعملاء والفواتير والفرق | iPhone، Android، Huawei | `/business-hub` و`/projects` و`/customers` و`/invoices` و`/sales` و`/employees` و`/suppliers` |
| THE SFM TV | المتابعة الحية للأسواق والأخبار على الشاشات | Android/Google TV، Huawei، Apple TV، LG webOS | `/tv` |

## قواعد مشتركة

- كل منتج يمتلك اسمًا ومعرّف متجر ومسار روابط مباشرة خاصًا به؛ القيم المصدرية موجودة في `src/lib/mobile/appCatalog.ts`.
- مصادقة المستخدم تتم عبر Supabase مع RLS. مفاتيح مقدمي البيانات، مفاتيح الخدمة، وStripe secrets لا تدخل أي تطبيق جوال.
- تطبيق Huawei هو نكهة Android مستقلة بلا اعتماد على Google Mobile Services، وتستخدم HMS للإشعارات عند تنفيذها.
- لا تُخزّن شاشات الحساب أو ردود API المالية في خدمة العامل. عند عدم وجود اتصال تعرض التطبيقات شاشة آمنة فقط.
- الشراء داخل التطبيق لا يُنفذ قبل توحيد استحقاقات Apple وGoogle وHuawei مع الاستحقاقات الحالية في Stripe.

## ما تم إنشاؤه الآن

- عامل تطبيق ويب واحد قابل للتثبيت، يشارك الإشعارات ولا يخزن بيانات حساب أو ردود API مالية عند انقطاع الاتصال.
- تطبيق iOS الأول `THE SFM Finance` في `ios-native/`، مع جلسة Supabase مشفّرة في Keychain، قفل الجهاز عند الخلفية، وملخص مالي محدود من نقطة API محمية.
- تطبيق Android/Huawei الأول في `apps/sfm-finance/android/`، بواجهات Jetpack Compose عربية واتصال Supabase وجلسة مشفرة عبر Android Keystore تستعيد رمز الدخول عند الحاجة. يعيد التطبيق طلب اعتماد قفل الجهاز عند الرجوع من الخلفية؛ نكهة `huawei` مستقلة عن Google Mobile Services.
- نقطة API محمية للملخص `GET /api/mobile/finance/summary` تعيد المجاميع فقط، وتستعمل سياق مستخدم Supabase المقيد بـ RLS؛ لا ترسل بنود الحساب الفردية أو مفاتيح الخدمة إلى الهاتف.
- تطبيق Android/Huawei مستقل للمستثمر في `apps/sfm-investor/android/` بمعرّف `com.thesfm.investor`. يبدأ بدليل الأسواق العام في واجهة Compose أصلية؛ تبقى المحفظة والتنبيهات والتحليل الذكي مراحل API محمية منفصلة.
- هدف iPhone مستقل للمستثمر باسم `TheSFMInvestor` ومعرّف `com.thesfm.investor` داخل `ios-native/TheSFM.xcodeproj`، ويشمل واجهة SwiftUI عربية لدليل الأسواق ومخطط بناء `TheSFMInvestor`.
- تطبيق THE SFM Business له هدف iPhone مستقل `TheSFMBusiness` ومعرّف `com.thesfm.business`، وتطبيق Android/Huawei في `apps/sfm-business/android/` بنفس المعرف. تبدأ الواجهات الأصلية بمساحة المشاريع والعملاء والفواتير من دون بيانات تجريبية.
- هدف Apple TV أصلي باسم `TheSFMtv` ومعرّف `com.thesfm.tv` داخل مشروع Xcode، بتجربة اختيار قنوات مهيّأة للريموت. وهو يكمل حزم Android/Huawei TV وLG webOS وSamsung Tizen.
- تطبيق `apps/markets-tv/android/` يولد الآن نكهتي `play` و`huawei` كذلك. يستمر في استخدام حزم العرض المضمنة ولا يضم اعتمادًا على Google Mobile Services؛ قبول AppGallery الفعلي يبقى مرحلة حساب الناشر والتوقيع واختبار جهاز حقيقي.
- تطبيق SFM TV يشمل حزمة LG webOS في `apps/markets-tv/webos/`. ما زال يلزم تغليف IPK واختبار جهاز LG وتوقيع/مراجعة LG Seller Lounge قبل النشر.

## حزم التلفاز

- نفّذ `pnpm build:tv` لإنتاج أصول Android TV وحزم الويب الجاهزة لكل من Samsung Tizen وLG webOS داخل `.tv-build/`.
- يستخدم Android TV التطبيق الأصلي في `apps/markets-tv/android/` مع نكهتي `play` و`huawei`؛ لا يحمّل موقعًا بعيدًا أو يُضمّن رموز حسابات.
- لا تُعد مخرجات `.tv-build/` موقعة أو جاهزة للمتجر: يلزم حساب ناشر ومفاتيح توقيع واختبار عبر جهاز/محاكي لكل متجر قبل رفع IPA/APK/IPK.

## ترتيب التنفيذ

1. **Finance:** تسجيل دخول حقيقي، الصفحة الرئيسية، الدخل، المصروفات، الالتزامات، التنبيهات، والبصمة/Face ID.
2. **Investor:** قائمة المتابعة والتنبيهات والأخبار وبيانات الأسواق، مع الإفصاحات الاستثمارية.
3. **Business:** المشاريع، العملاء، الفواتير وسير العمل التشغيلي.
4. **TV:** تجربة ريموت أفقية مستقلة عن واجهة الهاتف؛ وحدة `apps/markets-tv` هي نقطة البداية الحالية.

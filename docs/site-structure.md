# THE SFM Site Structure

This document maps the main product routes after the navigation cleanup. Public pages stay separate from the authenticated app, and dashboard pages should continue to rely on real user data only.

## Public Routes

| Route | Arabic Name | English Name | Purpose |
| --- | --- | --- | --- |
| `/` | الصفحة العامة | Public Landing | Main public entry for visitors. |
| `/about` | من نحن | About THE SFM | Product story, mission, privacy posture, and financial disclaimer. |
| `/login` | تسجيل الدخول | Login | Authentication, account creation, password recovery, and secure entry. |
| `/security` | الأمان والخصوصية | Security & Privacy | Trust, privacy, and financial data handling notes. |
| `/terms` | الشروط والأحكام | Terms | Platform terms and usage conditions. |
| `/privacy` | سياسة الخصوصية | Privacy Policy | Data collection and usage policy. |
| `/support` | الدعم | Support | Contact and support information. |

## Authenticated App Routes

| Route | Arabic Name | English Name | Sidebar Group | Related Pages |
| --- | --- | --- | --- | --- |
| `/dashboard` | الصفحة الرئيسية | Home Page | الرئيسية | `/command-center`, `/today`, `/reports-center`, `/notifications` |
| `/command-center` | مركز القيادة | Command Center | الرئيسية | `/dashboard`, `/today`, `/site-map` |
| `/today` | اليوم المالي | Financial Today | الرئيسية | `/notifications`, `/tasks`, `/income`, `/projects`, `/zakat` |
| `/tasks` | مركز المهام | Tasks Center | الرئيسية | `/dashboard`, `/today`, `/command-center`, `/notifications` |
| `/documents` | مركز المستندات | Documents Center | الرئيسية | `/projects/[id]`, `/charity-projects`, `/reports-center`, `/business-hub` |
| `/notifications` | الإشعارات الذكية | Smart Notifications | الرئيسية | `/today`, `/projects`, `/zakat`, `/reports-center` |
| `/reports-center` | مركز التقارير | Reports Center | الرئيسية | `/reports`, `/income`, `/expenses`, `/projects` |
| `/reports` | التقارير | Reports | مرتبطة | `/reports-center` |
| `/income` | الدخل | Income | المال الشخصي | `/dashboard`, `/reports-center`, `/notifications` |
| `/expenses` | المصروفات | Expenses | المال الشخصي | `/dashboard`, `/reports-center`, `/monthly-subscriptions` |
| `/monthly-subscriptions` | الاشتراكات الشهرية | Monthly Subscriptions | المال الشخصي | `/expenses`, `/debts` |
| `/debts` | الديون | Debts | المال الشخصي | `/expenses`, `/monthly-subscriptions` |
| `/savings` | المدخرات | Savings | المال الشخصي | `/zakat`, `/dashboard` |
| `/goals` | الأهداف المالية | Financial Goals | المال الشخصي | `/dashboard`, `/notifications`, `/reports-center` |
| `/financial-theories` | النظريات المالية | Financial Theories | الذكاء المالي | `/ai`, `/dashboard` |
| `/ai` | مساعدي الذكي | AI Assistant | الذكاء المالي | `/command-center`, `/projects/[id]`, `/business-hub` |
| `/invest` | الاستثمارات | Investments | الاستثمار والسوق | `/market-analysis`, `/market-agent`, `/zakat` |
| `/market-analysis` | تحليلات السوق | Market Analysis | الاستثمار والسوق | `/invest`, `/market-agent` |
| `/market-agent` | وكيل تحليل الأسواق | Market Analysis Agent | الاستثمار والسوق | `/market-analysis`, `/invest` |
| `/projects` | مشاريعي | My Projects | الأعمال والمشاريع | `/projects/[id]`, `/business-hub` |
| `/projects/[id]` | مساحة المشروع | Project Workspace | مرتبطة | `/projects`, `/business-hub`, `/reports-center` |
| `/business-hub` | مركز الأعمال | Business Hub | الأعمال والمشاريع | `/projects`, `/reports-center`, `/documents` |
| `/investment-offers` | العروض الاستثمارية | Investment Offers | الأعمال والمشاريع | `/projects/[id]`, `/business-hub`, `/documents` |
| `/zakat` | الزكاة | Zakat | الزكاة والأعمال الخيرية | `/charity-projects`, `/reports-center`, `/today` |
| `/charity` | الأعمال الخيرية | Charity | الزكاة والأعمال الخيرية | `/charity-projects`, `/zakat` |
| `/charity-projects` | المشاريع الخيرية | Charity Projects | الزكاة والأعمال الخيرية | `/charity`, `/zakat`, `/reports-center` |
| `/services/investment-firms` | شركات الاستثمار | Investment Firms | الخدمات | `/business-hub` |
| `/services/accounting-firms` | شركات المحاسبة | Accounting Firms | الخدمات | `/reports-center` |
| `/services/feasibility-firms` | شركات دراسة الجدوى | Feasibility Firms | الخدمات | `/projects`, `/business-hub` |
| `/services/advisory-firms` | شركات الاستشارات المالية | Financial Advisory Firms | الخدمات | `/business-hub` |
| `/profile` | الملف الشخصي | Profile | الحساب | `/security` |
| `/settings` | تحويل قديم | Legacy Redirect | قديم | `/profile` |
| `/site-map` | خريطة THE SFM | THE SFM Map | داعمة | `/command-center`, `/profile` |
| `/setup` | إعداد الحساب | Account Setup | داعمة | `/dashboard`, `/profile` |

## Sidebar Groups

- الرئيسية: الصفحة الرئيسية، مركز القيادة، اليوم المالي، المهام، المستندات، الإشعارات، مركز التقارير.
- المال الشخصي: الدخل، المصروفات، الاشتراكات الشهرية، الديون، المدخرات، الأهداف.
- الذكاء المالي: مساعدي الذكي، النظريات المالية، الأدوات التعليمية.
- الاستثمار والسوق: الاستثمارات، تحليلات السوق، وكيل تحليل الأسواق، أخبار الأسواق.
- الأعمال والمشاريع: المشاريع، مركز الأعمال، العروض الاستثمارية، مساحة المشروع.
- الزكاة والأعمال الخيرية: الزكاة، الأعمال الخيرية، المشاريع الخيرية، المستفيدون، تقارير الخير.
- الخدمات: شركات الاستثمار، المحاسبة، دراسة الجدوى، والاستشارات المالية.
- الحساب: الملف الشخصي، الأمان والخصوصية، تسجيل الخروج.

## Display Modes

- العرض الأساسي يركز على الصفحات اليومية الأساسية: الصفحة الرئيسية، اليوم المالي، الدخل، المصروفات، الاشتراكات، الديون، الأهداف، الإشعارات، الملف الشخصي.
- العرض المتقدم يفتح كل الصفحات والأدوات المتخصصة.
- يفضل حفظ اختيار المستخدم في `public.profiles.view_mode` عند توفر حقل قاعدة البيانات.

# THE SFM Site Structure

This route map keeps the product organized around one clear purpose per page. Existing pages remain available; sidebar navigation now prioritizes the clean primary structure.

| Route | Page name | Purpose | Sidebar group | Related pages |
| --- | --- | --- | --- | --- |
| `/` | Dashboard / لوحة القيادة | Executive overview across real financial, project, report, and notification data. | الرئيسية | `/notifications`, `/reports-center`, `/setup` |
| `/notifications` | Smart Notifications / الإشعارات | Unified real-data notification center. | الرئيسية | `/projects`, `/zakat`, `/reports-center` |
| `/reports-center` | Reports Center / مركز التقارير | Main hub for report readiness, preview, and exports. | الرئيسية | `/reports`, `/income`, `/expenses`, `/projects` |
| `/reports` | Reports / التقارير | Legacy report page and shortcut path to Reports Center. | Related, not primary sidebar | `/reports-center` |
| `/income` | Income / الدخل | Income source management only. | المال الشخصي | `/reports-center`, `/notifications` |
| `/expenses` | Expenses / المصروفات | Expense management only. | المال الشخصي | `/reports-center`, `/projects` |
| `/savings` | Savings / المدخرات | Savings records and summaries. | المال الشخصي | `/zakat`, `/` |
| `/goals` | Financial Goals / الأهداف المالية | Goal tracking and progress. | المال الشخصي | `/notifications`, `/reports-center` |
| `/zakat` | Zakat / الزكاة | Zakat calculation, nisab, hawl, and saved history. | المال الشخصي | `/charity-projects`, `/reports-center`, `/notifications` |
| `/invest` | Investments / الاستثمارات | Investment portfolio management. | الاستثمار والسوق | `/market-analysis`, `/zakat` |
| `/market-analysis` | Market Analysis / تحليلات السوق | Market analysis and real source availability states. | الاستثمار والسوق | `/invest`, `/market-analysis#watchlist`, `/market-analysis#market-alerts` |
| `/market-analysis#watchlist` | Watchlist / قائمة المتابعة | Saved market watchlist section. | الاستثمار والسوق | `/market-analysis` |
| `/market-analysis#market-alerts` | Market Alerts / تنبيهات السوق | Saved market alerts section. | الاستثمار والسوق | `/market-analysis` |
| `/projects` | My Projects / مشاريعي | Project list and entry point to project workspaces. | الأعمال والمشاريع | `/projects/[id]`, `/business-hub` |
| `/projects/[id]` | Project Workspace / مساحة المشروع | Individual project workspace: overview, feasibility, financial model, tasks, documents, KPIs, advisor, and pitch deck tabs. | Related project route | `/projects`, `/business-hub`, `/reports-center` |
| `/business-hub` | Business Hub / مركز الأعمال | Strategic project layer for readiness, funding, jurisdiction, documents, and funding directory. | الأعمال والمشاريع | `/projects`, `/business-hub#strategic-documents` |
| `/business-hub#strategic-documents` | Strategic Documents / المستندات والعروض | Strategic document and pitch deck preparation area inside Business Hub. | الأعمال والمشاريع | `/projects/[id]`, `/reports-center` |
| `/charity` | Charity / الأعمال الخيرية | Quick charity and donation logging only. | الأعمال الخيرية | `/charity-projects`, `/zakat` |
| `/charity-projects` | Charity Projects / المشاريع الخيرية | Charity projects, contributors, beneficiaries, documents, impact, and charity reports. | الأعمال الخيرية | `/charity`, `/zakat`, `/reports-center` |
| `/charity-projects#beneficiary-tracking` | Beneficiaries / المستفيدين | Beneficiary management section. | الأعمال الخيرية | `/charity-projects` |
| `/charity-projects#charity-reports` | Charity Reports / تقارير الخير | Charity report generation/export section. | الأعمال الخيرية | `/reports-center` |
| `/services/investment-firms` | Investment Firms / شركات الاستثمار | Service directory page. | الخدمات | `/business-hub` |
| `/services/accounting-firms` | Accounting Firms / شركات المحاسبة | Service directory page. | الخدمات | `/reports-center` |
| `/services/feasibility-firms` | Feasibility Firms / شركات دراسة الجدوى | Service directory page. | الخدمات | `/projects`, `/business-hub` |
| `/services/advisory-firms` | Financial Advisory Firms / شركات الاستشارات المالية | Service directory page. | الخدمات | `/business-hub` |
| `/profile` | Profile / الملف الشخصي | User profile and account preferences. | الحساب | `/settings` |
| `/settings` | Settings / الإعدادات | Settings route; currently redirects into the profile/settings experience. | الحساب | `/profile` |
| `/setup` | Account Setup / إعداد الحساب | Guided onboarding setup route. | Related account route | `/`, `/profile` |
| `/ai` | Financial AI / الذكاء المالي | Supporting AI page retained for direct access; project-aware AI belongs in project workspaces and Business Hub. | Related, not primary sidebar | `/projects/[id]`, `/business-hub` |

## Navigation Groups

- الرئيسية: dashboard, notifications, reports center.
- المال الشخصي: income, expenses, savings, financial goals, zakat.
- الاستثمار والسوق: investments, market analysis, watchlist, market alerts.
- الأعمال والمشاريع: projects, business hub, strategic documents, pitch decks.
- الأعمال الخيرية: charity, charity projects, beneficiaries, charity reports.
- الخدمات: investment, accounting, feasibility, and financial advisory firms.
- الحساب: profile, settings, logout.

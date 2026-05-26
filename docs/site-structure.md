# THE SFM Site Structure

This map documents the cleaned product organization. The public landing page stays separate from the authenticated app. App pages use grouped navigation, shared layout spacing, and real-data-only empty states.

| Route | Arabic name | English name | French name | Purpose | Sidebar group | Related pages |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | الصفحة العامة | Public Landing | Page publique | Public marketing page for visitors. | Public | `/login`, `/dashboard` |
| `/about` | من نحن | About THE SFM | À propos de THE SFM | Public product story, mission, real-data principle, privacy posture, and disclaimer. | Public | `/`, `/login`, `/security` |
| `/dashboard` | لوحة القيادة | Executive Dashboard | Tableau de bord exécutif | Executive overview only, based on real user data. | الرئيسية | `/command-center`, `/today`, `/reports-center`, `/notifications` |
| `/command-center` | مركز القيادة | Command Center | Centre de commande | Clean gateway to the main worlds of THE SFM. | الرئيسية | `/dashboard`, `/today`, `/site-map` |
| `/today` | اليوم المالي | Financial Today | Aujourd’hui financier | Daily focus page for real due items and alerts. | الرئيسية | `/notifications`, `/tasks`, `/income`, `/projects`, `/zakat` |
| `/tasks` | مركز المهام | Tasks Center | Centre des tâches | Unified action list generated from real setup gaps, due dates, reminders, reports, and project tasks. | الرئيسية | `/dashboard`, `/today`, `/command-center`, `/notifications` |
| `/documents` | مركز المستندات | Documents Center | Centre des documents | Unified center for user-owned project, charity, receipt, pitch deck, business, and saved report documents. | الرئيسية | `/projects/[id]`, `/charity-projects`, `/reports-center`, `/business-hub` |
| `/notifications` | الإشعارات الذكية | Smart Notifications | Notifications intelligentes | Unified notification center from stored and dynamic real-data alerts. | الرئيسية | `/today`, `/projects`, `/zakat`, `/reports-center` |
| `/reports-center` | مركز التقارير | Reports Center | Centre des rapports | Report readiness, preview, and export hub. | الرئيسية | `/reports`, `/income`, `/expenses`, `/projects` |
| `/reports` | التقارير | Reports | Rapports | Legacy reports page with a shortcut to Reports Center. | Related | `/reports-center` |
| `/income` | الدخل | Income | Revenus | Income management only. | المال الشخصي | `/dashboard`, `/reports-center`, `/notifications` |
| `/expenses` | المصروفات | Expenses | Dépenses | Expense management only. | المال الشخصي | `/dashboard`, `/reports-center` |
| `/savings` | المدخرات | Savings | Épargne | Savings records and summaries. | المال الشخصي | `/zakat`, `/dashboard` |
| `/goals` | الأهداف المالية | Financial Goals | Objectifs financiers | Goal tracking and progress. | المال الشخصي | `/dashboard`, `/notifications`, `/reports-center` |
| `/zakat` | الزكاة | Zakat | Zakat | Zakat calculator, hawl, reminders, and saved history. | المال الشخصي | `/charity-projects`, `/reports-center`, `/today` |
| `/invest` | الاستثمارات | Investments | Investissements | Investment portfolio management. | الاستثمار والسوق | `/market-analysis`, `/zakat` |
| `/market-analysis` | تحليلات السوق | Market Analysis | Analyse du marché | Market analysis, watchlist, and market alerts. | الاستثمار والسوق | `/invest`, `/market-analysis#watchlist`, `/market-analysis#market-alerts` |
| `/market-analysis#watchlist` | قائمة المتابعة | Watchlist | Liste de suivi | Watchlist section inside Market Analysis. | الاستثمار والسوق | `/market-analysis` |
| `/market-analysis#market-alerts` | تنبيهات السوق | Market Alerts | Alertes de marché | Market alerts section inside Market Analysis. | الاستثمار والسوق | `/market-analysis` |
| `/projects` | مشاريعي | My Projects | Mes projets | Project list and entry point to workspaces. | الأعمال والمشاريع | `/projects/[id]`, `/business-hub` |
| `/projects/[id]` | مساحة المشروع | Project Workspace | Espace projet | Individual project workspace with tabs for detailed workflows. | Related | `/projects`, `/business-hub`, `/reports-center` |
| `/business-hub` | مركز الأعمال | Business Hub | Centre d’affaires | Business readiness, funding, jurisdiction, documents, and funding directory. | الأعمال والمشاريع | `/projects`, `/reports-center`, `/documents` |
| `/business-hub#strategic-documents` | العروض الاستثمارية | Pitch Decks | Pitch decks | Strategic documents and pitch deck area inside Business Hub. | الأعمال والمشاريع | `/projects/[id]`, `/business-hub`, `/documents` |
| `/charity` | الأعمال الخيرية | Charity | Charité | Quick charity and donation logging. | الزكاة والأعمال الخيرية | `/charity-projects`, `/zakat` |
| `/charity-projects` | المشاريع الخيرية | Charity Projects | Projets caritatifs | Charity projects, beneficiaries, contributors, documents, impact, and reports. | الزكاة والأعمال الخيرية | `/charity`, `/zakat`, `/reports-center` |
| `/charity-projects#beneficiary-tracking` | المستفيدين | Beneficiaries | Bénéficiaires | Beneficiary section inside Charity Projects. | الزكاة والأعمال الخيرية | `/charity-projects` |
| `/charity-projects#charity-reports` | تقارير الخير | Charity Reports | Rapports caritatifs | Charity reports section inside Charity Projects. | الزكاة والأعمال الخيرية | `/reports-center` |
| `/services/investment-firms` | شركات الاستثمار | Investment Firms | Sociétés d’investissement | Service directory page. | الخدمات | `/business-hub` |
| `/services/accounting-firms` | شركات المحاسبة | Accounting Firms | Cabinets comptables | Service directory page. | الخدمات | `/reports-center` |
| `/services/feasibility-firms` | شركات دراسة الجدوى | Feasibility Firms | Études de faisabilité | Service directory page. | الخدمات | `/projects`, `/business-hub` |
| `/services/advisory-firms` | شركات الاستشارات المالية | Financial Advisory Firms | Conseil financier | Service directory page. | الخدمات | `/business-hub` |
| `/profile` | الملف الشخصي | Profile | Profil | User profile, account information, language, currency, and app preferences. | الحساب | `/security` |
| `/settings` | تحويل قديم | Legacy redirect | Redirection héritée | Old settings links redirect safely to Profile to avoid duplicate account navigation. | Legacy | `/profile` |
| `/security` | الأمان والخصوصية | Security & Privacy | Sécurité et confidentialité | Trust, privacy, and financial disclaimer information. | الحساب | `/profile` |
| `/site-map` | خريطة THE SFM | THE SFM Map | Carte THE SFM | Route map and product orientation page. | Supporting | `/command-center`, `/profile` |
| `/setup` | إعداد الحساب | Account Setup | Configuration du compte | Guided setup that saves only user-entered data. | Supporting | `/dashboard`, `/profile` |
| `/ai` | مساعدي الذكي | AI Assistant | Assistant IA | AI entry point; advice must be based on real user data when available. | Supporting | `/command-center`, `/projects/[id]`, `/business-hub` |

## Sidebar Groups

- الرئيسية: dashboard, command center, financial today, tasks center, documents center, notifications, reports center.
- المال الشخصي: income, expenses, savings, goals, zakat.
- الاستثمار والسوق: investments, market analysis, watchlist, market alerts.
- الأعمال والمشاريع: projects, business hub, pitch decks.
- الزكاة والأعمال الخيرية: charity, charity projects, beneficiaries, charity reports.
- الخدمات: investment, accounting, feasibility, and financial advisory firms.
- الحساب: profile, security and privacy, logout.

## Simple / Professional Mode

- Simple mode keeps the core orientation and personal finance pages visible: Dashboard, Command Center, Financial Today, Tasks Center, Notifications, Reports Center, Income, Expenses, Goals, Profile, Security & Privacy, and Logout.
- Professional mode shows every page and advanced tool.
- The preference is available from the sidebar/mobile view-mode selector and can persist to `public.profiles.view_mode` after the migration is applied.

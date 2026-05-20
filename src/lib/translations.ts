/* ═══════════════════════════════════════════════════════

   SFM — Global Translations (AR | EN)

   Shared across all pages. Add keys here, use via t()

═══════════════════════════════════════════════════════ */

export type Lang = 'ar' | 'en' | 'fr';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR: Record<string, TranslationEntry> = {

  /* ── Common / UI ── */
  back:        { ar:'← رجوع', en:'← Back', fr:'← Retour' },
  save:        { ar:'💾 حفظ', en:'💾 Save', fr:'💾 Enregistrer' },
  saving:      { ar:'جارٍ الحفظ...', en:'Saving...', fr:'Enregistrement...' },
  saved:       { ar:'✅ تم الحفظ', en:'✅ Saved', fr:'✅ Enregistre' },
  cancel:      { ar:'إلغاء', en:'Cancel', fr:'Annuler' },

  edit:        { ar:'تعديل',             en:'Edit' },

  delete:      { ar:'حذف',              en:'Delete' },

  add:         { ar:'إضافة',             en:'Add' },

  search:      { ar:'بحث...',            en:'Search...' },
  loading:     { ar:'جارٍ التحميل...', en:'Loading...', fr:'Chargement...' },
  error:       { ar:'حدث خطأ', en:'An error occurred', fr:'Une erreur est survenue' },

  success:     { ar:'تمت العملية بنجاح', en:'Operation successful' },

  close:       { ar:'إغلاق',             en:'Close' },

  confirm:     { ar:'تأكيد',             en:'Confirm' },

  next:        { ar:'التالي →',          en:'Next →' },

  previous:    { ar:'← السابق',          en:'← Previous' },

  noData:      { ar:'لا توجد بيانات',    en:'No data found' },

  optional:    { ar:'(اختياري)',         en:'(optional)' },

  required:    { ar:'مطلوب',            en:'Required' },

  currency:    { ar:'د.ك',              en:'KWD' },

  /* ── Navigation / Sidebar ── */
  nav_home:       { ar:'الرئيسية', en:'Dashboard', fr:'Tableau de bord' },
  nav_expenses:   { ar:'المصاريف', en:'Expenses', fr:'Depenses' },
  nav_income:     { ar:'الدخل', en:'Income', fr:'Revenus' },
  nav_invest:     { ar:'الاستثمارات', en:'Investments', fr:'Investissements' },
  nav_goals:      { ar:'الأهداف المالية', en:'Financial Goals', fr:'Objectifs financiers' },
  nav_projects:   { ar:'مشاريعي', en:'My Projects', fr:'Mes projets' },
  nav_charity:    { ar:'الأعمال الخيرية', en:'Charity', fr:'Charite' },
  nav_reports:    { ar:'التقارير', en:'Reports', fr:'Rapports' },
  nav_ai:         { ar:'تحليلات الذكاء', en:'AI Analytics', fr:'Analyses IA' },
  nav_notif:      { ar:'الإشعارات', en:'Notifications', fr:'Notifications' },
  nav_settings:   { ar:'الإعدادات', en:'Settings', fr:'Parametres' },
  nav_profile:    { ar:'الملف الشخصي', en:'Profile', fr:'Profil' },
  nav_logout:     { ar:'تسجيل الخروج', en:'Sign Out', fr:'Deconnexion' },
  nav_savings:    { ar:'المدخرات', en:'Savings', fr:'Epargne' },
  nav_education:  { ar:'التعليم المالي', en:'Financial Education', fr:'Education financiere' },

  /* ── Dashboard Hero ── */

  dash_hello:     { ar:'مرحباً',          en:'Welcome back,' },

  dash_subtitle:  { ar:'هذه نظرة عامة على وضعك المالي اليوم', en:'Here\'s your financial overview for today' },

  dash_report:    { ar:'🖨️ تقرير شهري',  en:'🖨️ Monthly Report' },

  net_wealth:     { ar:'📊 صافي الثروة',  en:'📊 Net Wealth' },

  health_score:   { ar:'الصحة المالية',   en:'Financial Health' },

  health_great:   { ar:'ممتاز',           en:'Excellent' },
  ai_manager:     { ar:'المدير المالي الذكي', en:'AI Finance Manager', fr:'Gestionnaire financier IA' },

  ai_active:      { ar:'نشط',             en:'Active' },

  ai_working:     { ar:'يعمل حالياً لتحسين وضعك المالي', en:'Currently optimizing your financial health' },

  vs_prev_month:  { ar:'مقارنة بالشهر الماضي', en:'vs. previous month' },

  /* ── KPI Cards ── */

  total_income:   { ar:'إجمالي الدخل',    en:'Total Income' },

  total_expenses: { ar:'إجمالي المصروفات',en:'Total Expenses' },

  total_savings:  { ar:'إجمالي الادخار',  en:'Total Savings' },

  total_invest:   { ar:'إجمالي الاستثمار',en:'Total Investment' },

  /* ── AI Insights ── */

  ai_insights_title: { ar:'رؤية المدير المالي الذكي', en:'AI Financial Manager Insights' },

  ai_month_analysis: { ar:'تحليل هذا الشهر', en:'This month\'s analysis' },

  ai_view_full:      { ar:'عرض التحليل الكامل', en:'View Full Analysis' },

  chart_6months:     { ar:'نظرة عامة على 6 أشهر', en:'6-Month Overview' },

  chart_income:      { ar:'الدخل',        en:'Income' },

  chart_expenses:    { ar:'المصروفات',    en:'Expenses' },

  chart_savings:     { ar:'الادخار',      en:'Savings' },

  chart_investment:  { ar:'الاستثمار',    en:'Investment' },

  /* ── Month Comparison ── */

  month_cmp_title:  { ar:'مقارنة الأشهر',                   en:'Month Comparison' },

  month_cmp_sub:    { ar:'احسب الفرق بين كل شهر وآخر',       en:'Calculate the difference between any two months' },

  month_first:      { ar:'اختر الشهر الأول',                  en:'Select first month' },

  month_second:     { ar:'اختر الشهر الثاني',                 en:'Select second month' },

  month_show_diff:  { ar:'عرض الفرق',                         en:'Show Difference' },

  diff_income:      { ar:'الفرق في الدخل',                   en:'Income Difference' },

  diff_expenses:    { ar:'الفرق في المصروفات',                en:'Expenses Difference' },

  diff_savings:     { ar:'الفرق في الادخار',                  en:'Savings Difference' },

  diff_invest:      { ar:'الفرق في الاستثمار',               en:'Investment Difference' },

  /* ── Transactions ── */

  trans_title:      { ar:'تاريخ المعاملات', en:'Transaction History' },

  trans_date:       { ar:'التاريخ',        en:'Date' },

  trans_cat:        { ar:'الفئة',          en:'Category' },

  trans_desc:       { ar:'الوصف',          en:'Description' },

  trans_amount:     { ar:'المبلغ',         en:'Amount' },

  trans_pct:        { ar:'النسبة',         en:'Change %' },

  trans_view_all:   { ar:'عرض كل المعاملات', en:'View All Transactions' },

  /* ── Expense Distribution ── */

  dist_title:       { ar:'توزيع المصروفات', en:'Expense Distribution' },

  dist_transport:   { ar:'المواصلات',       en:'Transport' },

  dist_food:        { ar:'الطعام',          en:'Food' },

  dist_housing:     { ar:'السكن',           en:'Housing' },

  dist_shopping:    { ar:'التسوق',          en:'Shopping' },

  dist_entertain:   { ar:'الترفيه',         en:'Entertainment' },

  dist_other:       { ar:'أخرى',            en:'Other' },

  /* ── Investments ── */

  invest_summary:    { ar:'ملخص الاستثمارات',       en:'Investment Summary' },

  invest_portfolio:  { ar:'إجمالي قيمة المحفظة',    en:'Total Portfolio Value' },

  invest_realized:   { ar:'الأرباح المحققة',         en:'Realized Profits' },

  invest_unrealized: { ar:'الأرباح غير المحققة',    en:'Unrealized Profits' },

  invest_total_ret:  { ar:'إجمالي العائد',           en:'Total Return' },

  invest_view_all:   { ar:'عرض محفظة الاستثمارات',  en:'View Investment Portfolio' },

  invest_perf:       { ar:'أداء الاستثمارات (6 أشهر)', en:'Investment Performance (6 months)' },

  invest_best:       { ar:'أفضل الاستثمارات',        en:'Top Investments' },

  invest_view_more:  { ar:'عرض كل الاستثمارات',     en:'View All Investments' },

  /* ── Goals ── */

  goals_title:    { ar:'الأهداف المالية', en:'Financial Goals' },

  goal_saved:     { ar:'المبلغ المدخر',   en:'Amount saved' },

  goal_target:    { ar:'المستهدف',       en:'Target' },

  goal_car:       { ar:'شراء سيارة',     en:'Buy a Car' },

  goal_house:     { ar:'منزل الأحلام',   en:'Dream Home' },

  goal_retire:    { ar:'التقاعد',        en:'Retirement' },

  goal_project:   { ar:'مشروع',          en:'Project' },

  /* ── Quick Actions ── */

  action_add_income:  { ar:'إضافة دخل',      en:'Add Income' },

  action_add_expense: { ar:'إضافة مصروف',    en:'Add Expense' },

  action_transfer:    { ar:'تحويل استثمار',  en:'Transfer Investment' },

  action_report:      { ar:'تقرير شهري',     en:'Monthly Report' },

  action_print:       { ar:'طباعة التقرير',  en:'Print Report' },

  action_export:      { ar:'تصدير PDF',      en:'Export PDF' },

  /* ── Profile ── */

  profile_title:     { ar:'الملف الشخصي',           en:'Profile' },

  profile_subtitle:  { ar:'إدارة بياناتك الشخصية وإعدادات الحساب', en:'Manage your personal info and account settings' },

  profile_tab_info:  { ar:'المعلومات الشخصية',       en:'Personal Info' },

  profile_tab_pass:  { ar:'كلمة المرور',             en:'Password' },

  profile_tab_income:{ ar:'مصادر الدخل',             en:'Income Sources' },

  profile_fullname:  { ar:'الاسم الكامل',            en:'Full Name' },

  profile_username:  { ar:'اسم المستخدم',            en:'Username' },

  profile_age:       { ar:'العمر',                   en:'Age' },

  profile_gender:    { ar:'الجنس',                   en:'Gender' },

  profile_male:      { ar:'ذكر',                     en:'Male' },

  profile_female:    { ar:'أنثى',                    en:'Female' },

  profile_country:   { ar:'رمز الدولة',              en:'Country Code' },

  profile_phone:     { ar:'رقم الهاتف',              en:'Phone Number' },

  profile_profession:{ ar:'المهنة',                  en:'Profession' },

  profile_email:     { ar:'البريد الإلكتروني',       en:'Email' },

  profile_save_info: { ar:'✦ حفظ المعلومات الشخصية', en:'✦ Save Personal Info' },

  profile_security:  { ar:'تأمين بيانات عالٍ',       en:'High data security' },

  profile_curr_pass: { ar:'كلمة المرور الحالية',     en:'Current Password' },

  profile_new_pass:  { ar:'كلمة المرور الجديدة',     en:'New Password' },

  profile_confirm_pass:{ ar:'تأكيد كلمة المرور',    en:'Confirm Password' },

  profile_change_pass:{ ar:'🔐 تغيير كلمة المرور',  en:'🔐 Change Password' },

  profile_income_title:{ ar:'مصادر الدخل الشهري',   en:'Monthly Income Sources' },

  profile_income_sub: { ar:'أدخل مبالغ مصادر دخلك الشهرية', en:'Enter your monthly income amounts' },

  profile_save_income:{ ar:'💰 حفظ مصادر الدخل',    en:'💰 Save Income Sources' },

  profile_elite:      { ar:'ELITE MEMBER',            en:'ELITE MEMBER' },

  profile_completion: { ar:'اكتمال الملف الشخصي',   en:'Profile Completion' },

  profile_ai_active:  { ar:'المدير المالي الذكي نشط', en:'AI Finance Manager active' },

  profile_health:     { ar:'مستوى الصحة المالية',    en:'Financial Health Level' },

  profile_ai_preds:   { ar:'توقعات الذكاء الاصطناعي', en:'AI Predictions' },

  profile_save_inc:   { ar:'زيادة الادخار',          en:'Savings increase' },

  profile_invest_opp: { ar:'فرصة استثمار',           en:'Investment opportunity' },

  profile_portfolio_risk: { ar:'مخاطر المحفظة',     en:'Portfolio risk' },

  profile_daily_msg:  { ar:'رسالة اليوم',            en:'Today\'s Message' },

  profile_quote:      { ar:'"استثمر في التعلم فهو أفضل استثمار يمكن أن تقوم به طوال حياتك"',

                        en:'"Invest in learning — it is the best investment you can make throughout your life."' },

  profile_features:   { ar:'مميزات SFM Premium',    en:'SFM Premium Features' },

  feat_smart_ui:   { ar:'واجهة ذكية',         en:'Smart UI' },

  feat_ai_finance: { ar:'ذكاء مالي',          en:'AI Finance' },

  feat_ai_analytics:{ ar:'تحليلات AI',        en:'AI Analytics' },

  feat_security:   { ar:'حماية متقدمة',       en:'Advanced Security' },

  feat_realtime:   { ar:'تحديث لحظي',         en:'Real-time Updates' },

  feat_goals:      { ar:'أهداف مالية',        en:'Financial Goals' },

  feat_smart_ui_desc:   { ar:'تصميم عصري وسهل', en:'Modern & intuitive design' },

  feat_ai_finance_desc: { ar:'تحليلات دقيقة',   en:'Precise AI analysis' },

  feat_analytics_desc:  { ar:'توصيات ذكية',    en:'Smart recommendations' },

  feat_security_desc:   { ar:'تشفير بنكي',     en:'Bank-level encryption' },

  feat_realtime_desc:   { ar:'بيانات محدثة',   en:'Always up-to-date' },

  feat_goals_desc:      { ar:'تتبع دقيق',      en:'Precise tracking' },

  /* ── Projects ── */

  proj_title:     { ar:'مشاريعي',             en:'My Projects' },

  proj_subtitle:  { ar:'تابع مشاريعك وخططك المالية والاستثمارية', en:'Track your financial and business projects' },

  proj_new:       { ar:'+ مشروع جديد',        en:'+ New Project' },

  proj_total:     { ar:'إجمالي المشاريع',      en:'Total Projects' },

  proj_active:    { ar:'المشاريع النشطة',      en:'Active Projects' },

  proj_capital:   { ar:'إجمالي رأس المال',     en:'Total Capital' },

  proj_profit:    { ar:'إجمالي الأرباح',       en:'Total Profits' },

  proj_name:      { ar:'اسم المشروع',          en:'Project Name' },

  proj_type:      { ar:'نوع المشروع',          en:'Project Type' },

  proj_status:    { ar:'حالة المشروع',         en:'Project Status' },

  proj_capital_f: { ar:'رأس المال المطلوب',    en:'Required Capital' },

  proj_exp_profit:{ ar:'الربح المتوقع',        en:'Expected Profit' },

  proj_cur_profit:{ ar:'الربح الحالي',         en:'Current Profit' },

  proj_expenses:  { ar:'المصروفات الشهرية',    en:'Monthly Expenses' },

  proj_revenue:   { ar:'الإيراد الشهري',       en:'Monthly Revenue' },

  proj_start:     { ar:'تاريخ البداية',        en:'Start Date' },

  proj_notes:     { ar:'ملاحظات',              en:'Notes' },

  proj_idea:      { ar:'فكرة',                 en:'Idea' },

  proj_inprogress:{ ar:'قيد التنفيذ',          en:'In Progress' },

  proj_active_s:  { ar:'نشط',                  en:'Active' },

  proj_paused:    { ar:'متوقف',                en:'Paused' },

  proj_done:      { ar:'مكتمل',                en:'Completed' },

  proj_empty:     { ar:'لا توجد مشاريع بعد — أضف مشروعك الأول', en:'No projects yet — add your first project' },

  proj_save_analyze:{ ar:'💾 حفظ وتحليل',      en:'💾 Save & Analyze' },

  proj_roi:       { ar:'استرجاع رأس المال',    en:'Capital Payback' },

  proj_monthly_profit:{ ar:'الربح الشهري',     en:'Monthly Profit' },

  proj_yearly_return: { ar:'العائد السنوي',    en:'Yearly Return' },

  proj_risk:      { ar:'مستوى المخاطرة',       en:'Risk Level' },

  proj_risk_low:  { ar:'منخفض',               en:'Low' },

  proj_risk_med:  { ar:'متوسط',               en:'Medium' },

  proj_risk_high: { ar:'عالٍ',                en:'High' },

  /* ── Expenses ── */

  exp_title:    { ar:'المصاريف',             en:'Expenses' },

  exp_subtitle: { ar:'إدارة وتتبع مصاريفك الشهرية', en:'Manage and track your monthly expenses' },

  exp_add:      { ar:'+ إضافة مصروف',       en:'+ Add Expense' },

  exp_edit:     { ar:'✏️ تعديل المصروف',    en:'✏️ Edit Expense' },

  exp_name:     { ar:'اسم المصروف أو الفئة', en:'Expense name or category' },

  exp_amount:   { ar:'المبلغ',              en:'Amount' },

  exp_count:    { ar:'عدد المصاريف',        en:'Expense Count' },

  exp_total:    { ar:'إجمالي المصاريف',    en:'Total Expenses' },

  exp_charity:  { ar:'الأعمال الخيرية',    en:'Charity' },

  exp_avg:      { ar:'متوسط المصروف',      en:'Average Expense' },

  exp_no_data:  { ar:'لا توجد مصاريف مسجلة بعد', en:'No expenses recorded yet' },

  exp_save_confirm: { ar:'✅ تأكيد التعديل', en:'✅ Confirm Edit' },

  exp_save_new:     { ar:'💾 حفظ المصروف',   en:'💾 Save Expense' },

  exp_list:     { ar:'قائمة المصاريف',     en:'Expenses List' },

  exp_total_row:{ ar:'الإجمالي',           en:'Total' },

  exp_footer:   { ar:'جميع المصاريف تُحتسب تلقائياً في لوحة التحكم', en:'All expenses are automatically counted in the dashboard' },

  /* ── Charity ── */

  charity_title:   { ar:'الأعمال الخيرية',  en:'Charity' },

  charity_subtitle:{ ar:'أضف المبالغ الخيرية الشهرية وسيتم احتسابها ضمن المصروفات', en:'Add monthly charity amounts — counted as expenses automatically' },

  charity_add:     { ar:'إضافة عمل خيري',  en:'Add Charity Payment' },

  charity_month:   { ar:'الشهر',           en:'Month' },

  charity_amount:  { ar:'المبلغ',          en:'Amount' },

  charity_name:    { ar:'الاسم أو الملاحظة', en:'Name or Note' },

  charity_save:    { ar:'🤲 حفظ وتسجيل ضمن المصروفات', en:'🤲 Save & Record as Expense' },

  charity_month_total:{ ar:'إجمالي الشهر', en:'Month Total' },

  charity_year:    { ar:'إجمالي السنة',    en:'Year Total' },

  charity_count:   { ar:'عدد التبرعات',    en:'Donation Count' },

  charity_types:   { ar:'أنواع الأعمال الخيرية', en:'Charity Types' },

  charity_daily_msg:{ ar:'رسالة اليوم',   en:"Today's Message" },

  charity_quote:   { ar:'"الصدقة تطفئ غضب الرب وتبارك في الرزق"', en:'"Charity extinguishes the Lord\'s wrath and blesses provision"' },

  charity_history: { ar:'سجل الأعمال الخيرية', en:'Charity History' },

  charity_summary: { ar:'ملخص كل الأشهر',  en:'All Months Summary' },

  charity_ring:    { ar:'الأعمال الخيرية هذا الشهر', en:"This month's charity" },

  charity_note:    { ar:'يُحتسب هذا المبلغ تلقائياً في إجمالي مصروفاتك', en:'This amount is automatically included in your total expenses' },

  /* ── Savings education ── */

  sav_hero_title:   { ar:'أنشئ مستقبل ثروتك',  en:'Build Your Wealth Future' },

  sav_hero_sub:     { ar:'حوّل الادخار من عادة إلى نظام ذكي لبناء الثروة', en:'Transform saving from habit to a smart wealth-building system' },

  sav_plan_btn:     { ar:'ابدأ الخطة ←',       en:'Start the Plan ←' },

  sav_ai_btn:       { ar:'🤖 تحليل الذكاء المالي', en:'🤖 AI Financial Analysis' },

  sav_new_goal:     { ar:'+ إنشاء هدف جديد',   en:'+ Create New Goal' },

  sav_current:      { ar:'ادخارك الحالي',       en:'Current Savings' },

  sav_target:       { ar:'الهدف المستهدف',      en:'Target Goal' },

  sav_time_est:     { ar:'الوقت المقدّر',       en:'Estimated Time' },

  sav_ai_score:     { ar:'تقييم SFM AI',        en:'SFM AI Score' },

  sav_path:         { ar:'مسار الثروة',          en:'Wealth Path' },

  sav_tools:        { ar:'أدوات بناء الثروة',   en:'Wealth Building Tools' },

  sav_simulator:    { ar:'محاكي الثروة المستقبلية', en:'Future Wealth Simulator' },

  sav_ai_advisor:   { ar:'مستشار الثروة الذكي', en:'AI Wealth Advisor' },

  sav_dashboard:    { ar:'لوحة الثروة',         en:'Wealth Dashboard' },

  /* ── Investments education ── */

  inv_hero_title:   { ar:'أنواع الاستثمار',        en:'Investment Types' },

  inv_hero_sub:     { ar:'ابنِ محفظتك الاستثمارية الذكية', en:'Build your smart investment portfolio' },

  inv_start_btn:    { ar:'ابدأ الاستثمار ←',       en:'Start Investing ←' },

  inv_ai_btn:       { ar:'🤖 تحليل AI',            en:'🤖 AI Analysis' },

  inv_create_btn:   { ar:'+ إنشاء محفظة',          en:'+ Create Portfolio' },

  inv_current:      { ar:'الثروة الحالية',          en:'Current Wealth' },

  inv_goal:         { ar:'هدف الاستثمار',           en:'Investment Goal' },

  inv_risk_idx:     { ar:'مؤشر المخاطر',            en:'Risk Index' },

  inv_expected_ret: { ar:'العائد المتوقع',           en:'Expected Return' },

  inv_categories:   { ar:'فئات الاستثمار',          en:'Investment Categories' },

  inv_portfolio:    { ar:'لوحة المحفظة',            en:'Portfolio Dashboard' },

  inv_ai_advisor:   { ar:'مستشار الاستثمار الذكي',  en:'AI Investment Advisor' },

  inv_wealth_path:  { ar:'مسار الاستثمار',          en:'Investment Path' },

  inv_simulator:    { ar:'محاكي نمو الثروة',        en:'Wealth Growth Simulator' },

  /* ── Footer ── */

  footer_rights:  { ar:'جميع الحقوق محفوظة', en:'All rights reserved' },

  footer_tagline: { ar:'المدير المالي الذكي • AI Wealth Platform', en:'AI Wealth Platform • Smart Financial Manager' },

  settings_title: { ar:'الإعدادات', en:'Settings', fr:'Parametres' },
  settings_subtitle: { ar:'اضبط حسابك وتفضيلاتك المالية وتجربة THE SFM', en:'Manage your account, financial preferences, and THE SFM experience', fr:'Gerez votre compte, vos preferences financieres et votre experience THE SFM' },
  settings_language: { ar:'إعدادات اللغة', en:'Language Settings', fr:'Langue' },
  settings_account: { ar:'إعدادات الحساب', en:'Account Settings', fr:'Compte' },
  settings_financial: { ar:'التفضيلات المالية', en:'Financial Preferences', fr:'Preferences financieres' },
  settings_appearance: { ar:'المظهر', en:'Appearance', fr:'Apparence' },
  settings_notifications: { ar:'الإشعارات', en:'Notifications', fr:'Notifications' },
  settings_security: { ar:'الخصوصية والأمان', en:'Privacy & Security', fr:'Confidentialite et securite' },
  settings_data: { ar:'البيانات والتقارير', en:'Data & Reports', fr:'Donnees et rapports' },
  settings_save_language: { ar:'حفظ اللغة', en:'Save language', fr:'Enregistrer la langue' },
  settings_save_profile: { ar:'حفظ الملف', en:'Save profile', fr:'Enregistrer le profil' },
  settings_save_preferences: { ar:'حفظ التفضيلات', en:'Save preferences', fr:'Enregistrer les preferences' },
  settings_export_data: { ar:'تصدير البيانات', en:'Export data', fr:'Exporter les donnees' },
  settings_export_pdf: { ar:'تصدير تقرير PDF', en:'Export monthly PDF', fr:'Exporter le rapport PDF' },
  settings_clear_demo: { ar:'مسح البيانات التجريبية', en:'Clear demo data', fr:'Effacer les donnees demo' },
  placeholder_first_name: { ar:'أدخل الاسم الأول', en:'Enter first name', fr:'Entrez le prenom' },
  placeholder_last_name: { ar:'أدخل الاسم الأخير', en:'Enter last name', fr:'Entrez le nom' },

} as const;

/** Helper: get translation for current language */

export function t(key: keyof typeof TR, lang: Lang): string {
  return TR[key]?.[lang] ?? TR[key]?.en ?? TR[key]?.ar ?? String(key);
}

/** Get all months in a language */

export const MONTHS = {
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  fr: ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'],
};

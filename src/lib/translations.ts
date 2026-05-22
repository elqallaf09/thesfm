/* ═══════════════════════════════════════════════════════

   SFM — Global Translations (AR | EN | FR)

   Shared across all pages. Add keys here, use via t()

═══════════════════════════════════════════════════════ */

export type Lang = 'ar' | 'en' | 'fr';

type TranslationEntry = Partial<Record<Lang, string>> & { ar: string; en: string };

export const TR: Record<string, TranslationEntry> = {

  /* ── Common / UI ── */
  back:        { ar:'← رجوع', en:'← Back', fr:'← Retour' },
  save:        { ar:'💾 حفظ', en:'💾 Save', fr:'💾 Enregistrer' },
  saving:      { ar:'جارٍ الحفظ...', en:'Saving...', fr:'Enregistrement...' },
  saved:       { ar:'✅ تم الحفظ', en:'✅ Saved', fr:'✅ Enregistré' },
  cancel:      { ar:'إلغاء', en:'Cancel', fr:'Annuler' },

  edit:        { ar:'تعديل',             en:'Edit', fr:'Modifier' },

  delete:      { ar:'حذف',              en:'Delete', fr:'Supprimer' },

  add:         { ar:'إضافة',             en:'Add', fr:'Ajouter' },

  search:      { ar:'بحث...',            en:'Search...', fr:'Rechercher...' },
  loading:     { ar:'جارٍ التحميل...', en:'Loading...', fr:'Chargement...' },
  error:       { ar:'حدث خطأ', en:'An error occurred', fr:'Une erreur est survenue' },

  success:     { ar:'تمت العملية بنجاح', en:'Operation successful', fr:'Opération réussie' },
  actualData:  { ar:'بيانات فعلية', en:'Actual data', fr:'Données réelles' },
  demoData:    { ar:'بيانات تجريبية', en:'Demo data', fr:'Données démo' },
  common_underDevelopment: { ar:'الصفحة تحت التطوير والإنشاء', en:'This page is under development', fr:'Cette page est en cours de développement' },
  common_comingSoon: { ar:'قريباً', en:'Coming soon', fr:'Bientôt disponible' },
  common_backToDashboard: { ar:'العودة للرئيسية', en:'Back to dashboard', fr:'Retour au tableau de bord' },

  close:       { ar:'إغلاق',             en:'Close', fr:'Fermer' },
  'common.close': { ar:'إغلاق', en:'Close', fr:'Fermer' },

  confirm:     { ar:'تأكيد',             en:'Confirm', fr:'Confirmer' },

  next:        { ar:'التالي →',          en:'Next →', fr:'Suivant →' },

  previous:    { ar:'← السابق',          en:'← Previous', fr:'← Précédent' },

  noData:      { ar:'لا توجد بيانات',    en:'No data found', fr:'Aucune donnée' },

  optional:    { ar:'(اختياري)',         en:'(optional)', fr:'(facultatif)' },

  required:    { ar:'مطلوب',            en:'Required', fr:'Requis' },

  currency:    { ar:'د.ك',              en:'KWD', fr:'KWD' },

  /* ── Navigation / Sidebar ── */
  nav_home:       { ar:'الرئيسية', en:'Dashboard', fr:'Tableau de bord' },
  nav_expenses:   { ar:'المصاريف', en:'Expenses', fr:'Dépenses' },
  nav_income:     { ar:'الدخل', en:'Income', fr:'Revenus' },
  nav_invest:     { ar:'الاستثمارات', en:'Investments', fr:'Investissements' },
  nav_goals:      { ar:'الأهداف المالية', en:'Financial Goals', fr:'Objectifs financiers' },
  nav_projects:   { ar:'مشاريعي', en:'My Projects', fr:'Mes projets' },
  nav_charity:    { ar:'الأعمال الخيرية', en:'Charity', fr:'Charité' },
  nav_reports:    { ar:'التقارير', en:'Reports', fr:'Rapports' },
  nav_ai:         { ar:'تحليلات الذكاء', en:'AI Analytics', fr:'Analyses IA' },
  nav_notif:      { ar:'الإشعارات', en:'Notifications', fr:'Notifications' },
  nav_settings:   { ar:'الإعدادات', en:'Settings', fr:'Paramètres' },
  nav_profile:    { ar:'الملف الشخصي', en:'Profile', fr:'Profil' },
  nav_logout:     { ar:'تسجيل الخروج', en:'Logout', fr:'Déconnexion' },
  nav_savings:    { ar:'المدخرات', en:'Savings', fr:'Épargne' },
  nav_education:  { ar:'التعليم المالي', en:'Financial Education', fr:'Éducation financière' },
  nav_services_section: { ar:'الخدمات', en:'Services', fr:'Services' },
  nav_investment_firms: { ar:'شركات الاستثمار', en:'Investment Firms', fr:"Sociétés d'investissement" },
  nav_accounting_firms: { ar:'شركات المحاسبة', en:'Accounting Firms', fr:'Cabinets comptables' },
  nav_feasibility_firms: { ar:'شركات دراسة الجدوى', en:'Feasibility Study Firms', fr:'Études de faisabilité' },
  nav_advisory_firms: { ar:'شركات الاستشارات المالية', en:'Financial Advisory Firms', fr:'Conseil financier' },
  'services.investmentFirms.title': { ar:'شركات الاستثمار', en:'Investment Firms', fr:"Sociétés d'investissement" },
  'services.investmentFirms.description': { ar:'دليل شامل لشركات الاستثمار المرخّصة محلياً وإقليمياً', en:'A comprehensive directory of licensed investment firms', fr:"Annuaire complet des sociétés d'investissement agréées" },
  'services.accountingFirms.title': { ar:'شركات المحاسبة', en:'Accounting Firms', fr:'Cabinets comptables' },
  'services.accountingFirms.description': { ar:'دليل بأفضل مكاتب وشركات المحاسبة والمراجعة', en:'Top accounting and auditing firms', fr:"Annuaire des meilleurs cabinets de comptabilité et d'audit" },
  'services.feasibilityFirms.title': { ar:'شركات دراسة الجدوى', en:'Feasibility Study Firms', fr:'Études de faisabilité' },
  'services.feasibilityFirms.description': { ar:'دليل بشركات إعداد دراسات الجدوى الاقتصادية للمشاريع', en:'Firms specialized in economic feasibility studies', fr:'Cabinets spécialisés en études de faisabilité économique' },
  'services.advisoryFirms.title': { ar:'شركات الاستشارات المالية للأفراد', en:'Personal Financial Advisory Firms', fr:'Conseil financier aux particuliers' },
  'services.advisoryFirms.description': { ar:'دليل بمستشارين ماليين معتمدين للأفراد والعائلات', en:'Certified financial advisors for individuals and families', fr:'Conseillers financiers certifiés pour particuliers et familles' },

  /* ── Dashboard Hero ── */

  dash_hello:     { ar:'مرحباً',          en:'Welcome back,', fr:'Bienvenue,' },

  dash_subtitle:  { ar:'هذه نظرة عامة على وضعك المالي اليوم', en:"Here's your financial overview for today", fr:"Voici votre aperçu financier d'aujourd'hui" },
  dash_guest:     { ar:'وضع الضيف', en:'Guest mode', fr:'Mode invité' },
  dash_enterMonthData: { ar:'أدخل بيانات الشهر لرؤية النمو', en:'Enter this month’s data to see growth', fr:'Saisissez les données du mois pour voir la croissance' },
  dash_noMonthlyHistory: { ar:'لا يوجد تاريخ شهري بعد', en:'No monthly history yet', fr:'Aucun historique mensuel pour le moment' },
  dash_monthlyHistoryHint: { ar:'ابدأ بإدخال دخلك ومصاريفك ليتكوّن الرسم تلقائياً', en:'Start by entering income and expenses so the chart builds automatically', fr:'Commencez par saisir vos revenus et dépenses pour générer le graphique automatiquement' },
  dash_monthlyHistoryAccumHint: { ar:'ابدأ بإدخال دخلك ومصاريفك ليتراكم السجل تلقائياً', en:'Start by entering income and expenses so history builds automatically', fr:'Commencez par saisir vos revenus et dépenses pour créer l’historique automatiquement' },
  dash_enterMonthlyIncome: { ar:'إدخال الدخل الشهري', en:'Enter monthly income', fr:'Saisir le revenu mensuel' },
  dash_noComparisonData: { ar:'لا توجد بيانات كافية للمقارنة', en:'Not enough data to compare', fr:'Données insuffisantes pour comparer' },
  dash_addTwoMonths: { ar:'أضف بيانات لشهرين على الأقل', en:'Add data for at least two months', fr:'Ajoutez les données d’au moins deux mois' },
  dash_addIncomeData: { ar:'إضافة بيانات الدخل', en:'Add income data', fr:'Ajouter des données de revenu' },
  dash_expenseName: { ar:'اسم المصروف', en:'Expense name', fr:'Nom de la dépense' },
  dash_expenseFallback: { ar:'مصروف', en:'Expense', fr:'Dépense' },
  dash_noExpenses: { ar:'لا توجد مصاريف مسجلة بعد', en:'No expenses recorded yet', fr:'Aucune dépense enregistrée pour le moment' },
  dash_addFirstExpense: { ar:'ابدأ بإضافة مصروفك الأول', en:'Start by adding your first expense', fr:'Commencez par ajouter votre première dépense' },
  dash_addExpense: { ar:'إضافة مصروف', en:'Add expense', fr:'Ajouter une dépense' },
  dash_noExpenseDistribution: { ar:'لا توجد مصاريف مسجلة', en:'No expenses recorded', fr:'Aucune dépense enregistrée' },
  dash_addExpensesForDistribution: { ar:'أضف مصاريفك لرؤية التوزيع', en:'Add expenses to see the distribution', fr:'Ajoutez vos dépenses pour voir la répartition' },
  dash_noInvestments: { ar:'لا توجد استثمارات مسجلة', en:'No investments recorded', fr:'Aucun investissement enregistré' },
  dash_addFirstInvestment: { ar:'أضف استثمارك الأول', en:'Add your first investment', fr:'Ajoutez votre premier investissement' },
  dash_addInvestment: { ar:'إضافة استثمار', en:'Add investment', fr:'Ajouter un investissement' },
  dash_noInvestmentHistory: { ar:'لا يوجد تاريخ استثماري بعد', en:'No investment history yet', fr:'Aucun historique d’investissement pour le moment' },
  dash_investmentHistoryHint: { ar:'أضف دخلك ومصاريفك واستثماراتك لعرض الأداء', en:'Add income, expenses, and investments to show performance', fr:'Ajoutez revenus, dépenses et investissements pour afficher la performance' },
  dash_topInvestmentsEmpty: { ar:'ستظهر أعلى الاستثمارات بعد إضافتها', en:'Top investments will appear after you add them', fr:'Les meilleurs investissements apparaîtront après leur ajout' },
  dash_investmentFallback: { ar:'استثمار', en:'Investment', fr:'Investissement' },
  dash_goalFallback: { ar:'هدف مالي', en:'Financial goal', fr:'Objectif financier' },
  dash_from: { ar:'من', en:'of', fr:'sur' },
  dash_footerTagline: { ar:'المدير المالي الذكي • AI Wealth Platform', en:'Smart Financial Manager • AI Wealth Platform', fr:'Gestionnaire financier intelligent • Plateforme IA de patrimoine' },
  dash_footerRights: { ar:'جميع الحقوق محفوظة • THE SFM 2026', en:'All rights reserved • THE SFM 2026', fr:'Tous droits réservés • THE SFM 2026' },
  dash_monthlyInvestments: { ar:'الاستثمارات الشهرية', en:'Monthly investments', fr:'Investissements mensuels' },
  dash_monthlyExpenses: { ar:'المصروفات الشهرية', en:'Monthly expenses', fr:'Dépenses mensuelles' },

  dash_report:    { ar:'🖨️ تقرير شهري',  en:'🖨️ Monthly Report', fr:'🖨️ Rapport mensuel' },

  net_wealth:     { ar:'📊 صافي الثروة',  en:'📊 Net Wealth', fr:'📊 Patrimoine net' },

  health_score:   { ar:'الصحة المالية',   en:'Financial Health', fr:'Santé financière' },

  health_great:   { ar:'ممتاز',           en:'Excellent', fr:'Excellent' },
  ai_manager:     { ar:'المدير المالي الذكي', en:'AI Finance Manager', fr:'Gestionnaire financier IA' },

  ai_active:      { ar:'نشط',             en:'Active', fr:'Actif' },

  ai_working:     { ar:'يعمل حالياً لتحسين وضعك المالي', en:'Currently optimizing your financial health', fr:'Optimisation de votre santé financière en cours' },

  vs_prev_month:  { ar:'مقارنة بالشهر الماضي', en:'vs. previous month', fr:'vs. mois précédent' },

  /* ── KPI Cards ── */

  total_income:   { ar:'إجمالي الدخل',    en:'Total Income', fr:'Total des revenus' },

  total_expenses: { ar:'إجمالي المصروفات',en:'Total Expenses', fr:'Total des dépenses' },

  total_savings:  { ar:'إجمالي الادخار',  en:'Total Savings', fr:"Total de l'épargne" },

  total_invest:   { ar:'إجمالي الاستثمار',en:'Total Investment', fr:'Total des investissements' },

  /* ── AI Insights ── */

  ai_insights_title: { ar:'رؤية المدير المالي الذكي', en:'AI Financial Manager Insights', fr:'Insights du Gestionnaire Financier IA' },

  ai_month_analysis: { ar:'تحليل هذا الشهر', en:"This month's analysis", fr:'Analyse du mois' },

  ai_view_full:      { ar:'عرض التحليل الكامل', en:'View Full Analysis', fr:"Voir l'analyse complète" },
  'ai.viewFullAnalysis': { ar:'عرض التحليل الكامل', en:'View Full Analysis', fr:"Voir l'analyse complète" },
  'ai.fullAnalysisTitle': { ar:'التحليل المالي الكامل', en:'Full Financial Analysis', fr:'Analyse financière complète' },
  'ai.financialSummary': { ar:'الملخص المالي', en:'Financial Summary', fr:'Résumé financier' },
  'ai.strengths': { ar:'نقاط القوة', en:'Strengths', fr:'Points forts' },
  'ai.improvements': { ar:'نقاط تحتاج تحسين', en:'Areas to Improve', fr:'Points à améliorer' },
  'ai.recommendations': { ar:'توصيات الذكاء المالي', en:'Financial AI Recommendations', fr:"Recommandations de l'IA financière" },
  'ai.nextMonthPlan': { ar:'خطة الشهر القادم', en:'Next Month Plan', fr:'Plan du mois prochain' },
  'ai.alerts': { ar:'التنبيهات المهمة', en:'Important Alerts', fr:'Alertes importantes' },
  'ai.notEnoughData': { ar:'لا توجد بيانات كافية لإنشاء تحليل كامل', en:'Not enough data to generate a full analysis', fr:'Données insuffisantes pour générer une analyse complète' },
  'ai.goToAiPage': { ar:'الانتقال إلى صفحة الذكاء المالي', en:'Go to Financial AI page', fr:'Aller à la page IA financière' },

  chart_6months:     { ar:'نظرة عامة على 6 أشهر', en:'6-Month Overview', fr:'Aperçu sur 6 mois' },

  chart_income:      { ar:'الدخل',        en:'Income', fr:'Revenus' },

  chart_expenses:    { ar:'المصروفات',    en:'Expenses', fr:'Dépenses' },

  chart_savings:     { ar:'الادخار',      en:'Savings', fr:'Épargne' },

  chart_investment:  { ar:'الاستثمار',    en:'Investment', fr:'Investissement' },

  /* ── Month Comparison ── */

  month_cmp_title:  { ar:'مقارنة الأشهر',                   en:'Month Comparison', fr:'Comparaison des mois' },

  month_cmp_sub:    { ar:'احسب الفرق بين كل شهر وآخر',       en:'Calculate the difference between any two months', fr:'Calculez la différence entre deux mois' },

  month_first:      { ar:'اختر الشهر الأول',                  en:'Select first month', fr:'Sélectionner le premier mois' },

  month_second:     { ar:'اختر الشهر الثاني',                 en:'Select second month', fr:'Sélectionner le deuxième mois' },

  month_show_diff:  { ar:'عرض الفرق',                         en:'Show Difference', fr:'Afficher la différence' },

  diff_income:      { ar:'الفرق في الدخل',                   en:'Income Difference', fr:'Différence de revenus' },

  diff_expenses:    { ar:'الفرق في المصروفات',                en:'Expenses Difference', fr:'Différence de dépenses' },

  diff_savings:     { ar:'الفرق في الادخار',                  en:'Savings Difference', fr:"Différence d'épargne" },

  diff_invest:      { ar:'الفرق في الاستثمار',               en:'Investment Difference', fr:"Différence d'investissement" },

  /* ── Transactions ── */

  trans_title:      { ar:'تاريخ المعاملات', en:'Transaction History', fr:'Historique des transactions' },

  trans_date:       { ar:'التاريخ',        en:'Date', fr:'Date' },

  trans_cat:        { ar:'الفئة',          en:'Category', fr:'Catégorie' },

  trans_desc:       { ar:'الوصف',          en:'Description', fr:'Description' },

  trans_amount:     { ar:'المبلغ',         en:'Amount', fr:'Montant' },

  trans_pct:        { ar:'النسبة',         en:'Change %', fr:'Variation %' },

  trans_view_all:   { ar:'عرض كل المعاملات', en:'View All Transactions', fr:'Voir toutes les transactions' },

  /* ── Expense Distribution ── */

  dist_title:       { ar:'توزيع المصروفات', en:'Expense Distribution', fr:'Répartition des dépenses' },

  dist_transport:   { ar:'المواصلات',       en:'Transport', fr:'Transport' },

  dist_food:        { ar:'الطعام',          en:'Food', fr:'Alimentation' },

  dist_housing:     { ar:'السكن',           en:'Housing', fr:'Logement' },

  dist_shopping:    { ar:'التسوق',          en:'Shopping', fr:'Shopping' },

  dist_entertain:   { ar:'الترفيه',         en:'Entertainment', fr:'Loisirs' },

  dist_other:       { ar:'أخرى',            en:'Other', fr:'Autres' },

  /* ── Investments ── */

  invest_summary:    { ar:'ملخص الاستثمارات',       en:'Investment Summary', fr:'Résumé des investissements' },

  invest_portfolio:  { ar:'إجمالي قيمة المحفظة',    en:'Total Portfolio Value', fr:'Valeur totale du portefeuille' },

  invest_realized:   { ar:'الأرباح المحققة',         en:'Realized Profits', fr:'Profits réalisés' },

  invest_unrealized: { ar:'الأرباح غير المحققة',    en:'Unrealized Profits', fr:'Profits non réalisés' },

  invest_total_ret:  { ar:'إجمالي العائد',           en:'Total Return', fr:'Rendement total' },

  invest_view_all:   { ar:'عرض محفظة الاستثمارات',  en:'View Investment Portfolio', fr:'Voir le portefeuille' },

  invest_perf:       { ar:'أداء الاستثمارات (6 أشهر)', en:'Investment Performance (6 months)', fr:'Performance des investissements (6 mois)' },

  invest_best:       { ar:'أفضل الاستثمارات',        en:'Top Investments', fr:'Meilleurs investissements' },

  invest_view_more:  { ar:'عرض كل الاستثمارات',     en:'View All Investments', fr:'Voir tous les investissements' },

  /* ── Goals ── */

  goals_title:    { ar:'الأهداف المالية', en:'Financial Goals', fr:'Objectifs financiers' },

  goal_saved:     { ar:'المبلغ المدخر',   en:'Amount saved', fr:'Montant épargné' },

  goal_target:    { ar:'المستهدف',       en:'Target', fr:'Objectif' },

  goal_car:       { ar:'شراء سيارة',     en:'Buy a Car', fr:'Acheter une voiture' },

  goal_house:     { ar:'منزل الأحلام',   en:'Dream Home', fr:'Maison de rêve' },

  goal_retire:    { ar:'التقاعد',        en:'Retirement', fr:'Retraite' },

  goal_project:   { ar:'مشروع',          en:'Project', fr:'Projet' },

  /* ── Quick Actions ── */
  quick_title: { ar:'إجراءات سريعة', en:'Quick Actions', fr:'Actions rapides' },

  action_add_income:  { ar:'إضافة دخل',      en:'Add Income', fr:'Ajouter un revenu' },

  action_add_expense: { ar:'إضافة مصروف',    en:'Add Expense', fr:'Ajouter une dépense' },

  action_transfer:    { ar:'تحويل استثمار',  en:'Transfer Investment', fr:'Transfert investissement' },

  action_report:      { ar:'تقرير شهري',     en:'Monthly Report', fr:'Rapport mensuel' },

  action_print:       { ar:'طباعة التقرير',  en:'Print Report', fr:'Imprimer le rapport' },

  action_export:      { ar:'تصدير PDF',      en:'Export PDF', fr:'Exporter PDF' },

  /* ── Profile ── */

  profile_title:     { ar:'الملف الشخصي',           en:'Profile', fr:'Profil' },

  profile_subtitle:  { ar:'إدارة بياناتك الشخصية وإعدادات الحساب', en:'Manage your personal info and account settings', fr:'Gérez vos informations personnelles et les paramètres du compte' },

  profile_tab_info:  { ar:'المعلومات الشخصية',       en:'Personal Info', fr:'Informations personnelles' },

  profile_tab_pass:  { ar:'كلمة المرور',             en:'Password', fr:'Mot de passe' },

  profile_tab_income:{ ar:'مصادر الدخل',             en:'Income Sources', fr:'Sources de revenus' },

  profile_fullname:  { ar:'الاسم الكامل',            en:'Full Name', fr:'Nom complet' },

  profile_username:  { ar:'اسم المستخدم',            en:'Username', fr:"Nom d'utilisateur" },

  profile_age:       { ar:'العمر',                   en:'Age', fr:'Âge' },

  profile_gender:    { ar:'الجنس',                   en:'Gender', fr:'Genre' },

  profile_male:      { ar:'ذكر',                     en:'Male', fr:'Homme' },

  profile_female:    { ar:'أنثى',                    en:'Female', fr:'Femme' },

  profile_country:   { ar:'رمز الدولة',              en:'Country Code', fr:'Code pays' },

  profile_phone:     { ar:'رقم الهاتف',              en:'Phone Number', fr:'Numéro de téléphone' },

  profile_profession:{ ar:'المهنة',                  en:'Profession', fr:'Profession' },

  profile_email:     { ar:'البريد الإلكتروني',       en:'Email', fr:'E-mail' },

  profile_save_info: { ar:'✦ حفظ المعلومات الشخصية', en:'✦ Save Personal Info', fr:'✦ Enregistrer les informations' },

  profile_security:  { ar:'تأمين بيانات عالٍ',       en:'High data security', fr:'Sécurité des données élevée' },

  profile_curr_pass: { ar:'كلمة المرور الحالية',     en:'Current Password', fr:'Mot de passe actuel' },

  profile_new_pass:  { ar:'كلمة المرور الجديدة',     en:'New Password', fr:'Nouveau mot de passe' },

  profile_confirm_pass:{ ar:'تأكيد كلمة المرور',    en:'Confirm Password', fr:'Confirmer le mot de passe' },

  profile_change_pass:{ ar:'🔐 تغيير كلمة المرور',  en:'🔐 Change Password', fr:'🔐 Changer le mot de passe' },

  profile_income_title:{ ar:'مصادر الدخل الشهري',   en:'Monthly Income Sources', fr:'Sources de revenus mensuels' },

  profile_income_sub: { ar:'أدخل مبالغ مصادر دخلك الشهرية', en:'Enter your monthly income amounts', fr:'Entrez vos montants de revenus mensuels' },

  profile_save_income:{ ar:'💰 حفظ مصادر الدخل',    en:'💰 Save Income Sources', fr:'💰 Enregistrer les revenus' },

  profile_elite:      { ar:'ELITE MEMBER',            en:'ELITE MEMBER', fr:'ELITE MEMBER' },

  profile_completion: { ar:'اكتمال الملف الشخصي',   en:'Profile Completion', fr:'Complétion du profil' },

  profile_ai_active:  { ar:'المدير المالي الذكي نشط', en:'AI Finance Manager active', fr:'Gestionnaire financier IA actif' },

  profile_health:     { ar:'مستوى الصحة المالية',    en:'Financial Health Level', fr:'Niveau de santé financière' },

  profile_ai_preds:   { ar:'توقعات الذكاء الاصطناعي', en:'AI Predictions', fr:'Prédictions IA' },

  profile_save_inc:   { ar:'زيادة الادخار',          en:'Savings increase', fr:"Augmentation de l'épargne" },

  profile_invest_opp: { ar:'فرصة استثمار',           en:'Investment opportunity', fr:"Opportunité d'investissement" },

  profile_portfolio_risk: { ar:'مخاطر المحفظة',     en:'Portfolio risk', fr:'Risque du portefeuille' },

  profile_daily_msg:  { ar:'رسالة اليوم',            en:"Today's Message", fr:'Message du jour' },

  profile_quote:      { ar:'"استثمر في التعلم فهو أفضل استثمار يمكن أن تقوم به طوال حياتك"',
                        en:'"Invest in learning — it is the best investment you can make throughout your life."',
                        fr:'"Investissez dans l\'apprentissage — c\'est le meilleur investissement de votre vie."' },

  profile_features:   { ar:'مميزات SFM Premium',    en:'SFM Premium Features', fr:'Fonctionnalités SFM Premium' },

  feat_smart_ui:   { ar:'واجهة ذكية',         en:'Smart UI', fr:'Interface intelligente' },

  feat_ai_finance: { ar:'ذكاء مالي',          en:'AI Finance', fr:'Finance IA' },

  feat_ai_analytics:{ ar:'تحليلات AI',        en:'AI Analytics', fr:'Analyses IA' },

  feat_security:   { ar:'حماية متقدمة',       en:'Advanced Security', fr:'Sécurité avancée' },

  feat_realtime:   { ar:'تحديث لحظي',         en:'Real-time Updates', fr:'Mises à jour en temps réel' },

  feat_goals:      { ar:'أهداف مالية',        en:'Financial Goals', fr:'Objectifs financiers' },

  feat_smart_ui_desc:   { ar:'تصميم عصري وسهل', en:'Modern & intuitive design', fr:'Design moderne et intuitif' },

  feat_ai_finance_desc: { ar:'تحليلات دقيقة',   en:'Precise AI analysis', fr:'Analyse IA précise' },

  feat_analytics_desc:  { ar:'توصيات ذكية',    en:'Smart recommendations', fr:'Recommandations intelligentes' },

  feat_security_desc:   { ar:'تشفير بنكي',     en:'Bank-level encryption', fr:'Chiffrement bancaire' },

  feat_realtime_desc:   { ar:'بيانات محدثة',   en:'Always up-to-date', fr:'Données toujours à jour' },

  feat_goals_desc:      { ar:'تتبع دقيق',      en:'Precise tracking', fr:'Suivi précis' },

  /* ── Projects ── */

  proj_title:     { ar:'مشاريعي',             en:'My Projects', fr:'Mes projets' },

  proj_subtitle:  { ar:'تابع مشاريعك وخططك المالية والاستثمارية', en:'Track your financial and business projects', fr:'Suivez vos projets financiers et commerciaux' },

  proj_new:       { ar:'+ مشروع جديد',        en:'+ New Project', fr:'+ Nouveau projet' },

  proj_total:     { ar:'إجمالي المشاريع',      en:'Total Projects', fr:'Total des projets' },

  proj_active:    { ar:'المشاريع النشطة',      en:'Active Projects', fr:'Projets actifs' },

  proj_capital:   { ar:'إجمالي رأس المال',     en:'Total Capital', fr:'Capital total' },

  proj_profit:    { ar:'إجمالي الأرباح',       en:'Total Profits', fr:'Profits totaux' },

  proj_name:      { ar:'اسم المشروع',          en:'Project Name', fr:'Nom du projet' },

  proj_type:      { ar:'نوع المشروع',          en:'Project Type', fr:'Type de projet' },

  proj_status:    { ar:'حالة المشروع',         en:'Project Status', fr:'Statut du projet' },

  proj_capital_f: { ar:'رأس المال المطلوب',    en:'Required Capital', fr:'Capital requis' },

  proj_exp_profit:{ ar:'الربح المتوقع',        en:'Expected Profit', fr:'Profit attendu' },

  proj_cur_profit:{ ar:'الربح الحالي',         en:'Current Profit', fr:'Profit actuel' },

  proj_expenses:  { ar:'المصروفات الشهرية',    en:'Monthly Expenses', fr:'Dépenses mensuelles' },

  proj_revenue:   { ar:'الإيراد الشهري',       en:'Monthly Revenue', fr:'Revenu mensuel' },

  proj_start:     { ar:'تاريخ البداية',        en:'Start Date', fr:'Date de début' },

  proj_notes:     { ar:'ملاحظات',              en:'Notes', fr:'Notes' },

  proj_idea:      { ar:'فكرة',                 en:'Idea', fr:'Idée' },

  proj_inprogress:{ ar:'قيد التنفيذ',          en:'In Progress', fr:'En cours' },

  proj_active_s:  { ar:'نشط',                  en:'Active', fr:'Actif' },

  proj_paused:    { ar:'متوقف',                en:'Paused', fr:'Suspendu' },

  proj_done:      { ar:'مكتمل',                en:'Completed', fr:'Terminé' },

  proj_empty:     { ar:'لا توجد مشاريع بعد — أضف مشروعك الأول', en:'No projects yet — add your first project', fr:'Aucun projet — ajoutez votre premier projet' },

  proj_save_analyze:{ ar:'💾 حفظ وتحليل',      en:'💾 Save & Analyze', fr:'💾 Enregistrer et analyser' },

  proj_roi:       { ar:'استرجاع رأس المال',    en:'Capital Payback', fr:'Retour sur investissement' },

  proj_monthly_profit:{ ar:'الربح الشهري',     en:'Monthly Profit', fr:'Profit mensuel' },

  proj_yearly_return: { ar:'العائد السنوي',    en:'Yearly Return', fr:'Rendement annuel' },

  proj_risk:      { ar:'مستوى المخاطرة',       en:'Risk Level', fr:'Niveau de risque' },

  proj_risk_low:  { ar:'منخفض',               en:'Low', fr:'Faible' },

  proj_risk_med:  { ar:'متوسط',               en:'Medium', fr:'Moyen' },

  proj_risk_high: { ar:'عالٍ',                en:'High', fr:'Élevé' },

  /* ── Expenses ── */

  exp_title:    { ar:'المصاريف',             en:'Expenses', fr:'Dépenses' },

  exp_subtitle: { ar:'إدارة وتتبع مصاريفك الشهرية', en:'Manage and track your monthly expenses', fr:'Gérez et suivez vos dépenses mensuelles' },

  exp_add:      { ar:'+ إضافة مصروف',       en:'+ Add Expense', fr:'+ Ajouter une dépense' },

  exp_edit:     { ar:'✏️ تعديل المصروف',    en:'✏️ Edit Expense', fr:'✏️ Modifier la dépense' },

  exp_name:     { ar:'اسم المصروف أو الفئة', en:'Expense name or category', fr:'Nom ou catégorie de la dépense' },

  exp_amount:   { ar:'المبلغ',              en:'Amount', fr:'Montant' },

  exp_count:    { ar:'عدد المصاريف',        en:'Expense Count', fr:'Nombre de dépenses' },

  exp_total:    { ar:'إجمالي المصاريف',    en:'Total Expenses', fr:'Total des dépenses' },

  exp_charity:  { ar:'الأعمال الخيرية',    en:'Charity', fr:'Charité' },

  exp_avg:      { ar:'متوسط المصروف',      en:'Average Expense', fr:'Dépense moyenne' },

  exp_no_data:  { ar:'لا توجد مصاريف مسجلة بعد', en:'No expenses recorded yet', fr:'Aucune dépense enregistrée' },

  exp_save_confirm: { ar:'✅ تأكيد التعديل', en:'✅ Confirm Edit', fr:'✅ Confirmer la modification' },

  exp_save_new:     { ar:'💾 حفظ المصروف',   en:'💾 Save Expense', fr:'💾 Enregistrer la dépense' },

  exp_list:     { ar:'قائمة المصاريف',     en:'Expenses List', fr:'Liste des dépenses' },

  exp_total_row:{ ar:'الإجمالي',           en:'Total', fr:'Total' },

  exp_footer:   { ar:'جميع المصاريف تُحتسب تلقائياً في لوحة التحكم', en:'All expenses are automatically counted in the dashboard', fr:'Toutes les dépenses sont automatiquement comptabilisées dans le tableau de bord' },

  /* ── Charity ── */

  charity_title:   { ar:'الأعمال الخيرية',  en:'Charity', fr:'Charité' },

  charity_subtitle:{ ar:'أضف المبالغ الخيرية الشهرية وسيتم احتسابها ضمن المصروفات', en:'Add monthly charity amounts — counted as expenses automatically', fr:'Ajoutez les montants mensuels — comptés automatiquement dans les dépenses' },

  charity_add:     { ar:'إضافة عمل خيري',  en:'Add Charity Payment', fr:'Ajouter un don' },

  charity_month:   { ar:'الشهر',           en:'Month', fr:'Mois' },

  charity_amount:  { ar:'المبلغ',          en:'Amount', fr:'Montant' },

  charity_name:    { ar:'الاسم أو الملاحظة', en:'Name or Note', fr:'Nom ou note' },

  charity_save:    { ar:'🤲 حفظ وتسجيل ضمن المصروفات', en:'🤲 Save & Record as Expense', fr:'🤲 Enregistrer comme dépense' },

  charity_month_total:{ ar:'إجمالي الشهر', en:'Month Total', fr:'Total du mois' },

  charity_year:    { ar:'إجمالي السنة',    en:'Year Total', fr:"Total de l'année" },

  charity_count:   { ar:'عدد التبرعات',    en:'Donation Count', fr:'Nombre de dons' },

  charity_types:   { ar:'أنواع الأعمال الخيرية', en:'Charity Types', fr:'Types de charité' },

  charity_daily_msg:{ ar:'رسالة اليوم',   en:"Today's Message", fr:'Message du jour' },

  charity_quote:   { ar:'"الصدقة تطفئ غضب الرب وتبارك في الرزق"', en:"\"Charity extinguishes the Lord's wrath and blesses provision\"", fr:'\"La charité éteint la colère du Seigneur et bénit la provision\"' },

  charity_history: { ar:'سجل الأعمال الخيرية', en:'Charity History', fr:'Historique des dons' },

  charity_summary: { ar:'ملخص كل الأشهر',  en:'All Months Summary', fr:'Résumé de tous les mois' },

  charity_ring:    { ar:'الأعمال الخيرية هذا الشهر', en:"This month's charity", fr:'Charité ce mois-ci' },

  charity_note:    { ar:'يُحتسب هذا المبلغ تلقائياً في إجمالي مصروفاتك', en:'This amount is automatically included in your total expenses', fr:'Ce montant est automatiquement inclus dans vos dépenses totales' },

  /* ── Savings education ── */

  sav_hero_title:   { ar:'أنشئ مستقبل ثروتك',  en:'Build Your Wealth Future', fr:'Construisez votre avenir financier' },

  sav_hero_sub:     { ar:'حوّل الادخار من عادة إلى نظام ذكي لبناء الثروة', en:'Transform saving from habit to a smart wealth-building system', fr:"Transformez l'épargne en un système intelligent de création de richesse" },

  sav_plan_btn:     { ar:'ابدأ الخطة ←',       en:'Start the Plan ←', fr:'Commencer le plan ←' },

  sav_ai_btn:       { ar:'🤖 تحليل الذكاء المالي', en:'🤖 AI Financial Analysis', fr:'🤖 Analyse financière IA' },

  sav_new_goal:     { ar:'+ إنشاء هدف جديد',   en:'+ Create New Goal', fr:'+ Créer un nouvel objectif' },

  sav_current:      { ar:'ادخارك الحالي',       en:'Current Savings', fr:'Épargne actuelle' },

  sav_target:       { ar:'الهدف المستهدف',      en:'Target Goal', fr:'Objectif cible' },

  sav_time_est:     { ar:'الوقت المقدّر',       en:'Estimated Time', fr:'Délai estimé' },

  sav_ai_score:     { ar:'تقييم SFM AI',        en:'SFM AI Score', fr:'Score SFM AI' },

  sav_path:         { ar:'مسار الثروة',          en:'Wealth Path', fr:'Parcours de richesse' },

  sav_tools:        { ar:'أدوات بناء الثروة',   en:'Wealth Building Tools', fr:'Outils de création de richesse' },

  sav_simulator:    { ar:'محاكي الثروة المستقبلية', en:'Future Wealth Simulator', fr:'Simulateur de richesse future' },

  sav_ai_advisor:   { ar:'مستشار الثروة الذكي', en:'AI Wealth Advisor', fr:'Conseiller richesse IA' },

  sav_dashboard:    { ar:'لوحة الثروة',         en:'Wealth Dashboard', fr:'Tableau de bord richesse' },

  /* ── Investments education ── */

  inv_hero_title:   { ar:'أنواع الاستثمار',        en:'Investment Types', fr:"Types d'investissement" },

  inv_hero_sub:     { ar:'ابنِ محفظتك الاستثمارية الذكية', en:'Build your smart investment portfolio', fr:'Construisez votre portefeuille intelligent' },

  inv_start_btn:    { ar:'ابدأ الاستثمار ←',       en:'Start Investing ←', fr:'Commencer à investir ←' },

  inv_ai_btn:       { ar:'🤖 تحليل AI',            en:'🤖 AI Analysis', fr:'🤖 Analyse IA' },

  inv_create_btn:   { ar:'+ إنشاء محفظة',          en:'+ Create Portfolio', fr:'+ Créer un portefeuille' },

  inv_current:      { ar:'الثروة الحالية',          en:'Current Wealth', fr:'Richesse actuelle' },

  inv_goal:         { ar:'هدف الاستثمار',           en:'Investment Goal', fr:"Objectif d'investissement" },

  inv_risk_idx:     { ar:'مؤشر المخاطر',            en:'Risk Index', fr:'Indice de risque' },

  inv_expected_ret: { ar:'العائد المتوقع',           en:'Expected Return', fr:'Rendement attendu' },

  inv_categories:   { ar:'فئات الاستثمار',          en:'Investment Categories', fr:"Catégories d'investissement" },

  inv_portfolio:    { ar:'لوحة المحفظة',            en:'Portfolio Dashboard', fr:'Tableau de bord portefeuille' },

  inv_ai_advisor:   { ar:'مستشار الاستثمار الذكي',  en:'AI Investment Advisor', fr:'Conseiller en investissement IA' },

  inv_wealth_path:  { ar:'مسار الاستثمار',          en:'Investment Path', fr:"Parcours d'investissement" },

  inv_simulator:    { ar:'محاكي نمو الثروة',        en:'Wealth Growth Simulator', fr:'Simulateur de croissance de richesse' },

  /* ── Footer ── */

  footer_rights:  { ar:'جميع الحقوق محفوظة', en:'All rights reserved', fr:'Tous droits réservés' },

  footer_tagline: { ar:'المدير المالي الذكي • AI Wealth Platform', en:'AI Wealth Platform • Smart Financial Manager', fr:'Plateforme de richesse IA • Gestionnaire financier intelligent' },

  settings_title: { ar:'الإعدادات', en:'Settings', fr:'Paramètres' },
  settings_subtitle: { ar:'اضبط حسابك وتفضيلاتك المالية وتجربة THE SFM', en:'Manage your account, financial preferences, and THE SFM experience', fr:'Gérez votre compte, vos préférences financières et votre expérience THE SFM' },
  settings_language: { ar:'إعدادات اللغة', en:'Language Settings', fr:'Langue' },
  settings_account: { ar:'إعدادات الحساب', en:'Account Settings', fr:'Compte' },
  settings_financial: { ar:'التفضيلات المالية', en:'Financial Preferences', fr:'Préférences financières' },
  settings_appearance: { ar:'المظهر', en:'Appearance', fr:'Apparence' },
  settings_notifications: { ar:'الإشعارات', en:'Notifications', fr:'Notifications' },
  settings_security: { ar:'الخصوصية والأمان', en:'Privacy & Security', fr:'Confidentialité et sécurité' },
  settings_data: { ar:'البيانات والتقارير', en:'Data & Reports', fr:'Données et rapports' },
  settings_save_language: { ar:'حفظ اللغة', en:'Save language', fr:'Enregistrer la langue' },
  settings_save_profile: { ar:'حفظ الملف', en:'Save profile', fr:'Enregistrer le profil' },
  settings_save_preferences: { ar:'حفظ التفضيلات', en:'Save preferences', fr:'Enregistrer les préférences' },
  settings_export_data: { ar:'تصدير البيانات', en:'Export data', fr:'Exporter les données' },
  settings_export_pdf: { ar:'تصدير تقرير PDF', en:'Export monthly PDF', fr:'Exporter le rapport PDF' },
  settings_clear_demo: { ar:'مسح البيانات التجريبية', en:'Clear demo data', fr:'Effacer les données démo' },

  /* ── Settings (extended keys) ── */
  settings_home:             { ar:'الرئيسية', en:'Home', fr:'Accueil' },
  settings_saved:            { ar:'تم الحفظ ✓', en:'Saved ✓', fr:'Enregistré ✓' },
  settings_select_lang:      { ar:'اختر اللغة', en:'Select language', fr:'Choisir la langue' },
  settings_display_name:     { ar:'اسم العرض', en:'Display name', fr:'Nom affiché' },
  settings_email:            { ar:'البريد الإلكتروني', en:'Email', fr:'E-mail' },
  settings_phone:            { ar:'الهاتف', en:'Phone', fr:'Téléphone' },
  settings_country:          { ar:'الدولة', en:'Country', fr:'Pays' },
  settings_profession:       { ar:'المهنة', en:'Profession', fr:'Profession' },
  settings_currency:         { ar:'العملة الافتراضية', en:'Default currency', fr:'Devise par défaut' },
  settings_cycle_start:      { ar:'يوم بداية الدورة المالية', en:'Financial cycle start day', fr:'Jour de début du cycle financier' },
  settings_cycle_hint:       { ar:'اليوم الذي يبدأ فيه كل شهر مالي (1–28)', en:'Day each financial month begins (1–28)', fr:'Jour de début de chaque mois financier (1–28)' },
  settings_cycle_day_label:  { ar:'يوم البداية', en:'Start day', fr:'Jour de début' },
  settings_budget:           { ar:'هدف الميزانية الشهرية', en:'Monthly budget target', fr:'Objectif budget mensuel' },
  settings_savings_pct:      { ar:'هدف الادخار %', en:'Savings target %', fr:'Objectif épargne %' },
  settings_invest_pct:       { ar:'هدف الاستثمار %', en:'Investment target %', fr:'Objectif investissement %' },
  settings_charity_pct:      { ar:'هدف الخير %', en:'Charity target %', fr:'Objectif charité %' },
  settings_theme_light:      { ar:'فاتح', en:'Light', fr:'Clair' },
  settings_theme_dark:       { ar:'داكن', en:'Dark', fr:'Sombre' },
  settings_theme_system:     { ar:'النظام', en:'System', fr:'Système' },
  settings_luxury:           { ar:'تفعيل اللمسة الفاخرة', en:'Luxury theme accent', fr:'Accent thème luxe' },
  settings_notif_reports:    { ar:'تذكير التقرير الشهري', en:'Monthly report reminders', fr:'Rappels rapport mensuel' },
  settings_notif_expenses:   { ar:'تنبيهات المصروفات', en:'Expense alerts', fr:'Alertes de dépenses' },
  settings_notif_invest:     { ar:'تنبيهات الاستثمار', en:'Investment alerts', fr:'Alertes investissement' },
  settings_notif_ai:         { ar:'تنبيهات توصيات الذكاء الاصطناعي', en:'AI recommendation alerts', fr:'Alertes recommandations IA' },
  settings_notif_hint:       { ar:'الإشعارات الفعلية تتطلب إعداد مزود Push — القيم محفوظة في التفضيلات', en:'Live push requires a push provider — values are saved in preferences', fr:'Les notifications en direct nécessitent un fournisseur Push — les valeurs sont enregistrées' },
  settings_change_password:  { ar:'تغيير كلمة المرور', en:'Change password', fr:'Changer le mot de passe' },
  settings_two_factor:       { ar:'المصادقة الثنائية', en:'Two-factor authentication', fr:'Authentification à deux facteurs' },
  settings_2fa_hint:         { ar:'جاهزة للربط عند تفعيل مزود المصادقة', en:'Ready to connect when auth provider support is enabled', fr:"Prêt à connecter quand le fournisseur d'authentification est activé" },
  settings_2fa_title:        { ar:'المصادقة الثنائية', en:'Two-Factor Authentication', fr:'Authentification à deux facteurs' },
  settings_2fa_body:         { ar:'المصادقة الثنائية قيد التطوير وستكون متاحة في تحديث قادم من THE SFM.', en:'Two-factor authentication is under development and will be available in an upcoming THE SFM update.', fr:"L'authentification à deux facteurs est en cours de développement et sera disponible dans une prochaine mise à jour THE SFM." },
  settings_under_dev:        { ar:'قيد التطوير', en:'Under Development', fr:'En développement' },
  settings_close:            { ar:'إغلاق', en:'Close', fr:'Fermer' },
  settings_cancel:           { ar:'إلغاء', en:'Cancel', fr:'Annuler' },
  settings_confirm:          { ar:'تأكيد', en:'Confirm', fr:'Confirmer' },
  settings_danger_zone:      { ar:'منطقة الخطر', en:'Danger Zone', fr:'Zone de danger' },
  settings_danger_hint:      { ar:'إجراءات لا يمكن التراجع عنها — تأكيد مطلوب قبل كل خطوة', en:'Irreversible actions — confirmation required before each step', fr:'Actions irréversibles — confirmation requise avant chaque étape' },
  settings_delete_account:   { ar:'حذف الحساب نهائياً', en:'Delete account permanently', fr:'Supprimer définitivement le compte' },
  settings_delete_confirm:   { ar:'تحذير: سيتم حذف جميع بياناتك بشكل نهائي', en:'Warning: all your data will be permanently deleted', fr:'Avertissement : toutes vos données seront définitivement supprimées' },
  settings_delete_warning:   { ar:'سيتم حذف ملفك الشخصي ومصادر الدخل والمصروفات والمدخرات والاستثمارات والأهداف — لا يمكن التراجع عن هذا الإجراء', en:'Your profile, income sources, expenses, savings, investments, and goals will be removed — this cannot be undone', fr:'Votre profil, sources de revenus, dépenses, épargnes, investissements et objectifs seront supprimés — cette action est irréversible' },
  settings_delete_type:      { ar:'اكتب كلمة التأكيد للمتابعة', en:'Type the confirmation word to proceed', fr:'Tapez le mot de confirmation pour continuer' },
  settings_delete_btn:       { ar:'حذف الحساب', en:'Delete account', fr:'Supprimer le compte' },
  settings_deleting:         { ar:'جارٍ الحذف...', en:'Deleting...', fr:'Suppression...' },
  settings_delete_error:     { ar:'حدث خطأ أثناء الحذف. حاول مرة أخرى.', en:'An error occurred during deletion. Please try again.', fr:'Une erreur s\'est produite lors de la suppression. Réessayez.' },
  settings_new_pass:         { ar:'كلمة المرور الجديدة', en:'New password', fr:'Nouveau mot de passe' },
  settings_confirm_pass:     { ar:'تأكيد كلمة المرور', en:'Confirm password', fr:'Confirmer le mot de passe' },
  settings_pass_mismatch:    { ar:'كلمتا المرور لا تتطابقان', en:'Passwords do not match', fr:'Les mots de passe ne correspondent pas' },
  settings_pass_short:       { ar:'يجب أن تكون 8 أحرف على الأقل', en:'Must be at least 8 characters', fr:'Au moins 8 caractères requis' },
  settings_pass_changed:     { ar:'تم تغيير كلمة المرور بنجاح', en:'Password changed successfully', fr:'Mot de passe modifié avec succès' },
  settings_pass_error:       { ar:'تعذر تغيير كلمة المرور. تأكد من صلاحية الجلسة وحاول مرة أخرى.', en:'Could not change password. Ensure your session is valid and try again.', fr:'Impossible de changer le mot de passe. Vérifiez votre session et réessayez.' },
  settings_name_ph:          { ar:'أدخل الاسم', en:'Enter name', fr:'Entrez le nom' },
  settings_country_ph:       { ar:'الكويت', en:'Kuwait', fr:'Koweït' },
  settings_profession_ph:    { ar:'مهندس، طبيب، معلم...', en:'Engineer, doctor, teacher...', fr:'Ingénieur, médecin, enseignant...' },
  placeholder_first_name: { ar:'أدخل الاسم الأول', en:'Enter first name', fr:'Entrez le prénom' },
  placeholder_last_name: { ar:'أدخل الاسم الأخير', en:'Enter last name', fr:'Entrez le nom' },

  login_title: { ar:'المدير المالي الذكي', en:'Smart Financial Manager', fr:'Gestionnaire financier intelligent' },
  login_subtitle: { ar:'ادخل إلى لوحة THE SFM لإدارة دخلك ومصاريفك وأهدافك بوضوح.', en:'Sign in to THE SFM dashboard to manage income, expenses, and goals clearly.', fr:'Connectez-vous au tableau THE SFM pour gérer revenus, dépenses et objectifs.' },
  login_username: { ar:'اسم المستخدم', en:'Username', fr:"Nom d'utilisateur" },
  login_password: { ar:'كلمة المرور', en:'Password', fr:'Mot de passe' },
  login_confirm_password: { ar:'تأكيد كلمة المرور', en:'Confirm password', fr:'Confirmer le mot de passe' },
  login_sign_in: { ar:'تسجيل الدخول', en:'Sign in', fr:'Connexion' },
  login_create_account: { ar:'إنشاء حساب', en:'Create account', fr:'Créer un compte' },
  login_switch_create: { ar:'إنشاء حساب جديد', en:'Create new account', fr:'Créer un nouveau compte' },
  login_switch_login: { ar:'لدي حساب بالفعل', en:'I already have an account', fr:"J'ai déjà un compte" },
  login_guest: { ar:'متابعة كضيف', en:'Continue as guest', fr:'Continuer en invité' },
  login_forgot: { ar:'نسيت كلمة المرور؟', en:'Forgot password?', fr:'Mot de passe oublié ?' },
  login_username_placeholder: { ar:'أدخل اسم المستخدم', en:'Enter username', fr:"Entrez le nom d'utilisateur" },
  login_password_placeholder: { ar:'أدخل كلمة المرور', en:'Enter password', fr:'Entrez le mot de passe' },
  login_error_empty: { ar:'أكمل كل الحقول المطلوبة.', en:'Complete all required fields.', fr:'Complétez tous les champs requis.' },
  login_error_short_username: { ar:'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.', en:'Username must be at least 3 characters.', fr:"Le nom d'utilisateur doit contenir au moins 3 caractères." },
  login_error_short_password: { ar:'كلمة المرور يجب أن تكون 6 أحرف على الأقل.', en:'Password must be at least 6 characters.', fr:'Le mot de passe doit contenir au moins 6 caractères.' },
  login_error_mismatch: { ar:'كلمتا المرور غير متطابقتين.', en:'Passwords do not match.', fr:'Les mots de passe ne correspondent pas.' },
  login_error_exists: { ar:'اسم المستخدم مستخدم بالفعل.', en:'This username is already taken.', fr:"Ce nom d'utilisateur est déjà utilisé." },
  login_error_failed: { ar:'اسم المستخدم أو كلمة المرور غير صحيحة.', en:'Username or password is incorrect.', fr:"Nom d'utilisateur ou mot de passe incorrect." },
  login_error_register: { ar:'تعذر إنشاء الحساب. حاول مرة أخرى.', en:'Could not create the account. Try again.', fr:'Impossible de créer le compte. Réessayez.' },
  login_reset_sent: { ar:'تم إرسال رابط استعادة كلمة المرور إن كان الحساب موجوداً.', en:'A reset link was sent if the account exists.', fr:'Un lien de réinitialisation a été envoyé si le compte existe.' },

  update: { ar:'تحديث', en:'Update', fr:'Mettre à jour' },
  confirmDelete: { ar:'تأكيد الحذف', en:'Confirm deletion', fr:'Confirmer la suppression' },
  deleteWarning: { ar:'لا يمكن التراجع عن هذا الإجراء', en:'This action cannot be undone', fr:'Cette action est irréversible' },
  deleteSuccess: { ar:'تم الحذف', en:'Deleted successfully', fr:'Supprimé avec succès' },
  updateSuccess: { ar:'تم التحديث', en:'Updated successfully', fr:'Mis à jour avec succès' },
  entry_name: { ar:'الاسم', en:'Name', fr:'Nom' },
  entry_amount: { ar:'المبلغ', en:'Amount', fr:'Montant' },
  entry_category: { ar:'التصنيف', en:'Category', fr:'Catégorie' },
  entry_save: { ar:'إضافة', en:'Add', fr:'Ajouter' },
  entry_validation_error: { ar:'أدخل الاسم والمبلغ بشكل صحيح', en:'Enter a valid name and amount', fr:'Entrez un nom et un montant valides' },
  entry_auth_required: { ar:'سجل الدخول أولاً لإتمام العملية', en:'Sign in first to complete this action', fr:"Connectez-vous d'abord pour terminer cette action" },
  savings_noEntriesYet: { ar:'لم تُسجّل عمليات إدخار بعد', en:'No savings recorded yet', fr:'Aucune épargne enregistrée' },
  expenses_deleteConfirmMessage: { ar:'هل أنت متأكد من حذف هذا المصروف؟', en:'Delete this expense?', fr:'Supprimer cette dépense ?' },
  income_deleteConfirmMessage: { ar:'هل أنت متأكد من حذف هذا الدخل؟', en:'Delete this income?', fr:'Supprimer ce revenu ?' },
  invest_deleteConfirmMessage: { ar:'هل أنت متأكد من حذف هذا الاستثمار؟', en:'Delete this investment?', fr:'Supprimer cet investissement ?' },
  savings_deleteConfirmMessage: { ar:'هل أنت متأكد من حذف عملية الإدخار هذه؟', en:'Delete this saving entry?', fr:'Supprimer cette épargne ?' },
  expenses_entry_title: { ar:'مصروف', en:'Expense', fr:'Dépense' },
  income_entry_title: { ar:'دخل', en:'Income', fr:'Revenu' },
  invest_entry_title: { ar:'استثمار', en:'Investment', fr:'Investissement' },
  savings_entry_title: { ar:'إدخار', en:'Saving', fr:'Épargne' },
  invest_hero_title: { ar:'الاستثمار', en:'Investments', fr:'Investissements' },
  invest_hero_subtitle: { ar:'تابع محفظتك الاستثمارية، قيّم المخاطر، وحسّن مساهماتك الشهرية بذكاء.', en:'Track your portfolio, assess risk, and optimize monthly contributions intelligently.', fr:'Suivez votre portefeuille, évaluez les risques et optimisez vos contributions mensuelles intelligemment.' },
  invest_hero_addCta: { ar:'+ إضافة استثمار', en:'+ Add Investment', fr:'+ Ajouter un investissement' },
  invest_hero_aiCta: { ar:'تحليل المحفظة بالذكاء الاصطناعي', en:'Analyze with AI', fr:"Analyser avec l'IA" },
  invest_hero_activeBadge: { ar:'مسار نشط', en:'Active track', fr:'Suivi actif' },
  invest_summary_portfolioValue: { ar:'قيمة المحفظة', en:'Portfolio Value', fr:'Valeur du portefeuille' },
  invest_summary_monthlyContribution: { ar:'المساهمة الشهرية', en:'Monthly Contribution', fr:'Contribution mensuelle' },
  invest_summary_riskLevel: { ar:'مستوى المخاطر', en:'Risk Level', fr:'Niveau de risque' },
  invest_summary_diversification: { ar:'تنويع المحفظة', en:'Diversification', fr:'Diversification' },
  invest_summary_expectedReturn: { ar:'العائد السنوي المتوقع', en:'Expected Annual Return', fr:'Rendement annuel attendu' },
  invest_summary_categoriesCount: { ar:'{count} فئات', en:'{count} categories', fr:'{count} catégories' },
  invest_summary_notFinancialAdvice: { ar:'تقديري، ليس نصيحة مالية', en:'Estimate, not financial advice', fr:'Estimation, pas un conseil financier' },
  invest_summary_defaultReturn: { ar:'افتراضي 6% لعدم إدخال عائد متوقع', en:'Default 6% because no expected return was entered', fr:"6 % par défaut, aucun rendement attendu n'a été saisi" },
  invest_types_stocks: { ar:'أسهم', en:'Stocks', fr:'Actions' },
  invest_types_realEstate: { ar:'عقار', en:'Real Estate', fr:'Immobilier' },
  invest_types_fund: { ar:'صندوق استثماري', en:'Fund', fr:'Fonds' },
  invest_types_gold: { ar:'ذهب', en:'Gold', fr:'Or' },
  invest_types_cash: { ar:'كاش', en:'Cash', fr:'Liquidités' },
  invest_types_crypto: { ar:'عملات رقمية', en:'Crypto', fr:'Cryptomonnaies' },
  invest_types_project: { ar:'مشروع', en:'Project', fr:'Projet' },
  invest_types_other: { ar:'أخرى', en:'Other', fr:'Autre' },
  invest_risks_low: { ar:'منخفض', en:'Low', fr:'Faible' },
  invest_risks_medium: { ar:'متوسط', en:'Medium', fr:'Moyen' },
  invest_risks_high: { ar:'عالي', en:'High', fr:'Élevé' },
  invest_form_titleAdd: { ar:'إضافة استثمار', en:'Add Investment', fr:'Ajouter un investissement' },
  invest_form_titleEdit: { ar:'تعديل الاستثمار', en:'Edit Investment', fr:"Modifier l'investissement" },
  invest_form_name: { ar:'اسم الاستثمار', en:'Name', fr:'Nom' },
  invest_form_namePlaceholder: { ar:'مثال: سهم بيتك، أرض، صندوق', en:'e.g. Apple shares, land, fund', fr:'ex. actions, terrain, fonds' },
  invest_form_type: { ar:'نوع الاستثمار', en:'Type', fr:'Type' },
  invest_form_currentValue: { ar:'القيمة الحالية', en:'Current Value', fr:'Valeur actuelle' },
  invest_form_monthly: { ar:'المساهمة الشهرية', en:'Monthly Contribution', fr:'Contribution mensuelle' },
  invest_form_startDate: { ar:'تاريخ البداية', en:'Start Date', fr:'Date de début' },
  invest_form_risk: { ar:'مستوى المخاطر', en:'Risk Level', fr:'Niveau de risque' },
  invest_form_expectedReturn: { ar:'العائد السنوي المتوقع', en:'Expected Annual Return', fr:'Rendement annuel attendu' },
  invest_form_notes: { ar:'ملاحظات', en:'Notes', fr:'Notes' },
  invest_form_save: { ar:'حفظ الاستثمار', en:'Save Investment', fr:'Enregistrer' },
  invest_form_update: { ar:'تحديث', en:'Update', fr:'Mettre à jour' },
  invest_form_successAdd: { ar:'تم حفظ الاستثمار', en:'Investment saved', fr:'Investissement enregistré' },
  invest_form_successUpdate: { ar:'تم تحديث الاستثمار', en:'Investment updated', fr:'Investissement mis à jour' },
  invest_form_errors_nameRequired: { ar:'الاسم مطلوب', en:'Name is required', fr:'Le nom est requis' },
  invest_form_errors_valuePositive: { ar:'القيمة يجب أن تكون رقماً أكبر من صفر', en:'Value must be greater than zero', fr:'La valeur doit être supérieure à zéro' },
  invest_form_errors_contributionPositive: { ar:'المساهمة لا يمكن أن تكون سالبة', en:'Contribution cannot be negative', fr:'La contribution ne peut pas être négative' },
  invest_form_errors_returnRange: { ar:'العائد يجب أن يكون بين 0 و 100', en:'Return must be between 0 and 100', fr:'Le rendement doit être entre 0 et 100' },
  invest_list_search: { ar:'ابحث بالاسم...', en:'Search by name...', fr:'Rechercher par nom...' },
  invest_list_allTypes: { ar:'كل الفئات', en:'All categories', fr:'Toutes les catégories' },
  invest_list_sortBy: { ar:'ترتيب', en:'Sort by', fr:'Trier par' },
  invest_list_valueDesc: { ar:'الأعلى قيمة', en:'Highest value', fr:'Valeur décroissante' },
  invest_list_valueAsc: { ar:'الأقل قيمة', en:'Lowest value', fr:'Valeur croissante' },
  invest_list_monthlyDesc: { ar:'أعلى مساهمة شهرية', en:'Highest monthly', fr:'Contribution la plus élevée' },
  invest_list_riskDesc: { ar:'الأعلى مخاطرة', en:'Highest risk', fr:'Risque le plus élevé' },
  invest_list_newest: { ar:'الأحدث', en:'Newest', fr:'Les plus récents' },
  invest_list_edit: { ar:'تعديل', en:'Edit', fr:'Modifier' },
  invest_list_delete: { ar:'حذف', en:'Delete', fr:'Supprimer' },
  invest_list_details: { ar:'تفاصيل', en:'Details', fr:'Détails' },
  invest_list_ofPortfolio: { ar:'{pct}% من المحفظة', en:'{pct}% of portfolio', fr:'{pct}% du portefeuille' },
  invest_empty_title: { ar:'ابدأ ببناء محفظتك الاستثمارية', en:'Start building your portfolio', fr:'Commencez à bâtir votre portefeuille' },
  invest_empty_description: { ar:'أضف أول استثمار حتى نقدر نحسب قيمة المحفظة، المساهمة الشهرية، المخاطر، والتوقعات.', en:'Add your first investment so we can calculate value, contributions, risk, and projections.', fr:'Ajoutez votre premier investissement pour calculer la valeur, les contributions, le risque et les projections.' },
  invest_empty_cta: { ar:'+ إضافة أول استثمار', en:'+ Add first investment', fr:'+ Ajouter le premier investissement' },
  invest_delete_title: { ar:'تأكيد الحذف', en:'Confirm Deletion', fr:'Confirmer la suppression' },
  invest_delete_message: { ar:'هل أنت متأكد من حذف "{name}"؟ لا يمكن التراجع.', en:'Delete "{name}"? This cannot be undone.', fr:'Supprimer « {name} » ? Cette action est irréversible.' },
  invest_delete_confirm: { ar:'حذف', en:'Delete', fr:'Supprimer' },
  invest_delete_success: { ar:'تم حذف الاستثمار', en:'Investment deleted', fr:'Investissement supprimé' },
  invest_charts_distribution: { ar:'توزيع المحفظة حسب النوع', en:'Portfolio by Type', fr:'Répartition par type' },
  invest_charts_byInvestment: { ar:'قيمة كل استثمار', en:'Value by Investment', fr:'Valeur par investissement' },
  invest_charts_projection12: { ar:'نمو متوقع خلال 12 شهر', en:'12-Month Growth Projection', fr:'Projection sur 12 mois' },
  invest_charts_month: { ar:'شهر', en:'Month', fr:'Mois' },
  invest_insights_title: { ar:'رؤى ذكية', en:'Smart Insights', fr:'Insights intelligents' },
  invest_insights_addMoreForDiversification: { ar:'أضف استثمارين على الأقل حتى نقدر نحلل التنويع بدقة.', en:'Add at least two investments for accurate diversification analysis.', fr:'Ajoutez au moins deux investissements pour analyser la diversification.' },
  invest_insights_concentratedRisk: { ar:'محفظتك مركّزة بنسبة {pct}% في {type}، الأفضل إضافة فئة ثانية لتقليل المخاطر.', en:'Your portfolio is {pct}% concentrated in {type}. Adding another category will reduce risk.', fr:'Votre portefeuille est concentré à {pct}% dans {type}. Ajoutez une autre catégorie pour réduire le risque.' },
  invest_insights_noMonthlyContribution: { ar:'لا توجد مساهمة شهرية حالياً، أضف مساهمة شهرية حتى يظهر نمو المحفظة في التوقعات.', en:'No monthly contribution is set. Add one so projections can show portfolio growth.', fr:"Aucune contribution mensuelle n'est définie. Ajoutez-en une pour projeter la croissance." },
  invest_insights_monthlyContribution: { ar:'مساهمتك الشهرية {amount} تعني مساهمات مباشرة قدرها {total} خلال 5 سنوات قبل العوائد.', en:'Your monthly {amount} equals {total} in direct contributions over 5 years before returns.', fr:'Votre contribution mensuelle de {amount} représente {total} sur 5 ans avant rendement.' },
  invest_insights_projection5y: { ar:'بالاستمرار بنفس المساهمة وعائد {rate}%، قد تصل محفظتك إلى {amount} خلال 5 سنوات.', en:'At {rate}% return, your portfolio could reach {amount} in 5 years.', fr:'À un rendement de {rate} %, votre portefeuille pourrait atteindre {amount} en 5 ans.' },
  invest_insights_wellDiversified: { ar:'محفظتك متنوّعة بشكل ممتاز عبر {count} فئات.', en:'Excellent diversification across {count} categories.', fr:'Excellente diversification sur {count} catégories.' },
  invest_insights_diversifyMore: { ar:'محفظتك موزعة على {count} فئات فقط؛ إضافة فئة جديدة تخفف تركز المخاطر.', en:'Your portfolio spans only {count} categories; adding a new category reduces concentration risk.', fr:"Votre portefeuille couvre seulement {count} catégories ; ajoutez une catégorie pour réduire le risque de concentration." },
  invest_projections_title: { ar:'توقّع نمو المحفظة', en:'Portfolio Growth Projection', fr:'Projection de croissance' },
  invest_projections_years1: { ar:'بعد سنة', en:'1 year', fr:'1 an' },
  invest_projections_years3: { ar:'بعد 3 سنوات', en:'3 years', fr:'3 ans' },
  invest_projections_years5: { ar:'بعد 5 سنوات', en:'5 years', fr:'5 ans' },
  invest_projections_projectedValue: { ar:'القيمة المتوقعة', en:'Projected Value', fr:'Valeur projetée' },
  invest_projections_totalContributions: { ar:'إجمالي المساهمات', en:'Total Contributions', fr:'Contributions totales' },
  invest_projections_expectedGain: { ar:'العائد المتوقع', en:'Expected Gain', fr:'Gain attendu' },
  invest_projections_disclaimer: { ar:'الأرقام تقديرية وليست توصية مالية.', en:'Figures are estimates, not financial advice.', fr:'Chiffres estimatifs, pas un conseil financier.' },
  goals_empty_state: { ar:'لا توجد أهداف مالية محفوظة حالياً', en:'No financial goals saved yet', fr:'Aucun objectif financier enregistré' },
  goal_edit_button: { ar:'تعديل الهدف', en:'Edit Goal', fr:"Modifier l'objectif" },
  goal_edit_title: { ar:'تعديل الهدف المالي', en:'Edit financial goal', fr:"Modifier l'objectif financier" },
  goal_name_label: { ar:'اسم الهدف', en:'Goal name', fr:"Nom de l'objectif" },
  goal_type_label: { ar:'نوع الهدف', en:'Goal type', fr:"Type d'objectif" },
  goal_type_debt: { ar:'سداد دين', en:'Debt payoff', fr:'Remboursement de dette' },
  goal_type_saving: { ar:'ادخار', en:'Saving', fr:'Épargne' },
  goal_type_investment: { ar:'استثمار', en:'Investment', fr:'Investissement' },
  goal_type_emergency: { ar:'صندوق طوارئ', en:'Emergency fund', fr:"Fonds d'urgence" },
  goal_type_asset: { ar:'شراء أصل', en:'Asset purchase', fr:"Achat d'actif" },
  goal_type_education: { ar:'تعليم', en:'Education', fr:'Éducation' },
  goal_type_travel: { ar:'سفر', en:'Travel', fr:'Voyage' },
  goal_type_retirement: { ar:'تقاعد', en:'Retirement', fr:'Retraite' },
  goal_type_custom: { ar:'مخصص', en:'Custom', fr:'Personnalisé' },
  goal_target_amount: { ar:'المبلغ المستهدف', en:'Target amount', fr:'Montant cible' },
  goal_current_amount: { ar:'المبلغ المدخر حالياً', en:'Current saved amount', fr:'Montant actuellement épargné' },
  goal_monthly_contribution: { ar:'المساهمة الشهرية', en:'Monthly contribution', fr:'Contribution mensuelle' },
  goal_deadline: { ar:'تاريخ الهدف', en:'Target date', fr:'Date cible' },
  goal_deadline_missing: { ar:'غير محدد', en:'Not set', fr:'Non définie' },
  goal_category_label: { ar:'فئة الهدف', en:'Goal category', fr:"Catégorie de l'objectif" },
  goal_category_general: { ar:'عام', en:'General', fr:'Général' },
  goal_category_emergency: { ar:'طوارئ', en:'Emergency', fr:'Urgence' },
  goal_category_home: { ar:'منزل', en:'Home', fr:'Logement' },
  goal_category_car: { ar:'سيارة', en:'Car', fr:'Voiture' },
  goal_category_education: { ar:'تعليم', en:'Education', fr:'Éducation' },
  goal_category_business: { ar:'مشروع', en:'Business', fr:'Projet' },
  goal_priority_label: { ar:'الأولوية', en:'Priority', fr:'Priorité' },
  goal_priority_low: { ar:'منخفضة', en:'Low', fr:'Faible' },
  goal_priority_medium: { ar:'متوسطة', en:'Medium', fr:'Moyenne' },
  goal_priority_high: { ar:'عالية', en:'High', fr:'Élevée' },
  goal_funding_source_label: { ar:'مصدر التمويل', en:'Funding source', fr:'Source de financement' },
  goal_funding_salary: { ar:'الراتب', en:'Salary', fr:'Salaire' },
  goal_funding_investment_return: { ar:'عوائد الاستثمار', en:'Investment return', fr:"Rendement d'investissement" },
  goal_funding_expense_reduction: { ar:'خفض المصروفات', en:'Expense reduction', fr:'Réduction des dépenses' },
  goal_funding_extra_income: { ar:'دخل إضافي', en:'Extra income', fr:'Revenu supplémentaire' },
  goal_funding_automatic: { ar:'تخصيص تلقائي', en:'Automatic allocation', fr:'Allocation automatique' },
  goal_currency_label: { ar:'العملة', en:'Currency', fr:'Devise' },
  goal_notes_label: { ar:'ملاحظات', en:'Notes', fr:'Notes' },
  goal_ai_toggle: { ar:'تفعيل خطة الذكاء الاصطناعي', en:'Enable AI Plan', fr:'Activer le plan IA' },
  goal_ai_preview_title: { ar:'معاينة خطة الذكاء الاصطناعي', en:'AI plan preview', fr:'Aperçu du plan IA' },
  goal_ai_missing_title: { ar:'أكمل هذه البيانات لإظهار خطة رقمية دقيقة', en:'Complete these fields for a precise numeric plan', fr:'Complétez ces champs pour obtenir un plan chiffré précis' },
  goal_missing_target: { ar:'المبلغ المستهدف', en:'Target amount', fr:'Montant cible' },
  goal_missing_target_hint: { ar:'أدخل مبلغ الهدف لحساب التقدم', en:'Enter a target amount to calculate progress', fr:'Saisissez un montant cible pour calculer la progression' },
  goal_missing_current: { ar:'المبلغ الحالي', en:'Current amount', fr:'Montant actuel' },
  goal_missing_contribution: { ar:'المساهمة الشهرية', en:'Monthly contribution', fr:'Contribution mensuelle' },
  goal_missing_deadline: { ar:'تاريخ مستقبلي للهدف', en:'Future target date', fr:'Date cible future' },
  goal_current_contribution: { ar:'مساهمتك الحالية', en:'Current contribution', fr:'Contribution actuelle' },
  goal_validation_required: { ar:'أدخل اسم الهدف والمبلغ المستهدف بشكل صحيح', en:'Enter a valid goal name and target amount', fr:"Saisissez un nom d'objectif et un montant cible valides" },
  goal_validation_positive: { ar:'المبالغ يجب أن تكون صفراً أو أكثر', en:'Amounts must be zero or higher', fr:'Les montants doivent être supérieurs ou égaux à zéro' },
  goal_validation_current_over_target: { ar:'المبلغ الحالي لا يمكن أن يكون أكبر من المبلغ المستهدف', en:'Current amount cannot be greater than target amount', fr:'Le montant actuel ne peut pas dépasser le montant cible' },
  goal_validation_future_deadline: { ar:'تاريخ الهدف يجب أن يكون في المستقبل', en:'Deadline must be a future date', fr:'La date cible doit être future' },
  goal_create_success: { ar:'تم إنشاء الهدف بنجاح', en:'Goal created successfully', fr:'Objectif créé avec succès' },
  goal_update_success: { ar:'تم تحديث الهدف بنجاح', en:'Goal updated successfully', fr:'Objectif mis à jour avec succès' },
  goal_update_error: { ar:'تعذر تحديث الهدف', en:'Could not update the goal', fr:"Impossible de mettre à jour l'objectif" },
  goal_ai_title: { ar:'تحليل الذكاء الاصطناعي للوصول إلى الهدف', en:'AI Goal Plan', fr:"Plan IA pour l'objectif" },
  goal_remaining_amount: { ar:'المبلغ المتبقي', en:'Remaining amount', fr:'Montant restant' },
  goal_required_monthly: { ar:'الادخار الشهري المطلوب', en:'Required monthly saving', fr:'Épargne mensuelle requise' },
  goal_estimated_completion: { ar:'المدة المتوقعة', en:'Estimated completion', fr:'Achèvement estimé' },
  goal_status_label: { ar:'حالة الهدف', en:'Goal status', fr:"Statut de l'objectif" },
  goal_adjustment_label: { ar:'الزيادة المطلوبة', en:'Needed adjustment', fr:'Ajustement requis' },
  goal_plan_title: { ar:'الخطة المقترحة', en:'Suggested plan', fr:'Plan suggéré' },
  goal_months: { ar:'شهر', en:'months', fr:'mois' },
  goal_unknown_completion: { ar:'أضف مساهمة شهرية للتقدير', en:'Add a monthly contribution to estimate', fr:'Ajoutez une contribution mensuelle pour estimer' },
  goal_risk_low: { ar:'مخاطر منخفضة', en:'Low risk', fr:'Risque faible' },
  goal_risk_medium: { ar:'مخاطر متوسطة', en:'Medium risk', fr:'Risque moyen' },
  goal_risk_high: { ar:'مخاطر عالية', en:'High risk', fr:'Risque élevé' },
  goal_status_on_track: { ar:'قابل للتحقيق', en:'On track', fr:'En bonne voie' },
  goal_status_needs_adjustment: { ar:'يحتاج تعديلاً', en:'Needs adjustment', fr:'Ajustement nécessaire' },
  goal_status_high_risk: { ar:'خطر مرتفع', en:'High risk', fr:'Risque élevé' },
  goal_ai_no_contribution: { ar:'لا توجد مساهمة شهرية لهذا الهدف، أضف مبلغاً شهرياً حتى نقدر مدة الوصول.', en:'There is no monthly contribution for this goal. Add one so we can estimate the completion timeline.', fr:"Aucune contribution mensuelle n'est définie pour cet objectif. Ajoutez-en une pour estimer le délai." },
  goal_ai_on_track: { ar:'تحتاج إلى ادخار {required} شهرياً للوصول إلى هذا الهدف، ومساهمتك الحالية مناسبة.', en:'You need to save {required} monthly to reach this goal, and your current contribution is suitable.', fr:'Vous devez épargner {required} par mois pour atteindre cet objectif, et votre contribution actuelle est adaptée.' },
  goal_ai_needs_adjustment: { ar:'مساهمتك الحالية أقل من المطلوب. تحتاج إلى زيادة الادخار بمقدار {adjustment} شهرياً.', en:'Your current contribution is below the requirement. Increase saving by {adjustment} monthly.', fr:'Votre contribution actuelle est inférieure au besoin. Augmentez votre épargne de {adjustment} par mois.' },
  goal_ai_high_risk: { ar:'الهدف يحتاج خطة أقوى. نسبة الصرف الحالية {expenseRatio}% وقد تحتاج إلى خفض المصروفات وزيادة الادخار.', en:'This goal needs a stronger plan. Current spending ratio is {expenseRatio}% and may require expense reduction plus higher saving.', fr:'Cet objectif nécessite un plan plus solide. Le ratio de dépenses actuel est de {expenseRatio}% et peut nécessiter une réduction des dépenses ainsi qu\'une épargne plus élevée.' },
  goal_step_add_contribution: { ar:'أضف مساهمة شهرية ثابتة لهذا الهدف قبل الصرف اليومي.', en:'Add a fixed monthly contribution to this goal before daily spending.', fr:'Ajoutez une contribution mensuelle fixe à cet objectif avant les dépenses quotidiennes.' },
  goal_step_raise_contribution: { ar:'ارفع مساهمة الهدف الشهرية إلى {amount}.', en:'Raise the monthly goal contribution to {amount}.', fr:'Augmentez la contribution mensuelle à {amount}.' },
  goal_step_reduce_expenses: { ar:'قلل المصروفات غير الأساسية بنسبة {percent}% شهرياً.', en:'Reduce non-essential expenses by {percent}% monthly.', fr:'Réduisez les dépenses non essentielles de {percent}% par mois.' },
  goal_step_review_spending: { ar:'راجع المصروفات المتكررة وحدد بنداً واحداً يمكن تخفيضه.', en:'Review recurring expenses and identify one item to reduce.', fr:'Passez en revue les dépenses récurrentes et choisissez un poste à réduire.' },
  goal_step_automate: { ar:'حوّل مبلغ الهدف تلقائياً بداية كل شهر.', en:'Automate the goal transfer at the start of every month.', fr:"Automatisez le transfert vers l'objectif au début de chaque mois." },
  goal_step_increase_saving: { ar:'وجّه {amount} من الفائض الشهري مباشرة إلى هذا الهدف.', en:'Move {amount} of monthly surplus directly into this goal.', fr:"Affectez {amount} de l'excédent mensuel directement à cet objectif." },
  goal_step_monthly_review: { ar:'راجع الهدف كل شهر وعدّل المساهمة حسب الدخل والمصروفات.', en:'Review the goal monthly and adjust contribution based on income and expenses.', fr:"Révisez l'objectif chaque mois et ajustez la contribution selon les revenus et les dépenses." },

  /* ── Dashboard / Route UI ── */
  route_breadcrumb:     { ar:'THE SFM / لوحة التحكم', en:'THE SFM / Dashboard', fr:'THE SFM / Tableau de bord' },
  guest_mode:           { ar:'وضع الضيف', en:'Guest mode', fr:'Mode invité' },
  active_route:         { ar:'مسار نشط', en:'Active route', fr:'Route active' },
  page_details:         { ar:'تفاصيل الصفحة', en:'Page details', fr:'Détails de la page' },
  error_partial_load:   { ar:'تعذر تحميل بعض البيانات، لذلك نعرض واجهة آمنة بدون تعطيل الصفحة.', en:'Some data could not load, so the page is showing a safe fallback instead.', fr:'Certaines données n\'ont pas pu être chargées, la page affiche un écran de secours.' },
  no_data_saved:        { ar:'لا توجد بيانات محفوظة حالياً', en:'No saved data yet', fr:'Aucune donnée enregistrée' },

  /* ── Filters / Sort ── */
  filter_all:           { ar:'كل الفترات', en:'All time', fr:'Toute la période' },
  filter_month:         { ar:'هذا الشهر', en:'This month', fr:'Ce mois-ci' },
  filter_last3:         { ar:'آخر 3 أشهر', en:'Last 3 months', fr:'3 derniers mois' },
  filter_year:          { ar:'هذه السنة', en:'This year', fr:'Cette année' },
  sort_newest:          { ar:'الأحدث أولاً', en:'Newest first', fr:'Plus récent d\'abord' },
  sort_oldest:          { ar:'الأقدم أولاً', en:'Oldest first', fr:'Plus ancien d\'abord' },
  sort_highest:         { ar:'أعلى مبلغ', en:'Highest amount', fr:'Montant le plus élevé' },
  sort_lowest:          { ar:'أقل مبلغ', en:'Lowest amount', fr:'Montant le plus bas' },
  load_more:            { ar:'تحميل المزيد ({n} متبقية)', en:'Load more ({n} remaining)', fr:'Charger plus ({n} restants)' },

  /* ── AI Chat ── */
  smart_insights:       { ar:'رؤى ذكية', en:'Smart insights', fr:'Insights intelligents' },
  suggestions_now:      { ar:'اقتراحات الآن', en:'Suggestions now', fr:'Suggestions maintenant' },
  ask_assistant:        { ar:'اسأل المساعد المالي', en:'Ask the financial assistant', fr:'Demander à l\'assistant financier' },
  ai_chat_hint:         { ar:'اكتب سؤالك عن الميزانية، الدخل، أو الاستثمار. الواجهة جاهزة للتوصيل بخدمة الذكاء الموجودة.', en:'Ask about budgets, income, or investing. The interface is ready for the existing AI service.', fr:'Posez vos questions sur le budget, les revenus ou l\'investissement.' },
  ai_welcome:           { ar:'مرحباً، اسألني عن دخلك أو مصروفاتك أو فرص تحسين الادخار.', en:'Hi, ask me about income, expenses, or savings optimization.', fr:'Bonjour, posez-moi vos questions sur vos revenus, dépenses ou l\'optimisation de l\'épargne.' },
  ai_placeholder:       { ar:'مثال: كيف أخفض مصاريفي هذا الشهر؟', en:'Example: How can I reduce expenses this month?', fr:'Exemple: Comment réduire mes dépenses ce mois-ci ?' },
  ai_fallback:          { ar:'وصلتني رسالتك، لكن لم أستطع توليد رد الآن.', en:'I received your message, but could not generate a reply right now.', fr:'J\'ai reçu votre message, mais je n\'ai pas pu générer une réponse pour l\'instant.' },
  ai_unavailable:       { ar:'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.', en:'The service is unavailable right now. Please try again shortly.', fr:'Le service est indisponible pour l\'instant. Veuillez réessayer dans quelques instants.' },
  ask_now:              { ar:'اسأل الآن', en:'Ask now', fr:'Demander maintenant' },

  /* ── Reports / Insights ── */
  income_vs_exp:        { ar:'الدخل مقابل المصروفات', en:'Income vs expenses', fr:'Revenus vs dépenses' },
  cashflow_summary:     { ar:'ملخص التدفق النقدي الحالي', en:'Current cash flow summary', fr:'Résumé des flux de trésorerie actuels' },
  savings_report:       { ar:'تقرير الادخار', en:'Savings report', fr:'Rapport d\'épargne' },
  savings_balance:      { ar:'رصيد الادخار المسجل', en:'Recorded savings balance', fr:'Solde d\'épargne enregistré' },
  invest_report:        { ar:'تقرير الاستثمار', en:'Investment report', fr:'Rapport d\'investissement' },
  portfolio_val:        { ar:'قيمة المحفظة الحالية', en:'Current portfolio value', fr:'Valeur actuelle du portefeuille' },
  reduce_exp:           { ar:'خفض المصروفات', en:'Reduce expenses', fr:'Réduire les dépenses' },
  reduce_exp_body:      { ar:'راجع أعلى 3 بنود صرف هذا الشهر.', en:'Review the top 3 spending items this month.', fr:'Examinez les 3 principales dépenses de ce mois.' },
  increase_sav:         { ar:'زيادة الادخار', en:'Increase savings', fr:'Augmenter l\'épargne' },
  increase_sav_body:    { ar:'حوّل جزءًا من الصافي إلى هدف واضح.', en:'Move part of your surplus into a clear goal.', fr:'Transférez une partie de votre excédent vers un objectif précis.' },
  recurring_invest:     { ar:'استثمار منتظم', en:'Recurring investing', fr:'Investissement régulier' },
  recurring_invest_body:{ ar:'مساهمة شهرية صغيرة تحافظ على الاستمرارية.', en:'A small monthly contribution keeps momentum.', fr:'Une petite contribution mensuelle maintient la dynamique.' },
  financial_record:     { ar:'سجل مالي', en:'Financial record', fr:'Relevé financier' },
  spend_ratio:          { ar:'نسبة الصرف', en:'Spend ratio', fr:'Ratio de dépenses' },
  net_runway:           { ar:'مساحة الصافي', en:'Net runway', fr:'Marge nette' },
  suggested_action:     { ar:'خطوة مقترحة', en:'Suggested action', fr:'Action suggérée' },
  risk_level_val:       { ar:'متوسط', en:'Medium', fr:'Moyen' },
  smart_alert:          { ar:'تنبيه ذكي', en:'Smart alert', fr:'Alerte intelligente' },
  page_ready:           { ar:'الصفحة جاهزة للرؤى والإجراءات.', en:'Page is ready for insights and actions.', fr:'La page est prête pour les insights et les actions.' },
  risk_balanced:        { ar:'متوازن بناءً على التوزيع الحالي.', en:'Balanced based on current allocation.', fr:'Équilibré selon la répartition actuelle.' },
  goal_progress:        { ar:'تقدم {pct}%، المتبقي {remaining}', en:'{pct}% complete, remaining {remaining}', fr:'{pct}% accompli, reste {remaining}' },
  spend_ratio_body:     { ar:'مصروفاتك تساوي {ratio}% من الدخل.', en:'Expenses equal {ratio}% of income.', fr:'Vos dépenses représentent {ratio}% des revenus.' },
  net_runway_body:      { ar:'الصافي الحالي {amount}.', en:'Current net balance is {amount}.', fr:'Solde net actuel: {amount}.' },
  action_export_short:  { ar:'تصدير', en:'Export', fr:'Exporter' },
  action_print_short:   { ar:'طباعة', en:'Print', fr:'Imprimer' },

  /* ── add/edit form labels (expenses, income, invest, savings) ── */
  form_type:            { ar:'النوع', en:'Type', fr:'Type' },
  form_necessity:       { ar:'درجة الضرورة', en:'Necessity', fr:'Niveau de nécessité' },
  form_date:            { ar:'التاريخ', en:'Date', fr:'Date' },
  form_desc:            { ar:'الوصف', en:'Description', fr:'Description' },
  form_notes_add:       { ar:'ملاحظات إضافية', en:'Additional Notes', fr:'Notes supplémentaires' },
  form_notes_add_ph:    { ar:'ملاحظات إضافية (اختياري)...', en:'Additional notes (optional)...', fr:'Notes supplémentaires (facultatif)...' },
  form_desc_ph_exp:     { ar:'أدخل وصف المصروف...', en:'Enter expense description...', fr:'Entrez la description de la dépense...' },
  form_desc_ph_inc:     { ar:'أدخل وصف الدخل...', en:'Enter income description...', fr:'Entrez la description du revenu...' },
  form_desc_ph_inv:     { ar:'أدخل وصف الاستثمار...', en:'Enter investment description...', fr:"Entrez la description de l'investissement..." },
  form_title_exp:       { ar:'سجّل مصروفك', en:'Record your expense', fr:'Enregistrez votre dépense' },
  form_sub_exp:         { ar:'أدخل تفاصيل المصروف الجديد', en:'Enter details for the new expense', fr:'Entrez les détails de la nouvelle dépense' },
  form_title_inc:       { ar:'سجّل دخلك', en:'Record your income', fr:'Enregistrez votre revenu' },
  form_sub_inc:         { ar:'أدخل تفاصيل الدخل الجديد', en:'Enter details for the new income', fr:'Entrez les détails du nouveau revenu' },
  form_title_inv:       { ar:'سجّل استثمارك', en:'Record your investment', fr:'Enregistrez votre investissement' },
  form_sub_inv:         { ar:'أدخل تفاصيل الاستثمار الجديد', en:'Enter details for the new investment', fr:"Entrez les détails du nouvel investissement" },
  form_add_expense:     { ar:'إضافة مصروف جديد', en:'Add New Expense', fr:'Ajouter une nouvelle dépense' },
  form_add_income:      { ar:'إضافة دخل جديد', en:'Add New Income', fr:'Ajouter un nouveau revenu' },
  form_add_invest:      { ar:'إضافة استثمار جديد', en:'Add New Investment', fr:'Ajouter un nouvel investissement' },
  form_save_expense:    { ar:'حفظ المصروف', en:'Save Expense', fr:'Enregistrer la dépense' },
  form_save_income:     { ar:'حفظ الدخل', en:'Save Income', fr:'Enregistrer le revenu' },
  form_save_invest:     { ar:'حفظ الاستثمار', en:'Save Investment', fr:"Enregistrer l'investissement" },
  form_success_exp:     { ar:'تم إضافة المصروف بنجاح', en:'Expense added successfully', fr:'Dépense ajoutée avec succès' },
  form_success_inc:     { ar:'تم إضافة الدخل بنجاح', en:'Income added successfully', fr:'Revenu ajouté avec succès' },
  form_success_inv:     { ar:'تم إضافة الاستثمار بنجاح', en:'Investment added successfully', fr:'Investissement ajouté avec succès' },
  form_type_exp:        { ar:'نوع المصروف *', en:'Expense Type *', fr:'Type de dépense *' },
  form_type_inc:        { ar:'نوع الدخل *', en:'Income Type *', fr:'Type de revenu *' },
  form_type_inv:        { ar:'نوع الاستثمار *', en:'Investment Type *', fr:"Type d'investissement *" },
  form_amount_req:      { ar:'المبلغ *', en:'Amount *', fr:'Montant *' },
  form_sign_required:   { ar:'سجل الدخول لحفظ البيانات', en:'Sign in to save data', fr:'Connectez-vous pour enregistrer' },
  form_validation:      { ar:'أدخل اسم الهدف والمبلغ المستهدف', en:'Enter goal name and target amount', fr:"Entrez le nom de l'objectif et le montant cible" },
  form_save_error:      { ar:'تعذر الحفظ', en:'Could not save', fr:'Enregistrement impossible' },
  form_goal_saved:      { ar:'تم حفظ الهدف بنجاح', en:'Goal saved', fr:'Objectif enregistré' },

  /* ── Goals add/edit page ── */
  goals_page_title:     { ar:'إضافة هدف مالي', en:'Add Financial Goal', fr:'Ajouter un objectif financier' },
  goals_page_sub:       { ar:'حوّل هدفك إلى مبلغ واضح ومدة زمنية قابلة للمتابعة.', en:'Turn your target into a clear amount and timeline.', fr:'Transformez votre objectif en montant précis et délai suivi.' },
  goal_name_ph:         { ar:'مثال: صندوق الطوارئ', en:'Example: Emergency fund', fr:"Exemple: Fonds d'urgence" },
  goal_timeline:        { ar:'المدة', en:'Timeline', fr:'Durée' },
  goals_save_btn:       { ar:'حفظ الهدف', en:'Save Goal', fr:"Enregistrer l'objectif" },

  /* ── Charity page ── */
  'charity.title': { ar:'الأعمال الخيرية', en:'Charity', fr:'Charité' },
  'charity.subtitle': { ar:'تابع مساهماتك الخيرية وتأثيرها على ميزانيتك', en:'Track your charitable contributions and their impact on your budget', fr:'Suivez vos contributions caritatives et leur impact sur votre budget' },
  'charity.currency': { ar:'د.ك', en:'KWD', fr:'KWD' },
  'charity.monthTotal': { ar:'إجمالي {month}', en:'Total for {month}', fr:'Total pour {month}' },
  'charity.yearTotal': { ar:'إجمالي السنة', en:'Year total', fr:"Total de l'année" },
  'charity.donationCount': { ar:'عدد التبرعات', en:'Donation count', fr:'Nombre de dons' },
  'charity.addDonation': { ar:'إضافة تبرع', en:'Add Donation', fr:'Ajouter un don' },
  'charity.autoExpenseNote': { ar:'يُسجَّل تلقائياً ضمن المصروفات الشهرية', en:'Automatically recorded as a monthly expense', fr:'Enregistré automatiquement comme dépense mensuelle' },
  'charity.month': { ar:'الشهر', en:'Month', fr:'Mois' },
  'charity.amount': { ar:'المبلغ', en:'Amount', fr:'Montant' },
  'charity.nameOrNote': { ar:'الاسم أو الملاحظة', en:'Name or note', fr:'Nom ou note' },
  'charity.namePlaceholder': { ar:'مثال: صدقة جارية - مسجد - كفالة يتيم', en:'Example: ongoing charity - mosque - orphan sponsorship', fr:'Exemple : aumône continue - mosquée - parrainage d’orphelin' },
  'charity.saveDonation': { ar:'حفظ التبرع', en:'Save Donation', fr:'Enregistrer le don' },
  'charity.countedInExpenses': { ar:'يُحتسب هذا المبلغ تلقائياً في إجمالي مصروفاتك الشهرية', en:'This amount is automatically included in your monthly expenses', fr:'Ce montant est automatiquement inclus dans vos dépenses mensuelles' },
  'charity.historyTitle': { ar:'سجل الأعمال الخيرية', en:'Donation history', fr:'Historique des dons' },
  'charity.donationCountValue': { ar:'{count} تبرع', en:'{count} donations', fr:'{count} dons' },
  'charity.noDonationsForMonth': { ar:'لا توجد تبرعات مسجلة لشهر {month}', en:'No donations recorded for {month}', fr:'Aucun don enregistré pour {month}' },
  'charity.tableName': { ar:'الاسم / الملاحظة', en:'Name / Note', fr:'Nom / Note' },
  'charity.tableAmount': { ar:'المبلغ', en:'Amount', fr:'Montant' },
  'charity.tableMonth': { ar:'الشهر', en:'Month', fr:'Mois' },
  'charity.total': { ar:'الإجمالي', en:'Total', fr:'Total' },
  'charity.allMonthsSummary': { ar:'ملخص كل الأشهر', en:'All months summary', fr:'Résumé de tous les mois' },
  'charity.thisMonth': { ar:'الأعمال الخيرية هذا الشهر', en:'Charity this month', fr:'Charité ce mois-ci' },
  'charity.typesTitle': { ar:'أنواع الأعمال الخيرية', en:'Charity types', fr:'Types de charité' },
  'charity.typeGeneral': { ar:'الصدقة العامة', en:'General charity', fr:'Charité générale' },
  'charity.typeGeneralDesc': { ar:'أي عطاء في سبيل الله', en:'Any giving for a good cause', fr:'Tout don pour une bonne cause' },
  'charity.typeZakat': { ar:'الزكاة', en:'Zakat', fr:'Zakat' },
  'charity.typeZakatDesc': { ar:'2.5% من المدخرات سنوياً', en:'2.5% of savings annually', fr:"2,5 % de l'épargne annuelle" },
  'charity.typeSacrifice': { ar:'الأضحية', en:'Sacrifice', fr:'Sacrifice' },
  'charity.typeSacrificeDesc': { ar:'في عيد الأضحى', en:'For Eid al-Adha', fr:"Pour l'Aïd al-Adha" },
  'charity.typeOrphan': { ar:'كفالة يتيم', en:'Orphan sponsorship', fr:'Parrainage d’orphelin' },
  'charity.typeOrphanDesc': { ar:'دعم طفل محتاج شهرياً', en:'Monthly support for a child in need', fr:'Soutien mensuel pour un enfant dans le besoin' },
  'charity.typeKaffara': { ar:'الكفارة', en:'Kaffara', fr:'Kaffara' },
  'charity.typeKaffaraDesc': { ar:'كفارة اليمين والظهار', en:'Expiation for vows and obligations', fr:'Expiation des serments et obligations' },
  'charity.typeWaqf': { ar:'الوقف', en:'Waqf', fr:'Waqf' },
  'charity.typeWaqfDesc': { ar:'صدقة جارية دائمة', en:'A lasting ongoing charity', fr:'Une charité continue et durable' },
  'charity.selectType': { ar:'اختر', en:'Select', fr:'Choisir' },
  'charity.dailyMessage': { ar:'رسالة اليوم', en:"Today's message", fr:'Message du jour' },
  'charity.dailyQuote': { ar:'"الصدقة تطفئ غضب الرب وتبارك في الرزق - حتى المبلغ الصغير له قيمة عظيمة"', en:'"Charity blesses provision and even a small amount can have great value."', fr:'« La charité bénit les ressources, et même un petit montant peut avoir une grande valeur. »' },
  'charity.footerNote': { ar:'جميع المبالغ المُدخلة تُسجَّل تلقائياً ضمن المصروفات الشهرية', en:'All entered amounts are automatically recorded within monthly expenses', fr:'Tous les montants saisis sont automatiquement enregistrés dans les dépenses mensuelles' },
  'charity.defaultDonationName': { ar:'تبرع خيري', en:'Charity donation', fr:'Don caritatif' },
  'charity.loadError': { ar:'تعذر تحميل الأعمال الخيرية', en:'Could not load charity records', fr:'Impossible de charger les dons' },
  'charity.invalidAmount': { ar:'أدخل مبلغاً صحيحاً', en:'Enter a valid amount', fr:'Saisissez un montant valide' },
  'charity.invalidName': { ar:'أدخل اسماً أو ملاحظة للتبرع', en:'Enter a name or note for the donation', fr:'Saisissez un nom ou une note pour le don' },
  'charity.saveError': { ar:'خطأ في الحفظ', en:'Save error', fr:"Erreur d'enregistrement" },
  'charity.saveSuccess': { ar:'تم تسجيل {amount} {currency} كتبرع في {month}', en:'Recorded {amount} {currency} as a donation in {month}', fr:'{amount} {currency} enregistré comme don en {month}' },
  'charity.deleteError': { ar:'تعذر حذف السجل', en:'Could not delete record', fr:"Impossible de supprimer l'enregistrement" },
  'charity.deleteSuccess': { ar:'تم حذف السجل', en:'Record deleted', fr:'Enregistrement supprimé' },

  /* ── Notifications page ── */
  notif_page_title:     { ar:'الإشعارات', en:'Notifications', fr:'Notifications' },
  notif_page_sub:       { ar:'تنبيهاتك المالية الذكية', en:'Your smart financial alerts', fr:'Vos alertes financières intelligentes' },
  notif_empty:          { ar:'لا توجد إشعارات حالياً', en:'No notifications yet', fr:'Aucune notification pour l\'instant' },
  notif_mark_read:      { ar:'تحديد الكل كمقروء', en:'Mark all as read', fr:'Tout marquer comme lu' },
  notif_clear:          { ar:'مسح الكل', en:'Clear all', fr:'Tout effacer' },

} as const;

/** Helper: get translation for current language */

export function t(key: keyof typeof TR, lang: Lang): string {
  return TR[key]?.[lang] ?? TR[key]?.en ?? TR[key]?.ar ?? String(key);
}

/** Get all months in a language */

export const MONTHS = {
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
};

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderKanban,
  HandHeart,
  LineChart,
  Loader2,
  Printer,
  Settings2,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables } from '@/lib/data/reportsData';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { buildFeasibilityStudyExportRow, printFeasibilityStudyToPdf } from '@/lib/reports/feasibilityStudyExport';
import { formatDate, formatNumber } from '@/lib/locale';
import { trackEvent } from '@/lib/analytics';

type Lang = 'ar' | 'en' | 'fr';
type ReportStatus = 'ready' | 'needs_data' | 'unavailable' | 'error';
type ReportCategory = 'financial' | 'investment' | 'projects' | 'charity';
type ReportView = 'all' | 'ready' | 'needs_data' | ReportCategory;
type TableKey =
  | 'income'
  | 'expenses'
  | 'projectIncome'
  | 'projectExpenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'projects'
  | 'feasibility'
  | 'financialModels'
  | 'tasks'
  | 'milestones'
  | 'documents'
  | 'pitchDecks'
  | 'marketWatchlist'
  | 'zakatCalculations'
  | 'zakatAssets'
  | 'charityProjects'
  | 'charityDonations'
  | 'charityBeneficiaries'
  | 'charityImpact';

type ReportType =
  | 'monthly-financial'
  | 'income'
  | 'expenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'watchlist'
  | 'market-analysis'
  | 'project-business'
  | 'project-feasibility'
  | 'project-financial'
  | 'project-kpis'
  | 'pitch-deck'
  | 'zakat'
  | 'charity-projects'
  | 'charity-donations'
  | 'beneficiaries'
  | 'charity-impact';

type ReportDefinition = {
  id: ReportType;
  category: ReportCategory;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  sources: Record<Lang, string[]>;
  required: TableKey[];
  optional?: TableKey[];
  route: string;
  exportable: boolean;
  unavailable?: boolean;
};

type Filters = {
  year: string;
  month: string;
  startDate: string;
  endDate: string;
  currency: string;
  projectId: string;
  category: 'all' | ReportCategory;
};

type RecordsState = Record<TableKey, any[]>;
type MissingAction = { label: string; href: string };

const TABLES: Array<{ key: TableKey; table: string; userScoped: boolean }> = [
  { key: 'income', table: 'monthly_income_sources', userScoped: true },
  { key: 'expenses', table: 'expense_items', userScoped: true },
  { key: 'projectIncome', table: 'project_income', userScoped: true },
  { key: 'projectExpenses', table: 'project_expenses', userScoped: true },
  { key: 'savings', table: 'savings_items', userScoped: true },
  { key: 'goals', table: 'financial_goals', userScoped: true },
  { key: 'investments', table: 'investment_items', userScoped: true },
  { key: 'projects', table: 'projects', userScoped: true },
  { key: 'feasibility', table: 'project_feasibility_studies', userScoped: true },
  { key: 'financialModels', table: 'project_financial_models', userScoped: true },
  { key: 'tasks', table: 'project_tasks', userScoped: true },
  { key: 'milestones', table: 'project_milestones', userScoped: true },
  { key: 'documents', table: 'project_documents', userScoped: true },
  { key: 'pitchDecks', table: 'project_pitch_decks', userScoped: true },
  { key: 'marketWatchlist', table: 'market_watchlist', userScoped: true },
  { key: 'zakatCalculations', table: 'zakat_calculations', userScoped: true },
  { key: 'zakatAssets', table: 'zakat_assets', userScoped: true },
  { key: 'charityProjects', table: 'charity_projects', userScoped: true },
  { key: 'charityDonations', table: 'charity_project_donations', userScoped: true },
  { key: 'charityBeneficiaries', table: 'charity_beneficiaries', userScoped: true },
  { key: 'charityImpact', table: 'charity_project_impact_metrics', userScoped: true },
];

const EMPTY_RECORDS = TABLES.reduce((acc, item) => {
  acc[item.key] = [];
  return acc;
}, {} as RecordsState);

const TEXT = {
  ar: {
    title: 'مركز التقارير',
    subtitle: 'أنشئ تقارير مالية وشرعية واستثمارية ومشاريعك في مكان واحد، بناءً على بياناتك الفعلية فقط.',
    heroBadge: 'تقارير من البيانات المسجلة فقط',
    financial: 'التقارير المالية',
    investment: 'تقارير الاستثمار والسوق',
    projects: 'تقارير المشاريع',
    charity: 'تقارير الزكاة والأعمال الخيرية',
    tabAll: 'الكل',
    tabFinancial: 'التقارير المالية',
    tabInvestment: 'الاستثمار والسوق',
    tabProjects: 'المشاريع',
    tabCharity: 'الزكاة والأعمال الخيرية',
    readyReports: 'التقارير الجاهزة',
    noReadyReports: 'لا توجد تقارير جاهزة حالياً. أضف بياناتك أولاً.',
    allReports: 'كل التقارير',
    ready: 'جاهز',
    needsData: 'يحتاج بيانات',
    unavailable: 'غير متاح حالياً',
    error: 'خطأ في التحميل',
    preview: 'معاينة',
    pdf: 'تحميل PDF',
    excel: 'تحميل Excel / CSV',
    configure: 'إعداد التقرير',
    printPdf: 'طباعة / حفظ PDF',
    reportPreview: 'معاينة التقرير',
    closePreview: 'إغلاق المعاينة',
    requiredData: 'البيانات المطلوبة:',
    dataUsed: 'البيانات المستخدمة:',
    missingData: 'أضف البيانات المطلوبة قبل إنشاء هذا التقرير.',
    unavailableCopy: 'هذا التقرير غير متاح حالياً من مركز التقارير. افتح الوحدة المرتبطة عند توفر البيانات.',
    noData: 'لا توجد بيانات حتى الآن.',
    noDataBody: 'ابدأ بإضافة بياناتك لعرض التحليل.',
    insufficient: 'بيانات غير كافية للحساب.',
    loadError: 'تعذر تحميل البيانات حالياً. حاول لاحقاً.',
    filters: 'إعداد التقرير',
    year: 'السنة',
    month: 'الشهر',
    dateRange: 'الفترة',
    from: 'من',
    to: 'إلى',
    currency: 'العملة',
    project: 'اختيار المشروع',
    category: 'التصنيف',
    allProjects: 'كل المشاريع',
    allCategories: 'كل التصنيفات',
    generatedReports: 'التقارير المنشأة',
    noGeneratedReports: 'لا توجد تقارير محفوظة حتى الآن. يمكنك المعاينة والطباعة أو تصدير CSV من هذه الصفحة.',
    lastGenerated: 'آخر إنشاء',
    notSaved: 'غير محفوظ',
    rows: 'عدد السجلات',
    status: 'الحالة',
    source: 'المصدر',
    reportReady: 'التقرير جاهز بناءً على بياناتك المسجلة.',
    noRowsForExport: 'لا توجد سجلات حقيقية لتصديرها.',
    csvDownloaded: 'تم تنزيل ملف CSV.',
    printOpened: 'تم فتح نافذة الطباعة.',
    generatedBy: 'تم الإنشاء بواسطة THE SFM',
    userName: 'اسم المستخدم',
    reportDate: 'تاريخ التقرير',
    signedInRequired: 'سجّل الدخول لعرض تقاريرك.',
    addIncome: 'إضافة دخل',
    addExpense: 'إضافة مصروف',
    openSavings: 'فتح المدخرات',
    openGoals: 'فتح الأهداف',
    openInvestments: 'فتح الاستثمارات',
    openMarket: 'فتح السوق',
    openProject: 'فتح المشروع',
    openZakat: 'فتح الزكاة',
    openCharity: 'فتح الأعمال الخيرية',
    openModule: 'فتح الوحدة',
    exportsDisabled: 'التصدير متاح فقط عند توفر بيانات حقيقية ضمن الفلاتر الحالية.',
    comingSoon: 'قريباً',
    documentsCenter: 'مركز المستندات',
    openReportsCenter: 'فتح مركز التقارير',
    oldReportsHint: 'هذه صفحة التقارير المختصرة. استخدم مركز التقارير للتقارير المالية والمشاريع والزكاة والاستثمار.',
    monthlyFinancial: 'التقرير المالي الشهري',
    incomeReport: 'تقرير الدخل',
    expensesReport: 'تقرير المصروفات',
    savingsReport: 'تقرير المدخرات',
    goalsReport: 'تقرير الأهداف المالية',
    investmentsReport: 'تقرير الاستثمارات',
    watchlistReport: 'تقرير قائمة المتابعة',
    marketReport: 'تقرير تحليل السوق',
    projectBusinessReport: 'تقرير المشروع التجاري',
    feasibilityReport: 'تقرير دراسة الجدوى',
    financialModelReport: 'تقرير النموذج المالي',
    projectKpisReport: 'تقرير مؤشرات المشروع',
    pitchDeckReport: 'العرض الاستثماري Pitch Deck',
    zakatReport: 'تقرير الزكاة',
    charityProjectsReport: 'تقرير المشاريع الخيرية',
    charityDonationsReport: 'تقرير التبرعات السنوي',
    beneficiariesReport: 'تقرير المستفيدين',
    charityImpactReport: 'تقرير الأثر الخيري',
  },
  en: {
    title: 'Reports Center',
    subtitle: 'Generate financial, zakat, investment, and project reports in one place, based only on your real data.',
    heroBadge: 'Reports from recorded data only',
    financial: 'Financial Reports',
    investment: 'Investment & Market Reports',
    projects: 'Project Reports',
    charity: 'Charity & Zakat Reports',
    tabAll: 'All',
    tabFinancial: 'Financial Reports',
    tabInvestment: 'Investment & Market',
    tabProjects: 'Projects',
    tabCharity: 'Zakat & Charity',
    readyReports: 'Ready Reports',
    noReadyReports: 'No reports are ready right now. Add your data first.',
    allReports: 'All reports',
    ready: 'Ready',
    needsData: 'Needs data',
    unavailable: 'Currently unavailable',
    error: 'Load error',
    preview: 'Preview',
    pdf: 'Download PDF',
    excel: 'Download Excel / CSV',
    configure: 'Configure report',
    printPdf: 'Print / Save PDF',
    reportPreview: 'Report Preview',
    closePreview: 'Close preview',
    requiredData: 'Required data:',
    dataUsed: 'Data used:',
    missingData: 'Add the required data before generating this report.',
    unavailableCopy: 'This report is currently unavailable from the Reports Center. Open the linked module when data is available.',
    noData: 'No data yet.',
    noDataBody: 'Start adding your data to view analysis.',
    insufficient: 'Insufficient data for calculation.',
    loadError: 'Could not load data right now. Please try again later.',
    filters: 'Configure report',
    year: 'Year',
    month: 'Month',
    dateRange: 'Date range',
    from: 'From',
    to: 'To',
    currency: 'Currency',
    project: 'Project selector',
    category: 'Category',
    allProjects: 'All projects',
    allCategories: 'All categories',
    generatedReports: 'Generated reports',
    noGeneratedReports: 'No generated reports are saved yet. You can preview and print or export CSV from this page.',
    lastGenerated: 'Last generated',
    notSaved: 'Not saved',
    rows: 'Rows',
    status: 'Status',
    source: 'Source',
    reportReady: 'This report is ready from your recorded data.',
    noRowsForExport: 'There are no real rows to export.',
    csvDownloaded: 'CSV downloaded.',
    printOpened: 'Print dialog opened.',
    generatedBy: 'Generated by THE SFM',
    userName: 'User name',
    reportDate: 'Report date',
    signedInRequired: 'Sign in to view your reports.',
    addIncome: 'Add Income',
    addExpense: 'Add Expense',
    openSavings: 'Open Savings',
    openGoals: 'Open Goals',
    openInvestments: 'Open Investments',
    openMarket: 'Open Market',
    openProject: 'Open Project',
    openZakat: 'Open Zakat',
    openCharity: 'Open Charity',
    openModule: 'Open module',
    exportsDisabled: 'Export is available only when real data exists for the current filters.',
    comingSoon: 'Coming soon',
    documentsCenter: 'Documents Center',
    openReportsCenter: 'Open Reports Center',
    oldReportsHint: 'This is the compact reports page. Use Reports Center for financial, project, zakat, and investment reports.',
    monthlyFinancial: 'Monthly Financial Report',
    incomeReport: 'Income Report',
    expensesReport: 'Expenses Report',
    savingsReport: 'Savings Report',
    goalsReport: 'Financial Goals Report',
    investmentsReport: 'Investment Report',
    watchlistReport: 'Watchlist Report',
    marketReport: 'Market Analysis Report',
    projectBusinessReport: 'Business Project Report',
    feasibilityReport: 'Feasibility Study Report',
    financialModelReport: 'Financial Model Report',
    projectKpisReport: 'Project KPI Report',
    pitchDeckReport: 'Pitch Deck',
    zakatReport: 'Zakat Report',
    charityProjectsReport: 'Charity Projects Report',
    charityDonationsReport: 'Annual Donations Report',
    beneficiariesReport: 'Beneficiaries Report',
    charityImpactReport: 'Charity Impact Report',
  },
  fr: {
    title: 'Centre des rapports',
    subtitle: 'Générez vos rapports financiers, zakat, investissements et projets en un seul endroit, uniquement à partir de vos données réelles.',
    heroBadge: 'Rapports à partir des données enregistrées uniquement',
    financial: 'Rapports financiers',
    investment: 'Rapports investissement et marché',
    projects: 'Rapports projets',
    charity: 'Rapports zakat et charité',
    tabAll: 'Tous',
    tabFinancial: 'Rapports financiers',
    tabInvestment: 'Investissement et marché',
    tabProjects: 'Projets',
    tabCharity: 'Zakat et charité',
    readyReports: 'Rapports prêts',
    noReadyReports: 'Aucun rapport n’est prêt pour le moment. Ajoutez d’abord vos données.',
    allReports: 'Tous les rapports',
    ready: 'Prêt',
    needsData: 'Données requises',
    unavailable: 'Non disponible actuellement',
    error: 'Erreur de chargement',
    preview: 'Aperçu',
    pdf: 'Télécharger PDF',
    excel: 'Télécharger Excel / CSV',
    configure: 'Configurer le rapport',
    printPdf: 'Imprimer / Enregistrer PDF',
    reportPreview: 'Aperçu du rapport',
    closePreview: 'Fermer l’aperçu',
    requiredData: 'Données requises :',
    dataUsed: 'Données utilisées :',
    missingData: 'Ajoutez les données nécessaires avant de générer ce rapport.',
    unavailableCopy: 'Ce rapport n’est pas encore disponible depuis le Centre des rapports. Ouvrez le module lié lorsque les données sont disponibles.',
    noData: 'Aucune donnée pour le moment.',
    noDataBody: 'Ajoutez vos données pour afficher l’analyse.',
    insufficient: 'Données insuffisantes pour le calcul.',
    loadError: 'Impossible de charger les données pour le moment. Veuillez réessayer plus tard.',
    filters: 'Configurer le rapport',
    year: 'Année',
    month: 'Mois',
    dateRange: 'Période',
    from: 'De',
    to: 'À',
    currency: 'Devise',
    project: 'Sélection du projet',
    category: 'Catégorie',
    allProjects: 'Tous les projets',
    allCategories: 'Toutes les catégories',
    generatedReports: 'Rapports générés',
    noGeneratedReports: 'Aucun rapport généré n’est enregistré pour le moment. Vous pouvez prévisualiser et imprimer ou exporter CSV depuis cette page.',
    lastGenerated: 'Dernière génération',
    notSaved: 'Non enregistré',
    rows: 'Lignes',
    status: 'Statut',
    source: 'Source',
    reportReady: 'Ce rapport est prêt à partir de vos données enregistrées.',
    noRowsForExport: 'Aucune ligne réelle à exporter.',
    csvDownloaded: 'CSV téléchargé.',
    printOpened: 'Fenêtre d’impression ouverte.',
    generatedBy: 'Généré par THE SFM',
    userName: 'Nom utilisateur',
    reportDate: 'Date du rapport',
    signedInRequired: 'Connectez-vous pour voir vos rapports.',
    addIncome: 'Ajouter un revenu',
    addExpense: 'Ajouter une dépense',
    openSavings: 'Ouvrir l’épargne',
    openGoals: 'Ouvrir les objectifs',
    openInvestments: 'Ouvrir les investissements',
    openMarket: 'Ouvrir le marché',
    openProject: 'Ouvrir le projet',
    openZakat: 'Ouvrir la zakat',
    openCharity: 'Ouvrir la charité',
    openModule: 'Ouvrir le module',
    exportsDisabled: 'L’export est disponible uniquement lorsque des données réelles existent pour les filtres actuels.',
    comingSoon: 'Bientôt',
    documentsCenter: 'Centre des documents',
    openReportsCenter: 'Ouvrir le Centre des rapports',
    oldReportsHint: 'Ceci est la page compacte des rapports. Utilisez le Centre des rapports pour les rapports financiers, projets, zakat et investissements.',
    monthlyFinancial: 'Rapport financier mensuel',
    incomeReport: 'Rapport des revenus',
    expensesReport: 'Rapport des dépenses',
    savingsReport: 'Rapport d’épargne',
    goalsReport: 'Rapport des objectifs financiers',
    investmentsReport: 'Rapport d’investissement',
    watchlistReport: 'Rapport de liste de suivi',
    marketReport: 'Rapport d’analyse de marché',
    projectBusinessReport: 'Rapport de projet commercial',
    feasibilityReport: 'Rapport d’étude de faisabilité',
    financialModelReport: 'Rapport du modèle financier',
    projectKpisReport: 'Rapport KPI du projet',
    pitchDeckReport: 'Pitch Deck',
    zakatReport: 'Rapport zakat',
    charityProjectsReport: 'Rapport des projets caritatifs',
    charityDonationsReport: 'Rapport annuel des dons',
    beneficiariesReport: 'Rapport des bénéficiaires',
    charityImpactReport: 'Rapport d’impact caritatif',
  },
} as const;

const EXTRA_TEXT = {
  ar: {
    tabReady: 'الجاهزة',
    tabNeedsData: 'تحتاج بيانات',
    viewAll: 'عرض الكل',
    viewLess: 'عرض أقل',
    showRequirements: 'عرض المتطلبات',
    hideRequirements: 'إخفاء المتطلبات',
    actions: 'إجراءات',
    addRequiredData: 'إضافة البيانات المطلوبة',
    openSource: 'فتح المصدر',
    reportDetails: 'التفاصيل',
    missingCount: 'بيانات ناقصة',
    unavailableReports: 'غير متاحة',
    reportsAvailable: 'تقارير متاحة',
  },
  en: {
    tabReady: 'Ready',
    tabNeedsData: 'Needs Data',
    viewAll: 'View All',
    viewLess: 'View Less',
    showRequirements: 'Show requirements',
    hideRequirements: 'Hide requirements',
    actions: 'Actions',
    addRequiredData: 'Add required data',
    openSource: 'Open source',
    reportDetails: 'Details',
    missingCount: 'missing items',
    unavailableReports: 'Unavailable',
    reportsAvailable: 'reports available',
  },
  fr: {
    tabReady: 'Prêts',
    tabNeedsData: 'Données requises',
    viewAll: 'Tout afficher',
    viewLess: 'Afficher moins',
    showRequirements: 'Afficher les exigences',
    hideRequirements: 'Masquer les exigences',
    actions: 'Actions',
    addRequiredData: 'Ajouter les données requises',
    openSource: 'Ouvrir la source',
    reportDetails: 'Détails',
    missingCount: 'éléments manquants',
    unavailableReports: 'Non disponibles',
    reportsAvailable: 'rapports disponibles',
  },
} as const;

const REPORTS: ReportDefinition[] = [
  {
    id: 'monthly-financial',
    category: 'financial',
    title: { ar: TEXT.ar.monthlyFinancial, en: TEXT.en.monthlyFinancial, fr: TEXT.fr.monthlyFinancial },
    description: {
      ar: 'ملخص شهري للدخل والمصروفات والمدخرات والاستثمارات المسجلة.',
      en: 'Monthly summary of recorded income, expenses, savings, and investments.',
      fr: 'Résumé mensuel des revenus, dépenses, épargne et investissements enregistrés.',
    },
    sources: { ar: ['الدخل', 'المصروفات', 'المدخرات', 'الاستثمارات'], en: ['Income', 'Expenses', 'Savings', 'Investments'], fr: ['Revenus', 'Dépenses', 'Épargne', 'Investissements'] },
    required: ['income', 'expenses'],
    optional: ['savings', 'investments'],
    route: '/reports',
    exportable: true,
  },
  {
    id: 'income',
    category: 'financial',
    title: { ar: TEXT.ar.incomeReport, en: TEXT.en.incomeReport, fr: TEXT.fr.incomeReport },
    description: { ar: 'تقرير بكل مصادر الدخل الشهرية المسجلة.', en: 'Report of recorded monthly income sources.', fr: 'Rapport des sources de revenus mensuels enregistrées.' },
    sources: { ar: ['monthly_income_sources'], en: ['monthly_income_sources'], fr: ['monthly_income_sources'] },
    required: ['income'],
    route: '/income',
    exportable: true,
  },
  {
    id: 'expenses',
    category: 'financial',
    title: { ar: TEXT.ar.expensesReport, en: TEXT.en.expensesReport, fr: TEXT.fr.expensesReport },
    description: { ar: 'تقرير المصروفات المسجلة والتصنيفات المتاحة.', en: 'Report of recorded expenses and available categories.', fr: 'Rapport des dépenses enregistrées et catégories disponibles.' },
    sources: { ar: ['expense_items'], en: ['expense_items'], fr: ['expense_items'] },
    required: ['expenses'],
    route: '/expenses',
    exportable: true,
  },
  {
    id: 'savings',
    category: 'financial',
    title: { ar: TEXT.ar.savingsReport, en: TEXT.en.savingsReport, fr: TEXT.fr.savingsReport },
    description: { ar: 'تقرير أرصدة المدخرات المسجلة.', en: 'Report of recorded savings balances.', fr: 'Rapport des soldes d’épargne enregistrés.' },
    sources: { ar: ['savings_items'], en: ['savings_items'], fr: ['savings_items'] },
    required: ['savings'],
    route: '/savings',
    exportable: true,
  },
  {
    id: 'goals',
    category: 'financial',
    title: { ar: TEXT.ar.goalsReport, en: TEXT.en.goalsReport, fr: TEXT.fr.goalsReport },
    description: { ar: 'تقرير الأهداف المالية والتقدم المسجل لكل هدف.', en: 'Report of financial goals and recorded progress.', fr: 'Rapport des objectifs financiers et de la progression enregistrée.' },
    sources: { ar: ['financial_goals'], en: ['financial_goals'], fr: ['financial_goals'] },
    required: ['goals'],
    route: '/goals',
    exportable: true,
  },
  {
    id: 'investments',
    category: 'investment',
    title: { ar: TEXT.ar.investmentsReport, en: TEXT.en.investmentsReport, fr: TEXT.fr.investmentsReport },
    description: { ar: 'تقرير الاستثمارات المسجلة وقيمتها الحالية.', en: 'Report of recorded investments and current values.', fr: 'Rapport des investissements enregistrés et valeurs actuelles.' },
    sources: { ar: ['investment_items'], en: ['investment_items'], fr: ['investment_items'] },
    required: ['investments'],
    route: '/invest',
    exportable: true,
  },
  {
    id: 'watchlist',
    category: 'investment',
    title: { ar: TEXT.ar.watchlistReport, en: TEXT.en.watchlistReport, fr: TEXT.fr.watchlistReport },
    description: { ar: 'تقرير قائمة متابعة السوق المسجلة.', en: 'Report of recorded market watchlist items.', fr: 'Rapport des éléments enregistrés dans la liste de suivi.' },
    sources: { ar: ['market_watchlist'], en: ['market_watchlist'], fr: ['market_watchlist'] },
    required: ['marketWatchlist'],
    route: '/market-analysis',
    exportable: true,
  },
  {
    id: 'market-analysis',
    category: 'investment',
    title: { ar: TEXT.ar.marketReport, en: TEXT.en.marketReport, fr: TEXT.fr.marketReport },
    description: { ar: 'يفتح تحليل السوق لاستخدام بيانات OpenBB أو إظهار عدم توفر المصدر.', en: 'Opens Market Analysis to use OpenBB data or show provider unavailability.', fr: 'Ouvre l’analyse de marché pour utiliser OpenBB ou afficher l’indisponibilité.' },
    sources: { ar: ['OpenBB عند توفره'], en: ['OpenBB when available'], fr: ['OpenBB si disponible'] },
    required: [],
    route: '/market-analysis',
    exportable: false,
    unavailable: true,
  },
  {
    id: 'project-business',
    category: 'projects',
    title: { ar: TEXT.ar.projectBusinessReport, en: TEXT.en.projectBusinessReport, fr: TEXT.fr.projectBusinessReport },
    description: { ar: 'تقرير المشاريع التجارية المسجلة.', en: 'Report of recorded business projects.', fr: 'Rapport des projets commerciaux enregistrés.' },
    sources: { ar: ['projects'], en: ['projects'], fr: ['projects'] },
    required: ['projects'],
    route: '/projects',
    exportable: true,
  },
  {
    id: 'project-feasibility',
    category: 'projects',
    title: { ar: TEXT.ar.feasibilityReport, en: TEXT.en.feasibilityReport, fr: TEXT.fr.feasibilityReport },
    description: { ar: 'تقرير دراسات الجدوى المحفوظة للمشاريع.', en: 'Report of saved project feasibility studies.', fr: 'Rapport des études de faisabilité enregistrées.' },
    sources: { ar: ['project_feasibility_studies'], en: ['project_feasibility_studies'], fr: ['project_feasibility_studies'] },
    required: ['feasibility'],
    route: '/projects',
    exportable: true,
  },
  {
    id: 'project-financial',
    category: 'projects',
    title: { ar: TEXT.ar.financialModelReport, en: TEXT.en.financialModelReport, fr: TEXT.fr.financialModelReport },
    description: { ar: 'تقرير النماذج المالية المحفوظة للمشاريع.', en: 'Report of saved project financial models.', fr: 'Rapport des modèles financiers enregistrés.' },
    sources: { ar: ['project_financial_models', 'project_income', 'project_expenses'], en: ['project_financial_models', 'project_income', 'project_expenses'], fr: ['project_financial_models', 'project_income', 'project_expenses'] },
    required: ['projects'],
    optional: ['financialModels', 'projectIncome', 'projectExpenses'],
    route: '/projects',
    exportable: true,
  },
  {
    id: 'project-kpis',
    category: 'projects',
    title: { ar: TEXT.ar.projectKpisReport, en: TEXT.en.projectKpisReport, fr: TEXT.fr.projectKpisReport },
    description: { ar: 'تقرير مؤشرات المشروع بناءً على المهام والنماذج والمستندات المسجلة.', en: 'Project KPI report based on recorded tasks, models, and documents.', fr: 'Rapport KPI basé sur tâches, modèles et documents enregistrés.' },
    sources: { ar: ['projects', 'project_tasks', 'project_financial_models'], en: ['projects', 'project_tasks', 'project_financial_models'], fr: ['projects', 'project_tasks', 'project_financial_models'] },
    required: ['projects'],
    optional: ['tasks', 'financialModels', 'documents', 'milestones'],
    route: '/projects',
    exportable: true,
  },
  {
    id: 'pitch-deck',
    category: 'projects',
    title: { ar: TEXT.ar.pitchDeckReport, en: TEXT.en.pitchDeckReport, fr: TEXT.fr.pitchDeckReport },
    description: { ar: 'يفتح مساحة المشاريع لتصدير العرض الاستثماري من بيانات المشروع.', en: 'Opens the project workspace to export the pitch deck from project data.', fr: 'Ouvre l’espace projet pour exporter le pitch deck à partir des données.' },
    sources: { ar: ['projects', 'project_pitch_decks'], en: ['projects', 'project_pitch_decks'], fr: ['projects', 'project_pitch_decks'] },
    required: ['projects'],
    optional: ['pitchDecks'],
    route: '/projects',
    exportable: false,
  },
  {
    id: 'zakat',
    category: 'charity',
    title: { ar: TEXT.ar.zakatReport, en: TEXT.en.zakatReport, fr: TEXT.fr.zakatReport },
    description: { ar: 'تقرير حسابات الزكاة أو أصول الزكاة المسجلة.', en: 'Report of saved zakat calculations or zakat assets.', fr: 'Rapport des calculs ou actifs de zakat enregistrés.' },
    sources: { ar: ['zakat_calculations', 'zakat_assets'], en: ['zakat_calculations', 'zakat_assets'], fr: ['zakat_calculations', 'zakat_assets'] },
    required: ['zakatCalculations'],
    optional: ['zakatAssets'],
    route: '/zakat',
    exportable: true,
  },
  {
    id: 'charity-projects',
    category: 'charity',
    title: { ar: TEXT.ar.charityProjectsReport, en: TEXT.en.charityProjectsReport, fr: TEXT.fr.charityProjectsReport },
    description: { ar: 'تقرير المشاريع الخيرية المسجلة.', en: 'Report of recorded charity projects.', fr: 'Rapport des projets caritatifs enregistrés.' },
    sources: { ar: ['charity_projects'], en: ['charity_projects'], fr: ['charity_projects'] },
    required: ['charityProjects'],
    route: '/charity-projects',
    exportable: true,
  },
  {
    id: 'charity-donations',
    category: 'charity',
    title: { ar: TEXT.ar.charityDonationsReport, en: TEXT.en.charityDonationsReport, fr: TEXT.fr.charityDonationsReport },
    description: { ar: 'تقرير التبرعات السنوية المسجلة.', en: 'Report of recorded annual donations.', fr: 'Rapport des dons annuels enregistrés.' },
    sources: { ar: ['charity_project_donations'], en: ['charity_project_donations'], fr: ['charity_project_donations'] },
    required: ['charityDonations'],
    route: '/charity-projects',
    exportable: true,
  },
  {
    id: 'beneficiaries',
    category: 'charity',
    title: { ar: TEXT.ar.beneficiariesReport, en: TEXT.en.beneficiariesReport, fr: TEXT.fr.beneficiariesReport },
    description: { ar: 'تقرير المستفيدين والكفالات المسجلة.', en: 'Report of recorded beneficiaries and sponsorships.', fr: 'Rapport des bénéficiaires et parrainages enregistrés.' },
    sources: { ar: ['charity_beneficiaries'], en: ['charity_beneficiaries'], fr: ['charity_beneficiaries'] },
    required: ['charityBeneficiaries'],
    route: '/charity-projects',
    exportable: true,
  },
  {
    id: 'charity-impact',
    category: 'charity',
    title: { ar: TEXT.ar.charityImpactReport, en: TEXT.en.charityImpactReport, fr: TEXT.fr.charityImpactReport },
    description: { ar: 'تقرير الأثر الخيري من المقاييس أو التبرعات أو المستفيدين المسجلين.', en: 'Charity impact report from recorded metrics, donations, or beneficiaries.', fr: 'Rapport d’impact à partir des métriques, dons ou bénéficiaires enregistrés.' },
    sources: { ar: ['impact metrics', 'donations', 'beneficiaries'], en: ['impact metrics', 'donations', 'beneficiaries'], fr: ['métriques', 'dons', 'bénéficiaires'] },
    required: ['charityImpact'],
    optional: ['charityDonations', 'charityBeneficiaries'],
    route: '/charity-projects',
    exportable: true,
  },
];

const REPORT_VIEW_TABS: Array<{ id: ReportView; labelKey: 'tabAll' | 'tabFinancial' | 'tabInvestment' | 'tabProjects' | 'tabCharity' | keyof typeof EXTRA_TEXT.ar }> = [
  { id: 'all', labelKey: 'tabAll' },
  { id: 'ready', labelKey: 'tabReady' },
  { id: 'needs_data', labelKey: 'tabNeedsData' },
  { id: 'financial', labelKey: 'tabFinancial' },
  { id: 'projects', labelKey: 'tabProjects' },
  { id: 'charity', labelKey: 'tabCharity' },
  { id: 'investment', labelKey: 'tabInvestment' },
];

const CATEGORY_SECTIONS: Array<{ id: ReportCategory; labelKey: 'financial' | 'investment' | 'projects' | 'charity' }> = [
  { id: 'financial', labelKey: 'financial' },
  { id: 'projects', labelKey: 'projects' },
  { id: 'charity', labelKey: 'charity' },
  { id: 'investment', labelKey: 'investment' },
];

const STATUS_TONE: Record<ReportStatus, string> = {
  ready: '#15803D',
  needs_data: '#B45309',
  unavailable: '#6B7280',
  error: '#B91C1C',
};

const ENTITY_LABELS: Record<Lang, Record<string, string>> = {
  ar: {
    income: 'دخل',
    expense: 'مصروف',
    savings: 'مدخرات',
    goal: 'هدف مالي',
    investment: 'استثمار',
    project: 'مشروع',
    charityProject: 'مشروع خيري',
    beneficiary: 'مستفيد',
    zakatCalculations: 'حسابات الزكاة',
    zakatAssets: 'أصول الزكاة',
    impactMetrics: 'مقاييس الأثر',
    donations: 'التبرعات',
  },
  en: {
    income: 'Income',
    expense: 'Expense',
    savings: 'Savings',
    goal: 'Goal',
    investment: 'Investment',
    project: 'Project',
    charityProject: 'Charity project',
    beneficiary: 'Beneficiary',
    zakatCalculations: 'Zakat calculations',
    zakatAssets: 'Zakat assets',
    impactMetrics: 'Impact metrics',
    donations: 'Donations',
  },
  fr: {
    income: 'Revenu',
    expense: 'Dépense',
    savings: 'Épargne',
    goal: 'Objectif',
    investment: 'Investissement',
    project: 'Projet',
    charityProject: 'Projet caritatif',
    beneficiary: 'Bénéficiaire',
    zakatCalculations: 'Calculs de zakat',
    zakatAssets: 'Actifs de zakat',
    impactMetrics: 'Métriques d’impact',
    donations: 'Dons',
  },
};

const COLUMN_LABELS: Record<Lang, Record<string, string>> = {
  ar: {
    section: 'القسم',
    label: 'البند',
    value: 'القيمة',
    date: 'التاريخ',
    name: 'الاسم',
    type: 'النوع',
    status: 'الحالة',
    amount: 'المبلغ',
    currency: 'العملة',
    category: 'التصنيف',
    target_amount: 'المبلغ المستهدف',
    current_amount: 'المبلغ الحالي',
    notes: 'ملاحظات',
    current_value: 'القيمة الحالية',
    monthly_contribution: 'المساهمة الشهرية',
    risk: 'المخاطر',
    symbol: 'الرمز',
    asset_type: 'نوع الأصل',
    created_at: 'تاريخ الإنشاء',
    project: 'المشروع',
    capital: 'رأس المال',
    target: 'الهدف',
    start_date: 'تاريخ البداية',
    end_date: 'تاريخ النهاية',
    project_id: 'اسم المشروع',
    project_name: 'اسم المشروع',
    report_date: 'تاريخ التقرير',
    score: 'الدرجة',
    net_profit: 'صافي الربح',
    break_even: 'نقطة التعادل',
    recommendations: 'التوصيات',
    updated_at: 'آخر تحديث',
    total_revenue: 'إجمالي الإيرادات',
    total_profit: 'إجمالي الربح',
    roi: 'العائد على الاستثمار',
    payback_period: 'فترة الاسترداد',
    tasks_total: 'إجمالي المهام',
    tasks_done: 'المهام المكتملة',
    progress_percent: 'نسبة التقدم',
    documents: 'المستندات',
    source: 'المصدر',
    net_zakat_base: 'صافي الوعاء الزكوي',
    selected_nisab_value: 'النصاب المستخدم',
    zakat_due: 'الزكاة المستحقة',
    price_source: 'مصدر السعر',
    asset: 'الأصل',
    is_zakatable: 'خاضع للزكاة',
    collected: 'المحصل',
    organization: 'الجهة',
    reference: 'المرجع',
    monthly_support: 'الدعم الشهري',
    next_renewal_date: 'تاريخ التجديد القادم',
    metric_name: 'اسم المؤشر',
    metric_value: 'قيمة المؤشر',
    metric_unit: 'وحدة المؤشر',
  },
  en: {
    section: 'Section',
    label: 'Label',
    value: 'Value',
    date: 'Date',
    name: 'Name',
    type: 'Type',
    status: 'Status',
    amount: 'Amount',
    currency: 'Currency',
    category: 'Category',
    target_amount: 'Target amount',
    current_amount: 'Current amount',
    notes: 'Notes',
    current_value: 'Current value',
    monthly_contribution: 'Monthly contribution',
    risk: 'Risk',
    symbol: 'Symbol',
    asset_type: 'Asset type',
    created_at: 'Created at',
    project: 'Project',
    capital: 'Capital',
    target: 'Target',
    start_date: 'Start date',
    end_date: 'End date',
    project_id: 'Project name',
    project_name: 'Project name',
    report_date: 'Report date',
    score: 'Score',
    net_profit: 'Net profit',
    break_even: 'Break-even point',
    recommendations: 'Recommendations',
    updated_at: 'Updated at',
    total_revenue: 'Total revenue',
    total_profit: 'Total profit',
    roi: 'ROI',
    payback_period: 'Payback period',
    tasks_total: 'Total tasks',
    tasks_done: 'Completed tasks',
    progress_percent: 'Progress %',
    documents: 'Documents',
    source: 'Source',
    net_zakat_base: 'Net zakat base',
    selected_nisab_value: 'Selected nisab',
    zakat_due: 'Zakat à payer',
    price_source: 'Price source',
    asset: 'Asset',
    is_zakatable: 'Zakatable',
    collected: 'Collected',
    organization: 'Organization',
    reference: 'Reference',
    monthly_support: 'Monthly support',
    next_renewal_date: 'Next renewal date',
    metric_name: 'Metric name',
    metric_value: 'Metric value',
    metric_unit: 'Metric unit',
  },
  fr: {
    section: 'Section',
    label: 'Libellé',
    value: 'Valeur',
    date: 'Date',
    name: 'Nom',
    type: 'Type',
    status: 'Statut',
    amount: 'Montant',
    currency: 'Devise',
    category: 'Catégorie',
    target_amount: 'Montant cible',
    current_amount: 'Montant actuel',
    notes: 'Notes',
    current_value: 'Valeur actuelle',
    monthly_contribution: 'Contribution mensuelle',
    risk: 'Risque',
    symbol: 'Symbole',
    asset_type: 'Type d’actif',
    created_at: 'Créé le',
    project: 'Projet',
    capital: 'Capital',
    target: 'Objectif',
    start_date: 'Date de début',
    end_date: 'Date de fin',
    project_id: 'Nom du projet',
    project_name: 'Nom du projet',
    report_date: 'Date du rapport',
    score: 'Score',
    net_profit: 'Bénéfice net',
    break_even: 'Seuil de rentabilité',
    recommendations: 'Recommandations',
    updated_at: 'Dernière mise à jour',
    total_revenue: 'Revenu total',
    total_profit: 'Profit total',
    roi: 'ROI',
    payback_period: 'Période de récupération',
    tasks_total: 'Total des tâches',
    tasks_done: 'Tâches terminées',
    progress_percent: 'Progression %',
    documents: 'Documents',
    source: 'Source',
    net_zakat_base: 'Base nette de zakat',
    selected_nisab_value: 'Nisab sélectionné',
    zakat_due: 'Zakat due',
    price_source: 'Source du prix',
    asset: 'Actif',
    is_zakatable: 'Soumis à la zakat',
    collected: 'Collecté',
    organization: 'Organisation',
    reference: 'Référence',
    monthly_support: 'Soutien mensuel',
    next_renewal_date: 'Prochaine date de renouvellement',
    metric_name: 'Nom de l’indicateur',
    metric_value: 'Valeur de l’indicateur',
    metric_unit: 'Unité de l’indicateur',
  },
};

function columnLabel(key: string, lang: Lang) {
  return COLUMN_LABELS[lang]?.[key] ?? key.replace(/_/g, ' ');
}

const SOURCE_LABELS: Record<Lang, Record<string, string>> = {
  ar: {
    monthly_income_sources: 'مصادر الدخل الشهرية',
    expense_items: 'المصروفات',
    savings_items: 'المدخرات',
    financial_goals: 'الأهداف المالية',
    investment_items: 'الاستثمارات',
    market_watchlist: 'قائمة المتابعة',
    projects: 'المشاريع',
    project_feasibility_studies: 'دراسات الجدوى',
    project_financial_models: 'النماذج المالية',
    project_income: 'دخل المشروع',
    project_expenses: 'مصروفات المشروع',
    project_tasks: 'مهام المشروع',
    project_milestones: 'معالم المشروع',
    project_documents: 'مستندات المشروع',
    project_pitch_decks: 'العروض الاستثمارية',
    zakat_calculations: 'حسابات الزكاة',
    zakat_assets: 'أصول الزكاة',
    charity_projects: 'المشاريع الخيرية',
    charity_project_donations: 'تبرعات المشاريع الخيرية',
    charity_beneficiaries: 'المستفيدون',
    charity_project_impact_metrics: 'مقاييس الأثر الخيري',
    'impact metrics': 'مقاييس الأثر',
    donations: 'التبرعات',
    beneficiaries: 'المستفيدون',
  },
  en: {
    monthly_income_sources: 'Monthly income sources',
    expense_items: 'Expenses',
    savings_items: 'Savings',
    financial_goals: 'Financial goals',
    investment_items: 'Investments',
    market_watchlist: 'Market watchlist',
    projects: 'Projects',
    project_feasibility_studies: 'Feasibility studies',
    project_financial_models: 'Financial models',
    project_income: 'Project income',
    project_expenses: 'Project expenses',
    project_tasks: 'Project tasks',
    project_milestones: 'Project milestones',
    project_documents: 'Project documents',
    project_pitch_decks: 'Pitch decks',
    zakat_calculations: 'Zakat calculations',
    zakat_assets: 'Zakat assets',
    charity_projects: 'Charity projects',
    charity_project_donations: 'Charity donations',
    charity_beneficiaries: 'Beneficiaries',
    charity_project_impact_metrics: 'Charity impact metrics',
    'impact metrics': 'Impact metrics',
    donations: 'Donations',
    beneficiaries: 'Beneficiaries',
  },
  fr: {
    monthly_income_sources: 'Sources de revenus mensuels',
    expense_items: 'Dépenses',
    savings_items: 'Épargne',
    financial_goals: 'Objectifs financiers',
    investment_items: 'Investissements',
    market_watchlist: 'Liste de suivi',
    projects: 'Projets',
    project_feasibility_studies: 'Études de faisabilité',
    project_financial_models: 'Modèles financiers',
    project_income: 'Revenu de projet',
    project_expenses: 'Dépenses de projet',
    project_tasks: 'Tâches du projet',
    project_milestones: 'Jalons du projet',
    project_documents: 'Documents du projet',
    project_pitch_decks: 'Pitch decks',
    zakat_calculations: 'Calculs de zakat',
    zakat_assets: 'Actifs de zakat',
    charity_projects: 'Projets caritatifs',
    charity_project_donations: 'Dons caritatifs',
    charity_beneficiaries: 'Bénéficiaires',
    charity_project_impact_metrics: 'Métriques d’impact caritatif',
    'impact metrics': 'Métriques d’impact',
    donations: 'Dons',
    beneficiaries: 'Bénéficiaires',
  },
};

const TABLE_SOURCE_BY_KEY = TABLES.reduce((acc, item) => {
  acc[item.key] = item.table;
  return acc;
}, {} as Record<TableKey, string>);

function sourceLabel(source: string, lang: Lang) {
  return SOURCE_LABELS[lang]?.[source] ?? source;
}

function tableKeyLabel(key: TableKey, lang: Lang) {
  return sourceLabel(TABLE_SOURCE_BY_KEY[key] ?? key, lang);
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/,/g, '');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function firstNumber(values: unknown[]) {
  for (const value of values) {
    const number = nullableNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function firstText(row: any, keys: string[], defaultText = '') {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return defaultText;
}

function firstDate(row: any) {
  return firstText(row, ['received_date', 'generated_for_date', 'expense_date', 'donation_date', 'calculation_date', 'start_date', 'created_at', 'uploaded_at']);
}

const NO_GOAL_NOTES: Record<Lang, string> = {
  ar: 'لا توجد ملاحظات',
  en: 'No notes',
  fr: 'Aucune note',
};

const NOT_SPECIFIED: Record<Lang, string> = {
  ar: 'غير محدد',
  en: 'Not specified',
  fr: 'Non spécifié',
};

const MONTHS_LABEL: Record<Lang, string> = {
  ar: 'شهر',
  en: 'months',
  fr: 'mois',
};

function parseMaybeObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function cleanReportText(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (parseMaybeObject(trimmed)) return '';
  return trimmed;
}

function formatReportCurrency(value: unknown, fallback: unknown, lang: Lang) {
  const code = cleanReportText(value) || cleanReportText(fallback) || 'KWD';
  const normalized = code.toUpperCase();
  if (lang === 'ar' && normalized === 'KWD') return 'د.ك';
  return normalized;
}

function currencyCode(value: unknown, fallback: unknown) {
  return (cleanReportText(value) || cleanReportText(fallback) || 'KWD').toUpperCase();
}

function moneyOrMissing(value: unknown, currency: string, lang: Lang) {
  const number = nullableNumber(value);
  if (number === null) return NOT_SPECIFIED[lang];
  const amount = number.toFixed(3);
  if (lang === 'en') return `${currency} ${amount}`;
  return `${amount} ${formatReportCurrency(currency, currency, lang)}`;
}

function dateOrMissing(value: unknown, lang: Lang) {
  return value ? (formatDate(value, lang) || NOT_SPECIFIED[lang]) : NOT_SPECIFIED[lang];
}

function textOrMissing(value: unknown, lang: Lang) {
  return cleanReportText(value) || NOT_SPECIFIED[lang];
}

function periodOrMissing(value: unknown, lang: Lang) {
  const number = nullableNumber(value);
  if (number === null) return NOT_SPECIFIED[lang];
  return `${formatNumber(number, lang, { maximumFractionDigits: 1 })} ${MONTHS_LABEL[lang]}`;
}

function formatGoalNotes(goal: any, lang: Lang) {
  const metadata = parseMaybeObject(goal?.notes);
  const description =
    cleanReportText(goal?.description) ||
    cleanReportText(goal?.goal_description) ||
    cleanReportText(goal?.details) ||
    cleanReportText(metadata?.description) ||
    cleanReportText(metadata?.notes) ||
    cleanReportText(goal?.notes);

  return description || NO_GOAL_NOTES[lang];
}

function normalizeReportCellValue(value: unknown, lang: Lang) {
  if (value === undefined || value === null || value === '') return '';
  const metadata = parseMaybeObject(value);
  if (metadata) {
    return (
      cleanReportText(metadata.description) ||
      cleanReportText(metadata.notes) ||
      cleanReportText(metadata.name) ||
      cleanReportText(metadata.title) ||
      ''
    );
  }
  if (typeof value === 'object') return '';
  return String(value);
}

function normalizeProjectForReport(project: any, lang: Lang, filters: Filters) {
  const notes = parseMaybeObject(project?.notes) ?? {};
  const analysis = parseMaybeObject(notes.analysis) ?? parseMaybeObject(project?.analysis) ?? {};
  const kpis = parseMaybeObject(notes.kpis) ?? parseMaybeObject(project?.kpis) ?? {};
  const currency = currencyCode(project?.currency ?? notes.currency, filters.currency);
  const capital = firstNumber([
    project?.capital,
    project?.capital_amount,
    project?.initialCapital,
    project?.initial_capital,
    project?.projectCapital,
    project?.project_capital,
    project?.budget,
    project?.investmentAmount,
    project?.investment_amount,
    notes.capital,
    notes.capital_amount,
    notes.initialCapital,
    notes.initial_capital,
    notes.projectCapital,
    notes.project_capital,
    notes.budget,
    notes.investmentAmount,
    notes.investment_amount,
  ]);
  const targetAmount = firstNumber([project?.target_amount, project?.targetAmount, notes.target_amount, notes.targetAmount]);
  const goalText = cleanReportText(project?.goal) || cleanReportText(notes.goal) || cleanReportText(project?.target) || cleanReportText(notes.target);
  const monthlyRevenue = firstNumber([project?.monthlyRevenue, project?.monthly_revenue, notes.monthlyRevenue, notes.monthly_revenue]);
  const monthlyExpenses = firstNumber([project?.monthlyExpenses, project?.monthly_expenses, notes.monthlyExpenses, notes.monthly_expenses]);
  const monthlyProfit = monthlyRevenue !== null && monthlyExpenses !== null ? monthlyRevenue - monthlyExpenses : null;
  const payback = firstNumber([
    project?.paybackPeriod,
    project?.payback_period,
    project?.paybackMonths,
    project?.payback_months,
    notes.paybackPeriod,
    notes.payback_period,
    notes.paybackMonths,
    notes.payback_months,
    analysis.paybackPeriod,
    analysis.payback_period,
    kpis.paybackPeriod,
    kpis.payback_period,
  ]) ?? (capital !== null && monthlyProfit !== null && monthlyProfit > 0 ? Math.ceil(capital / monthlyProfit) : null);

  return {
    project: firstText(project, ['name', 'project_name'], ENTITY_LABELS[lang].project),
    category: textOrMissing(project?.category ?? project?.type ?? notes.category ?? notes.type, lang),
    status: textOrMissing(project?.status ?? notes.status, lang),
    capital: moneyOrMissing(capital, currency, lang),
    target: targetAmount !== null ? moneyOrMissing(targetAmount, currency, lang) : textOrMissing(goalText, lang),
    currency: formatReportCurrency(currency, filters.currency, lang),
    start_date: dateOrMissing(project?.start_date ?? project?.startDate ?? notes.start_date ?? notes.startDate ?? project?.timeline ?? notes.startTimeline, lang),
    payback_period: periodOrMissing(payback, lang),
  };
}

const MISSING_PROJECT_NAME: Record<Lang, string> = {
  ar: 'مشروع غير مسمى',
  en: 'Unnamed project',
  fr: 'Projet sans nom',
};

const DELETED_PROJECT_NAME: Record<Lang, string> = {
  ar: 'مشروع محذوف',
  en: 'Deleted project',
  fr: 'Projet supprimé',
};

function projectNameForReport(projects: any[], projectId: unknown, lang: Lang) {
  const id = String(projectId ?? '');
  if (!id) return MISSING_PROJECT_NAME[lang];
  const project = projects.find(row => String(row?.id ?? '') === id);
  if (!project) return DELETED_PROJECT_NAME[lang];
  return firstText(project, ['name', 'project_name'], MISSING_PROJECT_NAME[lang]);
}

function dateInFilters(row: any, filters: Filters) {
  const raw = firstDate(row);
  if (!raw) return true;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return true;
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  if (filters.year && year !== filters.year) return false;
  if (filters.month !== 'all' && month !== filters.month) return false;
  if (filters.startDate && date < new Date(`${filters.startDate}T00:00:00`)) return false;
  if (filters.endDate && date > new Date(`${filters.endDate}T23:59:59`)) return false;
  return true;
}

function projectMatches(row: any, filters: Filters) {
  if (!filters.projectId) return true;
  return row?.id === filters.projectId || row?.project_id === filters.projectId || row?.related_project_id === filters.projectId;
}

function filteredRows(rows: any[], filters: Filters) {
  return rows.filter(row => dateInFilters(row, filters) && projectMatches(row, filters));
}

function csvCell(value: unknown, lang: Lang) {
  const text = normalizeReportCellValue(value, lang).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[], lang: Lang) {
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set<string>()));
  const body = rows.map(row => headers.map(header => csvCell(row[header], lang)).join(','));
  const localizedHeaders = headers.map(header => csvCell(columnLabel(header, lang), lang)).join(',');
  const blob = new Blob([`\uFEFF${localizedHeaders}\r\n${body.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function reportStatus(report: ReportDefinition, records: RecordsState, loadErrors: Partial<Record<TableKey, string>>) {
  if (report.unavailable) return 'unavailable' as ReportStatus;
  if ([...report.required, ...(report.optional ?? [])].some(key => loadErrors[key])) return 'error' as ReportStatus;
  if (report.id === 'monthly-financial') {
    return records.income.length > 0 || records.expenses.length > 0 || records.savings.length > 0 || records.investments.length > 0 ? 'ready' : 'needs_data';
  }
  if (report.id === 'zakat') return records.zakatCalculations.length > 0 || records.zakatAssets.length > 0 ? 'ready' : 'needs_data';
  if (report.id === 'charity-impact') {
    return records.charityImpact.length > 0 || records.charityDonations.length > 0 || records.charityBeneficiaries.length > 0 ? 'ready' : 'needs_data';
  }
  if (report.id === 'project-kpis') {
    return records.projects.length > 0 && (records.tasks.length > 0 || records.financialModels.length > 0 || records.documents.length > 0 || records.milestones.length > 0)
      ? 'ready'
      : 'needs_data';
  }
  if (report.id === 'project-financial') {
    return records.projects.length > 0 && (records.financialModels.length > 0 || records.projectIncome.length > 0 || records.projectExpenses.length > 0)
      ? 'ready'
      : 'needs_data';
  }
  return report.required.every(key => records[key]?.length > 0) ? 'ready' : 'needs_data';
}

function missingDataKeys(report: ReportDefinition, records: RecordsState) {
  if (report.unavailable) return [] as TableKey[];
  if (report.id === 'monthly-financial') {
    const keys: TableKey[] = ['income', 'expenses', 'savings', 'investments'];
    return keys.some(key => records[key]?.length > 0) ? [] : keys;
  }
  if (report.id === 'zakat') {
    const keys: TableKey[] = ['zakatCalculations', 'zakatAssets'];
    return keys.some(key => records[key]?.length > 0) ? [] : keys;
  }
  if (report.id === 'charity-impact') {
    const keys: TableKey[] = ['charityImpact', 'charityDonations', 'charityBeneficiaries'];
    return keys.some(key => records[key]?.length > 0) ? [] : keys;
  }
  if (report.id === 'project-kpis') {
    if (!records.projects.length) return ['projects'];
    const supportKeys: TableKey[] = ['tasks', 'financialModels', 'documents', 'milestones'];
    return supportKeys.some(key => records[key]?.length > 0) ? [] : supportKeys;
  }
  if (report.id === 'project-financial') {
    if (!records.projects.length) return ['projects'];
    const supportKeys: TableKey[] = ['financialModels', 'projectIncome', 'projectExpenses'];
    return supportKeys.some(key => records[key]?.length > 0) ? [] : supportKeys;
  }
  return report.required.filter(key => !records[key]?.length);
}

function uniqueActions(actions: MissingAction[]) {
  const seen = new Set<string>();
  return actions.filter(action => {
    const key = `${action.href}:${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function reportRows(report: ReportDefinition, records: RecordsState, filters: Filters, lang: Lang): Record<string, unknown>[] {
  const money = (value: unknown, currency?: unknown) => `${numberValue(value).toFixed(3)} ${String(currency || filters.currency || 'KWD')}`;
  const entity = ENTITY_LABELS[lang];
  const rows: Record<string, unknown>[] = [];
  const addSummaryRow = (section: string, label: string, value: unknown) => rows.push({ section, label, value });

  if (report.id === 'monthly-financial') {
    const income = filteredRows(records.income, filters);
    const expenses = filteredRows(records.expenses, filters);
    const savings = filteredRows(records.savings, filters);
    const investments = filteredRows(records.investments, filters);
    addSummaryRow(report.title[lang], lang === 'ar' ? 'إجمالي الدخل' : lang === 'fr' ? 'Total des revenus' : 'Total income', money(income.reduce((sum, row) => sum + numberValue(row.amount), 0)));
    addSummaryRow(report.title[lang], lang === 'ar' ? 'إجمالي المصروفات' : lang === 'fr' ? 'Total des dépenses' : 'Total expenses', money(expenses.reduce((sum, row) => sum + numberValue(row.amount), 0)));
    addSummaryRow(report.title[lang], lang === 'ar' ? 'إجمالي المدخرات' : lang === 'fr' ? 'Total épargne' : 'Total savings', money(savings.reduce((sum, row) => sum + numberValue(row.amount), 0)));
    addSummaryRow(report.title[lang], lang === 'ar' ? 'إجمالي الاستثمارات' : lang === 'fr' ? 'Total investissements' : 'Total investments', money(investments.reduce((sum, row) => sum + numberValue(row.amount ?? row.current_value ?? row.currentValue), 0)));
    return rows.filter(row => String(row.value).match(/[1-9]/));
  }

  if (report.id === 'income') {
    return filteredRows(records.income, filters).map(row => ({
      date: firstDate(row),
      name: firstText(row, ['source_name', 'name', 'description'], entity.income),
      type: firstText(row, ['income_type', 'category']),
      status: firstText(row, ['status', 'workflowStatus']),
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
    }));
  }

  if (report.id === 'expenses') {
    return filteredRows(records.expenses, filters).map(row => ({
      date: firstDate(row),
      name: firstText(row, ['name', 'description'], entity.expense),
      category: firstText(row, ['category', 'expense_type']),
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
    }));
  }

  if (report.id === 'savings') {
    return filteredRows(records.savings, filters).map(row => ({
      date: firstDate(row),
      name: firstText(row, ['name', 'description'], entity.savings),
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
    }));
  }

  if (report.id === 'goals') {
    return filteredRows(records.goals, filters).map(row => ({
      name: firstText(row, ['name', 'goal'], entity.goal),
      target_amount: numberValue(row.target_amount ?? row.amount),
      current_amount: numberValue(row.current_amount ?? row.saved_amount),
      currency: formatReportCurrency(row.currency ?? parseMaybeObject(row.notes)?.currency, filters.currency, lang),
      notes: formatGoalNotes(row, lang),
    }));
  }

  if (report.id === 'investments') {
    return filteredRows(records.investments, filters).map(row => ({
      name: firstText(row, ['name', 'description'], entity.investment),
      type: firstText(row, ['type', 'investment_type']),
      current_value: numberValue(row.currentValue ?? row.current_value ?? row.amount),
      monthly_contribution: numberValue(row.monthlyContribution ?? row.monthly_contribution),
      risk: firstText(row, ['riskLevel', 'risk_level']),
      currency: row.currency || filters.currency,
    }));
  }

  if (report.id === 'watchlist') {
    return filteredRows(records.marketWatchlist, filters).map(row => ({
      symbol: firstText(row, ['symbol']),
      asset_type: firstText(row, ['asset_type', 'assetType']),
      notes: row.notes || '',
      created_at: firstDate(row),
    }));
  }

  if (report.id === 'project-business') {
    return filteredRows(records.projects, filters).map(row => normalizeProjectForReport(row, lang, filters));
  }

  if (report.id === 'project-feasibility') {
    return filteredRows(records.feasibility, filters).map(row => {
      const project = records.projects.find(item => String(item?.id ?? '') === String(row.project_id ?? ''));
      const projectNotes = parseMaybeObject(project?.notes) ?? {};
      return buildFeasibilityStudyExportRow({
        projectName: projectNameForReport(records.projects, row.project_id, lang),
        currency: currencyCode(project?.currency ?? projectNotes.currency, filters.currency),
        financialData: row.financial_data,
        feasibilityScore: row.feasibility_score,
        feasibilityStatus: row.feasibility_status,
        reportDate: row.updated_at || row.created_at,
        recommendations: row.recommendations ?? row.ai_recommendations,
      }, lang);
    });
  }

  if (report.id === 'project-financial') {
    const modelRows = filteredRows(records.financialModels, filters).map(row => {
      const kpis = row.kpis && typeof row.kpis === 'object' ? row.kpis : {};
      return {
        source: sourceLabel('project_financial_models', lang),
        project_name: projectNameForReport(records.projects, row.project_id, lang),
        total_revenue: numberValue(kpis.totalRevenue ?? kpis.total_revenue),
        total_profit: numberValue(kpis.totalProfit ?? kpis.total_profit),
        roi: numberValue(kpis.roi),
        payback_period: kpis.paybackPeriod ?? kpis.payback_period ?? '',
        updated_at: row.updated_at || row.created_at || '',
      };
    });
    const expenseRows = filteredRows(records.projectExpenses, filters).map(row => ({
      source: sourceLabel('project_expenses', lang),
      project_name: projectNameForReport(records.projects, row.project_id, lang),
      date: row.expense_date || row.created_at || '',
      title: firstText(row, ['title', 'name'], entity.expense),
      category: firstText(row, ['category']),
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
      paid_from_personal_budget: row.paid_from_personal_budget === true,
    }));
    const incomeRows = filteredRows(records.projectIncome, filters).map(row => ({
      source: sourceLabel('project_income', lang),
      project_name: projectNameForReport(records.projects, row.project_id, lang),
      date: row.income_date || row.created_at || '',
      title: firstText(row, ['title', 'name'], entity.income),
      category: firstText(row, ['category', 'source']),
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
      transferred_to_personal_income: row.transferred_to_personal_income === true,
    }));
    return [...modelRows, ...incomeRows, ...expenseRows];
  }

  if (report.id === 'project-kpis') {
    const projects = filteredRows(records.projects, filters);
    return projects.map(project => {
      const tasks = records.tasks.filter(row => row.project_id === project.id);
      const done = tasks.filter(row => row.status === 'done').length;
      const docs = records.documents.filter(row => row.project_id === project.id).length;
      return {
        project: firstText(project, ['name', 'project_name'], entity.project),
        tasks_total: tasks.length,
        tasks_done: done,
        progress_percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
        documents: docs,
      };
    }).filter(row => row.tasks_total || row.documents);
  }

  if (report.id === 'zakat') {
    const calculations = filteredRows(records.zakatCalculations, filters).map(row => ({
      source: entity.zakatCalculations,
      date: row.calculation_date || row.created_at || '',
      net_zakat_base: numberValue(row.net_zakat_base),
      selected_nisab_value: numberValue(row.selected_nisab_value),
      zakat_due: numberValue(row.zakat_due),
      price_source: row.price_source || '',
      currency: row.currency || filters.currency,
    }));
    const assets = filteredRows(records.zakatAssets, filters).map(row => ({
      source: entity.zakatAssets,
      date: row.zakat_due_date || row.ownership_date || '',
      asset: firstText(row, ['asset_name', 'name']),
      amount: numberValue(row.amount),
      is_zakatable: row.is_zakatable !== false,
      currency: row.currency || filters.currency,
    }));
    return [...calculations, ...assets];
  }

  if (report.id === 'charity-projects') {
    return filteredRows(records.charityProjects, filters).map(row => ({
      project: firstText(row, ['name', 'project_name'], entity.charityProject),
      category: firstText(row, ['category']),
      status: firstText(row, ['status']),
      target: numberValue(row.target_amount),
      collected: numberValue(row.collected_amount),
      currency: row.currency || filters.currency,
      organization: row.organization_name || '',
    }));
  }

  if (report.id === 'charity-donations') {
    return filteredRows(records.charityDonations, filters).map(row => ({
      date: row.donation_date || row.created_at || '',
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
      type: firstText(row, ['donation_type', 'category']),
      project_name: projectNameForReport(records.charityProjects, row.project_id, lang),
      notes: row.notes || '',
    }));
  }

  if (report.id === 'beneficiaries') {
    return filteredRows(records.charityBeneficiaries, filters).map(row => ({
      name: firstText(row, ['display_name', 'reference_code'], entity.beneficiary),
      reference: row.reference_code || '',
      category: row.category || '',
      status: row.status || '',
      monthly_support: numberValue(row.monthly_support_amount),
      currency: row.currency || filters.currency,
      next_renewal_date: row.next_renewal_date || '',
    }));
  }

  if (report.id === 'charity-impact') {
    const metrics = filteredRows(records.charityImpact, filters).map(row => ({
      source: entity.impactMetrics,
      project_name: projectNameForReport(records.charityProjects, row.project_id, lang),
      metric_name: row.metric_name,
      metric_value: numberValue(row.metric_value),
      metric_unit: row.metric_unit || '',
    }));
    const donations = filteredRows(records.charityDonations, filters).map(row => ({
      source: entity.donations,
      amount: numberValue(row.amount),
      currency: row.currency || filters.currency,
      date: row.donation_date || row.created_at || '',
    }));
    return [...metrics, ...donations];
  }

  return rows;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'report';
}

export default function ReportsCenterPage() {
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[(lang as Lang) || 'ar'];
  const extra = EXTRA_TEXT[(lang as Lang) || 'ar'];
  const now = new Date();
  const [records, setRecords] = useState<RecordsState>(EMPTY_RECORDS);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<TableKey, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportId, setActiveReportId] = useState<ReportType>('monthly-financial');
  const [toast, setToast] = useState('');
  const [reportView, setReportView] = useState<ReportView>('all');
  const [reportViewTouched, setReportViewTouched] = useState(false);
  const [expandedRequirements, setExpandedRequirements] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<ReportCategory, boolean>>({
    financial: true,
    projects: false,
    charity: false,
    investment: false,
  });
  const [filters, setFilters] = useState<Filters>({
    year: String(now.getFullYear()),
    month: 'all',
    startDate: '',
    endDate: '',
    currency: 'KWD',
    projectId: '',
    category: 'all',
  });

  const activeReport = REPORTS.find(report => report.id === activeReportId) ?? REPORTS[0];

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (authLoading) return;
      if (!user) {
        setRecords(EMPTY_RECORDS);
        setLoadErrors({});
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const result = await loadUserDataTables(supabase as any, user.id, TABLES);

      if (!cancelled) {
        setRecords({
          ...(result.records as RecordsState),
          income: personalIncomeRows(result.records.income ?? []),
          expenses: personalExpenseRows(result.records.expenses ?? []),
        });
        setLoadErrors(result.errors as Partial<Record<TableKey, string>>);
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const reportCards = useMemo(() => REPORTS.map(report => {
    const status = reportStatus(report, records, loadErrors);
    const rows = status === 'ready' ? reportRows(report, records, filters, lang as Lang) : [];
    return { report, status, rows };
  }), [filters, lang, loadErrors, records]);

  const activeRows = useMemo(() => reportRows(activeReport, records, filters, lang as Lang), [activeReport, filters, lang, records]);
  const activeStatus = reportStatus(activeReport, records, loadErrors);
  const readyCount = reportCards.filter(card => card.status === 'ready').length;
  const needsCount = reportCards.filter(card => card.status === 'needs_data').length;
  const unavailableCount = reportCards.filter(card => card.status === 'unavailable' || card.status === 'error').length;
  const readyCards = reportCards.filter(card => card.status === 'ready' && card.rows.length > 0);
  const visibleCards = useMemo(() => reportCards.filter(card => {
    if (reportView === 'all') return true;
    if (reportView === 'ready') return card.status === 'ready';
    if (reportView === 'needs_data') return card.status === 'needs_data';
    return card.report.category === reportView;
  }), [reportCards, reportView]);
  const activeCanExport = activeStatus === 'ready' && activeRows.length > 0;
  const activeMissing = missingDataKeys(activeReport, records);
  const projects = records.projects;

  useEffect(() => {
    if (isLoading || reportViewTouched) return;
    setReportView(readyCount > 0 ? 'ready' : 'all');
  }, [isLoading, readyCount, reportViewTouched]);

  useEffect(() => {
    setOpenCategories({
      financial: true,
      projects: reportView !== 'all',
      charity: reportView !== 'all',
      investment: reportView !== 'all',
    });
  }, [reportView]);

  const missingActionForKey = useCallback((key: TableKey): MissingAction => {
    if (key === 'income') return { label: tr.addIncome, href: '/income/add' };
    if (key === 'expenses') return { label: tr.addExpense, href: '/expenses/add' };
    if (key === 'savings') return { label: tr.openSavings, href: '/savings' };
    if (key === 'goals') return { label: tr.openGoals, href: '/goals' };
    if (key === 'investments') return { label: tr.openInvestments, href: '/invest' };
    if (key === 'marketWatchlist') return { label: tr.openMarket, href: '/market-analysis' };
    if (key === 'zakatCalculations' || key === 'zakatAssets') return { label: tr.openZakat, href: '/zakat' };
    if (key === 'charityProjects' || key === 'charityDonations' || key === 'charityBeneficiaries' || key === 'charityImpact') {
      return { label: tr.openCharity, href: '/charity-projects' };
    }
    if (key === 'projects' || key === 'feasibility' || key === 'financialModels' || key === 'tasks' || key === 'milestones' || key === 'documents' || key === 'pitchDecks') {
      return { label: tr.openProject, href: '/projects' };
    }
    return { label: tr.openModule, href: '/dashboard' };
  }, [tr]);

  const selectReportView = useCallback((view: ReportView) => {
    setReportView(view);
    setReportViewTouched(true);
    const nextCard = reportCards.find(card => {
      if (view === 'all') return true;
      if (view === 'ready') return card.status === 'ready';
      if (view === 'needs_data') return card.status === 'needs_data';
      return card.report.category === view;
    });
    if (nextCard) setActiveReportId(nextCard.report.id);
  }, [reportCards]);

  const toggleRequirements = useCallback((reportId: ReportType) => {
    setExpandedRequirements(prev => ({ ...prev, [reportId]: !prev[reportId] }));
  }, []);

  const toggleCategory = useCallback((category: ReportCategory) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const exportCsv = useCallback((report: ReportDefinition) => {
    const status = reportStatus(report, records, loadErrors);
    const rows = status === 'ready' ? reportRows(report, records, filters, lang as Lang) : [];
    if (!rows.length) return showToast(tr.noRowsForExport);
    downloadCsv(`sfm-${slug(report.title.en)}-${filters.year}.csv`, rows, lang as Lang);
    void trackEvent('export_report', { module: 'reports', metadata: { export_type: 'csv', report_id: report.id } });
    showToast(tr.csvDownloaded);
  }, [filters, lang, loadErrors, records, showToast, tr.csvDownloaded, tr.noRowsForExport]);

  const printReport = useCallback((report: ReportDefinition) => {
    const status = reportStatus(report, records, loadErrors);
    const rows = status === 'ready' ? reportRows(report, records, filters, lang as Lang) : [];
    if (status !== 'ready' || !rows.length) return showToast(tr.exportsDisabled);
    if (report.id === 'project-feasibility') {
      try {
        printFeasibilityStudyToPdf({
          title: report.title[lang as Lang],
          rows: rows as ReturnType<typeof buildFeasibilityStudyExportRow>[],
          lang: lang as Lang,
          dir: dir as 'rtl' | 'ltr',
        });
        void trackEvent('export_report', { module: 'reports', metadata: { export_type: 'pdf', report_id: report.id } });
        showToast(tr.printOpened);
      } catch (error) {
        console.error('Feasibility PDF export failed', error);
        showToast(tr.exportsDisabled);
      }
      return;
    }
    setActiveReportId(report.id);
    window.setTimeout(() => {
      window.print();
      void trackEvent('export_report', { module: 'reports', metadata: { export_type: 'print', report_id: report.id } });
      showToast(tr.printOpened);
    }, 120);
  }, [dir, filters, lang, loadErrors, records, showToast, tr.exportsDisabled, tr.printOpened]);

  const statusLabel = (status: ReportStatus) => {
    if (status === 'ready') return tr.ready;
    if (status === 'needs_data') return tr.needsData;
    if (status === 'error') return tr.error;
    return tr.unavailable;
  };

  if (authLoading || isLoading) {
    return (
      <div className="reports-center-shell" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={tr.title} className="reports-center-main loading-state" contentClassName="reports-center-content">
          <Loader2 className="spin" size={28} />
          <span>{tr.title}</span>
        </DashboardPageShell>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="reports-center-shell" dir={dir}>
        <Sidebar />
        <DashboardPageShell ariaLabel={tr.title} className="reports-center-main" contentClassName="reports-center-content">
          <section className="reports-hero">
            <div>
              <span className="hero-badge">{tr.heroBadge}</span>
              <h1>{tr.title}</h1>
              <p>{tr.signedInRequired}</p>
            </div>
            <button type="button" onClick={() => router.push('/login')}>{tr.signedInRequired}</button>
          </section>
        </DashboardPageShell>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="reports-center-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={tr.title} className="reports-center-main" contentClassName="reports-center-content">
        <header className="topbar no-print">
          <div>
            <span>THE SFM</span>
            <strong>{tr.title}</strong>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="reports-hero no-print">
          <div>
            <span className="hero-badge"><FileText size={16} /> {tr.heroBadge}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
            <div className="hero-stats">
              <span><CheckCircle2 size={16} /> {tr.ready}: {readyCount}</span>
              <span><ShieldAlert size={16} /> {tr.needsData}: {needsCount}</span>
              <span><CalendarDays size={16} /> {filters.year}</span>
            </div>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => router.push('/documents')} aria-label={tr.documentsCenter}>
              <FileText size={18} /> {tr.documentsCenter}
            </button>
            <button type="button" disabled={!activeCanExport} aria-disabled={!activeCanExport} onClick={() => printReport(activeReport)} aria-label={tr.printPdf}>
              <Printer size={18} /> {tr.printPdf}
            </button>
          </div>
        </section>

        <section className="report-summary-cards no-print" aria-label={tr.status}>
          <article>
            <span>{tr.readyReports}</span>
            <strong>{readyCount}</strong>
          </article>
          <article>
            <span>{tr.needsData}</span>
            <strong>{needsCount}</strong>
          </article>
          <article>
            <span>{extra.unavailableReports}</span>
            <strong>{unavailableCount}</strong>
          </article>
          <article>
            <span>{tr.lastGenerated}</span>
            <strong>{tr.notSaved}</strong>
          </article>
        </section>

        <nav className="category-tabs no-print" aria-label={tr.category}>
          {REPORT_VIEW_TABS.map(tab => {
            const isActive = reportView === tab.id;
            const count = tab.id === 'all'
              ? reportCards.length
              : tab.id === 'ready'
                ? readyCount
                : tab.id === 'needs_data'
                  ? needsCount
                  : reportCards.filter(card => card.report.category === tab.id).length;
            const label = tab.labelKey in extra ? extra[tab.labelKey as keyof typeof extra] : tr[tab.labelKey as keyof typeof tr];
            return (
              <button key={tab.id} type="button" className={isActive ? 'active' : ''} onClick={() => selectReportView(tab.id)} aria-pressed={isActive}>
                {label} <span>{count}</span>
              </button>
            );
          })}
        </nav>

        <section className="filters-panel no-print" aria-label={tr.filters}>
          <div className="section-title">
            <Filter size={18} />
            <h2>{tr.filters}</h2>
          </div>
          <div className="filters-grid">
            <label>
              <span>{tr.year}</span>
              <input value={filters.year} onChange={event => setFilters(prev => ({ ...prev, year: event.target.value.replace(/\D/g, '').slice(0, 4) || String(now.getFullYear()) }))} inputMode="numeric" />
            </label>
            <label>
              <span>{tr.month}</span>
              <select value={filters.month} onChange={event => setFilters(prev => ({ ...prev, month: event.target.value }))}>
                <option value="all">{tr.allCategories}</option>
                {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map(month => <option key={month} value={month}>{month}</option>)}
              </select>
            </label>
            <label>
              <span>{tr.from}</span>
              <input type="date" value={filters.startDate} onChange={event => setFilters(prev => ({ ...prev, startDate: event.target.value }))} />
            </label>
            <label>
              <span>{tr.to}</span>
              <input type="date" value={filters.endDate} onChange={event => setFilters(prev => ({ ...prev, endDate: event.target.value }))} />
            </label>
            <label>
              <span>{tr.currency}</span>
              <select value={filters.currency} onChange={event => setFilters(prev => ({ ...prev, currency: event.target.value }))}>
                <option value="KWD">KWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <div className="filters-project-selector">
              <ProjectSelector
                projects={projects}
                selectedProjectId={filters.projectId}
                onChange={projectId => setFilters(prev => ({ ...prev, projectId }))}
                label={tr.project}
                hint={tr.filters}
                allowEmpty
                emptyOptionLabel={tr.allProjects}
                compact
              />
            </div>
          </div>
        </section>

        <section className="ready-panel no-print" aria-label={tr.readyReports}>
          <div className="section-title">
            <CheckCircle2 size={18} />
            <h2>{tr.readyReports}</h2>
          </div>
          {readyCards.length ? (
            <div className="ready-list">
              {readyCards.slice(0, 3).map(({ report, rows }) => (
                <button key={report.id} type="button" onClick={() => setActiveReportId(report.id)} aria-label={`${tr.preview} ${report.title[lang as Lang]}`}>
                  <span>{report.title[lang as Lang]}</span>
                  <strong>{tr.rows}: {rows.length}</strong>
                </button>
              ))}
              {readyCards.length > 3 && (
                <button type="button" className="view-all-ready" onClick={() => selectReportView('ready')} aria-label={extra.viewAll}>
                  <span>{extra.viewAll}</span>
                  <strong>{readyCards.length} {extra.reportsAvailable}</strong>
                </button>
              )}
            </div>
          ) : (
            <p>{tr.noReadyReports}</p>
          )}
        </section>

        <div className="reports-layout">
          <section className="report-categories no-print">
            {CATEGORY_SECTIONS.map(({ id: category, labelKey }) => {
              const items = visibleCards.filter(card => card.report.category === category);
              if (!items.length) return null;
              const Icon = category === 'financial' ? Wallet : category === 'investment' ? LineChart : category === 'projects' ? FolderKanban : HandHeart;
              const isOpen = openCategories[category];
              const categoryReadyCount = items.filter(card => card.status === 'ready').length;
              const categoryNeedsCount = items.filter(card => card.status === 'needs_data').length;
              return (
                <div key={category} className="category-section">
                  <button
                    type="button"
                    className="category-summary"
                    aria-expanded={isOpen}
                    aria-controls={`reports-category-${category}`}
                    onClick={() => toggleCategory(category)}
                  >
                    <span className="category-title">
                      <Icon size={19} />
                      <strong>{tr[labelKey]}</strong>
                    </span>
                    <span className="category-counts">
                      <em>{tr.ready}: {categoryReadyCount}</em>
                      <em>{tr.needsData}: {categoryNeedsCount}</em>
                      <ChevronDown size={17} aria-hidden="true" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="reports-grid" id={`reports-category-${category}`}>
                      {items.map(({ report, status, rows }) => {
                        const missing = missingDataKeys(report, records);
                        const requirements = missing.length ? missing : report.required;
                        const missingActions = uniqueActions(requirements.map(missingActionForKey));
                        const canPrint = status === 'ready' && rows.length > 0;
                        const canCsv = canPrint && report.exportable;
                        const requirementsOpen = !!expandedRequirements[report.id];
                        const primaryLabel = status === 'ready' ? tr.preview : status === 'needs_data' ? extra.addRequiredData : extra.openSource;
                        const primaryAction = () => {
                          if (status === 'ready') return setActiveReportId(report.id);
                          if (status === 'needs_data' && missingActions[0]) return router.push(missingActions[0].href);
                          return router.push(report.route);
                        };
                        return (
                          <article key={report.id} className={`report-card ${status}`}>
                            <div className="report-card-head">
                              <div>
                                <h3>{report.title[lang as Lang]}</h3>
                                <p>{report.description[lang as Lang]}</p>
                              </div>
                              <span className="status-badge" style={{ color: STATUS_TONE[status], background: `${STATUS_TONE[status]}12`, borderColor: `${STATUS_TONE[status]}30` }}>
                                {statusLabel(status)}
                              </span>
                            </div>

                            <div className="card-meta">
                              <span>{tr.rows}: {rows.length}</span>
                              <span>{tr.lastGenerated}: {tr.notSaved}</span>
                            </div>

                            {status === 'ready' ? (
                              <div className="sources compact">
                                <strong>{tr.dataUsed}</strong>
                                <div>{report.sources[lang as Lang].slice(0, 3).map(source => <span key={source}>{sourceLabel(source, lang as Lang)}</span>)}</div>
                              </div>
                            ) : (
                              <div className="requirements-compact">
                                <div>
                                  <strong>{status === 'unavailable' ? tr.unavailable : status === 'error' ? tr.error : `${requirements.length} ${extra.missingCount}`}</strong>
                                  <span>{status === 'unavailable' ? tr.unavailableCopy : status === 'error' ? tr.loadError : tr.missingData}</span>
                                </div>
                                {status === 'needs_data' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRequirements(report.id)}
                                    aria-expanded={requirementsOpen}
                                    aria-controls={`requirements-${report.id}`}
                                  >
                                    {requirementsOpen ? extra.hideRequirements : extra.showRequirements}
                                  </button>
                                )}
                              </div>
                            )}

                            {status === 'needs_data' && requirementsOpen && (
                              <div className="missing-requirements" id={`requirements-${report.id}`}>
                                <strong>{tr.requiredData}</strong>
                                <ul>
                                  {requirements.map(key => <li key={key}>{tableKeyLabel(key, lang as Lang)}</li>)}
                                </ul>
                                {missingActions.length > 0 && (
                                  <div className="missing-actions">
                                    {missingActions.slice(0, 3).map(action => (
                                      <button key={`${action.href}-${action.label}`} type="button" onClick={() => router.push(action.href)} aria-label={action.label}>
                                        {action.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="card-actions compact-actions">
                              <button type="button" className="primary-card-action" onClick={primaryAction} aria-label={`${primaryLabel} ${report.title[lang as Lang]}`}>
                                <FileText size={15} /> {primaryLabel}
                              </button>
                              <details className="report-actions-menu">
                                <summary>{extra.actions}</summary>
                                <div>
                                  <button type="button" disabled={!canPrint} aria-disabled={!canPrint} title={!canPrint ? tr.exportsDisabled : undefined} onClick={() => printReport(report)} aria-label={`${tr.pdf} ${report.title[lang as Lang]}`}>
                                    <Printer size={15} /> {tr.pdf}
                                  </button>
                                  <button type="button" disabled={!canCsv} aria-disabled={!canCsv} title={!canCsv ? tr.exportsDisabled : undefined} onClick={() => exportCsv(report)} aria-label={`${tr.excel} ${report.title[lang as Lang]}`}>
                                    <FileSpreadsheet size={15} /> {report.exportable ? tr.excel : tr.comingSoon}
                                  </button>
                                  <button type="button" onClick={() => setActiveReportId(report.id)} aria-label={`${extra.reportDetails} ${report.title[lang as Lang]}`}>
                                    <FileText size={15} /> {extra.reportDetails}
                                  </button>
                                  <button type="button" onClick={() => router.push(report.route)} aria-label={`${tr.configure} ${report.title[lang as Lang]}`}>
                                    <Settings2 size={15} /> {tr.configure}
                                  </button>
                                </div>
                              </details>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <aside className="preview-panel print-area" aria-label={tr.reportPreview}>
            <div className="print-report-brand">
              <Image src="/sfm-logo.png" alt="" width={46} height={46} />
              <div>
                <strong>THE SFM</strong>
                <span>{tr.generatedBy}</span>
              </div>
            </div>
            <div className="preview-head">
              <div>
                <span>{tr.reportPreview}</span>
                <h2>{activeReport.title[lang as Lang]}</h2>
              </div>
              <span className="status-badge" style={{ color: STATUS_TONE[activeStatus], background: `${STATUS_TONE[activeStatus]}12`, borderColor: `${STATUS_TONE[activeStatus]}30` }}>
                {statusLabel(activeStatus)}
              </span>
            </div>

            <div className="preview-meta">
              <span>{tr.userName}: {String(user?.user_metadata?.full_name || user?.email || 'THE SFM')}</span>
              <span>{tr.year}: {filters.year}</span>
              <span>{tr.month}: {filters.month === 'all' ? tr.allCategories : filters.month}</span>
              <span>{tr.currency}: {filters.currency}</span>
              <span>{tr.reportDate}: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</span>
              <span>{tr.rows}: {activeRows.length}</span>
            </div>

            {activeStatus === 'ready' && activeRows.length > 0 ? (
              <>
                <p className="ready-copy">{tr.reportReady}</p>
                <div className="preview-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(activeRows[0]).map(key => <th key={key}>{columnLabel(key, lang as Lang)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {activeRows.slice(0, 60).map((row, index) => (
                        <tr key={index}>
                          {Object.keys(activeRows[0]).map(key => <td key={key}>{normalizeReportCellValue(row[key], lang as Lang)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="preview-empty">
                <ShieldAlert size={28} />
                <strong>{activeStatus === 'unavailable' ? tr.unavailable : tr.noData}</strong>
                <p>{activeStatus === 'unavailable' ? tr.unavailableCopy : activeStatus === 'error' ? tr.loadError : tr.missingData}</p>
                {activeStatus === 'needs_data' && activeMissing.length > 0 && (
                  <div className="preview-requirements">
                    <strong>{tr.requiredData}</strong>
                    <ul>
                      {activeMissing.map(key => <li key={key}>{tableKeyLabel(key, lang as Lang)}</li>)}
                    </ul>
                    <div className="missing-actions">
                      {uniqueActions(activeMissing.map(missingActionForKey)).slice(0, 3).map(action => (
                        <button key={`${action.href}-${action.label}`} type="button" onClick={() => router.push(action.href)} aria-label={action.label}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="preview-actions no-print">
              <button type="button" disabled={!activeCanExport} aria-disabled={!activeCanExport} title={!activeCanExport ? tr.exportsDisabled : undefined} onClick={() => printReport(activeReport)}>
                <Printer size={16} /> {tr.printPdf}
              </button>
              <button type="button" disabled={!activeCanExport || !activeReport.exportable} aria-disabled={!activeCanExport || !activeReport.exportable} title={!activeCanExport || !activeReport.exportable ? tr.exportsDisabled : undefined} onClick={() => exportCsv(activeReport)}>
                <Download size={16} /> {activeReport.exportable ? tr.excel : tr.comingSoon}
              </button>
            </div>
            <footer className="print-footer">{tr.generatedBy}</footer>
          </aside>
        </div>

        <section className="history-panel no-print">
          <div className="section-title">
            <BarChart3 size={18} />
            <h2>{tr.generatedReports}</h2>
          </div>
          <p>{tr.noGeneratedReports}</p>
        </section>

        {toast && <div className="toast no-print">{toast}</div>}
      </DashboardPageShell>
      <style jsx>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .reports-center-shell{min-height:100vh;background:var(--sfm-background);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
  .reports-center-main{width:calc(100% - var(--sidebar-w,230px))!important;max-width:none!important;margin:0!important;margin-inline-start:var(--sidebar-w,230px)!important;margin-inline-end:0!important;padding:22px 24px 60px!important;min-width:0;overflow-x:clip}
  .reports-center-content{display:grid;gap:18px;width:100%;max-width:none;min-width:0}
  [dir="ltr"] .reports-center-main{margin-inline-start:var(--sidebar-w,230px)!important;margin-inline-end:0!important}
  .loading-state{min-height:100vh;place-items:center;color:var(--sfm-primary);font-weight:900}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .topbar{display:flex;justify-content:space-between;align-items:center;gap:12px}.topbar span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900}.topbar strong{font-size:24px}
  .reports-hero{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:30px;padding:clamp(24px,5vw,48px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:0 24px 80px rgba(3,18,37,.22)}
  .hero-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.22);background:rgba(167,243,240,.10);border-radius:999px;padding:8px 13px;color:var(--sfm-soft-cyan);font-size:12px;font-weight:950}
  .reports-hero h1{margin:18px 0 10px;font-size:clamp(34px,7vw,66px);line-height:1;font-weight:950;letter-spacing:0}.reports-hero p{margin:0;max-width:780px;color:rgba(234,246,255,.76);font-size:clamp(15px,2vw,19px);line-height:1.8;font-weight:800}
  .hero-stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.hero-stats span{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:7px 11px;color:rgba(234,246,255,.8);font-size:12px;font-weight:900}
  .hero-actions{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
  .reports-hero button,.preview-actions button,.card-actions button{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:42px;padding:0 13px}
  .reports-hero button{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;white-space:nowrap}.reports-hero button:disabled{background:rgba(234,246,255,.2);color:rgba(234,246,255,.62);cursor:not-allowed}
  .report-summary-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.report-summary-cards article{min-width:0;border:1px solid rgba(29,140,255,.14);border-radius:18px;background:var(--sfm-card);box-shadow:0 12px 34px rgba(3,18,37,.06);padding:14px;display:grid;gap:7px}.report-summary-cards span{color:var(--sfm-muted);font-size:12px;font-weight:950}.report-summary-cards strong{color:var(--sfm-primary-dark);font-size:24px;line-height:1.1;overflow-wrap:anywhere}
  .category-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:thin}.category-tabs button{flex:0 0 auto;min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 14px;display:inline-flex;align-items:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease,background .18s ease}.category-tabs button:hover{transform:translateY(-1px);border-color:rgba(24,212,212,.34);color:var(--sfm-primary-dark);box-shadow:0 10px 24px rgba(29,140,255,.10)}.category-tabs button span{min-width:24px;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:3px 7px}.category-tabs button.active,.category-tabs button:focus-visible{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.14)}.category-tabs button.active span{background:rgba(167,243,240,.16);color:var(--sfm-soft-cyan)}
  .filters-panel,.category-section,.preview-panel,.history-panel,.ready-panel{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;box-shadow:0 14px 44px rgba(3,18,37,.07);min-width:0}
  .filters-panel,.history-panel,.ready-panel{padding:16px}.section-title{display:flex;align-items:center;gap:9px;margin-bottom:12px;color:var(--sfm-primary)}.section-title h2{margin:0;color:var(--sfm-primary-dark);font-size:18px;font-weight:950}
  .filters-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:start}.filters-grid label{display:grid;gap:6px;min-width:0}.filters-grid span{font-size:11px;font-weight:950;color:var(--sfm-muted)}.filters-grid input,.filters-grid select{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-primary-dark);padding:10px 11px;font:900 12px Tajawal,Arial,sans-serif;outline:0}.filters-grid input:focus,.filters-grid select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.filters-project-selector{grid-column:span 2;min-width:0}
  .ready-panel p{margin:0;color:var(--sfm-muted);font-weight:900;line-height:1.7}.ready-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(230px,100%),1fr));gap:8px}.ready-list button{min-width:0;border:1px solid rgba(21,128,61,.14);border-radius:15px;background:#F2FAEA;color:#047857;padding:10px 12px;text-align:start;display:grid;gap:4px;font-family:inherit;cursor:pointer}.ready-list button.view-all-ready{background:#FFFFFF;border-color:rgba(29,140,255,.18);color:var(--sfm-primary-dark)}.ready-list button span{font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ready-list button strong{font-size:11px;color:#4D6B32}
  .reports-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,380px);gap:18px;align-items:start;min-width:0}.report-categories{display:grid;gap:14px;min-width:0}.category-section{padding:0;overflow:visible}.category-summary{width:100%;border:0;background:transparent;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--sfm-primary-dark);font-family:inherit;cursor:pointer;text-align:start}.category-title{display:inline-flex;align-items:center;gap:9px;min-width:0}.category-title svg{color:var(--sfm-primary)}.category-title strong{font-size:18px;font-weight:950;overflow-wrap:anywhere}.category-counts{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.category-counts em{font-style:normal;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:999px;padding:5px 8px;color:var(--sfm-muted);font-size:11px;font-weight:950}.category-summary svg:last-child{transition:transform .18s ease}.category-summary[aria-expanded="true"] svg:last-child{transform:rotate(180deg)}.reports-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:12px;min-width:0;padding:0 18px 18px}
  .report-card{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.13);border-radius:18px;padding:14px;display:grid;grid-template-rows:auto auto 1fr auto;gap:10px;min-width:0;min-height:218px}.report-card.ready{border-color:rgba(21,128,61,.18)}.report-card.needs_data{border-color:rgba(154,94,13,.22)}.report-card.unavailable,.report-card.error{background:var(--sfm-light-card)}.report-card-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:start}.report-card h3{margin:0 0 5px;color:var(--sfm-primary-dark);font-size:16px;font-weight:950;line-height:1.35}.report-card p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .status-badge{display:inline-flex;align-items:center;border:1px solid;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:950;white-space:nowrap}.sources,.missing-requirements{display:grid;gap:7px}.sources strong,.missing-requirements strong{font-size:11px;color:var(--sfm-primary)}.sources div{display:flex;flex-wrap:wrap;gap:5px}.sources span{font-size:11px;font-weight:900;color:var(--sfm-muted);background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);border-radius:999px;padding:4px 7px}.missing-requirements{background:#FFF7ED;border:1px solid rgba(154,94,13,.16);border-radius:13px;padding:10px}.missing-requirements ul{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:5px}.missing-requirements li{font-size:11px;font-weight:950;color:#7A4B09;background:#FFFFFF;border:1px solid rgba(154,94,13,.16);border-radius:999px;padding:4px 8px}
  .card-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:var(--sfm-muted);font-size:11px;font-weight:900}.requirements-compact{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;background:rgba(154,94,13,.08);border:1px solid rgba(154,94,13,.14);border-radius:13px;padding:10px}.requirements-compact div{min-width:0;display:grid;gap:3px}.requirements-compact strong{color:#7A4B09;font-size:12px}.requirements-compact span{color:#7A4B09;font-size:11px;font-weight:850;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.requirements-compact button,.missing-actions button{border:1px solid rgba(29,140,255,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-primary-hover);padding:7px 10px;font:950 11px Tajawal,Arial,sans-serif;cursor:pointer}.missing-actions{display:flex;flex-wrap:wrap;gap:6px}
  .card-actions{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;min-width:0;align-items:center}.card-actions button,.report-actions-menu summary{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:42px;padding:0 13px}.primary-card-action{background:var(--sfm-primary-dark)!important;color:var(--sfm-card)!important;min-width:0;white-space:normal}.report-actions-menu{position:relative;justify-self:end}.report-actions-menu summary{list-style:none;border:1px solid rgba(29,140,255,.18);background:#FFFFFF;color:var(--sfm-primary-dark)}.report-actions-menu summary::-webkit-details-marker{display:none}.report-actions-menu div{position:absolute;inset-block-start:calc(100% + 8px);inset-inline-end:0;z-index:20;min-width:220px;display:grid;gap:6px;background:#FFFFFF;border:1px solid rgba(29,140,255,.16);border-radius:16px;box-shadow:0 18px 48px rgba(3,18,37,.18);padding:8px}.report-actions-menu button{width:100%;justify-content:flex-start;background:#FFFFFF;color:var(--sfm-primary-dark);border:1px solid rgba(29,140,255,.10);white-space:normal}.report-actions-menu button:hover{background:rgba(29,140,255,.08)}.card-actions button:disabled,.preview-actions button:disabled,.report-actions-menu button:disabled{opacity:1;background:#EEF2F7!important;color:#64748B!important;border:1px solid rgba(100,116,139,.18);cursor:not-allowed}
  .preview-panel{padding:18px;position:sticky;top:18px}.print-report-brand{display:flex;align-items:center;gap:12px;border:1px solid rgba(29,140,255,.12);background:linear-gradient(180deg,#FFFFFF,var(--sfm-light-card));border-radius:16px;padding:12px;margin-bottom:14px}.print-report-brand img{width:42px;height:42px;border-radius:12px;object-fit:cover}.print-report-brand strong{display:block;color:var(--sfm-primary-dark);font-size:18px;font-weight:950}.print-report-brand span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900}.preview-head{display:flex;justify-content:space-between;gap:12px;align-items:start;border-bottom:1px solid rgba(29,140,255,.12);padding-bottom:12px}.preview-head span:first-child{font-size:12px;color:var(--sfm-primary);font-weight:950}.preview-head h2{margin:5px 0 0;color:var(--sfm-primary-dark);font-size:24px;line-height:1.2}.preview-meta{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.preview-meta span{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900;color:var(--sfm-muted)}.ready-copy{margin:0 0 12px;color:#047857;background:#ECFDF5;border:1px solid rgba(39,80,10,.12);border-radius:13px;padding:10px;font-size:13px;font-weight:900}
  .preview-table-wrap{max-width:100%;max-height:540px;overflow:auto;border:1px solid rgba(29,140,255,.14);border-radius:14px}.preview-table-wrap table{width:100%;border-collapse:collapse;background:var(--sfm-card);min-width:560px;table-layout:auto}.preview-table-wrap th,.preview-table-wrap td{padding:10px;border-bottom:1px solid rgba(29,140,255,.1);text-align:start;font-size:12px}.preview-table-wrap th{color:var(--sfm-primary);background:rgba(29,140,255,.10);font-weight:950;white-space:nowrap}.preview-table-wrap td{color:var(--sfm-midnight);font-weight:800;white-space:normal;vertical-align:top;overflow-wrap:anywhere;max-width:280px}
  .preview-empty{min-height:260px;display:grid;place-items:center;text-align:center;align-content:center;gap:9px;background:var(--sfm-light-card);border:1px dashed rgba(29,140,255,.26);border-radius:18px;color:var(--sfm-primary);padding:18px}.preview-empty strong{color:var(--sfm-primary-dark);font-size:18px}.preview-empty p{margin:0;color:var(--sfm-muted);line-height:1.7;font-weight:900}.preview-requirements{width:100%;display:grid;gap:8px;text-align:start;background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:14px;padding:12px}.preview-requirements>strong{font-size:12px;color:var(--sfm-primary)}.preview-requirements ul{margin:0;padding-inline-start:20px;color:#7A4B09;font-weight:950}
  .preview-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.preview-actions button{background:var(--sfm-primary-dark);color:var(--sfm-card)}.preview-actions button+button{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.print-footer{display:none;margin-top:18px;border-top:1px solid rgba(29,140,255,.16);padding-top:10px;color:var(--sfm-muted);font-size:11px;font-weight:900;text-align:center}
  .history-panel p{margin:0;color:var(--sfm-muted);line-height:1.7;font-weight:800}.toast{position:fixed;inset:auto 24px 24px auto;z-index:80;background:var(--sfm-primary-dark);color:var(--sfm-card);border:1px solid rgba(29,140,255,.3);border-radius:16px;padding:12px 14px;font-weight:950;box-shadow:0 18px 50px rgba(3,18,37,.28)}
  [dir="rtl"] .toast{inset:auto auto 24px 24px}
  @media(max-width:1200px){.filters-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.filters-project-selector{grid-column:1 / -1}.reports-layout{grid-template-columns:1fr}.preview-panel{position:static}.reports-grid{grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))}}
  @media(max-width:1024px){.reports-center-main{width:100%!important;max-width:100%!important;margin-inline-start:0!important;margin-inline-end:0!important;padding:calc(84px + env(safe-area-inset-top)) 16px 24px!important}.reports-hero{grid-template-columns:1fr}.reports-hero button{width:100%}.report-summary-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:720px){.filters-grid,.report-summary-cards{grid-template-columns:1fr}.card-actions{grid-template-columns:1fr}.report-actions-menu,.report-actions-menu summary,.primary-card-action{width:100%}.report-actions-menu div{position:static;margin-top:8px;min-width:0}.requirements-compact{grid-template-columns:1fr}.requirements-compact button{width:100%}.category-summary{align-items:flex-start;flex-direction:column}.category-counts{justify-content:flex-start}.reports-grid{padding:0 14px 14px}.reports-hero{border-radius:22px}.topbar{align-items:flex-start}.preview-table-wrap table{min-width:520px}.reports-center-content{gap:14px}.toast{left:14px;right:14px;bottom:14px;text-align:center}}
  @media print{@page{size:A4;margin:14mm}.sfm-shared-sidebar,.no-print,.topbar,.reports-hero,.filters-panel,.report-categories,.history-panel,.toast{display:none!important}.reports-center-main{width:100%!important;margin:0!important;padding:0!important}.reports-center-shell{background:white;color:#0F2742}.reports-layout{display:block}.preview-panel{position:static!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;background:white!important}.print-report-brand{break-inside:avoid;border:0;border-bottom:2px solid #0F2742;border-radius:0;background:white;padding:0 0 12px;margin-bottom:18px}.print-report-brand img{width:46px;height:46px}.print-report-brand strong{font-size:22px;color:#0F2742}.preview-head{break-inside:avoid}.preview-head h2{font-size:24px;color:#0F2742}.status-badge{border-color:#94A3B8!important;color:#0F2742!important;background:#F8FAFC!important}.preview-meta span{border:1px solid #CBD5E1;background:#F8FAFC;color:#334155;border-radius:8px}.ready-copy{border-color:#BBF7D0;background:#F0FDF4;color:#166534}.preview-table-wrap{max-height:none;overflow:visible;border:1px solid #CBD5E1;border-radius:0}.preview-table-wrap table{min-width:0;font-size:10.5px}.preview-table-wrap th{background:#EAF6FF!important;color:#0F2742!important}.preview-table-wrap th,.preview-table-wrap td{padding:7px;border-color:#E2E8F0;white-space:normal}.preview-actions{display:none!important}.print-footer{display:block}}
`;

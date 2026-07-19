'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Printer,
  Settings2,
  ShieldAlert,
  X,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageTabPanel, PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables } from '@/lib/data/reportsData';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';
import { buildFeasibilityStudyExportRow, printFeasibilityStudyToPdf } from '@/lib/reports/feasibilityStudyExport';
import { evaluateReportReadiness } from '@/lib/reports/reportReadiness';
import { formatDate, formatNumber, normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { trackEvent } from '@/lib/analytics';
import { recordAccountActivity } from '@/lib/accountActivity';
import { investmentValueInCurrency } from '@/lib/investments/currencyIntegrity';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';

type Lang = 'ar' | 'en' | 'fr';
type ReportStatus = 'ready' | 'needs_data' | 'unavailable' | 'error';
type ReportCategory = 'financial' | 'investment' | 'projects' | 'charity';
type ReportStatusFilter = 'all' | 'ready' | 'needs_data';
const REPORT_WORKSPACE_TAB_IDS = ['recent', 'financial', 'markets', 'business', 'charity', 'ai-generated', 'archived'] as const;
type ReportWorkspaceTab = typeof REPORT_WORKSPACE_TAB_IDS[number];
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
    tabRecent: 'الأحدث',
    tabFinancial: 'المالية',
    tabMarkets: 'الأسواق',
    tabBusiness: 'الأعمال',
    tabCharity: 'الأعمال الخيرية',
    tabAiGenerated: 'منشأة بالذكاء الاصطناعي',
    tabArchived: 'المؤرشفة',
    tabReady: 'الجاهزة',
    tabNeedsData: 'تحتاج بيانات',
    statusAll: 'كل الحالات',
    filterSummary: 'الحالة وفلاتر التقرير',
    noReportsMatch: 'لا توجد تقارير تطابق هذه الحالة والفلاتر.',
    recentDescription: 'التقارير الجاهزة حالياً من بياناتك المسجلة. لا يحفظ المركز سجل التوليد بعد.',
    recentEmpty: 'لا توجد تقارير جاهزة من البيانات الحالية.',
    aiEmptyTitle: 'لا توجد تقارير منشأة بالذكاء الاصطناعي',
    aiEmptyBody: 'هذا القسم يعرض فقط التقارير المنشأة والمحفوظة فعلياً، ولا توجد بيانات محفوظة حالياً.',
    archivedEmptyTitle: 'لا توجد تقارير مؤرشفة',
    archivedEmptyBody: 'ستظهر هنا فقط التقارير التي يتم حفظها أو أرشفتها فعلياً.',
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
    tabRecent: 'Recent',
    tabFinancial: 'Financial',
    tabMarkets: 'Markets',
    tabBusiness: 'Business',
    tabCharity: 'Charity',
    tabAiGenerated: 'AI Generated',
    tabArchived: 'Archived',
    tabReady: 'Ready',
    tabNeedsData: 'Needs Data',
    statusAll: 'All statuses',
    filterSummary: 'Status and report filters',
    noReportsMatch: 'No reports match this status and filter selection.',
    recentDescription: 'Reports currently ready from your recorded data. The center does not yet store generation history.',
    recentEmpty: 'No reports are ready from the current data.',
    aiEmptyTitle: 'No AI-generated reports',
    aiEmptyBody: 'This view only shows reports that were actually generated and saved; none are stored right now.',
    archivedEmptyTitle: 'No archived reports',
    archivedEmptyBody: 'Only reports that are actually saved or archived will appear here.',
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
    tabRecent: 'Récents',
    tabFinancial: 'Financiers',
    tabMarkets: 'Marchés',
    tabBusiness: 'Entreprise',
    tabCharity: 'Charité',
    tabAiGenerated: 'Générés par IA',
    tabArchived: 'Archivés',
    tabReady: 'Prêts',
    tabNeedsData: 'Données requises',
    statusAll: 'Tous les statuts',
    filterSummary: 'Statut et filtres du rapport',
    noReportsMatch: 'Aucun rapport ne correspond à ce statut et à ces filtres.',
    recentDescription: 'Rapports actuellement prêts à partir de vos données enregistrées. Le centre ne conserve pas encore l’historique de génération.',
    recentEmpty: 'Aucun rapport n’est prêt avec les données actuelles.',
    aiEmptyTitle: 'Aucun rapport généré par IA',
    aiEmptyBody: 'Cette vue affiche uniquement les rapports réellement générés et enregistrés ; aucun n’est stocké actuellement.',
    archivedEmptyTitle: 'Aucun rapport archivé',
    archivedEmptyBody: 'Seuls les rapports réellement enregistrés ou archivés apparaîtront ici.',
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
    description: { ar: 'يفتح تحليل السوق لاستخدام بيانات Yahoo Finance أو إظهار عدم توفر المصدر.', en: 'Opens Market Analysis to use Yahoo Finance data or show provider unavailability.', fr: 'Ouvre l’analyse de marché pour utiliser Yahoo Finance ou afficher l’indisponibilité.' },
    sources: { ar: ['Yahoo Finance عند توفره'], en: ['Yahoo Finance when available'], fr: ['Yahoo Finance si disponible'] },
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
    purchase_platform_name: 'جهة الشراء أو الحفظ',
    purchase_platform_type: 'نوع المنصة أو الجهة',
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
    purchase_platform_name: 'Purchase or custody platform',
    purchase_platform_type: 'Platform or provider type',
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
    purchase_platform_name: 'Plateforme d’achat ou de conservation',
    purchase_platform_type: 'Type de plateforme ou d’entité',
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

const PDF_REPORT_TEXT: Record<Lang, {
  reportCenter: string;
  privateReport: string;
  generatedAt: string;
  reportPeriod: string;
  reportYear: string;
  grouping: string;
  currency: string;
  recordsCount: string;
  userName: string;
  totalExpenses: string;
  operationsCount: string;
  averageExpense: string;
  highestExpense: string;
  topCategory: string;
  coveredPeriod: string;
  noCategory: string;
  printReady: string;
  previewControls: string;
  fitWidth: string;
  fitPage: string;
  pageNumber: string;
}> = {
  ar: {
    reportCenter: 'مركز التقارير المالية',
    privateReport: 'تقرير مالي خاص بالمستخدم',
    generatedAt: 'تاريخ إنشاء التقرير',
    reportPeriod: 'فترة التقرير',
    reportYear: 'سنة التقرير',
    grouping: 'طريقة التجميع',
    currency: 'العملة',
    recordsCount: 'عدد السجلات',
    userName: 'اسم المستخدم',
    totalExpenses: 'إجمالي المصروفات',
    operationsCount: 'عدد العمليات',
    averageExpense: 'متوسط المصروف',
    highestExpense: 'أعلى مصروف',
    topCategory: 'أكثر تصنيف إنفاقاً',
    coveredPeriod: 'الفترة المشمولة',
    noCategory: 'غير مصنف',
    printReady: 'المعاينة جاهزة للطباعة أو الحفظ كملف PDF.',
    previewControls: 'أدوات المعاينة',
    fitWidth: 'ملاءمة العرض',
    fitPage: 'ملاءمة الصفحة',
    pageNumber: 'صفحة',
  },
  en: {
    reportCenter: 'Financial Reports Center',
    privateReport: 'Private financial report',
    generatedAt: 'Generated at',
    reportPeriod: 'Report period',
    reportYear: 'Report year',
    grouping: 'Grouping',
    currency: 'Currency',
    recordsCount: 'Records',
    userName: 'User name',
    totalExpenses: 'Total expenses',
    operationsCount: 'Transactions',
    averageExpense: 'Average expense',
    highestExpense: 'Highest expense',
    topCategory: 'Top spending category',
    coveredPeriod: 'Covered period',
    noCategory: 'Uncategorized',
    printReady: 'The preview is ready to print or save as PDF.',
    previewControls: 'Preview controls',
    fitWidth: 'Fit width',
    fitPage: 'Fit page',
    pageNumber: 'Page',
  },
  fr: {
    reportCenter: 'Centre des rapports financiers',
    privateReport: 'Rapport financier privé',
    generatedAt: 'Date de génération',
    reportPeriod: 'Période du rapport',
    reportYear: 'Année du rapport',
    grouping: 'Regroupement',
    currency: 'Devise',
    recordsCount: 'Enregistrements',
    userName: 'Nom utilisateur',
    totalExpenses: 'Total des dépenses',
    operationsCount: 'Opérations',
    averageExpense: 'Dépense moyenne',
    highestExpense: 'Dépense la plus élevée',
    topCategory: 'Catégorie principale',
    coveredPeriod: 'Période couverte',
    noCategory: 'Non classé',
    printReady: 'L’aperçu est prêt pour l’impression ou l’export PDF.',
    previewControls: 'Contrôles d’aperçu',
    fitWidth: 'Adapter à la largeur',
    fitPage: 'Adapter à la page',
    pageNumber: 'Page',
  },
};

type PdfColumn = {
  key: string;
  label: string;
  align?: 'start' | 'end';
};

function localeForReport(lang: Lang) {
  if (lang === 'ar') return toLatinNumberLocale('ar-KW');
  if (lang === 'fr') return toLatinNumberLocale('fr-FR');
  return toLatinNumberLocale('en-US');
}

function formatReportDateValue(value: unknown, lang: Lang, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  if (!date || !Number.isFinite(date.getTime())) return '';
  return normalizeDigits(new Intl.DateTimeFormat(localeForReport(lang), {
    ...(options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    }),
    numberingSystem: 'latn',
  }).format(date));
}

function formatReportDateTime(value: unknown, lang: Lang) {
  return formatReportDateValue(value, lang, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatReportAmount(value: unknown, currency: unknown, lang: Lang) {
  const amount = numberValue(value);
  const code = currencyCode(currency, 'KWD');
  const decimals = code === 'KWD' ? 3 : 2;
  const formatted = normalizeDigits(new Intl.NumberFormat(localeForReport(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    numberingSystem: 'latn',
  }).format(amount));
  const label = formatReportCurrency(code, code, lang);
  return normalizeDigits(lang === 'en' ? `${code} ${formatted}` : `${formatted} ${label}`);
}

function reportPeriodLabel(filters: Filters, lang: Lang) {
  if (filters.startDate || filters.endDate) {
    const start = filters.startDate ? formatReportDateValue(filters.startDate, lang) : '...';
    const end = filters.endDate ? formatReportDateValue(filters.endDate, lang) : '...';
    return `${start} - ${end}`;
  }
  if (filters.month !== 'all') {
    const monthDate = new Date(Number(filters.year), Number(filters.month) - 1, 1);
    return normalizeDigits(new Intl.DateTimeFormat(localeForReport(lang), { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(monthDate));
  }
  return normalizeDigits(filters.year);
}

function reportFileName(report: ReportDefinition, filters: Filters, lang: Lang) {
  const monthPart = filters.month === 'all' ? filters.year : `${filters.year}-${filters.month}`;
  const localizedTitle = report.id === 'expenses' && lang === 'ar' ? 'تقرير-المصروفات' : slug(report.title.en);
  return `THE-SFM-${localizedTitle}-${monthPart}.pdf`;
}

function expenseSummaryRows(rows: Record<string, unknown>[], filters: Filters, lang: Lang) {
  const text = PDF_REPORT_TEXT[lang];
  const total = rows.reduce((sum, row) => sum + numberValue(row.amount), 0);
  const count = rows.length;
  const average = count ? total / count : 0;
  const highest = rows.reduce((max, row) => Math.max(max, numberValue(row.amount)), 0);
  const categoryTotals = rows.reduce((map, row) => {
    const category = cleanReportText(row.category) || text.noCategory;
    map.set(category, (map.get(category) ?? 0) + numberValue(row.amount));
    return map;
  }, new Map<string, number>());
  const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? text.noCategory;

  return [
    { label: text.totalExpenses, value: formatReportAmount(total, filters.currency, lang) },
    { label: text.operationsCount, value: formatNumber(count, lang) },
    { label: text.averageExpense, value: formatReportAmount(average, filters.currency, lang) },
    { label: text.highestExpense, value: formatReportAmount(highest, filters.currency, lang) },
    { label: text.topCategory, value: topCategory },
    { label: text.coveredPeriod, value: reportPeriodLabel(filters, lang) },
  ];
}

function reportMetadataRows(report: ReportDefinition, filters: Filters, lang: Lang, userLabel: string, rowsCount: number, generatedAt: Date) {
  const text = PDF_REPORT_TEXT[lang];
  return [
    { label: text.userName, value: userLabel },
    { label: text.reportPeriod, value: reportPeriodLabel(filters, lang) },
    { label: text.reportYear, value: filters.year },
    { label: text.grouping, value: report.category },
    { label: text.currency, value: filters.currency },
    { label: text.recordsCount, value: formatNumber(rowsCount, lang) },
    { label: text.generatedAt, value: formatReportDateTime(generatedAt, lang) },
  ].filter(item => cleanReportText(item.value));
}

function reportColumns(report: ReportDefinition, rows: Record<string, unknown>[], lang: Lang): PdfColumn[] {
  if (report.id === 'expenses') {
    const optional: PdfColumn[] = [];
    if (rows.some(row => cleanReportText(row.payment_method))) {
      optional.push({ key: 'payment_method', label: columnLabel('payment_method', lang) });
    }
    if (rows.some(row => cleanReportText(row.notes))) {
      optional.push({ key: 'notes', label: columnLabel('notes', lang) });
    }
    return [
      { key: 'date', label: columnLabel('date', lang) },
      { key: 'name', label: columnLabel('name', lang) },
      { key: 'category', label: columnLabel('category', lang) },
      ...optional,
      { key: 'amount', label: columnLabel('amount', lang), align: 'end' },
    ];
  }

  const keys = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach(key => set.add(key));
    return set;
  }, new Set<string>()));
  return keys.map(key => ({
    key,
    label: columnLabel(key, lang),
    align: /amount|value|total|price|cost|balance|profit|revenue/i.test(key) ? 'end' : 'start',
  }));
}

function reportCellValue(row: Record<string, unknown>, column: PdfColumn, lang: Lang, fallbackCurrency: string) {
  const value = row[column.key];
  if (column.key === 'date' || column.key.endsWith('_date') || column.key.endsWith('_at')) {
    return formatReportDateValue(value, lang);
  }
  if (column.key === 'amount' || column.key.endsWith('_amount') || column.key.includes('value') || column.key.includes('cost') || column.key.includes('profit') || column.key.includes('revenue')) {
    return formatReportAmount(value, row.currency ?? fallbackCurrency, lang);
  }
  if (typeof value === 'number') return formatNumber(value, lang, { maximumFractionDigits: 3 });
  return normalizeReportCellValue(value, lang);
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
  const status = evaluateReportReadiness(report.id, records, loadErrors);
  return (status === 'unknown' ? 'error' : status) as ReportStatus;
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
    const investmentValues = investments
      .map(row => investmentValueInCurrency(row, filters.currency))
      .filter((value): value is NonNullable<typeof value> => value !== null);
    if (investmentValues.length > 0) {
      addSummaryRow(report.title[lang], lang === 'ar' ? 'إجمالي الاستثمارات' : lang === 'fr' ? 'Total investissements' : 'Total investments', money(investmentValues.reduce((sum, value) => sum + value.amount, 0)));
    }
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
      payment_method: firstText(row, ['payment_method', 'paymentMethod', 'payment_source', 'paymentSource']),
      notes: firstText(row, ['notes', 'note']),
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
    return filteredRows(records.investments, filters).map(row => {
      const resolvedValue = investmentValueInCurrency(row, filters.currency);
      return {
        name: firstText(row, ['name', 'description'], entity.investment),
        type: firstText(row, ['type', 'investment_type']),
        current_value: resolvedValue?.amount ?? null,
        native_market_value: numberValue(row.native_market_value ?? row.current_market_value),
        native_currency: row.native_currency ?? row.price_currency ?? null,
        user_currency: row.user_currency ?? null,
        fx_rate: numberValue(row.fx_rate_to_user_currency),
        monthly_contribution: numberValue(row.monthlyContribution ?? row.monthly_contribution),
        risk: firstText(row, ['riskLevel', 'risk_level']),
        purchase_platform_name: firstText(row, ['purchasePlatformName', 'purchase_platform_name']),
        purchase_platform_type: firstText(row, ['purchasePlatformType', 'purchase_platform_type']),
        currency: resolvedValue?.currency ?? row.currency ?? null,
      };
    });
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
  const now = useMemo(() => new Date(), []);
  const reportLang = (lang as Lang) || 'ar';
  const pdfText = PDF_REPORT_TEXT[reportLang];
  const [records, setRecords] = useState<RecordsState>(EMPTY_RECORDS);
  const [loadErrors, setLoadErrors] = useState<Partial<Record<TableKey, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeReportId, setActiveReportId] = useState<ReportType>('monthly-financial');
  const [toast, setToast] = useState('');
  const [workspaceTab, setWorkspaceTab] = useUrlTabState<ReportWorkspaceTab>({
    param: 'tab',
    values: REPORT_WORKSPACE_TAB_IDS,
    defaultValue: 'recent',
    omitDefault: true,
  });
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('all');
  const [expandedRequirements, setExpandedRequirements] = useState<Record<string, boolean>>({});
  const [previewFit, setPreviewFit] = useState<'width' | 'page'>('width');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    year: String(now.getFullYear()),
    month: 'all',
    startDate: '',
    endDate: '',
    currency: 'KWD',
    projectId: '',
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

  const activeRows = useMemo(() => reportRows(activeReport, records, filters, reportLang), [activeReport, filters, reportLang, records]);
  const activeColumns = useMemo(() => reportColumns(activeReport, activeRows, reportLang), [activeReport, activeRows, reportLang]);
  const activeUserLabel = String(user?.user_metadata?.full_name || user?.email || 'THE SFM');
  const activeMetadataRows = useMemo(
    () => reportMetadataRows(activeReport, filters, reportLang, activeUserLabel, activeRows.length, now),
    [activeReport, activeRows.length, activeUserLabel, filters, now, reportLang],
  );
  const activeSummaryRows = useMemo(
    () => activeReport.id === 'expenses' ? expenseSummaryRows(activeRows, filters, reportLang) : [],
    [activeReport.id, activeRows, filters, reportLang],
  );
  const activeTotalAmount = useMemo(() => activeRows.reduce((sum, row) => sum + numberValue(row.amount), 0), [activeRows]);
  const activeStatus = reportStatus(activeReport, records, loadErrors);
  const readyCount = reportCards.filter(card => card.status === 'ready').length;
  const needsCount = reportCards.filter(card => card.status === 'needs_data').length;
  const unavailableCount = reportCards.filter(card => card.status === 'unavailable' || card.status === 'error').length;
  const readyCards = useMemo(
    () => reportCards.filter(card => card.status === 'ready' && card.rows.length > 0),
    [reportCards],
  );
  const tabScopedCards = useMemo(() => {
    if (workspaceTab === 'recent') return readyCards;
    if (workspaceTab === 'ai-generated' || workspaceTab === 'archived') return [];
    const category: ReportCategory = workspaceTab === 'markets'
      ? 'investment'
      : workspaceTab === 'business'
        ? 'projects'
        : workspaceTab;
    return reportCards.filter(card => card.report.category === category);
  }, [readyCards, reportCards, workspaceTab]);
  const visibleCards = useMemo(
    () => tabScopedCards.filter(card => statusFilter === 'all' || card.status === statusFilter),
    [statusFilter, tabScopedCards],
  );
  const reportTabs = useMemo<PageTabItem[]>(() => [
    { id: 'recent', label: extra.tabRecent, count: readyCards.length },
    { id: 'financial', label: extra.tabFinancial, count: reportCards.filter(card => card.report.category === 'financial').length },
    { id: 'markets', label: extra.tabMarkets, count: reportCards.filter(card => card.report.category === 'investment').length },
    { id: 'business', label: extra.tabBusiness, count: reportCards.filter(card => card.report.category === 'projects').length },
    { id: 'charity', label: extra.tabCharity, count: reportCards.filter(card => card.report.category === 'charity').length },
    { id: 'ai-generated', label: extra.tabAiGenerated, count: 0 },
    { id: 'archived', label: extra.tabArchived, count: 0 },
  ], [extra, readyCards.length, reportCards]);
  const activeCanExport = activeStatus === 'ready' && activeRows.length > 0;
  const activeReportInView = visibleCards.some(card => card.report.id === activeReport.id);
  const activeMissing = missingDataKeys(activeReport, records);
  const projects = records.projects;

  useEffect(() => {
    setPreviewOpen(false);
  }, [workspaceTab]);

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

  const selectWorkspaceTab = useCallback((id: string) => {
    if (!REPORT_WORKSPACE_TAB_IDS.includes(id as ReportWorkspaceTab)) return;
    setWorkspaceTab(id as ReportWorkspaceTab);
  }, [setWorkspaceTab]);

  const openReportPreview = useCallback((reportId: ReportType) => {
    setActiveReportId(reportId);
    setPreviewOpen(true);
  }, []);

  const toggleRequirements = useCallback((reportId: ReportType) => {
    setExpandedRequirements(prev => ({ ...prev, [reportId]: !prev[reportId] }));
  }, []);

  const exportCsv = useCallback((report: ReportDefinition) => {
    const status = reportStatus(report, records, loadErrors);
    const rows = status === 'ready' ? reportRows(report, records, filters, lang as Lang) : [];
    if (!rows.length) return showToast(tr.noRowsForExport);
    downloadCsv(`sfm-${slug(report.title.en)}-${filters.year}.csv`, rows, lang as Lang);
    void trackEvent('export_report', { module: 'reports', metadata: { export_type: 'csv', report_id: report.id } });
    if (user?.id && !isGuest) {
      void recordAccountActivity(supabase, {
        userId: user.id,
        eventType: 'report_exported',
        entityType: 'report',
        metadata: {
          export_type: 'csv',
          report_id: report.id,
          rows: rows.length,
          source: 'reports_center',
        },
      }).catch(error => {
        if (process.env.NODE_ENV === 'development') console.error('[account-activity] report csv export insert failed', error);
      });
    }
    showToast(tr.csvDownloaded);
  }, [filters, isGuest, lang, loadErrors, records, showToast, tr.csvDownloaded, tr.noRowsForExport, user?.id]);

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
        if (user?.id && !isGuest) {
          void recordAccountActivity(supabase, {
            userId: user.id,
            eventType: 'report_exported',
            entityType: 'report',
            metadata: {
              export_type: 'pdf',
              report_id: report.id,
              rows: rows.length,
              source: 'reports_center',
            },
          }).catch(error => {
            if (process.env.NODE_ENV === 'development') console.error('[account-activity] report pdf export insert failed', error);
          });
        }
        showToast(tr.printOpened);
      } catch (error) {
        console.error('Feasibility PDF export failed', error);
        showToast(tr.exportsDisabled);
      }
      return;
    }
    setActiveReportId(report.id);
    setPreviewOpen(true);
    window.setTimeout(() => {
      const previousTitle = document.title;
      const nextTitle = reportFileName(report, filters, lang as Lang).replace(/\.pdf$/i, '');
      const restoreTitle = () => {
        document.title = previousTitle;
        window.removeEventListener('afterprint', restoreTitle);
      };
      document.title = nextTitle;
      window.addEventListener('afterprint', restoreTitle);
      window.print();
      window.setTimeout(restoreTitle, 1500);
      void trackEvent('export_report', { module: 'reports', metadata: { export_type: 'print', report_id: report.id } });
      if (user?.id && !isGuest) {
        void recordAccountActivity(supabase, {
          userId: user.id,
          eventType: 'report_exported',
          entityType: 'report',
          metadata: {
            export_type: 'print',
            report_id: report.id,
            rows: rows.length,
            source: 'reports_center',
          },
        }).catch(error => {
          if (process.env.NODE_ENV === 'development') console.error('[account-activity] report print export insert failed', error);
        });
      }
      showToast(tr.printOpened);
    }, 120);
  }, [dir, filters, isGuest, lang, loadErrors, records, showToast, tr.exportsDisabled, tr.printOpened, user?.id]);

  const statusLabel = (status: ReportStatus) => {
    if (status === 'ready') return tr.ready;
    if (status === 'needs_data') return tr.needsData;
    if (status === 'error') return tr.error;
    return tr.unavailable;
  };

  if (authLoading || isLoading) {
    return (
      <div className="reports-center-shell" dir={dir}>
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
        <DashboardPageShell ariaLabel={tr.title} className="reports-center-main" contentClassName="reports-center-content">
          <section className="reports-hero">
            <div>
              <span className="hero-badge">{tr.heroBadge}</span>
              <h1>{tr.title}</h1>
              <p>{tr.signedInRequired}</p>
            </div>
            <button type="button" onClick={() => router.push(loginHrefForCurrentLocation('/reports-center'))}>{tr.signedInRequired}</button>
          </section>
        </DashboardPageShell>
        <style jsx>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="reports-center-shell" dir={dir}>
      <DashboardPageShell ariaLabel={tr.title} className="reports-center-main" contentClassName="reports-center-content">
        <header className="topbar no-print">
          <div>
            <span>THE SFM</span>
            <strong>{tr.title}</strong>
          </div>
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
            <button type="button" disabled={!activeCanExport || !activeReportInView} aria-disabled={!activeCanExport || !activeReportInView} onClick={() => printReport(activeReport)} aria-label={tr.printPdf}>
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

        <div className="no-print">
          <PageTabs
            idBase="reports-center-tabs"
            tabs={reportTabs}
            active={workspaceTab}
            onChange={selectWorkspaceTab}
            ariaLabel={tr.category}
            sticky
            mobileMode="auto"
          />
        </div>

        <details className="report-filter-drawer no-print">
          <summary>
            <span><Filter size={18} /> <strong>{extra.filterSummary}</strong></span>
            <span className="filter-context">{filters.year} · {filters.currency} · {statusFilter === 'all' ? extra.statusAll : statusFilter === 'ready' ? extra.tabReady : extra.tabNeedsData}</span>
            <ChevronDown className="filter-chevron" size={18} aria-hidden="true" />
          </summary>
          <div className="filter-drawer-content">
            <fieldset className="status-filter">
              <legend>{tr.status}</legend>
              <div>
                {([
                  { id: 'all', label: extra.statusAll },
                  { id: 'ready', label: extra.tabReady },
                  { id: 'needs_data', label: extra.tabNeedsData },
                ] as const).map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={statusFilter === option.id ? 'active' : ''}
                    aria-pressed={statusFilter === option.id}
                    onClick={() => setStatusFilter(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
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
          </div>
        </details>

        <div className={`reports-layout${previewOpen ? ' preview-open' : ''}`}>
          <PageTabPanel
            idBase="reports-center-tabs"
            value={workspaceTab}
            active
            className="report-categories no-print"
          >
            {workspaceTab === 'recent' && <p className="workspace-note">{extra.recentDescription}</p>}
            {workspaceTab === 'ai-generated' || workspaceTab === 'archived' ? (
              <div className="workspace-empty" role="status">
                <FileText size={26} aria-hidden="true" />
                <strong>{workspaceTab === 'ai-generated' ? extra.aiEmptyTitle : extra.archivedEmptyTitle}</strong>
                <p>{workspaceTab === 'ai-generated' ? extra.aiEmptyBody : extra.archivedEmptyBody}</p>
              </div>
            ) : visibleCards.length ? (
              <div className="reports-grid">
                {visibleCards.map(({ report, status, rows }) => {
                  const missing = missingDataKeys(report, records);
                  const requirements = missing.length ? missing : report.required;
                  const missingActions = uniqueActions(requirements.map(key => missingActionForKey(key as TableKey)));
                  const canPrint = status === 'ready' && rows.length > 0;
                  const canCsv = canPrint && report.exportable;
                  const requirementsOpen = !!expandedRequirements[report.id];
                  const primaryLabel = status === 'ready' ? tr.preview : status === 'needs_data' ? extra.addRequiredData : extra.openSource;
                  const primaryAction = () => {
                    if (status === 'ready') return openReportPreview(report.id);
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
                        <span className={`status-badge ${status}`}>
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
                            {requirements.map(key => <li key={key}>{tableKeyLabel(key as TableKey, lang as Lang)}</li>)}
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
                            <button type="button" onClick={() => openReportPreview(report.id)} aria-label={`${extra.reportDetails} ${report.title[lang as Lang]}`}>
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
            ) : (
              <div className="workspace-empty" role="status">
                <ShieldAlert size={26} aria-hidden="true" />
                <strong>{workspaceTab === 'recent' ? extra.recentEmpty : extra.noReportsMatch}</strong>
              </div>
            )}
          </PageTabPanel>

          {previewOpen && (
          <aside className="preview-panel" aria-label={tr.reportPreview}>
            <div className="pdf-preview-toolbar no-print">
              <div>
                <span>{tr.reportPreview}</span>
                <h2>{activeReport.title[reportLang]}</h2>
                <p>{pdfText.printReady}</p>
              </div>
              <div className="pdf-preview-controls" aria-label={pdfText.previewControls}>
                <button type="button" className="close-preview" onClick={() => setPreviewOpen(false)} aria-label={tr.closePreview}>
                  <X size={16} /> {tr.closePreview}
                </button>
                <button type="button" className={previewFit === 'width' ? 'active' : ''} onClick={() => setPreviewFit('width')}>
                  {pdfText.fitWidth}
                </button>
                <button type="button" className={previewFit === 'page' ? 'active' : ''} onClick={() => setPreviewFit('page')}>
                  {pdfText.fitPage}
                </button>
                <button type="button" disabled={!activeCanExport} aria-disabled={!activeCanExport} title={!activeCanExport ? tr.exportsDisabled : undefined} onClick={() => printReport(activeReport)}>
                  <Printer size={16} /> {tr.printPdf}
                </button>
                <button type="button" disabled={!activeCanExport || !activeReport.exportable} aria-disabled={!activeCanExport || !activeReport.exportable} title={!activeCanExport || !activeReport.exportable ? tr.exportsDisabled : undefined} onClick={() => exportCsv(activeReport)}>
                  <Download size={16} /> {activeReport.exportable ? tr.excel : tr.comingSoon}
                </button>
              </div>
            </div>

            <div className={`pdf-preview-viewport fit-${previewFit}`}>
              <article className="pdf-report-page print-area" dir={dir}>
                <header className="pdf-report-header">
                  <div className="pdf-brand-lockup">
                    <Image src="/sfm-logo.png" alt="THE SFM" width={56} height={56} className="pdf-logo" />
                    <div>
                      <span>{pdfText.reportCenter}</span>
                      <h2>{activeReport.title[reportLang]}</h2>
                      <p>{activeReport.description[reportLang]}</p>
                    </div>
                  </div>
                  <div className="pdf-report-reference">
                    <span>{pdfText.privateReport}</span>
                    <strong>{formatReportDateValue(now, reportLang)}</strong>
                    <em>{reportFileName(activeReport, filters, reportLang).replace(/\.pdf$/i, '')}</em>
                  </div>
                </header>

                <section className="pdf-metadata-grid" aria-label={tr.reportPreview}>
                  {activeMetadataRows.map(item => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </section>

                {activeStatus === 'ready' && activeRows.length > 0 ? (
                  <>
                    {activeSummaryRows.length > 0 && (
                      <section className="pdf-summary-grid" aria-label={pdfText.totalExpenses}>
                        {activeSummaryRows.map(item => (
                          <div key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </section>
                    )}

                    <section className="pdf-table-section">
                      <div className="pdf-section-heading">
                        <h3>{activeReport.title[reportLang]}</h3>
                        <span>{formatNumber(activeRows.length, reportLang)} {pdfText.recordsCount}</span>
                      </div>
                      <div className="preview-table-wrap">
                        <table className="pdf-report-table">
                          <thead>
                            <tr>
                              {activeColumns.map(column => (
                                <th key={column.key} className={column.align === 'end' ? 'is-numeric' : undefined}>{column.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {activeRows.map((row, index) => (
                              <tr key={index}>
                                {activeColumns.map(column => (
                                  <td key={column.key} className={column.align === 'end' ? 'is-numeric' : undefined} dir={column.align === 'end' ? 'ltr' : undefined}>
                                    {reportCellValue(row, column, reportLang, filters.currency)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {activeReport.id === 'expenses' && (
                              <tr className="pdf-total-row">
                                <td colSpan={Math.max(activeColumns.length - 1, 1)}>
                                  {pdfText.totalExpenses} · {formatNumber(activeRows.length, reportLang)} {pdfText.recordsCount}
                                </td>
                                <td className="is-numeric" dir="ltr">{formatReportAmount(activeTotalAmount, filters.currency, reportLang)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                ) : (
                  <div className="preview-empty">
                    <ShieldAlert size={28} />
                    <strong>{activeStatus === 'unavailable' ? tr.unavailable : tr.noData}</strong>
                    <p>{activeStatus === 'unavailable' ? tr.unavailableCopy : activeStatus === 'error' ? tr.loadError : tr.missingData}</p>
                    {activeStatus === 'needs_data' && activeMissing.length > 0 && (
                      <div className="preview-requirements no-print">
                        <strong>{tr.requiredData}</strong>
                        <ul>
                          {activeMissing.map(key => <li key={key}>{tableKeyLabel(key as TableKey, reportLang)}</li>)}
                        </ul>
                        <div className="missing-actions">
                          {uniqueActions(activeMissing.map(key => missingActionForKey(key as TableKey))).slice(0, 3).map(action => (
                            <button key={`${action.href}-${action.label}`} type="button" onClick={() => router.push(action.href)} aria-label={action.label}>
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <footer className="pdf-report-footer">
                  <span>www.the-sfm.com</span>
                  <span>{pdfText.privateReport}</span>
                  <span>{pdfText.generatedAt}: {formatReportDateTime(now, reportLang)}</span>
                  <span className="pdf-page-number">{pdfText.pageNumber}</span>
                </footer>
              </article>
            </div>
          </aside>
          )}
        </div>

        {toast && <div className="toast no-print" role="status" aria-live="polite">{toast}</div>}
      </DashboardPageShell>
      <style jsx>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .reports-center-shell {
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-ui);
  }

  .reports-center-main {
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0;
    margin: 0 !important;
    padding: 0 !important;
    overflow-x: clip;
  }

  .reports-center-content {
    display: grid;
    gap: var(--workspace-page-section-gap);
    width: 100%;
    max-width: none;
    min-width: 0;
    padding: var(--workspace-page-padding-block) var(--workspace-page-padding-inline);
  }

  .loading-state {
    min-height: 100vh;
    place-items: center;
    color: var(--primary);
    font-weight: var(--type-button-weight);
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }

  .topbar span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .topbar strong {
    color: var(--foreground);
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
  }

  .reports-hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-5);
    align-items: end;
    padding: clamp(1.5rem, 4vi, 3rem);
    border: 1px solid color-mix(in srgb, var(--primary) 42%, var(--border));
    border-radius: var(--radius-panel);
    background: var(--hero-gradient);
    color: var(--hero-foreground);
    box-shadow: var(--shadow-md);
  }

  .hero-badge,
  .hero-stats span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
    color: var(--hero-foreground) !important;
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .hero-badge {
    padding: var(--space-2) var(--space-3);
  }

  .reports-hero h1 {
    margin: var(--space-4) 0 var(--space-2);
    color: var(--hero-foreground) !important;
    font-size: var(--type-display-size);
    font-weight: var(--type-display-weight);
    line-height: var(--type-display-leading);
    letter-spacing: var(--type-display-tracking);
  }

  .reports-hero p {
    max-width: 48rem;
    margin: 0;
    color: var(--hero-foreground-muted) !important;
    font-size: var(--type-body-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-leading);
  }

  .hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .hero-stats span {
    padding: calc(var(--space-2) - 1px) var(--space-3);
    color: var(--hero-foreground-muted) !important;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: var(--space-2);
  }

  .reports-hero button,
  .card-actions button,
  .report-actions-menu summary,
  .status-filter button,
  .requirements-compact button,
  .missing-actions button,
  .pdf-preview-controls button {
    min-height: var(--control-h);
    border-radius: var(--radius-control);
    font-family: var(--font-ui);
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    line-height: var(--type-button-leading);
  }

  .reports-hero button,
  .card-actions button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border: 1px solid var(--primary);
    background: var(--primary);
    color: var(--primary-foreground) !important;
    cursor: pointer;
  }

  .reports-hero button:hover,
  .reports-hero button:focus-visible,
  .primary-card-action:hover,
  .primary-card-action:focus-visible {
    border-color: var(--primary-hover);
    background: var(--primary-hover);
  }

  .reports-hero button:disabled {
    border-color: var(--border);
    background: var(--surface-disabled);
    color: var(--foreground-subtle) !important;
    cursor: not-allowed;
  }

  .report-summary-cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }

  .report-summary-cards article {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }

  .report-summary-cards span {
    color: var(--foreground-muted);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .report-summary-cards strong {
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-numeric-value-size);
    font-weight: var(--type-numeric-value-weight);
    line-height: var(--type-numeric-value-leading);
    overflow-wrap: anywhere;
  }

  .report-filter-drawer,
  .preview-panel {
    min-width: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-panel);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }

  .report-filter-drawer > summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: var(--space-3);
    min-height: 3.5rem;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-panel);
    color: var(--foreground);
    cursor: pointer;
    list-style: none;
  }

  .report-filter-drawer > summary::-webkit-details-marker,
  .report-actions-menu summary::-webkit-details-marker {
    display: none;
  }

  .report-filter-drawer > summary > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .report-filter-drawer > summary svg {
    color: var(--primary);
  }

  .report-filter-drawer > summary strong {
    font-size: var(--type-body-size);
    font-weight: var(--type-section-title-weight);
  }

  .report-filter-drawer > summary:focus-visible,
  .report-categories:focus-visible,
  .status-filter button:focus-visible,
  .filters-grid input:focus-visible,
  .filters-grid select:focus-visible,
  .card-actions button:focus-visible,
  .report-actions-menu summary:focus-visible,
  .report-actions-menu button:focus-visible,
  .requirements-compact button:focus-visible,
  .missing-actions button:focus-visible,
  .pdf-preview-controls button:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    box-shadow: var(--focus-shadow);
  }

  .filter-context {
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
    text-align: end;
    overflow-wrap: anywhere;
  }

  .filter-chevron {
    transition: transform var(--duration-fast) var(--ease);
  }

  .report-filter-drawer[open] .filter-chevron {
    transform: rotate(180deg);
  }

  .filter-drawer-content {
    display: grid;
    gap: var(--space-4);
    padding: 0 var(--space-4) var(--space-4);
    border-top: 1px solid var(--border);
  }

  .status-filter {
    display: grid;
    gap: var(--space-2);
    margin: var(--space-4) 0 0;
    padding: 0;
    border: 0;
  }

  .status-filter legend {
    padding: 0;
    color: var(--foreground-secondary);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .status-filter > div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .status-filter button {
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    background: var(--control-background);
    color: var(--foreground-secondary);
    cursor: pointer;
  }

  .status-filter button:hover {
    border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
    background: var(--surface-hover);
    color: var(--primary-hover);
  }

  .status-filter button.active {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary-hover);
    box-shadow: var(--active-indicator-shadow);
  }

  .filters-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: var(--space-3);
    align-items: start;
  }

  .filters-grid label {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  .filters-grid span {
    color: var(--foreground-muted);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .filters-grid input,
  .filters-grid select {
    width: 100%;
    min-width: 0;
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    outline: 0;
    background: var(--control-background);
    color: var(--foreground);
    font-family: var(--font-ui);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
  }

  .filters-grid input:hover,
  .filters-grid select:hover {
    border-color: color-mix(in srgb, var(--primary) 32%, var(--border));
    background: var(--control-hover);
  }

  .filters-grid input:focus,
  .filters-grid select:focus {
    border-color: var(--focus-ring);
  }

  .filters-project-selector {
    grid-column: span 2;
    min-width: 0;
  }

  .reports-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
    min-width: 0;
  }

  .reports-layout.preview-open {
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 24rem);
  }

  .report-categories {
    display: grid;
    gap: var(--space-4);
    min-width: 0;
    outline: none;
  }

  .report-categories:focus-visible {
    border-radius: var(--radius-card);
  }

  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
    gap: var(--space-3);
    min-width: 0;
  }

  .workspace-note {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
    color: var(--foreground-secondary);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-small-leading);
  }

  .workspace-empty {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-2);
    min-height: 13rem;
    padding: var(--space-5);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--surface);
    color: var(--primary);
    text-align: center;
  }

  .workspace-empty strong,
  .preview-empty strong {
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
  }

  .workspace-empty p {
    max-width: 38rem;
    margin: 0;
    color: var(--foreground-secondary);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-small-leading);
  }

  .report-card {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: var(--space-3);
    min-width: 0;
    min-height: 13.5rem;
    padding: var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--shadow-xs);
  }

  .report-card.ready {
    border-color: color-mix(in srgb, var(--success) 32%, var(--border));
  }

  .report-card.needs_data {
    border-color: color-mix(in srgb, var(--warning) 32%, var(--border));
  }

  .report-card.unavailable,
  .report-card.error {
    background: var(--surface-muted);
  }

  .report-card-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: start;
  }

  .report-card h3 {
    margin: 0 0 var(--space-1);
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
    line-height: var(--type-card-title-leading);
  }

  .report-card p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-small-leading);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    border: 1px solid;
    border-radius: var(--radius-pill);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
    white-space: nowrap;
  }

  .status-badge.ready {
    border-color: color-mix(in srgb, var(--success) 34%, var(--border));
    background: var(--success-soft);
    color: var(--success);
  }

  .status-badge.needs_data {
    border-color: color-mix(in srgb, var(--warning) 34%, var(--border));
    background: var(--warning-soft);
    color: var(--warning);
  }

  .status-badge.unavailable {
    border-color: var(--border-strong);
    background: var(--surface-muted);
    color: var(--foreground-muted);
  }

  .status-badge.error {
    border-color: color-mix(in srgb, var(--danger) 34%, var(--border));
    background: var(--danger-soft);
    color: var(--danger);
  }

  .sources,
  .missing-requirements {
    display: grid;
    gap: var(--space-2);
  }

  .sources strong,
  .missing-requirements strong,
  .preview-requirements > strong {
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .sources div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .sources span {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface-muted);
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
  }

  .missing-requirements,
  .requirements-compact {
    border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
    border-radius: var(--radius-control);
    background: var(--warning-soft);
  }

  .missing-requirements {
    padding: var(--space-3);
  }

  .missing-requirements ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .missing-requirements li {
    padding: var(--space-1) var(--space-2);
    border: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border));
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--warning);
    font-size: var(--type-caption-size);
    font-weight: var(--type-label-weight);
  }

  .card-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
  }

  .requirements-compact {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3);
  }

  .requirements-compact div {
    display: grid;
    gap: var(--space-1);
    min-width: 0;
  }

  .requirements-compact strong,
  .requirements-compact span {
    color: var(--warning);
  }

  .requirements-compact strong {
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .requirements-compact span {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--type-caption-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-caption-leading);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .requirements-compact button,
  .missing-actions button {
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--primary-hover);
    cursor: pointer;
  }

  .requirements-compact button:hover,
  .missing-actions button:hover {
    border-color: var(--primary);
    background: var(--primary-soft);
  }

  .missing-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .card-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: center;
    min-width: 0;
  }

  .primary-card-action {
    min-width: 0;
    white-space: normal;
  }

  .report-actions-menu {
    position: relative;
    justify-self: end;
  }

  .report-actions-menu summary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--foreground);
    cursor: pointer;
    list-style: none;
  }

  .report-actions-menu summary:hover {
    border-color: color-mix(in srgb, var(--primary) 34%, var(--border));
    background: var(--surface-hover);
  }

  .report-actions-menu div {
    position: absolute;
    z-index: 20;
    inset-block-start: calc(100% + var(--space-2));
    inset-inline-end: 0;
    display: grid;
    gap: var(--space-1);
    min-width: 13.75rem;
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-elevated);
    box-shadow: var(--shadow-popover);
  }

  .report-actions-menu button {
    width: 100%;
    justify-content: flex-start;
    border-color: transparent;
    background: transparent;
    color: var(--foreground) !important;
    white-space: normal;
  }

  .report-actions-menu button:hover {
    border-color: var(--border);
    background: var(--surface-hover);
  }

  .card-actions button:disabled,
  .report-actions-menu button:disabled,
  .pdf-preview-controls button:disabled {
    border-color: var(--border) !important;
    background: var(--surface-disabled) !important;
    color: var(--foreground-subtle) !important;
    cursor: not-allowed;
    opacity: 1;
  }

  .preview-panel {
    position: sticky;
    top: var(--space-5);
    padding: 0;
    overflow: hidden;
  }

  .pdf-preview-toolbar {
    display: grid;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border);
    background: var(--surface-muted);
  }

  .pdf-preview-toolbar span {
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .pdf-preview-toolbar h2 {
    margin: var(--space-1) 0;
    color: var(--foreground);
    font-size: var(--type-section-title-size);
    font-weight: var(--type-section-title-weight);
    line-height: var(--type-section-title-leading);
  }

  .pdf-preview-toolbar p {
    margin: 0;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-small-leading);
  }

  .pdf-preview-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .pdf-preview-controls button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    min-height: var(--control-h);
    padding: 0 var(--space-3);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--foreground);
    cursor: pointer;
    transition:
      border-color var(--duration-fast) var(--ease),
      background var(--duration-fast) var(--ease),
      color var(--duration-fast) var(--ease);
  }

  .pdf-preview-controls button:hover {
    border-color: color-mix(in srgb, var(--primary) 36%, var(--border));
    background: var(--surface-hover);
    color: var(--primary-hover);
  }

  .pdf-preview-controls button.active {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary-hover);
    box-shadow: var(--active-indicator-shadow);
  }

  .pdf-preview-controls button.close-preview {
    margin-inline-end: auto;
    background: var(--surface);
    color: var(--foreground-secondary);
  }

  .pdf-preview-viewport {
    display: flex;
    justify-content: center;
    max-height: 72vh;
    overflow: auto;
    padding: var(--space-5);
    background: var(--surface-muted);
  }

  .pdf-preview-viewport.fit-page {
    align-items: flex-start;
  }

  .pdf-report-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    width: min(100%, 49.625rem);
    min-height: 70.1875rem;
    padding: 2.125rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-elevated);
    color: var(--foreground);
    box-shadow: var(--shadow-lg);
    font-family: var(--font-ui);
  }

  .pdf-report-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-5);
    align-items: start;
    padding-bottom: var(--space-4);
    border-bottom: 3px solid var(--foreground);
    break-inside: avoid;
  }

  .pdf-brand-lockup {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    min-width: 0;
  }

  .pdf-logo {
    padding: var(--space-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
    object-fit: contain;
  }

  .pdf-brand-lockup span,
  .pdf-report-reference span {
    display: block;
    color: var(--primary-hover);
    font-size: var(--type-label-size);
    font-weight: var(--type-label-weight);
  }

  .pdf-brand-lockup h2 {
    margin: var(--space-1) 0;
    color: var(--foreground);
    font-size: var(--type-page-title-size);
    font-weight: var(--type-page-title-weight);
    line-height: var(--type-page-title-leading);
  }

  .pdf-brand-lockup p {
    max-width: 32.5rem;
    margin: 0;
    color: var(--foreground-secondary);
    font-size: var(--type-body-small-size);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-small-leading);
  }

  .pdf-report-reference {
    display: grid;
    justify-items: end;
    gap: var(--space-1);
    text-align: end;
  }

  .pdf-report-reference strong {
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-label-size);
    font-weight: var(--type-financial-value-weight);
  }

  .pdf-report-reference em {
    max-width: 14rem;
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-style: normal;
    font-weight: var(--type-caption-weight);
    overflow-wrap: anywhere;
  }

  .pdf-metadata-grid,
  .pdf-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-2);
    break-inside: avoid;
  }

  .pdf-metadata-grid div,
  .pdf-summary-grid div {
    min-width: 0;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
  }

  .pdf-summary-grid div {
    background: var(--surface);
  }

  .pdf-metadata-grid span,
  .pdf-summary-grid span {
    display: block;
    margin-bottom: var(--space-1);
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
  }

  .pdf-metadata-grid strong,
  .pdf-summary-grid strong {
    display: block;
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: var(--type-table-cell-size);
    font-weight: var(--type-financial-value-weight);
    overflow-wrap: anywhere;
  }

  .pdf-summary-grid div:first-child {
    border-color: color-mix(in srgb, var(--info) 34%, var(--border));
    background: var(--info-soft);
  }

  .pdf-summary-grid div:first-child strong {
    color: var(--info);
    font-size: var(--type-financial-value-size);
  }

  .pdf-table-section {
    display: grid;
    gap: var(--space-3);
    min-width: 0;
  }

  .pdf-section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    break-inside: avoid;
  }

  .pdf-section-heading h3 {
    margin: 0;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
  }

  .pdf-section-heading span {
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
  }

  .preview-table-wrap {
    max-width: 100%;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
  }

  .pdf-report-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    table-layout: fixed;
  }

  .pdf-report-table thead {
    display: table-header-group;
  }

  .pdf-report-table th,
  .pdf-report-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
    font-size: var(--type-table-cell-size);
    line-height: var(--type-table-cell-leading);
    text-align: start;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  .pdf-report-table th {
    background: var(--foreground);
    color: var(--foreground-inverse);
    font-size: var(--type-table-header-size);
    font-weight: var(--type-table-header-weight);
    white-space: nowrap;
  }

  .pdf-report-table tbody tr:nth-child(even) td {
    background: var(--surface-muted);
  }

  .pdf-report-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-report-table .is-numeric {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    text-align: end;
    white-space: nowrap;
  }

  .pdf-total-row td {
    border-top: 2px solid color-mix(in srgb, var(--info) 46%, var(--border));
    background: var(--info-soft) !important;
    color: var(--foreground);
    font-weight: var(--type-table-header-weight);
  }

  .pdf-report-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
    color: var(--foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: var(--type-caption-weight);
    break-inside: avoid;
  }

  .pdf-page-number::after {
    content: " " counter(page) " / " counter(pages);
  }

  .preview-empty {
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-2);
    min-height: 16rem;
    padding: var(--space-4);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    color: var(--primary);
    text-align: center;
  }

  .preview-empty p {
    margin: 0;
    color: var(--foreground-muted);
    font-weight: var(--type-body-weight);
    line-height: var(--type-body-leading);
  }

  .preview-requirements {
    display: grid;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
    text-align: start;
  }

  .preview-requirements ul {
    margin: 0;
    padding-inline-start: var(--space-5);
    color: var(--warning);
    font-weight: var(--type-label-weight);
  }

  .toast {
    position: fixed;
    z-index: 80;
    inset-block-end: var(--space-5);
    inset-inline-end: var(--space-5);
    padding: var(--space-3) var(--space-4);
    border: 1px solid color-mix(in srgb, var(--primary) 38%, var(--border));
    border-radius: var(--radius-card);
    background: var(--surface-elevated);
    color: var(--foreground);
    font-weight: var(--type-label-weight);
    box-shadow: var(--shadow-popover);
  }

  @media (max-width: 1200px) {
    .filters-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .filters-project-selector {
      grid-column: 1 / -1;
    }

    .reports-layout.preview-open {
      grid-template-columns: 1fr;
    }

    .preview-panel {
      position: static;
    }

    .reports-grid {
      grid-template-columns: repeat(auto-fit, minmax(min(18.75rem, 100%), 1fr));
    }
  }

  @media (max-width: 1024px) {
    .reports-hero {
      grid-template-columns: 1fr;
    }

    .reports-hero button {
      width: 100%;
    }

    .report-summary-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .report-filter-drawer > summary {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .filter-context {
      grid-column: 1 / -1;
      grid-row: 2;
      text-align: start;
    }

    .filter-chevron {
      grid-column: 2;
      grid-row: 1;
    }

    .filters-grid,
    .report-summary-cards {
      grid-template-columns: 1fr;
    }

    .card-actions {
      grid-template-columns: 1fr;
    }

    .report-actions-menu,
    .report-actions-menu summary,
    .primary-card-action {
      width: 100%;
    }

    .report-actions-menu div {
      position: static;
      min-width: 0;
      margin-top: var(--space-2);
    }

    .requirements-compact {
      grid-template-columns: 1fr;
    }

    .requirements-compact button {
      width: 100%;
    }

    .topbar {
      align-items: flex-start;
    }

    .pdf-preview-viewport {
      max-height: 68vh;
      padding: var(--space-3);
    }

    .pdf-report-page {
      min-height: 48.75rem;
      padding: var(--space-5);
    }

    .pdf-report-header {
      grid-template-columns: 1fr;
    }

    .pdf-report-reference {
      justify-items: start;
      text-align: start;
    }

    .pdf-metadata-grid,
    .pdf-summary-grid {
      grid-template-columns: 1fr;
    }

    .pdf-report-table th,
    .pdf-report-table td {
      padding: var(--space-2);
    }

    .toast {
      inset-inline: var(--space-3);
      inset-block-end: var(--space-3);
      text-align: center;
    }
  }

  @media (max-width: 430px) {
    .reports-center-content {
      gap: var(--space-4);
      padding-inline: var(--space-3);
    }

    .reports-hero {
      padding: var(--space-5);
    }

    .reports-hero h1 {
      font-size: var(--type-page-title-size);
    }

    .report-card-head {
      grid-template-columns: 1fr;
    }

    .status-badge {
      justify-self: start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation-duration: 2s;
    }

    .filter-chevron,
    .pdf-preview-controls button {
      transition: none;
    }
  }

  @media print {
    @page {
      size: A4;
      margin: 16mm;
    }

    .sfm-shared-sidebar,
    .no-print,
    .topbar,
    .reports-hero,
    .report-filter-drawer,
    .report-categories,
    .toast,
    .skip-link,
    .sfm-skip-link,
    [href="#main-content"] {
      display: none !important;
    }

    html,
    body,
    .reports-center-shell,
    .preview-panel,
    .pdf-preview-viewport,
    .pdf-report-page {
      background: var(--surface) !important;
      color: var(--foreground) !important;
    }

    .reports-center-main {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .reports-layout {
      display: block !important;
    }

    .preview-panel {
      position: static !important;
      padding: 0 !important;
      overflow: visible !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    .pdf-preview-viewport {
      display: block !important;
      max-height: none !important;
      overflow: visible !important;
      padding: 0 !important;
    }

    .pdf-report-page {
      display: block !important;
      width: 100% !important;
      min-height: auto !important;
      padding: 0 0 14mm !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    .pdf-report-header {
      grid-template-columns: minmax(0, 1fr) auto;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-3);
      border-bottom: 2px solid var(--foreground);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pdf-brand-lockup h2 {
      font-size: 22pt;
    }

    .pdf-brand-lockup p {
      font-size: 9.5pt;
    }

    .pdf-logo {
      width: 42px !important;
      height: 42px !important;
    }

    .pdf-report-reference em {
      font-size: 7.5pt;
    }

    .pdf-metadata-grid,
    .pdf-summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pdf-metadata-grid div,
    .pdf-summary-grid div {
      padding: var(--space-2) !important;
      border-color: var(--border-strong) !important;
      border-radius: var(--radius-xs) !important;
      background: var(--surface-muted) !important;
    }

    .pdf-metadata-grid span,
    .pdf-summary-grid span {
      font-size: 8pt;
    }

    .pdf-metadata-grid strong,
    .pdf-summary-grid strong {
      font-size: 9.5pt;
    }

    .pdf-summary-grid div:first-child strong {
      font-size: 12pt;
    }

    .pdf-section-heading {
      margin-bottom: var(--space-2);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .preview-table-wrap {
      overflow: visible !important;
      border: 1px solid var(--border-strong) !important;
      border-radius: 0 !important;
    }

    .pdf-report-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
    }

    .pdf-report-table thead {
      display: table-header-group !important;
    }

    .pdf-report-table th,
    .pdf-report-table td {
      padding: var(--space-2) !important;
      border-color: var(--border) !important;
      font-size: 8.8pt !important;
      line-height: 1.45 !important;
    }

    .pdf-report-table th {
      background: var(--foreground) !important;
      color: var(--foreground-inverse) !important;
      font-size: 8.6pt !important;
    }

    .pdf-report-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .pdf-report-table tbody tr:nth-child(even) td {
      background: var(--surface-muted) !important;
    }

    .pdf-total-row td {
      border-top: 1.5px solid var(--info) !important;
      background: var(--info-soft) !important;
    }

    .pdf-report-footer {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      margin: 0;
      padding: 5mm 0 0;
      border-top: 1px solid var(--border-strong);
      background: var(--surface);
      font-size: 7.5pt;
    }

    .preview-empty {
      display: none !important;
    }
  }
`;

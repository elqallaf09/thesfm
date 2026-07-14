'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  Gauge,
  Goal,
  HeartHandshake,
  Landmark,
  LineChart,
  Loader2,
  PiggyBank,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useSmartTasks } from '@/hooks/useSmartTasks';
import { supabase } from '@/integrations/supabase/client';
import { currentMonthRange, personalExpenseRows, personalIncomeRows, safeDivide, sumAmounts } from '@/lib/data/financeData';
import { formatDate } from '@/lib/formatDate';
import { formatMoney } from '@/lib/formatMoney';
import { calculateGoalProgress } from '@/lib/goalProgress';
import { parseMoneyValue } from '@/lib/money';
import {
  type DataRow, CardShell, MetricCard, SmallStat, ActionLink, EmptyState, ProgressBar,
  normalizeDashboardError, logDashboardFailure, isGlobalDashboardFailure,
  numberValue, firstNumber, firstText, firstDate, parseRecordDate,
  isCurrentMonth, daysUntil, isOpenStatus, isTaskOverdue, goalProgress,
  latestByDate, statusLabel, getRecordCurrency,
} from '@/components/dashboard/DashboardSubComponents';


type Lang = 'ar' | 'en' | 'fr';

type DashboardKey =
  | 'income'
  | 'expenses'
  | 'savings'
  | 'goals'
  | 'investments'
  | 'projects'
  | 'projectTasks'
  | 'projectMilestones'
  | 'projectFinancialModels'
  | 'projectPitchDecks'
  | 'projectFundingReadiness'
  | 'marketWatchlist'
  | 'marketPriceAlerts'
  | 'zakatCalculations'
  | 'zakatAssets'
  | 'charityProjects'
  | 'charityDonations'
  | 'charityReminders'
  | 'charityCommitments'
  | 'notifications';

type DashboardRecords = Record<DashboardKey, DataRow[]>;
type DashboardTable = { key: DashboardKey; table: string; limit?: number; order?: { column: string; ascending?: boolean } };
type DashboardFailureSection = DashboardKey | 'profile' | 'auth';
type DashboardLoadFailure = {
  section: DashboardFailureSection;
  table: string;
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type ProfileRow = {
  default_currency?: string | null;
  onboarding_completed?: boolean | null;
};

type PriorityItem = {
  id: string;
  title: string;
  message: string;
  href: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  dueDate?: string | null;
};

const DASHBOARD_TABLES: DashboardTable[] = [
  { key: 'income', table: 'monthly_income_sources', limit: 1000 },
  { key: 'expenses', table: 'expense_items', limit: 1000 },
  { key: 'savings', table: 'savings_items', limit: 1000 },
  { key: 'goals', table: 'financial_goals', limit: 1000 },
  { key: 'investments', table: 'investment_items', limit: 1000 },
  { key: 'projects', table: 'projects', limit: 1000 },
  { key: 'projectTasks', table: 'project_tasks', limit: 1000 },
  { key: 'projectMilestones', table: 'project_milestones', limit: 1000 },
  { key: 'projectFinancialModels', table: 'project_financial_models', limit: 1000 },
  { key: 'projectPitchDecks', table: 'project_pitch_decks', limit: 1000 },
  { key: 'projectFundingReadiness', table: 'project_funding_readiness', limit: 1000 },
  { key: 'marketWatchlist', table: 'market_watchlist', limit: 1000 },
  { key: 'marketPriceAlerts', table: 'market_price_alerts', limit: 1000 },
  { key: 'zakatCalculations', table: 'zakat_calculations', limit: 1000 },
  { key: 'zakatAssets', table: 'zakat_assets', limit: 1000 },
  { key: 'charityProjects', table: 'charity_projects', limit: 1000 },
  { key: 'charityDonations', table: 'charity_project_donations', limit: 1000 },
  { key: 'charityReminders', table: 'charity_reminders', limit: 1000 },
  { key: 'charityCommitments', table: 'charity_commitments', limit: 1000 },
  { key: 'notifications', table: 'notifications', limit: 1000 },
];

const OPTIONAL_DASHBOARD_SECTIONS = new Set<DashboardFailureSection>([
  'projectTasks',
  'projectMilestones',
  'projectFinancialModels',
  'projectPitchDecks',
  'projectFundingReadiness',
  'marketWatchlist',
  'marketPriceAlerts',
  'zakatCalculations',
  'zakatAssets',
  'charityProjects',
  'charityDonations',
  'charityReminders',
  'charityCommitments',
  'notifications',
]);

const EMPTY_RECORDS = DASHBOARD_TABLES.reduce((acc, item) => {
  acc[item.key] = [];
  return acc;
}, {} as DashboardRecords);


async function fetchDashboardTable(userId: string, item: DashboardTable): Promise<{ key: DashboardKey; rows: DataRow[] }> {
  let query = supabase
    .from(item.table)
    .select('*')
    .eq('user_id', userId)
    .limit(item.limit ?? 1000);
  if (item.order) {
    query = query.order(item.order.column, { ascending: item.order.ascending ?? false });
  }
  const { data, error } = await query;
  if (error) throw error;
  return { key: item.key, rows: (data ?? []) as DataRow[] };
}
const TEXT = {
  ar: {
    pageTitle: 'الصفحة الرئيسية',
    pageSubtitle: 'نظرة شاملة على أموالك، مشاريعك، استثماراتك، زكاتك، وتنبيهاتك في مكان واحد.',
    updatedNow: 'محدث الآن',
    lastUpdatedNow: 'آخر تحديث: الآن',
    totalAssets: 'إجمالي الأصول',
    todayAlerts: 'تنبيهات اليوم',
    totalIncome: 'إجمالي الدخل',
    totalExpenses: 'إجمالي المصروفات',
    netBalance: 'صافي الرصيد',
    savings: 'المدخرات',
    investments: 'الاستثمارات',
    upcomingCommitments: 'الالتزامات القادمة',
    currentMonth: 'الشهر الحالي',
    allRecords: 'كل السجلات',
    insufficientData: 'بيانات غير كافية',
    noCurrentMonthData: 'لا توجد بيانات للشهر الحالي',
    notCalculable: 'غير قابل للحساب',
    notEntered: 'غير مدخل',
    invalidValue: 'قيمة غير صالحة',
    noDataYet: 'لا توجد بيانات حالياً',
    noDataBody: 'أضف بياناتك للبدء',
    openPage: 'فتح الصفحة',
    financialHealth: 'الصحة المالية',
    financialHealthHint: 'أضف الدخل والمصروفات والمدخرات لحساب الصحة المالية.',
    excellent: 'ممتاز',
    good: 'جيد',
    needsReview: 'يحتاج مراجعة',
    insufficientStatus: 'بيانات غير كافية',
    topActionToday: 'أهم إجراء اليوم',
    noUrgentActions: 'لا توجد إجراءات عاجلة حالياً.',
    incomeExpenses: 'الدخل والمصروفات',
    currentMonthIncome: 'دخل الشهر الحالي',
    currentMonthExpenses: 'مصروفات الشهر الحالي',
    spendingRatio: 'نسبة الصرف',
    viewIncome: 'عرض الدخل',
    viewExpenses: 'عرض المصروفات',
    openReports: 'فتح التقارير',
    goalsSavings: 'الأهداف والمدخرات',
    activeGoals: 'الأهداف النشطة',
    nearestTarget: 'أقرب تاريخ هدف',
    averageProgress: 'متوسط التقدم',
    totalGoalBalance: 'الرصيد الحالي للأهداف',
    noGoals: 'لا توجد أهداف مالية حتى الآن.',
    openGoals: 'فتح الأهداف المالية',
    investmentsMarket: 'الاستثمارات والسوق',
    watchlist: 'قائمة المتابعة',
    marketAlerts: 'تنبيهات السوق',
    topWatchedAsset: 'أبرز أصل متابع',
    marketUnavailable: 'لا توجد بيانات سوق كافية حالياً.',
    openInvestments: 'فتح الاستثمارات',
    openMarket: 'فتح تحليلات السوق',
    projectsBusinessHub: 'المشاريع ومركز الأعمال',
    activeProjects: 'المشاريع النشطة',
    overdueTasks: 'المهام المتأخرة',
    fundingReadiness: 'جاهزية التمويل',
    pitchDecks: 'العروض الاستثمارية',
    noProjects: 'لا توجد مشاريع بعد. أضف مشروعك الأول للبدء.',
    openProjects: 'فتح مشاريعي',
    openBusinessHub: 'فتح مركز الأعمال',
    createPitchDeck: 'إنشاء Pitch Deck',
    zakatCharity: 'الزكاة والأعمال الخيرية',
    zakatSaved: 'آخر زكاة محفوظة',
    nextZakatDate: 'تاريخ الاستحقاق القادم',
    charityProjects: 'المشاريع الخيرية',
    annualDonations: 'تبرعات السنة',
    noZakat: 'لا توجد حسابات زكاة محفوظة',
    openZakat: 'فتح الزكاة',
    openCharityProjects: 'فتح المشاريع الخيرية',
    openCharity: 'فتح الأعمال الخيرية',
    reports: 'التقارير',
    readyReports: 'تقارير جاهزة',
    reportsNeedData: 'تقارير تحتاج بيانات',
    lastGenerated: 'آخر تقرير محفوظ',
    lastGeneratedUnavailable: 'لا توجد تقارير محفوظة حالياً',
    openReportsCenter: 'فتح مركز التقارير',
    smartNotifications: 'الإشعارات الذكية',
    smartTasks: 'مركز المهام',
    viewAllTasks: 'عرض كل المهام',
    noTasks: 'لا توجد مهام حالياً.',
    unread: 'غير مقروءة',
    highPriority: 'عالية الأهمية',
    dueToday: 'مستحقة اليوم',
    viewAllNotifications: 'عرض كل الإشعارات',
    noNotifications: 'لا توجد إشعارات حالياً',
    completeSetupTitle: 'أكمل إعداد حسابك',
    completeSetupText: 'أضف بياناتك الأساسية للحصول على لوحة قيادة أدق.',
    completeSetup: 'إكمال الإعداد',
    loading: 'جاري تحميل لوحة القيادة...',
    dataError: 'تعذر تحميل بعض البيانات حالياً',
    debugLabel: 'تشخيص لوحة التحكم التنفيذية',
    debugTitle: 'تشخيص لوحة التحكم: أقسام تعذر تحميلها',
    addIncomeAction: 'أضف دخلك الشهري لتفعيل تقارير الدخل ولوحة القيادة.',
    reportNeedsDataAction: 'أكمل البيانات المطلوبة في مركز التقارير.',
    overdueTaskAction: 'راجع المهام المتأخرة في مشاريعك.',
    zakatDueAction: 'راجع استحقاق الزكاة القادم.',
    notificationAction: 'راجع الإشعارات عالية الأهمية.',
  },
  en: {
    pageTitle: 'Home Page',
    pageSubtitle: 'A complete overview of your finances, projects, investments, zakat, and alerts in one place.',
    updatedNow: 'Updated now',
    lastUpdatedNow: 'Last updated: now',
    totalAssets: 'Total assets',
    todayAlerts: 'Today alerts',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netBalance: 'Net Balance',
    savings: 'Savings',
    investments: 'Investments',
    upcomingCommitments: 'Upcoming Commitments',
    currentMonth: 'Current month',
    allRecords: 'All records',
    insufficientData: 'Insufficient data',
    noCurrentMonthData: 'No data for the current month',
    notCalculable: 'Not calculable',
    notEntered: 'Not entered',
    invalidValue: 'Invalid value',
    noDataYet: 'No data yet',
    noDataBody: 'Add your data to get started.',
    openPage: 'Open page',
    financialHealth: 'Financial Health',
    financialHealthHint: 'Add income, expenses, and savings to calculate financial health.',
    excellent: 'Excellent',
    good: 'Good',
    needsReview: 'Needs Review',
    insufficientStatus: 'Insufficient Data',
    topActionToday: 'Top Action Today',
    noUrgentActions: 'No urgent actions right now.',
    incomeExpenses: 'Income and Expenses',
    currentMonthIncome: 'Current month income',
    currentMonthExpenses: 'Current month expenses',
    spendingRatio: 'Spending ratio',
    viewIncome: 'View Income',
    viewExpenses: 'View Expenses',
    openReports: 'Open Reports',
    goalsSavings: 'Goals and Savings',
    activeGoals: 'Active goals',
    nearestTarget: 'Nearest target date',
    averageProgress: 'Average progress',
    totalGoalBalance: 'Current goal balance',
    noGoals: 'No financial goals yet.',
    openGoals: 'Open Financial Goals',
    investmentsMarket: 'Investments and Market',
    watchlist: 'Watchlist',
    marketAlerts: 'Market alerts',
    topWatchedAsset: 'Top watched asset',
    marketUnavailable: 'No sufficient market data right now.',
    openInvestments: 'Open Investments',
    openMarket: 'Open Market Analysis',
    projectsBusinessHub: 'Projects and Business Hub',
    activeProjects: 'Active projects',
    overdueTasks: 'Overdue tasks',
    fundingReadiness: 'Funding readiness',
    pitchDecks: 'Pitch decks',
    noProjects: 'No projects yet. Add your first project to begin.',
    openProjects: 'Open My Projects',
    openBusinessHub: 'Open Business Hub',
    createPitchDeck: 'Create Pitch Deck',
    zakatCharity: 'Zakat and Charity',
    zakatSaved: 'Latest saved zakat',
    nextZakatDate: 'Next due date',
    charityProjects: 'Charity projects',
    annualDonations: 'Annual donations',
    noZakat: 'No saved zakat calculations',
    openZakat: 'Open Zakat',
    openCharityProjects: 'Open Charity Projects',
    openCharity: 'Open Charity',
    reports: 'Reports',
    readyReports: 'Ready reports',
    reportsNeedData: 'Reports needing data',
    lastGenerated: 'Last saved report',
    lastGeneratedUnavailable: 'No saved reports yet',
    openReportsCenter: 'Open Reports Center',
    smartNotifications: 'Smart Notifications',
    smartTasks: 'Tasks Center',
    viewAllTasks: 'View all tasks',
    noTasks: 'No tasks right now.',
    unread: 'Unread',
    highPriority: 'High Priority',
    dueToday: 'Due Today',
    viewAllNotifications: 'View all notifications',
    noNotifications: 'No notifications yet',
    completeSetupTitle: 'Complete your account setup',
    completeSetupText: 'Add your core data to get a more accurate home page.',
    completeSetup: 'Complete Setup',
    loading: 'Loading home page...',
    dataError: 'Could not load some data right now.',
    debugLabel: 'Executive dashboard diagnostics',
    debugTitle: 'Dashboard diagnostics: failed sections',
    addIncomeAction: 'Add monthly income to activate income reports and dashboard totals.',
    reportNeedsDataAction: 'Complete the required data in Reports Center.',
    overdueTaskAction: 'Review overdue tasks in your projects.',
    zakatDueAction: 'Review your upcoming zakat due date.',
    notificationAction: 'Review high priority notifications.',
  },
  fr: {
    pageTitle: "Page d'accueil",
    pageSubtitle: 'Une vue complète de vos finances, projets, investissements, zakat et alertes en un seul endroit.',
    updatedNow: 'Mis à jour',
    lastUpdatedNow: 'Dernière mise à jour : maintenant',
    totalAssets: 'Actifs totaux',
    todayAlerts: 'Alertes du jour',
    totalIncome: 'Revenus totaux',
    totalExpenses: 'Dépenses totales',
    netBalance: 'Solde net',
    savings: 'Épargne',
    investments: 'Investissements',
    upcomingCommitments: 'Engagements à venir',
    currentMonth: 'Mois en cours',
    allRecords: 'Tous les enregistrements',
    insufficientData: 'Données insuffisantes',
    noCurrentMonthData: 'Aucune donnée pour le mois en cours',
    notCalculable: 'Non calculable',
    notEntered: 'Non saisi',
    invalidValue: 'Valeur invalide',
    noDataYet: 'Aucune donnée pour le moment',
    noDataBody: 'Ajoutez vos données pour commencer.',
    openPage: 'Ouvrir la page',
    financialHealth: 'Santé financière',
    financialHealthHint: 'Ajoutez les revenus, dépenses et épargne pour calculer la santé financière.',
    excellent: 'Excellent',
    good: 'Bon',
    needsReview: 'À réviser',
    insufficientStatus: 'Données insuffisantes',
    topActionToday: 'Action prioritaire du jour',
    noUrgentActions: 'Aucune action urgente pour le moment.',
    incomeExpenses: 'Revenus et dépenses',
    currentMonthIncome: 'Revenus du mois',
    currentMonthExpenses: 'Dépenses du mois',
    spendingRatio: 'Ratio de dépenses',
    viewIncome: 'Voir les revenus',
    viewExpenses: 'Voir les dépenses',
    openReports: 'Ouvrir les rapports',
    goalsSavings: 'Objectifs et épargne',
    activeGoals: 'Objectifs actifs',
    nearestTarget: 'Date cible la plus proche',
    averageProgress: 'Progression moyenne',
    totalGoalBalance: 'Solde actuel des objectifs',
    noGoals: 'Aucun objectif financier pour le moment.',
    openGoals: 'Ouvrir les objectifs financiers',
    investmentsMarket: 'Investissements et marché',
    watchlist: 'Liste de suivi',
    marketAlerts: 'Alertes marché',
    topWatchedAsset: 'Actif le plus suivi',
    marketUnavailable: 'Aucune donnée de marché suffisante pour le moment.',
    openInvestments: 'Ouvrir les investissements',
    openMarket: 'Ouvrir l’analyse de marché',
    projectsBusinessHub: 'Projets et Centre d’affaires',
    activeProjects: 'Projets actifs',
    overdueTasks: 'Tâches en retard',
    fundingReadiness: 'Préparation au financement',
    pitchDecks: 'Pitch decks',
    noProjects: 'Aucun projet pour le moment. Ajoutez votre premier projet pour commencer.',
    openProjects: 'Ouvrir mes projets',
    openBusinessHub: 'Ouvrir le Centre d’affaires',
    createPitchDeck: 'Créer un Pitch Deck',
    zakatCharity: 'Zakat et charité',
    zakatSaved: 'Dernière zakat enregistrée',
    nextZakatDate: 'Prochaine échéance',
    charityProjects: 'Projets caritatifs',
    annualDonations: 'Dons annuels',
    noZakat: 'Aucun calcul de zakat enregistré',
    openZakat: 'Ouvrir la zakat',
    openCharityProjects: 'Ouvrir les projets caritatifs',
    openCharity: 'Ouvrir la charité',
    reports: 'Rapports',
    readyReports: 'Rapports prêts',
    reportsNeedData: 'Rapports avec données requises',
    lastGenerated: 'Dernier rapport enregistré',
    lastGeneratedUnavailable: 'Aucun rapport enregistré',
    openReportsCenter: 'Ouvrir le Centre des rapports',
    smartNotifications: 'Notifications intelligentes',
    smartTasks: 'Centre des tâches',
    viewAllTasks: 'Voir toutes les tâches',
    noTasks: 'Aucune tâche pour le moment.',
    unread: 'Non lues',
    highPriority: 'Haute priorité',
    dueToday: 'À échéance aujourd’hui',
    viewAllNotifications: 'Voir toutes les notifications',
    noNotifications: 'Aucune notification pour le moment',
    completeSetupTitle: 'Complétez la configuration du compte',
    completeSetupText: 'Ajoutez vos données de base pour obtenir un tableau de bord plus précis.',
    completeSetup: 'Terminer la configuration',
    loading: 'Chargement du tableau de bord exécutif...',
    dataError: 'Impossible de charger certaines données pour le moment.',
    debugLabel: 'Diagnostics du tableau de bord exécutif',
    debugTitle: 'Diagnostics du tableau de bord : sections en échec',
    addIncomeAction: 'Ajoutez vos revenus mensuels pour activer les rapports et les totaux du tableau de bord.',
    reportNeedsDataAction: 'Complétez les données requises dans le Centre des rapports.',
    overdueTaskAction: 'Vérifiez les tâches en retard de vos projets.',
    zakatDueAction: 'Vérifiez votre prochaine échéance de zakat.',
    notificationAction: 'Vérifiez les notifications haute priorité.',
  },
} satisfies Record<Lang, Record<string, string>>;

export default function ExecutiveDashboardPage() {
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const text = TEXT[locale];
  const { tasks: dashboardTasks, loading: tasksLoading } = useSmartTasks();
  const userId = user?.id;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [records, setRecords] = useState<DashboardRecords>(EMPTY_RECORDS);
  const [errors, setErrors] = useState<Partial<Record<DashboardKey, string>>>({});
  const [loadFailures, setLoadFailures] = useState<DashboardLoadFailure[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!userId) {
      setRecords(EMPTY_RECORDS);
      setProfile(null);
      setErrors({});
      setLoadFailures([]);
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);

    try {
      const profileQuery = supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const [profileResult, ...tableResults] = await Promise.allSettled([
        profileQuery,
        ...DASHBOARD_TABLES.map((item) => fetchDashboardTable(userId, item)),
      ]);

      const failures: DashboardLoadFailure[] = [];
      const nextErrors: Partial<Record<DashboardKey, string>> = {};
      const nextRecords: DashboardRecords = { ...EMPTY_RECORDS };

      if (profileResult.status === 'fulfilled') {
        if (profileResult.value.error) {
          const normalized = normalizeDashboardError(profileResult.value.error);
          failures.push({ section: 'profile', table: 'profiles', ...normalized });
          setProfile(null);
        } else {
          setProfile(profileResult.value.data ?? null);
        }
      } else {
        const normalized = normalizeDashboardError(profileResult.reason);
        failures.push({ section: 'profile', table: 'profiles', ...normalized });
        setProfile(null);
      }

      tableResults.forEach((result, index) => {
        const table = DASHBOARD_TABLES[index];
        if (result.status === 'fulfilled') {
          nextRecords[result.value.key] = result.value.rows;
          return;
        }

        const normalized = normalizeDashboardError(result.reason);
        failures.push({ section: table.key, table: table.table, ...normalized });
        nextErrors[table.key] = normalized.message;
        nextRecords[table.key] = [];
      });

      nextRecords.income = personalIncomeRows(nextRecords.income ?? []);
      nextRecords.expenses = personalExpenseRows(nextRecords.expenses ?? []);

      failures.forEach(logDashboardFailure);
      setRecords(nextRecords);
      setErrors(nextErrors);
      setLoadFailures(failures);
    } catch (error) {
      const normalized = normalizeDashboardError(error);
      const failure: DashboardLoadFailure = { section: 'auth', table: 'dashboard', ...normalized };
      logDashboardFailure(failure);
      setRecords(EMPTY_RECORDS);
      setErrors({ income: normalized.message });
      setLoadFailures([failure]);
    } finally {
      setIsLoadingData(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loading) void loadDashboard();
  }, [loading, loadDashboard]);

  const summary = useMemo(() => {
    const defaultCurrency =
      profile?.default_currency ||
      getRecordCurrency(records.income) ||
      getRecordCurrency(records.expenses) ||
      getRecordCurrency(records.savings) ||
      'KWD';

    const incomeTotal = sumAmounts(records.income, ['amount']);
    const expenseTotal = sumAmounts(records.expenses, ['amount']);
    const savingsTotal = sumAmounts(records.savings, ['current_amount', 'balance', 'amount']);
    const investmentsTotal = sumAmounts(records.investments, ['converted_market_value', 'current_value', 'market_value', 'amount', 'current_market_value', 'native_market_value', 'invested_amount', 'initial_value', 'purchase_price', 'value']);

    const monthRange = currentMonthRange();
    const monthIncomeRows = records.income.filter((row) => isCurrentMonth(row, ['transaction_date', 'date', 'recorded_at', 'received_date', 'generated_for_date', 'created_at'], monthRange));
    const monthExpenseRows = records.expenses.filter((row) => isCurrentMonth(row, ['transaction_date', 'date', 'recorded_at', 'expense_date', 'created_at'], monthRange));
    const currentMonthIncome = sumAmounts(monthIncomeRows, ['amount']);
    const currentMonthExpenses = sumAmounts(monthExpenseRows, ['amount']);
    const spendingRatio = safeDivide(currentMonthExpenses, currentMonthIncome);
    const hasCurrentMonthData = monthIncomeRows.length > 0 || monthExpenseRows.length > 0;
    const currentMonthNet = currentMonthIncome - currentMonthExpenses;

    const goalProgressValues = records.goals.map(goalProgress).filter((value): value is number => value !== null);
    const averageGoalProgress = goalProgressValues.length ? goalProgressValues.reduce((total, value) => total + value, 0) / goalProgressValues.length : null;
    const nearestGoalDate = records.goals
      .map((row) => firstDate(row, ['target_date', 'due_date', 'end_date']))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    const activeProjects = records.projects.filter(isOpenStatus);
    const overdueTasks = records.projectTasks.filter(isTaskOverdue);
    const fundingScores = records.projectFundingReadiness
      .map((row) => firstNumber(row, ['readiness_score', 'score']))
      .filter((value): value is number => value !== null);
    const fundingAverage = fundingScores.length ? fundingScores.reduce((total, value) => total + value, 0) / fundingScores.length : null;

    const latestZakat = latestByDate(records.zakatCalculations, ['calculation_date', 'created_at']);
    const zakatDue = latestZakat ? firstNumber(latestZakat, ['zakat_due', 'amount', 'total_zakat']) : null;
    const nextZakatDate = records.zakatAssets
      .map((row) => firstDate(row, ['zakat_due_date', 'due_date', 'hawl_date']))
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    const currentYear = new Date().getFullYear();
    const annualDonations = sumAmounts(
      records.charityDonations.filter((row) => {
        const date = firstDate(row, ['donation_date', 'created_at']);
        return date ? new Date(date).getFullYear() === currentYear : false;
      }),
      ['amount']
    );

    const upcomingCommitments =
      records.charityCommitments.filter((row) => {
        const due = firstDate(row, ['due_date', 'next_due_date']);
        const days = daysUntil(due);
        return isOpenStatus(row) && days !== null && days >= 0 && days <= 30;
      }).length +
      records.charityReminders.filter((row) => {
        const due = firstDate(row, ['due_date', 'reminder_date']);
        const days = daysUntil(due);
        return isOpenStatus(row) && days !== null && days >= 0 && days <= 30;
      }).length;

    const activeNotifications = records.notifications.filter((row) => firstText(row, ['status']).toLowerCase() !== 'archived');
    const unreadNotifications = activeNotifications.filter((row) => {
      const status = firstText(row, ['status']).toLowerCase();
      const read = row.read;
      return status === 'unread' || read === false || (!status && read !== true);
    });
    const highPriorityNotifications = activeNotifications.filter((row) => ['danger', 'warning', 'high'].includes(firstText(row, ['severity', 'priority']).toLowerCase()));
    const dueTodayNotifications = activeNotifications.filter((row) => daysUntil(firstDate(row, ['due_date'])) === 0);

    const readyReports = [
      records.income.length > 0,
      records.expenses.length > 0,
      records.savings.length > 0,
      records.goals.length > 0,
      records.investments.length > 0,
      records.projects.length > 0,
      records.zakatCalculations.length > 0,
      records.charityDonations.length > 0 || records.charityProjects.length > 0,
    ].filter(Boolean).length;
    const reportsNeedData = 8 - readyReports;

    const healthInputsAvailable = records.income.length > 0 && records.expenses.length > 0 && records.savings.length > 0;
    const netBalance = incomeTotal - expenseTotal;
    const healthScore = healthInputsAvailable
      ? (records.income.length > 0 ? 15 : 0) +
        (records.expenses.length > 0 ? 15 : 0) +
        (netBalance > 0 ? 20 : 0) +
        (savingsTotal > 0 ? 15 : 0) +
        (goalProgressValues.length > 0 ? 15 : 0) +
        (overdueTasks.length === 0 && highPriorityNotifications.length === 0 ? 20 : 0)
      : null;

    const priorityItems: PriorityItem[] = [];
    if (profile?.onboarding_completed === false) {
      priorityItems.push({
        id: 'setup',
        title: text.completeSetupTitle,
        message: text.completeSetupText,
        href: '/onboarding',
        severity: 'warning',
      });
    }
    if (overdueTasks.length > 0) {
      priorityItems.push({
        id: 'overdue-tasks',
        title: text.overdueTasks,
        message: text.overdueTaskAction,
        href: '/projects',
        severity: 'danger',
      });
    }
    if (nextZakatDate && daysUntil(nextZakatDate) !== null && (daysUntil(nextZakatDate) ?? 999) <= 7) {
      priorityItems.push({
        id: 'zakat-due',
        title: text.nextZakatDate,
        message: text.zakatDueAction,
        href: '/zakat',
        severity: 'danger',
        dueDate: nextZakatDate,
      });
    }
    if (highPriorityNotifications.length > 0) {
      const notification = highPriorityNotifications[0];
      priorityItems.push({
        id: firstText(notification, ['id'], 'notification'),
        title: firstText(notification, ['title'], text.smartNotifications),
        message: firstText(notification, ['message'], text.notificationAction),
        href: firstText(notification, ['action_url'], '/notifications'),
        severity: 'warning',
        dueDate: firstDate(notification, ['due_date']),
      });
    }
    if (reportsNeedData > 0 && readyReports > 0) {
      priorityItems.push({
        id: 'reports-need-data',
        title: text.reportsNeedData,
        message: text.reportNeedsDataAction,
        href: '/reports-center',
        severity: 'info',
      });
    }
    if (records.income.length === 0) {
      priorityItems.push({
        id: 'income-missing',
        title: text.totalIncome,
        message: text.addIncomeAction,
        href: '/income',
        severity: 'info',
      });
    }

    return {
      defaultCurrency,
      incomeTotal,
      expenseTotal,
      netBalance,
      savingsTotal,
      investmentsTotal,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthNet,
      spendingRatio,
      hasCurrentMonthData,
      activeGoals: records.goals.length,
      nearestGoalDate,
      averageGoalProgress,
      totalGoalBalance: records.goals.reduce((sum, row) => sum + calculateGoalProgress(row).currentAmount, 0),
      watchlistCount: records.marketWatchlist.length,
      marketAlertsCount: records.marketPriceAlerts.length,
      topWatchedAsset: firstText(records.marketWatchlist[0] ?? {}, ['symbol', 'name', 'asset_name']),
      activeProjects: activeProjects.length,
      overdueTasks: overdueTasks.length,
      fundingAverage,
      pitchDecks: records.projectPitchDecks.length,
      zakatDue,
      nextZakatDate,
      charityProjects: records.charityProjects.length,
      annualDonations,
      upcomingCommitments,
      readyReports,
      reportsNeedData,
      unreadNotifications: unreadNotifications.length,
      highPriorityNotifications: highPriorityNotifications.length,
      dueTodayNotifications: dueTodayNotifications.length,
      topNotifications: activeNotifications.slice(0, 3),
      healthScore,
      priorityItem: priorityItems[0] ?? null,
    };
  }, [profile?.default_currency, profile?.onboarding_completed, records, text]);

  const money = useCallback(
    (amount: number | null | undefined) => {
      if (amount === null || amount === undefined) return text.notEntered;
      if (!Number.isFinite(amount)) return text.invalidValue;
      return formatMoney(amount, summary.defaultCurrency, locale);
    },
    [locale, summary.defaultCurrency, text.invalidValue, text.notEntered]
  );

  const percent = useCallback(
    (value: number | null) => (value === null ? text.insufficientData : `${Math.round(value * 100)}%`),
    [text.insufficientData]
  );

  const monthlySpendingRatio = useMemo(() => {
    if (!summary.hasCurrentMonthData) return text.noCurrentMonthData;
    if (summary.currentMonthIncome <= 0 && summary.currentMonthExpenses > 0) return text.notCalculable;
    if (summary.currentMonthIncome <= 0 && summary.currentMonthExpenses <= 0) return text.insufficientData;
    return percent(summary.spendingRatio);
  }, [percent, summary.currentMonthExpenses, summary.currentMonthIncome, summary.hasCurrentMonthData, summary.spendingRatio, text.insufficientData, text.noCurrentMonthData, text.notCalculable]);

  const globalLoadFailures = loadFailures.filter(isGlobalDashboardFailure);
  const hasErrors = globalLoadFailures.length > 0;
  const topOpenTasks = dashboardTasks.filter(task => task.status === 'open').slice(0, 3);
  const sourceUnavailable = (...keys: DashboardKey[]) => keys.some((key) => Boolean(errors[key]));
  const hasAssetData = records.savings.length > 0 || records.investments.length > 0 || records.goals.length > 0;
  const totalAssets = summary.savingsTotal + summary.investmentsTotal + summary.totalGoalBalance;
  const reportKpiSources: DashboardKey[] = [
    'income',
    'expenses',
    'savings',
    'goals',
    'investments',
    'projects',
    'projectFinancialModels',
    'zakatCalculations',
    'charityDonations',
  ];
  const heroKpis = [
    {
      label: text.totalAssets,
      value: !sourceUnavailable('savings', 'investments', 'goals') && hasAssetData ? money(totalAssets) : text.insufficientData,
    },
    {
      label: text.activeProjects,
      value: sourceUnavailable('projects') ? text.insufficientData : `${summary.activeProjects}`,
    },
    {
      label: text.todayAlerts,
      value: sourceUnavailable('notifications') ? text.insufficientData : `${summary.dueTodayNotifications}`,
    },
    {
      label: text.readyReports,
      value: sourceUnavailable(...reportKpiSources) ? text.insufficientData : `${summary.readyReports}`,
    },
  ];

  if (loading || isLoadingData) {
    return (
      <div className="dashboard-shell" dir={dir}>
        <main className="dashboard-main loading-main">
          <Loader2 className="loader" aria-hidden="true" />
          <p>{text.loading}</p>
        </main>
        <style jsx global>{dashboardStyles}</style>
      </div>
    );
  }

  return (
    <div className="dashboard-shell" dir={dir}>
      <main className="dashboard-main">
        <section className="hero-card" aria-labelledby="dashboard-hero-title">
          <div className="hero-visual" aria-hidden="true">
            <span className="hero-grid-plane" />
            <span className="hero-chart-line hero-chart-line-one" />
            <span className="hero-chart-line hero-chart-line-two" />
            <span className="hero-glow-dot hero-glow-dot-one" />
            <span className="hero-glow-dot hero-glow-dot-two" />
          </div>

          <div className="hero-content">
            <span className="hero-kicker">
              <Zap size={14} aria-hidden="true" />
              {text.updatedNow}
            </span>
            <h1 id="dashboard-hero-title">{text.pageTitle}</h1>
            <p>{text.pageSubtitle}</p>
            <span className="hero-status">{text.lastUpdatedNow}</span>
          </div>

          <div className="hero-side">
            <div className="hero-actions">
              <ActionLink href="/tasks">{text.viewAllTasks}</ActionLink>
              <ActionLink href="/reports-center">{text.openReportsCenter}</ActionLink>
              <ActionLink href="/notifications">{text.viewAllNotifications}</ActionLink>
            </div>

            <div className="hero-kpi-grid" aria-label={text.pageTitle}>
              {heroKpis.map((item) => (
                <article className="hero-kpi-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong data-financial-value={/[0-9]/.test(item.value) ? 'true' : undefined}>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        {hasErrors ? (
          <div className="notice-card" role="status">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{text.dataError}</span>
          </div>
        ) : null}

        {process.env.NODE_ENV !== 'production' && loadFailures.length > 0 ? (
          <section className="dashboard-debug-panel" aria-label={text.debugLabel}>
            <strong>{text.debugTitle}</strong>
            <ul>
              {loadFailures.map((failure) => (
                <li key={`${failure.section}-${failure.table}`}>
                  <span>{failure.section}</span>
                  <code>{failure.table}</code>
                  <em>{failure.code ? `${failure.code}: ` : ''}{failure.message}</em>
                  {failure.details ? <small>{failure.details}</small> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {profile?.onboarding_completed === false ? (
          <section className="setup-card">
            <div>
              <h2>{text.completeSetupTitle}</h2>
              <p>{text.completeSetupText}</p>
            </div>
            <ActionLink href="/onboarding">{text.completeSetup}</ActionLink>
          </section>
        ) : null}

        <section className="metrics-grid" aria-label={text.pageTitle}>
          <MetricCard title={text.totalIncome} value={money(summary.incomeTotal)} detail={text.allRecords} icon={<Wallet size={22} />} tone="positive" />
          <MetricCard title={text.totalExpenses} value={money(summary.expenseTotal)} detail={text.allRecords} icon={<Coins size={22} />} tone="warning" />
          <MetricCard title={text.netBalance} value={money(summary.netBalance)} detail={text.allRecords} icon={<Gauge size={22} />} tone={summary.netBalance >= 0 ? 'positive' : 'warning'} />
          <MetricCard title={text.savings} value={money(summary.savingsTotal)} detail={text.allRecords} icon={<PiggyBank size={22} />} />
          <MetricCard title={text.investments} value={money(summary.investmentsTotal)} detail={text.allRecords} icon={<TrendingUp size={22} />} />
          <MetricCard title={text.upcomingCommitments} value={`${summary.upcomingCommitments}`} detail={text.currentMonth} icon={<ClipboardList size={22} />} />
        </section>

        <section className="dashboard-grid">
          <CardShell title={text.financialHealth} icon={<ShieldCheck size={20} />} action={<ActionLink href="/reports-center">{text.openReportsCenter}</ActionLink>}>
            {summary.healthScore === null ? (
              <EmptyState title={text.insufficientData} body={text.financialHealthHint} />
            ) : (
              <>
                <div className="score-row">
                  <strong>{summary.healthScore}/100</strong>
                  <span>{statusLabel(summary.healthScore, text)}</span>
                </div>
                <ProgressBar value={summary.healthScore} label={text.financialHealth} />
              </>
            )}
          </CardShell>

          <CardShell title={text.topActionToday} icon={<Zap size={20} />} action={summary.priorityItem ? <ActionLink href={summary.priorityItem.href}>{text.openPage}</ActionLink> : undefined}>
            {summary.priorityItem ? (
              <div className={`priority-card priority-${summary.priorityItem.severity}`}>
                <strong>{summary.priorityItem.title}</strong>
                <p>{summary.priorityItem.message}</p>
                {summary.priorityItem.dueDate ? <span>{formatDate(summary.priorityItem.dueDate, locale)}</span> : null}
              </div>
            ) : (
              <EmptyState title={text.noUrgentActions} />
            )}
          </CardShell>

          <CardShell title={text.smartTasks} icon={<ClipboardList size={20} />} action={<ActionLink href="/tasks">{text.viewAllTasks}</ActionLink>}>
            {tasksLoading ? (
              <EmptyState title={text.loading} />
            ) : topOpenTasks.length === 0 ? (
              <EmptyState title={text.noTasks} />
            ) : (
              <div className="task-list">
                {topOpenTasks.map(task => (
                  <Link href={task.actionUrl || '/tasks'} key={task.id}>
                    <strong>{task.title}</strong>
                    <span>{task.description || text.openPage}</span>
                    {task.dueDate ? <em>{formatDate(task.dueDate, locale)}</em> : null}
                  </Link>
                ))}
              </div>
            )}
          </CardShell>

          <CardShell
            title={text.incomeExpenses}
            icon={<BarChart3 size={20} />}
            action={
              <>
                <ActionLink href="/income">{text.viewIncome}</ActionLink>
                <ActionLink href="/expenses">{text.viewExpenses}</ActionLink>
                <ActionLink href="/reports-center">{text.openReports}</ActionLink>
              </>
            }
          >
            {!summary.hasCurrentMonthData ? (
              <EmptyState title={text.noCurrentMonthData} />
            ) : (
              <div className="stats-grid">
                <SmallStat label={text.currentMonthIncome} value={money(summary.currentMonthIncome)} />
                <SmallStat label={text.currentMonthExpenses} value={money(summary.currentMonthExpenses)} />
                <SmallStat label={text.netBalance} value={money(summary.currentMonthNet)} />
                <SmallStat label={text.spendingRatio} value={monthlySpendingRatio} />
              </div>
            )}
          </CardShell>

          <CardShell title={text.goalsSavings} icon={<Goal size={20} />} action={<ActionLink href="/goals">{text.openGoals}</ActionLink>}>
            {summary.activeGoals === 0 ? (
              <EmptyState title={text.noGoals} body={text.noDataBody} />
            ) : (
              <div className="stats-grid">
                <SmallStat label={text.activeGoals} value={`${summary.activeGoals}`} />
                <SmallStat label={text.nearestTarget} value={summary.nearestGoalDate ? formatDate(summary.nearestGoalDate, locale) : text.insufficientData} />
                <SmallStat label={text.averageProgress} value={percent(summary.averageGoalProgress)} />
                <SmallStat label={text.totalGoalBalance} value={money(summary.totalGoalBalance)} />
              </div>
            )}
          </CardShell>

          <CardShell
            title={text.investmentsMarket}
            icon={<LineChart size={20} />}
            action={
              <>
                <ActionLink href="/invest">{text.openInvestments}</ActionLink>
                <ActionLink href="/market-analysis">{text.openMarket}</ActionLink>
              </>
            }
          >
            {records.investments.length === 0 && summary.watchlistCount === 0 ? (
              <EmptyState title={text.marketUnavailable} body={text.noDataBody} />
            ) : (
              <div className="stats-grid">
                <SmallStat label={text.investments} value={money(summary.investmentsTotal)} />
                <SmallStat label={text.watchlist} value={`${summary.watchlistCount}`} />
                <SmallStat label={text.marketAlerts} value={`${summary.marketAlertsCount}`} />
                <SmallStat label={text.topWatchedAsset} value={summary.topWatchedAsset || text.insufficientData} />
              </div>
            )}
          </CardShell>

          <CardShell
            title={text.projectsBusinessHub}
            icon={<BriefcaseBusiness size={20} />}
            action={
              <>
                <ActionLink href="/projects" variant="secondary">{text.openProjects}</ActionLink>
                <ActionLink href="/business-hub" variant="primary">{text.openBusinessHub}</ActionLink>
                {summary.activeProjects > 0 ? <ActionLink href="/projects" variant="primary">{text.createPitchDeck}</ActionLink> : null}
              </>
            }
          >
            {records.projects.length === 0 ? (
              <EmptyState title={text.noProjects} />
            ) : (
              <div className="stats-grid">
                <SmallStat label={text.activeProjects} value={`${summary.activeProjects}`} />
                <SmallStat label={text.overdueTasks} value={`${summary.overdueTasks}`} />
                <SmallStat label={text.fundingReadiness} value={summary.fundingAverage === null ? text.insufficientData : `${Math.round(summary.fundingAverage)}%`} />
                <SmallStat label={text.pitchDecks} value={`${summary.pitchDecks}`} />
              </div>
            )}
          </CardShell>

          <CardShell
            title={text.zakatCharity}
            icon={<HeartHandshake size={20} />}
            action={
              <>
                <ActionLink href="/zakat">{text.openZakat}</ActionLink>
                <ActionLink href="/charity-projects">{text.openCharityProjects}</ActionLink>
                <ActionLink href="/charity">{text.openCharity}</ActionLink>
              </>
            }
          >
            {records.zakatCalculations.length === 0 && records.charityProjects.length === 0 && records.charityDonations.length === 0 ? (
              <EmptyState title={text.noZakat} body={text.noDataBody} />
            ) : (
              <div className="stats-grid">
                <SmallStat label={text.zakatSaved} value={summary.zakatDue === null ? text.insufficientData : money(summary.zakatDue)} />
                <SmallStat label={text.nextZakatDate} value={summary.nextZakatDate ? formatDate(summary.nextZakatDate, locale) : text.insufficientData} />
                <SmallStat label={text.charityProjects} value={`${summary.charityProjects}`} />
                <SmallStat label={text.annualDonations} value={money(summary.annualDonations)} />
              </div>
            )}
          </CardShell>

          <CardShell title={text.reports} icon={<FileText size={20} />} action={<ActionLink href="/reports-center">{text.openReportsCenter}</ActionLink>}>
            <div className="stats-grid">
              <SmallStat label={text.readyReports} value={`${summary.readyReports}`} />
              <SmallStat label={text.reportsNeedData} value={`${summary.reportsNeedData}`} />
              <SmallStat label={text.lastGenerated} value={text.lastGeneratedUnavailable} />
            </div>
          </CardShell>

          <CardShell title={text.smartNotifications} icon={<Bell size={20} />} action={<ActionLink href="/notifications">{text.viewAllNotifications}</ActionLink>}>
            {summary.topNotifications.length === 0 ? (
              <EmptyState title={text.noNotifications} />
            ) : (
              <>
                <div className="stats-grid compact">
                  <SmallStat label={text.unread} value={`${summary.unreadNotifications}`} />
                  <SmallStat label={text.highPriority} value={`${summary.highPriorityNotifications}`} />
                  <SmallStat label={text.dueToday} value={`${summary.dueTodayNotifications}`} />
                </div>
                <div className="notification-list">
                  {summary.topNotifications.map((notification, index) => (
                    <Link href={firstText(notification, ['action_url'], '/notifications')} key={firstText(notification, ['id'], `notification-${index}`)}>
                      <strong>{firstText(notification, ['title'], text.smartNotifications)}</strong>
                      <span>{firstText(notification, ['message'], text.openPage)}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardShell>
        </section>

        <section className="quick-links" aria-label={text.openPage}>
          <ActionLink href="/tasks">
            <ClipboardList size={16} aria-hidden="true" />
            {text.smartTasks}
          </ActionLink>
          <ActionLink href="/savings">
            <PiggyBank size={16} aria-hidden="true" />
            {text.savings}
          </ActionLink>
          <ActionLink href="/invest">
            <Landmark size={16} aria-hidden="true" />
            {text.investments}
          </ActionLink>
          <ActionLink href="/business-hub">
            <Building2 size={16} aria-hidden="true" />
            {text.openBusinessHub}
          </ActionLink>
          <ActionLink href="/notifications">
            <Bell size={16} aria-hidden="true" />
            {text.smartNotifications}
          </ActionLink>
        </section>
      </main>
      <style jsx global>{dashboardStyles}</style>
    </div>
  );
}

const dashboardStyles = `
  html,
  body {
    max-width: 100%;
    overflow-x: hidden;
  }

  .dashboard-shell,
  .dashboard-shell *,
  .dashboard-shell *::before,
  .dashboard-shell *::after {
    box-sizing: border-box;
  }

  .dashboard-shell {
    width: 100%;
    min-width: 0;
    min-height: 100%;
    overflow-x: clip;
    background: var(--background);
    color: var(--foreground);
    font-family: var(--font-ui);
  }

  .dashboard-shell :is(a, button, input, select, textarea, code) {
    font-family: var(--font-ui);
  }

  .dashboard-main {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin-inline: 0;
    padding: var(--workspace-page-padding-block) var(--workspace-page-padding-inline)
      clamp(2rem, 4vi, 3rem);
  }

  .dashboard-main > * {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin-inline: 0;
  }

  .loading-main {
    min-height: 70vh;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 12px;
    color: var(--foreground-muted);
  }

  .loader {
    animation: dashboard-spin 0.9s linear infinite;
    color: var(--primary);
  }

  @keyframes dashboard-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .hero-card {
    position: relative;
    isolation: isolate;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.72fr);
    gap: 24px;
    align-items: end;
    min-height: 300px;
    padding: clamp(24px, 2.8vi, 34px);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--border));
    border-radius: var(--radius-panel);
    background: var(--hero-gradient);
    color: var(--hero-foreground);
    box-shadow: var(--shadow-md);
  }

  .hero-card::before,
  .hero-card::after {
    content: none;
  }

  .hero-content,
  .hero-side {
    position: relative;
    z-index: 1;
    min-width: 0;
  }

  .hero-content {
    max-width: 790px;
  }

  .hero-side {
    display: grid;
    gap: 18px;
  }

  .hero-visual {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .hero-grid-plane {
    position: absolute;
    inset-inline-start: 48%;
    top: 36px;
    width: 46%;
    height: 66%;
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 16%, transparent);
    border-radius: var(--radius-panel);
    background: color-mix(in srgb, var(--hero-foreground) 6%, transparent);
    transform: perspective(760px) rotateX(58deg) rotateZ(-8deg);
    transform-origin: center;
    opacity: 0.44;
  }

  .hero-chart-line {
    position: absolute;
    height: 3px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    opacity: 0.58;
    transform: rotate(-8deg);
  }

  .hero-chart-line-one {
    inset-inline-end: 7%;
    top: 31%;
    width: 42%;
  }

  .hero-chart-line-two {
    inset-inline-end: 15%;
    top: 55%;
    width: 30%;
    opacity: 0.38;
    transform: rotate(8deg);
  }

  .hero-glow-dot {
    position: absolute;
    width: 96px;
    height: 96px;
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 18%, transparent);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    opacity: 0.6;
  }

  .hero-glow-dot-one {
    inset-inline-end: 18%;
    top: 16%;
  }

  .hero-glow-dot-two {
    inset-inline-end: 3%;
    bottom: 18%;
    width: 68px;
    height: 68px;
    background: color-mix(in srgb, var(--primary) 22%, transparent);
  }

  .hero-kicker,
  .hero-status {
    width: fit-content;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
    color: var(--hero-foreground);
    font-size: var(--type-caption-size);
    line-height: var(--type-caption-leading);
  }

  .hero-kicker {
    padding: 8px 12px;
    font-weight: 600;
  }

  .hero-status {
    margin-top: 18px;
    padding: 7px 11px;
    font-weight: 500;
  }

  .hero-card h1 {
    margin: 16px 0 12px;
    color: var(--hero-foreground);
    font-size: var(--type-display-size);
    font-weight: var(--type-display-weight);
    line-height: var(--type-display-leading);
    letter-spacing: var(--type-display-tracking);
    overflow-wrap: anywhere;
  }

  .hero-card p {
    max-width: 760px;
    margin: 0;
    color: var(--hero-foreground-muted);
    font-size: clamp(0.9375rem, 1.1vi, 1.0625rem);
    font-weight: 400;
    line-height: 1.8;
  }

  .hero-actions,
  .card-actions,
  .quick-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .hero-card .hero-actions {
    justify-content: flex-end;
  }

  .hero-kpi-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .hero-kpi-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid color-mix(in srgb, var(--hero-foreground) 22%, transparent);
    border-radius: var(--radius-card);
    background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
    color: var(--hero-foreground);
    box-shadow: none;
    transition:
      background-color var(--duration-fast) var(--ease),
      border-color var(--duration-fast) var(--ease),
      transform var(--duration-fast) var(--ease);
  }

  .hero-kpi-card:hover {
    border-color: color-mix(in srgb, var(--hero-foreground) 36%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 15%, transparent);
    transform: translateY(-1px);
  }

  .hero-kpi-card span,
  .hero-kpi-card strong {
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .hero-kpi-card span {
    color: var(--hero-foreground-muted);
    font-size: var(--type-caption-size);
    font-weight: 500;
    line-height: var(--type-caption-leading);
  }

  .hero-kpi-card strong {
    margin-top: 8px;
    color: var(--hero-foreground);
    font-size: clamp(1rem, 2vi, 1.28rem);
    font-weight: 600;
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
  }

  .notice-card,
  .setup-card,
  .dashboard-card,
  .metric-card,
  .quick-links {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--foreground);
    box-shadow: var(--shadow-card);
  }

  .notice-card {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 18px;
    padding: 14px 16px;
    border-color: color-mix(in srgb, var(--info) 28%, var(--border));
    border-radius: var(--radius-card);
    background: var(--info-soft);
    color: var(--info);
  }

  .dashboard-debug-panel {
    margin-top: 14px;
    padding: 14px 16px;
    border: 1px dashed color-mix(in srgb, var(--danger) 36%, var(--border));
    border-radius: var(--radius-card);
    background: var(--danger-soft);
    color: var(--danger);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
  }

  .dashboard-debug-panel strong {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
  }

  .dashboard-debug-panel ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .dashboard-debug-panel li {
    display: grid;
    gap: 4px;
    padding: 10px;
    border: 1px solid color-mix(in srgb, var(--danger) 20%, var(--border));
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--foreground-secondary);
  }

  .dashboard-debug-panel span {
    color: var(--danger);
    font-weight: 600;
  }

  .dashboard-debug-panel :is(code, em, small) {
    color: var(--foreground-secondary);
    font-style: normal;
    overflow-wrap: anywhere;
  }

  .setup-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-top: 18px;
    padding: 18px;
    border-radius: var(--radius-card);
  }

  .setup-card h2 {
    margin: 0 0 6px;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
    line-height: var(--type-card-title-leading);
  }

  .setup-card p {
    margin: 0;
    color: var(--foreground-muted);
    font-size: var(--type-body-size);
    line-height: var(--type-body-leading);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
    gap: 14px;
    margin: 22px 0;
  }

  .metric-card {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px;
    border-radius: var(--radius-card);
  }

  .metric-icon,
  .card-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border));
    border-radius: var(--radius-control);
    background: var(--primary-soft);
    color: var(--primary);
  }

  .metric-positive .metric-icon {
    border-color: color-mix(in srgb, var(--success) 24%, var(--border));
    background: var(--success-soft);
    color: var(--success);
  }

  .metric-warning .metric-icon {
    border-color: color-mix(in srgb, var(--warning) 24%, var(--border));
    background: var(--warning-soft);
    color: var(--warning);
  }

  .metric-card p,
  .metric-card span {
    margin: 0;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
  }

  .metric-card strong {
    display: block;
    margin: 4px 0;
    color: var(--foreground);
    font-size: var(--type-numeric-value-size);
    font-weight: var(--type-numeric-value-weight);
    line-height: var(--type-numeric-value-leading);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .dashboard-card {
    min-width: 0;
    padding: 20px;
    border-radius: var(--radius-card);
  }

  .card-heading {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .card-heading h2 {
    min-width: 0;
    margin: 0;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: var(--type-card-title-weight);
    line-height: var(--type-card-title-leading);
    overflow-wrap: anywhere;
  }

  .card-body {
    min-width: 0;
  }

  .card-actions {
    margin-top: 18px;
  }

  .action-link {
    min-width: 0;
    min-height: var(--control-h);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 9px 14px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--foreground-secondary);
    box-shadow: none;
    font-size: var(--type-button-size);
    font-weight: var(--type-button-weight);
    line-height: var(--type-button-leading);
    text-align: center;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease),
      border-color var(--duration-fast) var(--ease),
      color var(--duration-fast) var(--ease),
      transform var(--duration-fast) var(--ease);
  }

  .action-link-primary {
    border-color: var(--primary);
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: var(--shadow-xs);
  }

  .action-link-secondary {
    border-color: var(--border-strong);
    background: var(--surface);
    color: var(--foreground-secondary);
  }

  .action-link:hover {
    border-color: color-mix(in srgb, var(--primary) 38%, var(--border));
    background: var(--surface-hover);
    color: var(--primary-hover);
    transform: translateY(-1px);
  }

  .action-link-primary:hover {
    border-color: var(--primary-hover);
    background: var(--primary-hover);
    color: var(--primary-foreground);
  }

  .action-link:focus-visible,
  .task-list a:focus-visible,
  .notification-list a:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    box-shadow: var(--focus-shadow);
  }

  .action-link:active {
    transform: translateY(0) scale(0.98);
  }

  .action-link-label {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .action-link-icon {
    width: 26px;
    height: 26px;
    flex: 0 0 26px;
    display: inline-grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, currentColor 10%, transparent);
    color: inherit;
  }

  [dir='rtl'] .action-link-icon svg {
    transform: scaleX(-1);
  }

  .hero-card .action-link {
    border-color: color-mix(in srgb, var(--hero-foreground) 28%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 10%, transparent);
    color: var(--hero-foreground);
    box-shadow: none;
  }

  .hero-card .action-link:hover {
    border-color: color-mix(in srgb, var(--hero-foreground) 44%, transparent);
    background: color-mix(in srgb, var(--hero-foreground) 16%, transparent);
    color: var(--hero-foreground);
  }

  .hero-card .hero-actions .action-link:first-child {
    border-color: var(--primary-foreground);
    background: var(--primary-foreground);
    color: var(--primary-active);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .stats-grid.compact {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .small-stat {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
  }

  .small-stat span {
    display: block;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    line-height: var(--type-body-small-leading);
  }

  .small-stat strong {
    display: block;
    margin-top: 6px;
    color: var(--foreground);
    font-size: var(--type-financial-value-size);
    font-weight: var(--type-financial-value-weight);
    line-height: var(--type-financial-value-leading);
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .empty-state {
    padding: 18px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-card);
    background: var(--surface-muted);
    color: var(--foreground-muted);
  }

  .empty-state p {
    margin: 0;
    color: var(--foreground);
    font-weight: 600;
  }

  .empty-state span {
    display: block;
    margin-top: 6px;
    color: var(--foreground-muted);
    line-height: var(--type-body-leading);
  }

  .score-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }

  .score-row strong {
    color: var(--foreground);
    font-family: var(--font-data);
    font-size: 2rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .score-row span {
    color: var(--info);
    font-weight: 600;
  }

  .progress-wrap {
    width: 100%;
    height: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-pill);
    background: var(--surface-muted);
  }

  .progress-wrap div {
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
  }

  .priority-card {
    padding: 16px;
    border: 1px solid color-mix(in srgb, var(--info) 24%, var(--border));
    border-radius: var(--radius-card);
    background: var(--info-soft);
    color: var(--foreground);
  }

  .priority-card strong {
    display: block;
    color: var(--foreground);
    font-size: var(--type-card-title-size);
    font-weight: 600;
  }

  .priority-card p {
    margin: 8px 0 0;
    color: var(--foreground-secondary);
    line-height: var(--type-body-leading);
  }

  .priority-card > span {
    display: block;
    margin-top: 8px;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
  }

  .priority-warning {
    border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
    background: var(--warning-soft);
  }

  .priority-danger {
    border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
    background: var(--danger-soft);
  }

  .task-list,
  .notification-list {
    display: grid;
    gap: 10px;
  }

  .notification-list {
    margin-top: 12px;
  }

  .task-list a,
  .notification-list a {
    display: block;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface-muted);
    color: var(--foreground);
    text-decoration: none;
    transition:
      background-color var(--duration-fast) var(--ease),
      border-color var(--duration-fast) var(--ease);
  }

  .task-list a:hover,
  .notification-list a:hover {
    border-color: color-mix(in srgb, var(--primary) 26%, var(--border));
    background: var(--surface-hover);
  }

  .task-list strong,
  .task-list span,
  .task-list em,
  .notification-list strong,
  .notification-list span {
    display: block;
    overflow-wrap: anywhere;
  }

  .task-list strong,
  .notification-list strong {
    color: var(--foreground);
    font-weight: 600;
  }

  .task-list span,
  .task-list em,
  .notification-list span {
    margin-top: 4px;
    color: var(--foreground-muted);
    font-size: var(--type-body-small-size);
    font-style: normal;
    line-height: var(--type-body-small-leading);
  }

  .quick-links {
    margin-top: 18px;
    padding: 16px;
    border-radius: var(--radius-card);
  }

  @media (max-width: 1180px) {
    .dashboard-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .hero-card {
      grid-template-columns: minmax(0, 1fr);
      min-height: auto;
      align-items: stretch;
    }

    .hero-card .hero-actions {
      justify-content: flex-start;
    }

    .hero-grid-plane {
      inset-inline-start: 18%;
      width: 82%;
      opacity: 0.3;
    }

    .setup-card {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (max-width: 640px) {
    .hero-card {
      gap: 18px;
      padding: 22px 18px;
    }

    .hero-card h1 {
      font-size: clamp(1.8rem, 10vi, 2.5rem);
    }

    .hero-card p {
      font-size: var(--type-body-size);
    }

    .hero-kpi-grid,
    .metrics-grid,
    .stats-grid,
    .stats-grid.compact {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero-glow-dot,
    .hero-chart-line {
      opacity: 0.3;
    }

    .dashboard-card,
    .metric-card {
      padding: 16px;
    }

    .card-actions,
    .hero-actions,
    .quick-links {
      align-items: stretch;
    }

    .action-link {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    .dashboard-main {
      padding-inline: 14px;
    }

    .hero-card {
      padding: 20px 16px;
    }

    .hero-actions .action-link {
      padding-inline: 10px;
    }

    .metric-card {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dashboard-shell *,
    .dashboard-shell *::before,
    .dashboard-shell *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

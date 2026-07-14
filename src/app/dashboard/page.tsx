'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
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
  Plus,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Target,
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

  const dashboardCopy = lang === 'ar'
    ? {
        greeting: 'صباح الخير', overview: 'هذه نظرة شاملة على أدائك المالي', addTransaction: 'إضافة معاملة',
        thisMonth: 'هذا الشهر', cashFlow: 'التدفق النقدي', income: 'الدخل', expenses: 'المصروفات',
        financialHealth: 'الصحة المالية', savingsRatio: 'نسبة الادخار', expenseCoverage: 'تغطية المصروفات',
        debtLevel: 'مستوى الديون', veryGood: 'جيدة جداً', excellent: 'ممتاز', low: 'منخفض', details: 'عرض التفاصيل',
        recentTransactions: 'آخر المعاملات', merchant: 'التاجر / الجهة', category: 'الفئة', date: 'التاريخ', amount: 'المبلغ',
        expenseDistribution: 'توزيع المصروفات', dailyActions: 'إجراءات اليوم', goals: 'الأهداف المالية',
        viewAll: 'عرض الجميع', viewReport: 'عرض التقرير', annualGoal: 'الهدف السنوي', noTransactions: 'لا توجد معاملات حديثة',
        reviewExpenses: 'مراجعة تقرير المصروفات', approveInvoices: 'اعتماد فواتير الموردين', updateBudget: 'تحديث الميزانية الشهرية',
      }
    : lang === 'fr'
      ? {
          greeting: 'Bonjour', overview: 'Voici une vue complète de vos performances financières', addTransaction: 'Ajouter une transaction',
          thisMonth: 'Ce mois', cashFlow: 'Flux de trésorerie', income: 'Revenus', expenses: 'Dépenses',
          financialHealth: 'Santé financière', savingsRatio: "Taux d'épargne", expenseCoverage: 'Couverture des dépenses',
          debtLevel: "Niveau d'endettement", veryGood: 'Très bon', excellent: 'Excellent', low: 'Faible', details: 'Voir les détails',
          recentTransactions: 'Transactions récentes', merchant: 'Commerçant', category: 'Catégorie', date: 'Date', amount: 'Montant',
          expenseDistribution: 'Répartition des dépenses', dailyActions: "Actions du jour", goals: 'Objectifs financiers',
          viewAll: 'Tout afficher', viewReport: 'Voir le rapport', annualGoal: 'Objectif annuel', noTransactions: 'Aucune transaction récente',
          reviewExpenses: 'Examiner le rapport des dépenses', approveInvoices: 'Approuver les factures fournisseurs', updateBudget: 'Mettre à jour le budget mensuel',
        }
      : {
          greeting: 'Good morning', overview: 'Here is a complete view of your financial performance', addTransaction: 'Add transaction',
          thisMonth: 'This month', cashFlow: 'Cash flow', income: 'Income', expenses: 'Expenses',
          financialHealth: 'Financial health', savingsRatio: 'Savings ratio', expenseCoverage: 'Expense coverage',
          debtLevel: 'Debt level', veryGood: 'Very good', excellent: 'Excellent', low: 'Low', details: 'View details',
          recentTransactions: 'Recent transactions', merchant: 'Merchant', category: 'Category', date: 'Date', amount: 'Amount',
          expenseDistribution: 'Expense distribution', dailyActions: "Today's actions", goals: 'Financial goals',
          viewAll: 'View all', viewReport: 'View report', annualGoal: 'Annual goal', noTransactions: 'No recent transactions',
          reviewExpenses: 'Review expense report', approveInvoices: 'Approve supplier invoices', updateBudget: 'Update monthly budget',
        };

  const displayName = firstText(user?.user_metadata ?? {}, ['display_name', 'full_name', 'name'], lang === 'ar' ? 'محمد' : 'Mohammed');
  const financialKpis = [
    { label: text.netBalance, value: money(summary.netBalance), icon: <Wallet size={19} />, tone: 'blue', trend: '5.1%', path: 'M2 25 C15 22 17 29 29 22 S45 18 55 23 S70 5 84 15 S99 7 118 12' },
    { label: text.totalIncome, value: money(summary.incomeTotal), icon: <Wallet size={19} />, tone: 'green', trend: '12.7%', path: 'M2 26 C13 14 21 27 31 18 S47 22 57 13 S72 18 82 9 S98 18 118 5' },
    { label: text.totalExpenses, value: money(summary.expenseTotal), icon: <Coins size={19} />, tone: 'red', trend: '3.2%', path: 'M2 27 C15 14 20 27 33 17 S51 24 62 12 S78 9 87 22 S101 13 118 15' },
    { label: text.investments, value: money(summary.investmentsTotal), icon: <TrendingUp size={19} />, tone: 'teal', trend: '8.4%', path: 'M2 25 C12 14 19 29 30 18 S45 25 55 10 S70 18 80 6 S96 19 118 7' },
  ];

  const recentTransactions = [
    ...records.expenses.map((row, index) => ({
      id: firstText(row, ['id'], `expense-${index}`),
      merchant: firstText(row, ['merchant', 'name', 'title', 'description'], dashboardCopy.expenses),
      category: firstText(row, ['category', 'category_name', 'type'], dashboardCopy.expenses),
      date: firstDate(row, ['transaction_date', 'expense_date', 'date', 'created_at']),
      amount: -(firstNumber(row, ['amount']) ?? 0),
    })),
    ...records.income.map((row, index) => ({
      id: firstText(row, ['id'], `income-${index}`),
      merchant: firstText(row, ['source_name', 'name', 'title', 'description'], dashboardCopy.income),
      category: firstText(row, ['category', 'type'], dashboardCopy.income),
      date: firstDate(row, ['transaction_date', 'received_date', 'date', 'created_at']),
      amount: firstNumber(row, ['amount']) ?? 0,
    })),
  ]
    .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
    .slice(0, 5);

  const expenseGroups = Array.from(records.expenses.reduce((groups, row) => {
    const label = firstText(row, ['category', 'category_name', 'type'], dashboardCopy.expenses);
    groups.set(label, (groups.get(label) ?? 0) + (firstNumber(row, ['amount']) ?? 0));
    return groups;
  }, new Map<string, number>()).entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const expenseGroupTotal = expenseGroups.reduce((sum, [, value]) => sum + value, 0);
  const expenseLegend = expenseGroups.length
    ? expenseGroups.map(([label, value], index) => ({ label, percentage: expenseGroupTotal ? Math.round((value / expenseGroupTotal) * 100) : 0, index }))
    : [
        { label: lang === 'ar' ? 'الموظفون والرواتب' : 'Payroll', percentage: 35, index: 0 },
        { label: lang === 'ar' ? 'التشغيل' : 'Operations', percentage: 25, index: 1 },
        { label: lang === 'ar' ? 'التسويق والمبيعات' : 'Marketing', percentage: 15, index: 2 },
        { label: lang === 'ar' ? 'الإيجار والمرافق' : 'Rent & utilities', percentage: 10, index: 3 },
        { label: lang === 'ar' ? 'أخرى' : 'Other', percentage: 15, index: 4 },
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
        <section className="reference-hero" aria-labelledby="reference-dashboard-title">
          <div className="reference-hero-head">
            <div className="reference-hero-copy">
              <h1 id="reference-dashboard-title">{dashboardCopy.greeting}، {displayName}</h1>
              <p>{dashboardCopy.overview}</p>
            </div>
            <div className="reference-hero-actions">
              <button type="button" className="reference-period-button">
                <CalendarDays size={17} aria-hidden="true" />
                <span>{dashboardCopy.thisMonth}</span>
              </button>
              <Link href="/income" className="reference-primary-button">
                <Plus size={18} aria-hidden="true" />
                <span>{dashboardCopy.addTransaction}</span>
              </Link>
            </div>
          </div>

          <div className="reference-kpi-grid">
            {financialKpis.map((item) => (
              <article className={`reference-kpi-card reference-kpi-${item.tone}`} key={item.label}>
                <div className="reference-kpi-title">
                  <span>{item.label}</span>
                  <i aria-hidden="true">{item.icon}</i>
                </div>
                <strong data-financial-value="true">{item.value}</strong>
                <div className="reference-kpi-foot">
                  <span className="reference-trend">▲ {item.trend}</span>
                  <small>{lang === 'ar' ? 'عن الشهر الماضي' : lang === 'fr' ? 'vs mois précédent' : 'vs last month'}</small>
                  <svg viewBox="0 0 120 34" role="img" aria-label={`${item.label} trend`}>
                    <path d={item.path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="reference-overview-grid" aria-label={dashboardCopy.cashFlow}>
          <article className="reference-panel reference-cashflow">
            <header className="reference-panel-heading">
              <div>
                <h2>{dashboardCopy.cashFlow}</h2>
                <div className="reference-chart-legend">
                  <span><i className="is-income" />{dashboardCopy.income}</span>
                  <span><i className="is-expense" />{dashboardCopy.expenses}</span>
                </div>
              </div>
              <button type="button" className="reference-icon-button" aria-label={dashboardCopy.thisMonth}>
                <span>{lang === 'ar' ? '12 شهر' : '12 months'}</span>
                <CalendarDays size={15} aria-hidden="true" />
              </button>
            </header>
            <div className="reference-line-chart" aria-label={dashboardCopy.cashFlow}>
              <div className="reference-chart-scale" aria-hidden="true"><span>800k</span><span>600k</span><span>400k</span><span>200k</span><span>0</span></div>
              <svg viewBox="0 0 760 220" role="img" aria-label={dashboardCopy.cashFlow} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".18"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient>
                  <linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".16"/><stop offset="1" stopColor="var(--primary)" stopOpacity="0"/></linearGradient>
                </defs>
                <g className="reference-grid-lines"><path d="M0 18H760M0 64H760M0 110H760M0 156H760M0 202H760" /></g>
                <path className="reference-income-area" d="M0 150 C55 130 70 108 126 116 S190 150 246 88 S318 72 372 58 S448 82 500 66 S580 102 630 112 S710 142 760 118 L760 202 L0 202Z" />
                <path className="reference-expense-area" d="M0 172 C48 152 85 142 126 150 S198 176 246 132 S326 128 372 112 S454 106 500 120 S568 146 630 142 S706 168 760 150 L760 202 L0 202Z" />
                <path className="reference-income-line" d="M0 150 C55 130 70 108 126 116 S190 150 246 88 S318 72 372 58 S448 82 500 66 S580 102 630 112 S710 142 760 118" />
                <path className="reference-expense-line" d="M0 172 C48 152 85 142 126 150 S198 176 246 132 S326 128 372 112 S454 106 500 120 S568 146 630 142 S706 168 760 150" />
              </svg>
              <div className="reference-months" aria-hidden="true">{(lang === 'ar' ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']).map(month => <span key={month}>{month}</span>)}</div>
            </div>
          </article>

          <article className="reference-panel reference-health">
            <header className="reference-panel-heading"><h2>{dashboardCopy.financialHealth}</h2><ShieldCheck size={19} aria-hidden="true" /></header>
            <div className="reference-health-body">
              <div className="reference-score-ring" style={{ '--score': `${summary.healthScore ?? 0}%` } as CSSProperties}>
                <div><strong>{summary.healthScore ?? 0}</strong><span>/100</span></div>
              </div>
              <strong className="reference-score-label">{summary.healthScore === null ? text.insufficientData : statusLabel(summary.healthScore, text)}</strong>
              <div className="reference-health-list">
                {[
                  [dashboardCopy.savingsRatio, dashboardCopy.veryGood],
                  [dashboardCopy.expenseCoverage, dashboardCopy.excellent],
                  [dashboardCopy.debtLevel, dashboardCopy.low],
                ].map(([label, value]) => (
                  <div key={label}><CheckCircle2 size={18} aria-hidden="true" /><span>{label}<strong>{value}</strong></span></div>
                ))}
              </div>
            </div>
            <Link href="/reports-center" className="reference-secondary-button">{dashboardCopy.details}<ArrowRight size={15} aria-hidden="true" /></Link>
          </article>
        </section>

        <section className="reference-detail-grid">
          <article className="reference-panel reference-transactions">
            <header className="reference-panel-heading"><h2>{dashboardCopy.recentTransactions}</h2><ReceiptText size={19} aria-hidden="true" /></header>
            {recentTransactions.length ? (
              <div className="reference-table-wrap"><table><thead><tr><th>{dashboardCopy.merchant}</th><th>{dashboardCopy.category}</th><th>{dashboardCopy.date}</th><th>{dashboardCopy.amount}</th></tr></thead><tbody>
                {recentTransactions.map((transaction) => <tr key={transaction.id}><td>{transaction.merchant}</td><td>{transaction.category}</td><td>{transaction.date ? formatDate(transaction.date, locale) : '—'}</td><td className={transaction.amount >= 0 ? 'is-positive' : 'is-negative'}>{money(transaction.amount)}</td></tr>)}
              </tbody></table></div>
            ) : <div className="reference-compact-empty">{dashboardCopy.noTransactions}</div>}
            <Link href="/reports-center" className="reference-text-link">{dashboardCopy.viewAll}<ArrowRight size={14} aria-hidden="true" /></Link>
          </article>

          <article className="reference-panel reference-expenses-card">
            <header className="reference-panel-heading"><h2>{dashboardCopy.expenseDistribution}</h2><BarChart3 size={19} aria-hidden="true" /></header>
            <div className="reference-donut-layout">
              <div className="reference-donut"><span><strong>{money(summary.expenseTotal)}</strong><small>{dashboardCopy.expenses}</small></span></div>
              <div className="reference-expense-legend">{expenseLegend.map((item) => <div key={item.label}><i data-index={item.index} /><span>{item.label}</span><strong>{item.percentage}%</strong></div>)}</div>
            </div>
            <Link href="/expenses" className="reference-text-link">{dashboardCopy.viewReport}<ArrowRight size={14} aria-hidden="true" /></Link>
          </article>

          <article className="reference-panel reference-actions-card">
            <header className="reference-panel-heading"><h2>{dashboardCopy.dailyActions}</h2><ClipboardList size={19} aria-hidden="true" /></header>
            <div className="reference-action-list">
              {[
                [dashboardCopy.reviewExpenses, lang === 'ar' ? 'عالية' : 'High', '10:00', 'high'],
                [dashboardCopy.approveInvoices, lang === 'ar' ? 'متوسطة' : 'Medium', '12:30', 'medium'],
                [dashboardCopy.updateBudget, lang === 'ar' ? 'منخفضة' : 'Low', '03:00', 'low'],
              ].map(([label, priority, time, tone], index) => <Link href={index === 0 ? '/reports-center' : index === 1 ? '/expenses' : '/goals'} key={label}><i className={`is-${tone}`}>{index === 0 ? <ReceiptText size={18}/> : index === 1 ? <CalendarDays size={18}/> : <BarChart3 size={18}/>}</i><span><strong>{label}</strong><small>{time}</small></span><em className={`is-${tone}`}>{priority}</em></Link>)}
            </div>
            <Link href="/tasks" className="reference-text-link">{dashboardCopy.viewAll}<ArrowRight size={14} aria-hidden="true" /></Link>
          </article>

          <article className="reference-panel reference-goals-card">
            <header className="reference-panel-heading"><h2>{dashboardCopy.goals}</h2><Target size={19} aria-hidden="true" /></header>
            <div className="reference-goal-list">
              {records.goals.slice(0, 2).map((goal, index) => {
                const progress = Math.round((goalProgress(goal) ?? 0) * 100);
                return <div key={firstText(goal, ['id'], `goal-${index}`)}><span><strong>{firstText(goal, ['name', 'title'], dashboardCopy.annualGoal)}</strong><small>{progress}%</small></span><div><i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div></div>;
              })}
              {records.goals.length === 0 ? <div><span><strong>{dashboardCopy.annualGoal}</strong><small>0%</small></span><div><i style={{ width: '0%' }} /></div></div> : null}
            </div>
            <Link href="/goals" className="reference-text-link">{dashboardCopy.viewAll}<ArrowRight size={14} aria-hidden="true" /></Link>
          </article>
        </section>

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

  .dashboard-main > .hero-card,
  .dashboard-main > .metrics-grid,
  .dashboard-main > .dashboard-grid {
    display: none;
  }

  .reference-hero {
    overflow: hidden;
    padding: 20px;
    border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--border));
    border-radius: var(--radius-panel);
    background: var(--sidebar-background);
    box-shadow: var(--shadow-md);
    color: var(--hero-foreground);
  }

  .reference-hero-head,
  .reference-panel-heading,
  .reference-kpi-title,
  .reference-kpi-foot,
  .reference-text-link,
  .reference-secondary-button {
    display: flex;
    align-items: center;
  }

  .reference-hero-head { justify-content: space-between; gap: 18px; margin-bottom: 20px; }
  .reference-hero-copy h1 { margin: 0; color: var(--hero-foreground); font-size: clamp(1.45rem, 2.3vw, 2rem); font-weight: 700; line-height: 1.25; }
  .reference-hero-copy p { margin: 5px 0 0; color: var(--hero-foreground-muted); font-size: 13px; line-height: 1.7; }
  .reference-hero-actions { display: flex; align-items: center; gap: 10px; }
  .reference-primary-button,
  .reference-period-button,
  .reference-secondary-button,
  .reference-icon-button {
    min-height: 44px;
    border-radius: var(--radius-control);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }
  .reference-primary-button,
  .reference-period-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 0 16px; }
  .reference-primary-button { border: 1px solid var(--primary); background: var(--primary); color: var(--hero-foreground); box-shadow: var(--shadow-sm); }
  .reference-primary-button:hover { background: var(--primary-hover); transform: translateY(-1px); }
  .reference-period-button { border: 1px solid color-mix(in srgb, var(--hero-foreground) 34%, transparent); background: color-mix(in srgb, var(--hero-gradient-start) 54%, transparent); color: var(--hero-foreground); }
  .reference-period-button:hover { background: color-mix(in srgb, var(--hero-gradient-mid) 82%, transparent); }

  .reference-kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .reference-kpi-card { min-width: 0; padding: 15px 16px 12px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); color: var(--foreground); box-shadow: var(--shadow-card); }
  .reference-kpi-title { justify-content: space-between; gap: 10px; color: var(--foreground-secondary); font-size: 12px; }
  .reference-kpi-title i { width: 31px; height: 31px; display: grid; place-items: center; border-radius: var(--radius-sm); background: var(--primary-soft); color: var(--primary); font-style: normal; }
  .reference-kpi-card > strong { display: block; margin-top: 7px; color: var(--foreground); font-family:var(--font-data); font-size: clamp(1.15rem, 1.8vw, 1.55rem); font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reference-kpi-foot { gap: 7px; margin-top: 9px; color: var(--foreground-muted); }
  .reference-kpi-foot small { font-size: 10px; white-space: nowrap; }
  .reference-kpi-foot svg { width: 35%; min-width: 74px; height: 30px; margin-inline-start: auto; }
  .reference-trend { padding: 4px 7px; border-radius: var(--radius-sm); background: var(--success-soft); color: var(--success); font-size: 10px; font-weight: 700; direction: ltr; }
  .reference-kpi-red .reference-kpi-title i { background: var(--danger-soft); color: var(--danger); }
  .reference-kpi-red .reference-kpi-foot svg { color: var(--danger); }
  .reference-kpi-red .reference-trend { background: var(--danger-soft); color: var(--danger); }
  .reference-kpi-green .reference-kpi-title i, .reference-kpi-teal .reference-kpi-title i { background: var(--accent-soft); color: var(--accent); }
  .reference-kpi-green .reference-kpi-foot svg, .reference-kpi-teal .reference-kpi-foot svg { color: var(--accent); }
  .reference-kpi-blue .reference-kpi-foot svg { color: var(--primary); }

  .reference-overview-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .85fr); gap: 14px; margin-top: 14px; }
  .reference-detail-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
  .reference-panel { min-width: 0; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); box-shadow: var(--shadow-card); color: var(--foreground); }
  .reference-overview-grid .reference-panel { padding: 16px; }
  .reference-detail-grid .reference-panel { display: flex; flex-direction: column; min-height: 318px; padding: 14px; }
  .reference-panel-heading { justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .reference-panel-heading h2 { margin: 0; color: var(--foreground); font-size: 15px; font-weight: 700; }
  .reference-panel-heading > svg { color: var(--foreground-secondary); }
  .reference-chart-legend { display: flex; gap: 14px; margin-top: 8px; color: var(--foreground-secondary); font-size: 11px; }
  .reference-chart-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .reference-chart-legend i { width: 7px; height: 7px; border-radius: var(--radius-pill); }
  .reference-chart-legend .is-income { background: var(--accent); }
  .reference-chart-legend .is-expense { background: var(--primary); }
  .reference-icon-button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 10px; border: 1px solid var(--border); background: var(--hero-foreground); color: var(--foreground-secondary); }
  .reference-line-chart { position: relative; min-height: 245px; padding-inline-start: 42px; }
  .reference-line-chart > svg { width: 100%; height: 205px; overflow: visible; }
  .reference-grid-lines path { fill: none; stroke: var(--chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .reference-income-area { fill: url(#incomeArea); }
  .reference-expense-area { fill: url(#expenseArea); }
  .reference-income-line, .reference-expense-line { fill: none; stroke-width: 2.2; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .reference-income-line { stroke: var(--accent); }
  .reference-expense-line { stroke: var(--primary); }
  .reference-chart-scale { position: absolute; inset-inline-start: 0; top: 2px; bottom: 33px; display: flex; flex-direction: column; justify-content: space-between; color: var(--chart-label); font-family:var(--font-data); font-size: 10px; direction: ltr; }
  .reference-months { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; color: var(--chart-label); font-size: 10px; text-align: center; }

  .reference-health { display: flex; flex-direction: column; }
  .reference-health-body { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 10px 18px; align-items: center; flex: 1; }
  .reference-score-ring { --score: 0%; width: 138px; height: 138px; display: grid; place-items: center; border-radius: var(--radius-pill); background: var(--primary); position: relative; }
  .reference-score-ring::after { content: ''; position: absolute; inset: 12px; border-radius: var(--radius-pill); background: var(--surface); box-shadow: var(--shadow-xs); }
  .reference-score-ring > div { position: relative; z-index: 1; display: grid; text-align: center; }
  .reference-score-ring strong { color: var(--foreground); font: 700 2.65rem/1 var(--font-data); }
  .reference-score-ring span { color: var(--foreground-secondary); font: 500 1rem/1.2 var(--font-data); }
  .reference-score-label { grid-column: 1; text-align: center; color: var(--foreground); font-size: 14px; }
  .reference-health-list { grid-column: 2; grid-row: 1 / span 2; display: grid; gap: 8px; }
  .reference-health-list > div { min-height: 47px; display: flex; align-items: center; gap: 9px; padding: 8px 11px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface-muted); color: var(--accent); }
  .reference-health-list span { display: grid; color: var(--foreground-secondary); font-size: 11px; }
  .reference-health-list strong { margin-top: 2px; color: var(--primary); font-size: 11px; }
  .reference-secondary-button { justify-content: center; gap: 8px; min-height: 40px; margin-top: 12px; border: 1px solid var(--border-strong); background: var(--hero-foreground); color: var(--primary); }
  .reference-secondary-button:hover { border-color: var(--primary); background: var(--primary-soft); }
  [dir='rtl'] .reference-secondary-button svg, [dir='rtl'] .reference-text-link svg { transform: scaleX(-1); }

  .reference-table-wrap { overflow-x: auto; flex: 1; }
  .reference-transactions table { width: 100%; border-collapse: collapse; font-size: 10px; white-space: nowrap; }
  .reference-transactions th { padding: 8px 6px; background: var(--table-header); color: var(--foreground-muted); font-weight: 600; text-align: start; }
  .reference-transactions td { padding: 9px 6px; border-bottom: 1px solid var(--border); color: var(--foreground-secondary); text-align: start; }
  .reference-transactions td.is-positive { color: var(--success); font-weight: 700; }
  .reference-transactions td.is-negative { color: var(--danger); font-weight: 700; }
  .reference-text-link { justify-content: center; gap: 7px; min-height: 40px; margin-top: auto; border-top: 1px solid var(--border); color: var(--primary); font-size: 11px; font-weight: 600; text-decoration: none; }
  .reference-compact-empty { display: grid; place-items: center; flex: 1; color: var(--foreground-muted); font-size: 12px; }

  .reference-donut-layout { display: grid; grid-template-columns: minmax(110px, .8fr) minmax(130px, 1fr); gap: 14px; align-items: center; flex: 1; }
  .reference-donut { width: min(100%, 145px); aspect-ratio: 1; display: grid; place-items: center; margin: auto; border-radius: var(--radius-pill); background: var(--primary); position: relative; }
  .reference-donut::after { content: ''; position: absolute; inset: 27%; border-radius: var(--radius-pill); background: var(--surface); }
  .reference-donut span { position: relative; z-index: 1; display: grid; max-width: 70px; text-align: center; }
  .reference-donut strong { color: var(--foreground); font: 700 11px/1.3 var(--font-data); overflow: hidden; text-overflow: ellipsis; }
  .reference-donut small { color: var(--chart-5); font-size: 9px; }
  .reference-expense-legend { display: grid; gap: 10px; }
  .reference-expense-legend > div { display: grid; grid-template-columns: 7px minmax(0, 1fr) auto; gap: 6px; align-items: center; color: var(--foreground-muted); font-size: 10px; }
  .reference-expense-legend i { width: 7px; height: 7px; border-radius: var(--radius-pill); background: var(--primary); }
  .reference-expense-legend i[data-index='1'] { background: var(--accent); }.reference-expense-legend i[data-index='2'] { background: var(--chart-4); }.reference-expense-legend i[data-index='3'] { background: var(--danger); }.reference-expense-legend i[data-index='4'] { background: var(--chart-5); }
  .reference-expense-legend strong { color: var(--foreground-secondary); font-family:var(--font-data); }

  .reference-action-list { display: grid; gap: 8px; flex: 1; }
  .reference-action-list > a { min-height: 60px; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 9px; align-items: center; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); color: inherit; text-decoration: none; }
  .reference-action-list > a > i { width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--radius-sm); background: var(--danger-soft); color: var(--danger); font-style: normal; }
  .reference-action-list > a > i.is-medium { background: var(--warning-soft); color: var(--warning); }.reference-action-list > a > i.is-low { background: var(--success-soft); color: var(--success); }
  .reference-action-list span { display: grid; min-width: 0; }
  .reference-action-list span strong { color: var(--foreground-secondary); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .reference-action-list span small { margin-top: 3px; color: var(--foreground-muted); font-size: 9px; }
  .reference-action-list em { padding: 4px 6px; border-radius: var(--radius-sm); background: var(--danger-soft); color: var(--danger); font-size: 9px; font-style: normal; }.reference-action-list em.is-medium { background: var(--warning-soft); color: var(--warning); }.reference-action-list em.is-low { background: var(--success-soft); color: var(--success); }

  .reference-goal-list { display: grid; gap: 20px; flex: 1; align-content: start; padding-top: 8px; }
  .reference-goal-list > div > span { display: flex; justify-content: space-between; gap: 12px; color: var(--foreground-secondary); font-size: 11px; }
  .reference-goal-list small { color: var(--primary); font-family:var(--font-data); }
  .reference-goal-list > div > div { height: 7px; margin-top: 10px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-muted); }
  .reference-goal-list i { display: block; height: 100%; border-radius: inherit; background: var(--primary); }

  @media (max-width: 1180px) {
    .reference-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .reference-detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 900px) {
    .reference-overview-grid { grid-template-columns: 1fr; }
    .reference-health-body { grid-template-columns: 150px minmax(0, 1fr); }
  }
  @media (max-width: 640px) {
    .reference-hero { padding: 16px; }
    .reference-hero-head { align-items: stretch; flex-direction: column; }
    .reference-hero-actions { display: grid; grid-template-columns: 1fr 1fr; }
    .reference-kpi-grid, .reference-detail-grid { grid-template-columns: 1fr; }
    .reference-kpi-card > strong { white-space: normal; }
    .reference-line-chart { min-height: 220px; padding-inline-start: 34px; }
    .reference-months span:nth-child(even) { display: none; }
    .reference-months { grid-template-columns: repeat(6, 1fr); }
    .reference-health-body { grid-template-columns: 1fr; justify-items: center; }
    .reference-health-list { width: 100%; grid-column: 1; grid-row: auto; }
    .reference-score-label { grid-column: 1; }
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

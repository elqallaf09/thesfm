'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  FolderKanban,
  Gauge,
  Pencil,
  Plus,
  Target,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type TabId = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis' | 'ai';
type RiskLevel = 'low' | 'medium' | 'high';

type ProjectRow = {
  id: string;
  user_id: string;
  name: string | null;
  emoji?: string | null;
  budget?: string | number | null;
  timeline?: string | null;
  duration_unit?: string | null;
  steps?: unknown;
  notes?: Record<string, any> | string | null;
  created_at?: string | null;
};

type SavingsRow = { amount?: string | number | null };

const TEXT = {
  ar: {
    workspace: 'مساحة المشروع',
    projectName: 'اسم المشروع',
    projectType: 'نوع المشروع',
    status: 'الحالة',
    capital: 'رأس المال',
    financialTarget: 'الهدف المالي',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    editProject: 'تعديل المشروع',
    addExpense: 'إضافة مصروف للمشروع',
    addIncome: 'إضافة دخل للمشروع',
    analyzeProject: 'تحليل المشروع',
    back: 'العودة إلى مشاريعي',
    signIn: 'سجّل الدخول لعرض تفاصيل مشاريعك.',
    notFound: 'لم يتم العثور على المشروع.',
    overview: 'نظرة عامة',
    feasibility: 'دراسة الجدوى',
    financial: 'النموذج المالي',
    tasks: 'المهام',
    documents: 'المستندات',
    kpis: 'المؤشرات',
    ai: 'مستشار AI',
    comingSoon: 'سيتم تفعيل هذا القسم في المرحلة القادمة.',
    projectSummary: 'ملخص المشروع',
    financialSnapshot: 'اللقطة المالية',
    timelineSnapshot: 'ملخص الجدول الزمني',
    riskSnapshot: 'ملخص المخاطر',
    quickActions: 'إجراءات سريعة',
    description: 'الوصف',
    priority: 'الأولوية',
    currentPhase: 'المرحلة الحالية',
    totalIncome: 'إجمالي دخل المشروع',
    totalExpenses: 'إجمالي مصروفات المشروع',
    netResult: 'الصافي',
    remainingBudget: 'الميزانية المتبقية',
    targetProgress: 'التقدم نحو الهدف',
    daysRemaining: 'الأيام المتبقية',
    duration: 'مدة المشروع',
    noDate: 'غير محدد',
    noData: 'لا توجد بيانات كافية',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    riskLowText: 'المؤشرات الحالية تبدو مستقرة لهذا المشروع.',
    riskMediumText: 'يحتاج المشروع إلى متابعة مالية وتشغيلية منتظمة.',
    riskHighText: 'المشروع يحتاج مراجعة عاجلة للمخاطر والميزانية.',
    addTask: 'إضافة مهمة',
    generateFeasibility: 'إنشاء دراسة جدوى',
    createFinancialModel: 'إنشاء نموذج مالي',
    idea: 'فكرة',
    study: 'دراسة',
    setup: 'تأسيس',
    launch: 'إطلاق',
    growth: 'نمو',
    paused: 'متوقف',
    completed: 'مكتمل',
    ecommerce: 'متجر إلكتروني',
    restaurant: 'مطعم / كافيه',
    services: 'خدمات',
    saas: 'SaaS / تطبيق',
    trading: 'تجارة عامة',
    realEstate: 'عقار',
    otherProject: 'مشروع آخر',
    feasibilityHint: 'دراسة جدوى تشمل السوق، التكاليف، المنافسين، التراخيص، والمخاطر.',
    financialHint: 'نموذج مالي يتضمن الإيرادات، المصاريف، التدفق النقدي، ونقطة التعادل.',
    tasksHint: 'لوحة مهام وخط زمني لتنفيذ المشروع.',
    documentsHint: 'خزنة مستندات للعقود والتراخيص والفواتير.',
    kpisHint: 'مؤشرات أداء المشروع والربحية والتقدم.',
    aiHint: 'مستشار ذكي يقرأ بيانات مشروعك ويقترح الخطوات القادمة.',
  },
  en: {
    workspace: 'Project Workspace',
    projectName: 'Project name',
    projectType: 'Project type',
    status: 'Status',
    capital: 'Capital',
    financialTarget: 'Financial target',
    startDate: 'Start date',
    endDate: 'End date',
    editProject: 'Edit Project',
    addExpense: 'Add Project Expense',
    addIncome: 'Add Project Income',
    analyzeProject: 'Analyze Project',
    back: 'Back to My Projects',
    signIn: 'Sign in to view your project details.',
    notFound: 'Project not found.',
    overview: 'Overview',
    feasibility: 'Feasibility',
    financial: 'Financial Model',
    tasks: 'Tasks',
    documents: 'Documents',
    kpis: 'KPIs',
    ai: 'AI Advisor',
    comingSoon: 'This section will be activated in the next phase.',
    projectSummary: 'Project Summary',
    financialSnapshot: 'Financial Snapshot',
    timelineSnapshot: 'Timeline Snapshot',
    riskSnapshot: 'Risk Snapshot',
    quickActions: 'Quick Actions',
    description: 'Description',
    priority: 'Priority',
    currentPhase: 'Current phase',
    totalIncome: 'Total project income',
    totalExpenses: 'Total project expenses',
    netResult: 'Net result',
    remainingBudget: 'Remaining budget',
    targetProgress: 'Progress toward target',
    daysRemaining: 'Days remaining',
    duration: 'Project duration',
    noDate: 'Not set',
    noData: 'Not enough data',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    riskLowText: 'Current indicators look stable for this project.',
    riskMediumText: 'This project needs regular financial and operational review.',
    riskHighText: 'This project needs urgent risk and budget review.',
    addTask: 'Add task',
    generateFeasibility: 'Generate feasibility',
    createFinancialModel: 'Create financial model',
    idea: 'Idea',
    study: 'Study',
    setup: 'Setup',
    launch: 'Launch',
    growth: 'Growth',
    paused: 'Paused',
    completed: 'Completed',
    ecommerce: 'E-commerce',
    restaurant: 'Restaurant / Cafe',
    services: 'Services',
    saas: 'SaaS / App',
    trading: 'General Trading',
    realEstate: 'Real Estate',
    otherProject: 'Other Project',
    feasibilityHint: 'A feasibility study covering market, costs, competitors, licenses, and risks.',
    financialHint: 'A financial model covering revenue, expenses, cash flow, and break-even point.',
    tasksHint: 'A task board and timeline for project execution.',
    documentsHint: 'A document vault for contracts, licenses, and invoices.',
    kpisHint: 'Project performance, profitability, and progress KPIs.',
    aiHint: 'An intelligent advisor that reads your project data and suggests next steps.',
  },
  fr: {
    workspace: 'Espace projet',
    projectName: 'Nom du projet',
    projectType: 'Type de projet',
    status: 'Statut',
    capital: 'Capital',
    financialTarget: 'Objectif financier',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    editProject: 'Modifier le projet',
    addExpense: 'Ajouter une dépense',
    addIncome: 'Ajouter un revenu',
    analyzeProject: 'Analyser le projet',
    back: 'Retour à mes projets',
    signIn: 'Connectez-vous pour voir les détails de vos projets.',
    notFound: 'Projet introuvable.',
    overview: 'Vue d’ensemble',
    feasibility: 'Faisabilité',
    financial: 'Modèle financier',
    tasks: 'Tâches',
    documents: 'Documents',
    kpis: 'KPI',
    ai: 'Conseiller IA',
    comingSoon: 'Cette section sera activée dans la prochaine phase.',
    projectSummary: 'Résumé du projet',
    financialSnapshot: 'Aperçu financier',
    timelineSnapshot: 'Aperçu du calendrier',
    riskSnapshot: 'Aperçu des risques',
    quickActions: 'Actions rapides',
    description: 'Description',
    priority: 'Priorité',
    currentPhase: 'Phase actuelle',
    totalIncome: 'Revenus du projet',
    totalExpenses: 'Dépenses du projet',
    netResult: 'Résultat net',
    remainingBudget: 'Budget restant',
    targetProgress: 'Progression vers l’objectif',
    daysRemaining: 'Jours restants',
    duration: 'Durée du projet',
    noDate: 'Non défini',
    noData: 'Données insuffisantes',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    riskLowText: 'Les indicateurs actuels semblent stables pour ce projet.',
    riskMediumText: 'Ce projet nécessite un suivi financier et opérationnel régulier.',
    riskHighText: 'Ce projet nécessite une revue urgente des risques et du budget.',
    addTask: 'Ajouter une tâche',
    generateFeasibility: 'Créer une faisabilité',
    createFinancialModel: 'Créer un modèle financier',
    idea: 'Idée',
    study: 'Étude',
    setup: 'Mise en place',
    launch: 'Lancement',
    growth: 'Croissance',
    paused: 'En pause',
    completed: 'Terminé',
    ecommerce: 'E-commerce',
    restaurant: 'Restaurant / Café',
    services: 'Services',
    saas: 'SaaS / Application',
    trading: 'Commerce général',
    realEstate: 'Immobilier',
    otherProject: 'Autre projet',
    feasibilityHint: 'Une étude couvrant le marché, les coûts, les concurrents, les licences et les risques.',
    financialHint: 'Un modèle financier couvrant les revenus, les dépenses, la trésorerie et le seuil de rentabilité.',
    tasksHint: 'Un tableau de tâches et un calendrier pour exécuter le projet.',
    documentsHint: 'Un coffre de documents pour les contrats, licences et factures.',
    kpisHint: 'Indicateurs de performance, rentabilité et progression du projet.',
    aiHint: 'Un conseiller intelligent qui lit vos données et suggère les prochaines étapes.',
  },
} as const;

const tabs: Array<{ id: TabId; icon: typeof FolderKanban; hintKey?: keyof typeof TEXT.ar }> = [
  { id: 'overview', icon: FolderKanban },
  { id: 'feasibility', icon: FileText, hintKey: 'feasibilityHint' },
  { id: 'financial', icon: BarChart3, hintKey: 'financialHint' },
  { id: 'tasks', icon: ClipboardList, hintKey: 'tasksHint' },
  { id: 'documents', icon: FileText, hintKey: 'documentsHint' },
  { id: 'kpis', icon: Gauge, hintKey: 'kpisHint' },
  { id: 'ai', icon: Bot, hintKey: 'aiHint' },
];

function parseNotes(value: ProjectRow['notes']) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toNum(value: unknown) {
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeStatus(raw: unknown): 'idea' | 'study' | 'setup' | 'launch' | 'growth' | 'paused' | 'completed' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (['completed', 'complete', 'مكتمل', 'terminé'].includes(value)) return 'completed';
  if (['paused', 'متوقف', 'en pause'].includes(value)) return 'paused';
  if (['growth', 'نمو', 'نشط', 'active'].includes(value)) return 'growth';
  if (['launch', 'إطلاق', 'launched'].includes(value)) return 'launch';
  if (['setup', 'تأسيس', 'قيد التنفيذ', 'in_progress', 'in progress'].includes(value)) return 'setup';
  if (['study', 'دراسة', 'planning'].includes(value)) return 'study';
  return 'idea';
}

function normalizeType(raw: unknown): 'ecommerce' | 'restaurant' | 'services' | 'saas' | 'trading' | 'realEstate' | 'otherProject' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return 'otherProject';
  if (value.includes('متجر') || value.includes('e-commerce') || value.includes('ecommerce')) return 'ecommerce';
  if (value.includes('مطعم') || value.includes('كاف') || value.includes('restaurant') || value.includes('cafe')) return 'restaurant';
  if (value.includes('خدمات') || value.includes('service')) return 'services';
  if (value.includes('saas') || value.includes('تطبيق') || value.includes('تقنية') || value.includes('برمج')) return 'saas';
  if (value.includes('تجارة') || value.includes('trading') || value.includes('توزيع')) return 'trading';
  if (value.includes('عقار') || value.includes('real estate')) return 'realEstate';
  return 'otherProject';
}

function riskCopyKey(risk: RiskLevel) {
  if (risk === 'high') return 'riskHighText';
  if (risk === 'medium') return 'riskMediumText';
  return 'riskLowText';
}

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? '');
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [savings, setSavings] = useState(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const dateLabel = useCallback((value?: string | null) => {
    const date = safeDate(value);
    return date ? date.toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') : tr.noDate;
  }, [lang, tr.noDate]);

  const loadProject = useCallback(async () => {
    if (!user || !id) return;
    setLoadingProject(true);
    const [projectRes, savingsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle(),
      supabase.from('savings_items').select('amount').eq('user_id', user.id),
    ]);
    setProject(projectRes.error ? null : (projectRes.data as ProjectRow | null));
    if (!savingsRes.error) {
      setSavings(((savingsRes.data ?? []) as SavingsRow[]).reduce((sum, row) => sum + toNum(row.amount), 0));
    }
    setLoadingProject(false);
  }, [id, user]);

  useEffect(() => {
    if (!loading && user) loadProject();
    if (!loading && !user) setLoadingProject(false);
  }, [loadProject, loading, user]);

  const model = useMemo(() => {
    const notes = parseNotes(project?.notes);
    const capital = toNum(notes.capital ?? notes.capital_amount ?? project?.budget);
    const monthlyIncome = toNum(notes.monthlyRevenue ?? notes.monthly_revenue ?? notes.total_income);
    const monthlyExpenses = toNum(notes.monthlyExpenses ?? notes.monthly_expenses ?? notes.total_expenses);
    const currentProfit = toNum(notes.currentProfit ?? notes.current_profit);
    const target = toNum(notes.target_amount ?? notes.targetAmount ?? notes.expectedProfit ?? notes.expected_profit);
    const net = monthlyIncome - monthlyExpenses + currentProfit;
    const remainingBudget = capital - monthlyExpenses;
    const progress = target > 0 ? Math.min(100, Math.max(0, (Math.max(currentProfit, monthlyIncome) / target) * 100)) : 0;
    const startDate = notes.startDate ?? notes.start_date ?? project?.created_at ?? null;
    const endDate = notes.endDate ?? notes.end_date ?? null;
    const start = safeDate(startDate);
    const end = safeDate(endDate);
    const today = new Date();
    const daysRemaining = end ? Math.ceil((end.getTime() - today.getTime()) / 86400000) : null;
    const duration = start && end ? Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : null;
    const progressRecord = typeof notes.progress === 'object' && notes.progress ? notes.progress : {};
    const phase = notes.current_phase || Object.entries(progressRecord).reverse().find(([, done]) => done)?.[0] || notes.startTimeline || project?.timeline || tr.noData;
    const statusKey = normalizeStatus(notes.status);
    const typeKey = normalizeType(notes.type);
    const overdue = daysRemaining !== null && daysRemaining < 0 && statusKey !== 'completed';
    const missingFinancial = capital <= 0 && monthlyIncome <= 0 && monthlyExpenses <= 0 && target <= 0;
    const expensesOverCapital = capital > 0 && monthlyExpenses > capital;
    const savingsPressure = savings > 0 && capital > savings;
    const riskScore = [overdue, expensesOverCapital, savingsPressure, missingFinancial].filter(Boolean).length;
    const risk: RiskLevel = riskScore >= 2 ? 'high' : riskScore === 1 ? 'medium' : 'low';
    return {
      notes,
      capital,
      monthlyIncome,
      monthlyExpenses,
      currentProfit,
      target,
      net,
      remainingBudget,
      progress,
      startDate,
      endDate,
      daysRemaining,
      duration,
      phase,
      statusKey,
      typeKey,
      risk,
      priority: notes.priority || (risk === 'high' ? tr.high : risk === 'medium' ? tr.medium : tr.low),
      description: notes.idea || notes.description || notes.notes || '',
    };
  }, [project, savings, tr.high, tr.low, tr.medium, tr.noData]);

  const tabLabel = (tab: TabId) => {
    if (tab === 'financial') return tr.financial;
    return tr[tab];
  };

  const projectTitle = project?.name || tr.projectName;
  const statusLabel = tr[model.statusKey];
  const typeLabel = tr[model.typeKey];
  const riskText = tr[riskCopyKey(model.risk)];

  const heroMetrics = [
    { label: tr.projectType, value: typeLabel },
    { label: tr.status, value: statusLabel },
    { label: tr.capital, value: money(model.capital) },
    { label: tr.financialTarget, value: model.target > 0 ? money(model.target) : tr.noData },
    { label: tr.startDate, value: dateLabel(model.startDate) },
    { label: tr.endDate, value: dateLabel(model.endDate) },
  ];

  if (loading || loadingProject) {
    return (
      <div className="project-workspace" dir={dir} style={{ minHeight: '100vh', background: '#F5F1E8', color: '#2B1A0F', fontFamily: 'Tajawal,Arial,sans-serif' }}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <div style={{ borderRadius: '20px', background: '#FFFDF8', border: '1px solid rgba(186,117,23,.16)', padding: '24px', color: '#3D2914', fontWeight: 900 }}>{tr.workspace}</div>
        </DashboardPageShell>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="project-workspace" dir={dir} style={{ minHeight: '100vh', background: '#F5F1E8', color: '#2B1A0F', fontFamily: 'Tajawal,Arial,sans-serif' }}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.signIn} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-workspace" dir={dir} style={{ minHeight: '100vh', background: '#F5F1E8', color: '#2B1A0F', fontFamily: 'Tajawal,Arial,sans-serif' }}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.notFound} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div className="project-workspace" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="workspace-content">
        <section className="workspace-hero">
          <div className="hero-copy">
            <Link href="/projects" className="back-link"><ArrowLeft size={16} /> {tr.back}</Link>
            <span>{tr.workspace}</span>
            <h1>{project.emoji || '🚀'} {projectTitle}</h1>
            <p>{model.description || tr.projectSummary}</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => router.push('/projects')}><Pencil size={16} /> {tr.editProject}</button>
            <button type="button" onClick={() => router.push('/expenses/add')}><Plus size={16} /> {tr.addExpense}</button>
            <button type="button" onClick={() => router.push('/income/add')}><Plus size={16} /> {tr.addIncome}</button>
            <button type="button" onClick={() => setActiveTab('ai')}><Bot size={16} /> {tr.analyzeProject}</button>
            <LanguageSwitcher variant="dark" compact />
          </div>
          <div className="hero-metrics">
            {heroMetrics.map(item => (
              <div key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <nav className="workspace-tabs" role="tablist" aria-label={tr.workspace}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={event => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  const index = tabs.findIndex(item => item.id === activeTab);
                  const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
                  setActiveTab(tabs[(next + tabs.length) % tabs.length].id);
                }}
              >
                <Icon size={16} />
                {tabLabel(tab.id)}
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' ? (
          <section className="overview-grid">
            <article className="warm-card span-6">
              <CardTitle icon={<FolderKanban size={20} />} title={tr.projectSummary} />
              <dl className="details-list">
                <div><dt>{tr.projectName}</dt><dd>{projectTitle}</dd></div>
                <div><dt>{tr.description}</dt><dd>{model.description || tr.noData}</dd></div>
                <div><dt>{tr.projectType}</dt><dd>{typeLabel}</dd></div>
                <div><dt>{tr.status}</dt><dd><span className={`badge ${model.statusKey}`}>{statusLabel}</span></dd></div>
                <div><dt>{tr.priority}</dt><dd>{model.priority}</dd></div>
                <div><dt>{tr.currentPhase}</dt><dd>{String(model.phase)}</dd></div>
              </dl>
            </article>

            <article className="warm-card span-6">
              <CardTitle icon={<Coins size={20} />} title={tr.financialSnapshot} />
              <div className="metric-grid">
                <Metric label={tr.capital} value={money(model.capital)} />
                <Metric label={tr.totalIncome} value={model.monthlyIncome > 0 ? money(model.monthlyIncome) : tr.noData} />
                <Metric label={tr.totalExpenses} value={model.monthlyExpenses > 0 ? money(model.monthlyExpenses) : tr.noData} />
                <Metric label={tr.netResult} value={money(model.net)} />
                <Metric label={tr.remainingBudget} value={money(model.remainingBudget)} />
                <Metric label={tr.targetProgress} value={`${model.progress.toFixed(0)}%`} />
              </div>
              <div className="progress-bar" aria-label={tr.targetProgress}>
                <span style={{ width: `${model.progress}%` }} />
              </div>
            </article>

            <article className="warm-card">
              <CardTitle icon={<CalendarDays size={20} />} title={tr.timelineSnapshot} />
              <div className="timeline-list">
                <Metric label={tr.startDate} value={dateLabel(model.startDate)} />
                <Metric label={tr.endDate} value={dateLabel(model.endDate)} />
                <Metric label={tr.daysRemaining} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
                <Metric label={tr.duration} value={model.duration === null ? tr.noData : `${model.duration}`} />
                <Metric label={tr.currentPhase} value={String(model.phase)} />
              </div>
            </article>

            <article className={`warm-card risk-card ${model.risk}`}>
              <CardTitle icon={<AlertTriangle size={20} />} title={tr.riskSnapshot} />
              <div className="risk-badge">{tr[model.risk]}</div>
              <p>{riskText}</p>
            </article>

            <article className="warm-card quick-card">
              <CardTitle icon={<CheckCircle2 size={20} />} title={tr.quickActions} />
              <div className="quick-grid">
                <button type="button" onClick={() => router.push('/expenses/add')}>{tr.addExpense}</button>
                <button type="button" onClick={() => router.push('/income/add')}>{tr.addIncome}</button>
                <button type="button" onClick={() => setActiveTab('tasks')}>{tr.addTask}</button>
                <button type="button" onClick={() => setActiveTab('feasibility')}>{tr.generateFeasibility}</button>
                <button type="button" onClick={() => setActiveTab('financial')}>{tr.createFinancialModel}</button>
              </div>
            </article>
          </section>
        ) : (
          <section className="placeholder-grid">
            {tabs.filter(tab => tab.id === activeTab).map(tab => {
              const Icon = tab.icon;
              const hint = tab.hintKey ? tr[tab.hintKey] : tr.comingSoon;
              return (
                <article className="warm-card placeholder-card" key={tab.id}>
                  <Icon size={34} />
                  <h2>{tabLabel(tab.id)}</h2>
                  <p>{hint}</p>
                  <span>{tr.comingSoon}</span>
                </article>
              );
            })}
          </section>
        )}
      </DashboardPageShell>

      <style jsx>{`
        .project-workspace{min-height:100vh;background:#F5F1E8;color:#2B1A0F;font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}.workspace-content{display:grid;gap:18px}.workspace-hero{position:relative;overflow:hidden;border-radius:24px;padding:26px;background:radial-gradient(circle at 14% 10%,rgba(250,199,117,.26),transparent 30%),linear-gradient(135deg,#1A0F05,#2B1A0F 50%,#8A5514 138%);color:#FFFDF8;box-shadow:0 22px 55px rgba(61,41,20,.18);display:grid;gap:20px}.hero-copy span,.back-link{color:#FAC775;font-size:12px;font-weight:900}.back-link{display:inline-flex;align-items:center;gap:7px;text-decoration:none;margin-bottom:10px}.hero-copy h1{margin:8px 0;font-size:clamp(30px,5vw,48px);font-weight:950;line-height:1.08}.hero-copy p{margin:0;color:rgba(255,253,248,.76);line-height:1.8;max-width:820px}.hero-actions{display:flex;flex-wrap:wrap;gap:10px}.hero-actions button{min-height:42px;border-radius:13px;border:1px solid rgba(250,199,117,.28);background:rgba(20,12,6,.48);color:#FFFDF8;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.hero-actions button:first-child{background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407}.hero-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.hero-metrics div{border:1px solid rgba(250,199,117,.18);background:rgba(255,253,248,.08);border-radius:16px;padding:12px;min-width:0}.hero-metrics small{display:block;color:#FAC775;font-weight:900}.hero-metrics strong{display:block;margin-top:5px;color:#FFFDF8;overflow-wrap:anywhere}.workspace-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin}.workspace-tabs button{flex:0 0 auto;min-height:42px;border:1px solid rgba(186,117,23,.18);border-radius:999px;background:#FFFDF8;color:#5B4332;padding:0 14px;display:flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.workspace-tabs button.active,.workspace-tabs button:focus-visible{background:#3D2914;color:#FAC775;outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.overview-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.warm-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(61,41,20,.07);min-width:0}.span-6{grid-column:span 6}.card-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.card-title h2{margin:0;color:#3D2914;font-size:19px}.card-title svg{color:#BA7517}.details-list{display:grid;gap:10px;margin:0}.details-list div{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(0,1fr);gap:12px;border-bottom:1px solid rgba(186,117,23,.1);padding-bottom:10px}.details-list dt,.metric small{color:#7A6A55;font-weight:900}.details-list dd{margin:0;color:#2B1A0F;font-weight:900;overflow-wrap:anywhere}.badge{display:inline-flex;border-radius:999px;background:#FAEEDA;color:#854F0B;padding:5px 10px;font-size:12px}.badge.completed{background:#EAF3DE;color:#27500A}.badge.paused{background:#FCEBEB;color:#791F1F}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.metric,.timeline-list .metric{border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:12px;min-width:0}.metric strong{display:block;margin-top:6px;color:#2B1A0F;font-size:18px;overflow-wrap:anywhere}.progress-bar{height:10px;border-radius:999px;background:#FAEEDA;overflow:hidden;margin-top:14px}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#FAC775,#BA7517)}.timeline-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.risk-card,.quick-card{grid-column:span 6}.risk-badge{display:inline-flex;border-radius:999px;padding:8px 12px;font-weight:950;margin-bottom:10px}.risk-card.low .risk-badge{background:#EAF3DE;color:#27500A}.risk-card.medium .risk-badge{background:#FFF4DE;color:#9A5E0D}.risk-card.high .risk-badge{background:#FCEBEB;color:#791F1F}.risk-card p{margin:0;color:#5B4332;line-height:1.7}.quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quick-grid button{min-height:44px;border:1px solid rgba(186,117,23,.18);border-radius:13px;background:#FFF8EA;color:#3D2914;font-weight:900;font-family:inherit;cursor:pointer}.quick-grid button:hover,.quick-grid button:focus-visible{background:#FAEEDA;outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.14)}.placeholder-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.placeholder-card{min-height:280px;display:grid;place-items:center;text-align:center;align-content:center}.placeholder-card svg{color:#BA7517}.placeholder-card h2{margin:12px 0 6px;color:#3D2914}.placeholder-card p{margin:0;max-width:620px;color:#5B4332;line-height:1.8}.placeholder-card span{margin-top:14px;border-radius:999px;background:#FAEEDA;color:#854F0B;padding:7px 12px;font-weight:900}.state-card{border-radius:20px;background:#FFFDF8;border:1px solid rgba(186,117,23,.16);padding:24px;color:#3D2914;font-weight:900}.empty-state{min-height:360px;display:grid;place-items:center;text-align:center}.empty-state article{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:22px;padding:28px;box-shadow:0 14px 34px rgba(61,41,20,.07)}.empty-state button{margin-top:16px;min-height:42px;border:0;border-radius:13px;background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407;padding:0 16px;font-weight:900;font-family:inherit;cursor:pointer}@media(max-width:1180px){.hero-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.span-6,.risk-card,.quick-card{grid-column:1 / -1}}@media(max-width:760px){.workspace-hero{padding:22px}.hero-actions{display:grid;grid-template-columns:1fr}.hero-actions button{width:100%;justify-content:center}.hero-metrics,.metric-grid,.timeline-list,.quick-grid{grid-template-columns:1fr}.details-list div{grid-template-columns:1fr}.warm-card{padding:16px}.overview-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

function CardTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="card-title"><h2>{title}</h2>{icon}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
}

function EmptyState({ title, button, onClick }: { title: string; button: string; onClick: () => void }) {
  return (
    <div style={{ minHeight: '360px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <article style={{ background: '#FFFDF8', border: '1px solid rgba(186,117,23,.16)', borderRadius: '22px', padding: '28px', boxShadow: '0 14px 34px rgba(61,41,20,.07)' }}>
        <FolderKanban size={42} color="#BA7517" />
        <h1 style={{ margin: '14px 0 0', color: '#3D2914', fontSize: '22px' }}>{title}</h1>
        <button type="button" onClick={onClick} style={{ marginTop: '16px', minHeight: '42px', border: 0, borderRadius: '13px', background: 'linear-gradient(135deg,#FAC775,#EF9F27)', color: '#251407', padding: '0 16px', fontWeight: 900, fontFamily: 'inherit', cursor: 'pointer' }}>{button}</button>
      </article>
    </div>
  );
}

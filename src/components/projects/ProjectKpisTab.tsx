'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, ClipboardList, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { normalizeDigits } from '@/lib/locale';
import type { ProjectMilestoneRow, ProjectTaskRow } from './ProjectTasksTab';

type Lang = 'ar' | 'en' | 'fr';
export type ProjectKpiStatus = 'strong' | 'good' | 'needs_review' | 'high_risk' | 'insufficient';
export type ProjectRiskCode =
  | 'financial_model_missing'
  | 'feasibility_incomplete'
  | 'overdue_tasks'
  | 'no_documents'
  | 'project_end_passed'
  | 'expenses_exceed_budget'
  | 'negative_cash'
  | 'payback_too_long'
  | 'behind_schedule';

export type ProjectKpiSummary = {
  score: number | null;
  status: ProjectKpiStatus;
  topRiskCode: ProjectRiskCode | null;
  taskProgress: number | null;
  lateTasks: number;
};

export type ProjectFinancialModelKpiRow = {
  id?: string;
  assumptions: Record<string, unknown> | null;
  revenue_streams: unknown[] | null;
  cost_items: unknown[] | null;
  scenarios?: Record<string, unknown> | null;
  forecast: Array<Record<string, unknown>> | null;
  kpis: Record<string, unknown> | null;
};

export type ProjectFeasibilityKpiRow = {
  id?: string;
  feasibility_score?: string | number | null;
  feasibility_status?: string | null;
  market_data?: Record<string, unknown> | null;
  technical_data?: Record<string, unknown> | null;
  financial_data?: Record<string, unknown> | null;
  legal_data?: Record<string, unknown> | null;
};

export type ProjectKpiProject = {
  id?: string;
  budget?: string | number | null;
  notes?: Record<string, unknown> | string | null;
  timeline?: string | null;
  created_at?: string | null;
};

type ActualExpenseRow = {
  id: string;
  amount: string | number | null;
  project_id?: string | null;
  expense_date?: string | null;
  enhanced?: Record<string, unknown> | null;
  created_at?: string | null;
};

type ActualIncomeRow = {
  id: string;
  amount: string | number | null;
  project_id?: string | null;
  income_date?: string | null;
  created_at?: string | null;
};

type FinancialKpis = {
  roi: number | null;
  paybackPeriod: number | null;
  breakEvenMonth: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  burnRate: number | null;
  runway: number | null;
  totalRevenue: number | null;
  totalProfit: number | null;
  totalCosts: number | null;
  negativeCashBalance: boolean;
};

const TEXT = {
  ar: {
    kpis: 'المؤشرات',
    projectHealthScore: 'درجة صحة المشروع',
    financialKpis: 'المؤشرات المالية',
    operationalKpis: 'المؤشرات التشغيلية',
    progressKpis: 'مؤشرات التقدم',
    actualVsPlanned: 'الفعلي مقابل المخطط',
    riskFlags: 'تنبيهات المخاطر',
    planningDisclaimer: 'هذا مؤشر تخطيطي داخلي وليس ضماناً لنجاح المشروع.',
    strong: 'قوي',
    good: 'جيد',
    needs_review: 'يحتاج مراجعة',
    high_risk: 'عالي المخاطر',
    insufficient: 'بيانات غير كافية',
    na: 'غير متاح',
    addFinancialModel: 'أضف النموذج المالي لعرض المؤشرات المالية.',
    insufficientData: 'بيانات غير كافية',
    roi: 'العائد على الاستثمار ROI',
    paybackPeriod: 'فترة الاسترداد',
    breakEvenMonth: 'نقطة التعادل',
    netMargin: 'هامش الربح الصافي',
    grossMargin: 'هامش الربح الإجمالي',
    burnRate: 'معدل الحرق',
    runway: 'مدة التشغيل المتبقية',
    totalProjectedRevenue: 'إجمالي الإيرادات المتوقعة',
    totalProjectedProfit: 'إجمالي الربح المتوقع',
    taskCompletionRate: 'معدل إنجاز المهام',
    overdueTasks: 'المهام المتأخرة',
    milestonesCompleted: 'المعالم المكتملة',
    upcomingDeadlines: 'المواعيد القادمة',
    documentsCount: 'عدد المستندات',
    openIssues: 'الملاحظات المفتوحة',
    taskProgress: 'تقدم المهام',
    milestoneProgress: 'تقدم المعالم',
    timelineProgress: 'تقدم الجدول الزمني',
    actualProgress: 'التقدم الفعلي',
    behindSchedule: 'التقدم الفعلي أقل من المخطط.',
    plannedBudget: 'الميزانية المخططة',
    actualCost: 'التكلفة الفعلية',
    plannedTimeline: 'الجدول المخطط',
    projectedRevenue: 'الإيرادات المتوقعة',
    actualIncome: 'الدخل الفعلي',
    projectedCosts: 'التكاليف المتوقعة',
    actualExpenses: 'المصاريف الفعلية',
    actualVsPlannedHint: 'اربط مصاريف ودخل المشروع لعرض مقارنة الفعلي بالمخطط.',
    financial_model_missing: 'النموذج المالي غير مكتمل',
    feasibility_incomplete: 'دراسة الجدوى غير مكتملة',
    overdue_tasks: 'يوجد مهام متأخرة',
    no_documents: 'لا توجد مستندات',
    project_end_passed: 'تاريخ نهاية المشروع تجاوز اليوم',
    expenses_exceed_budget: 'المصاريف تجاوزت الميزانية',
    negative_cash: 'التدفق النقدي المتوقع سلبي',
    payback_too_long: 'فترة الاسترداد طويلة',
    behind_schedule: 'التقدم الفعلي أقل من المخطط',
    noRiskFlags: 'لا توجد تنبيهات مخاطر حالياً.',
    healthFormula: 'الصحة = اكتمال النموذج المالي + الربح المتوقع + تقدم المهام + عدم وجود تأخير + درجة الجدوى + المستندات.',
  },
  en: {
    kpis: 'KPIs',
    projectHealthScore: 'Project Health Score',
    financialKpis: 'Financial KPIs',
    operationalKpis: 'Operational KPIs',
    progressKpis: 'Progress KPIs',
    actualVsPlanned: 'Actual vs Planned',
    riskFlags: 'Risk Flags',
    planningDisclaimer: 'This is a planning indicator, not a guarantee of business success.',
    strong: 'Strong',
    good: 'Good',
    needs_review: 'Needs Review',
    high_risk: 'High Risk',
    insufficient: 'Insufficient data',
    na: 'N/A',
    addFinancialModel: 'Add a financial model to view financial KPIs.',
    insufficientData: 'Insufficient data',
    roi: 'ROI',
    paybackPeriod: 'Payback Period',
    breakEvenMonth: 'Break-even Month',
    netMargin: 'Net Margin',
    grossMargin: 'Gross Margin',
    burnRate: 'Burn Rate',
    runway: 'Runway',
    totalProjectedRevenue: 'Total Projected Revenue',
    totalProjectedProfit: 'Total Projected Profit',
    taskCompletionRate: 'Task completion rate',
    overdueTasks: 'Overdue tasks',
    milestonesCompleted: 'Milestones completed',
    upcomingDeadlines: 'Upcoming deadlines',
    documentsCount: 'Documents count',
    openIssues: 'Open issues',
    taskProgress: 'Task progress',
    milestoneProgress: 'Milestone progress',
    timelineProgress: 'Timeline progress',
    actualProgress: 'Actual progress',
    behindSchedule: 'Actual progress is behind schedule.',
    plannedBudget: 'Planned budget',
    actualCost: 'Actual cost',
    plannedTimeline: 'Planned timeline',
    projectedRevenue: 'Projected revenue',
    actualIncome: 'Actual income',
    projectedCosts: 'Projected costs',
    actualExpenses: 'Actual expenses',
    actualVsPlannedHint: 'Link project income and expenses to view actual vs planned comparison.',
    financial_model_missing: 'Financial model missing',
    feasibility_incomplete: 'Feasibility study incomplete',
    overdue_tasks: 'Overdue tasks',
    no_documents: 'No documents uploaded',
    project_end_passed: 'Project end date passed',
    expenses_exceed_budget: 'Expenses exceed budget',
    negative_cash: 'Negative projected cash balance',
    payback_too_long: 'Payback period too long',
    behind_schedule: 'Actual progress is behind schedule',
    noRiskFlags: 'No current risk flags.',
    healthFormula: 'Health = financial model completeness + projected profit + task progress + no overdue tasks + feasibility score + documents.',
  },
  fr: {
    kpis: 'KPI',
    projectHealthScore: 'Score de santé du projet',
    financialKpis: 'KPI financiers',
    operationalKpis: 'KPI opérationnels',
    progressKpis: 'KPI de progression',
    actualVsPlanned: 'Réel vs prévu',
    riskFlags: 'Alertes de risque',
    planningDisclaimer: 'Il s’agit d’un indicateur de planification, pas d’une garantie de réussite.',
    strong: 'Fort',
    good: 'Bon',
    needs_review: 'À réviser',
    high_risk: 'Risque élevé',
    insufficient: 'Données insuffisantes',
    na: 'N/A',
    addFinancialModel: 'Ajoutez un modèle financier pour afficher les KPI financiers.',
    insufficientData: 'Données insuffisantes',
    roi: 'ROI',
    paybackPeriod: 'Période de récupération',
    breakEvenMonth: 'Mois du point mort',
    netMargin: 'Marge nette',
    grossMargin: 'Marge brute',
    burnRate: 'Taux de consommation',
    runway: 'Autonomie',
    totalProjectedRevenue: 'Revenus projetés totaux',
    totalProjectedProfit: 'Bénéfice projeté total',
    taskCompletionRate: 'Taux d’achèvement des tâches',
    overdueTasks: 'Tâches en retard',
    milestonesCompleted: 'Jalons terminés',
    upcomingDeadlines: 'Échéances à venir',
    documentsCount: 'Nombre de documents',
    openIssues: 'Points ouverts',
    taskProgress: 'Progression des tâches',
    milestoneProgress: 'Progression des jalons',
    timelineProgress: 'Progression du calendrier',
    actualProgress: 'Progression réelle',
    behindSchedule: 'La progression réelle est en retard sur le planning.',
    plannedBudget: 'Budget prévu',
    actualCost: 'Coût réel',
    plannedTimeline: 'Planning prévu',
    projectedRevenue: 'Revenus projetés',
    actualIncome: 'Revenus réels',
    projectedCosts: 'Coûts projetés',
    actualExpenses: 'Dépenses réelles',
    actualVsPlannedHint: 'Liez les revenus et dépenses du projet pour voir le réel vs prévu.',
    financial_model_missing: 'Modèle financier manquant',
    feasibility_incomplete: 'Étude de faisabilité incomplète',
    overdue_tasks: 'Tâches en retard',
    no_documents: 'Aucun document téléversé',
    project_end_passed: 'Date de fin du projet dépassée',
    expenses_exceed_budget: 'Les dépenses dépassent le budget',
    negative_cash: 'Solde de trésorerie projeté négatif',
    payback_too_long: 'Période de récupération trop longue',
    behind_schedule: 'Progression réelle en retard',
    noRiskFlags: 'Aucune alerte de risque actuellement.',
    healthFormula: 'Santé = complétude du modèle financier + profit projeté + progression des tâches + absence de retard + score de faisabilité + documents.',
  },
} as const;

type KpiTranslation = Record<keyof typeof TEXT.ar, string>;

export const emptyProjectKpiSummary: ProjectKpiSummary = {
  score: null,
  status: 'insufficient',
  topRiskCode: null,
  taskProgress: null,
  lateTasks: 0,
};

function toNum(value: unknown) {
  const number = Number(normalizeDigits(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function numOrNull(value: unknown) {
  const number = toNum(value);
  if (!Number.isFinite(number)) return null;
  return value === null || value === undefined || value === '' ? null : number;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
}

function safeDate(value?: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isTaskDone(task: ProjectTaskRow) {
  return String(task.status ?? '') === 'done';
}

function isTaskCancelled(task: ProjectTaskRow) {
  return String(task.status ?? '') === 'cancelled';
}

function isTaskLate(task: ProjectTaskRow) {
  if (isTaskDone(task) || isTaskCancelled(task)) return false;
  const due = safeDate(task.due_date);
  return !!due && due < todayStart();
}

function completedMilestone(milestone: ProjectMilestoneRow) {
  return String(milestone.status ?? '') === 'completed' || toNum(milestone.progress_percent) >= 100;
}

function taskProgress(tasks: ProjectTaskRow[]) {
  return tasks.length ? (tasks.filter(isTaskDone).length / tasks.length) * 100 : null;
}

function milestoneProgress(milestones: ProjectMilestoneRow[]) {
  return milestones.length ? (milestones.filter(completedMilestone).length / milestones.length) * 100 : null;
}

function projectDates(project: ProjectKpiProject | null | undefined) {
  const notes = parseRecord(project?.notes);
  return {
    start: safeDate(notes.startDate ?? notes.start_date ?? project?.created_at),
    end: safeDate(notes.endDate ?? notes.end_date),
    status: String(notes.status ?? ''),
    budget: toNum(notes.capital ?? notes.capital_amount ?? notes.budget ?? project?.budget),
  };
}

function timelineProgress(project: ProjectKpiProject | null | undefined) {
  const { start, end } = projectDates(project);
  if (!start || !end || end <= start) return null;
  const elapsed = todayStart().getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  return clampPercent((elapsed / total) * 100);
}

function getFinancialKpis(model: ProjectFinancialModelKpiRow | null | undefined): FinancialKpis {
  const kpis = parseRecord(model?.kpis);
  const forecast = arrayValue(model?.forecast);
  const totalRevenue = numOrNull(kpis.totalRevenue) ?? (forecast.length ? forecast.reduce((sum, row) => sum + toNum(row.revenue), 0) : null);
  const totalProfit = numOrNull(kpis.totalProfit) ?? (forecast.length ? forecast.reduce((sum, row) => sum + toNum(row.netProfit), 0) : null);
  const totalCosts = forecast.length ? forecast.reduce((sum, row) => sum + toNum(row.totalCosts), 0) : null;
  return {
    roi: numOrNull(kpis.roi),
    paybackPeriod: numOrNull(kpis.paybackPeriod),
    breakEvenMonth: numOrNull(kpis.breakEvenMonth),
    grossMargin: numOrNull(kpis.grossMargin),
    netMargin: numOrNull(kpis.netMargin),
    burnRate: numOrNull(kpis.burnRate),
    runway: numOrNull(kpis.runway),
    totalRevenue,
    totalProfit,
    totalCosts,
    negativeCashBalance: forecast.some(row => toNum(row.cashBalance) < 0),
  };
}

function hasFinancialModel(model: ProjectFinancialModelKpiRow | null | undefined) {
  if (!model) return false;
  const assumptions = Object.keys(parseRecord(model.assumptions)).length;
  const revenueStreams = Array.isArray(model.revenue_streams) ? model.revenue_streams.length : 0;
  const costItems = Array.isArray(model.cost_items) ? model.cost_items.length : 0;
  const forecast = Array.isArray(model.forecast) ? model.forecast.length : 0;
  const kpis = Object.keys(parseRecord(model.kpis)).length;
  return assumptions > 0 || revenueStreams > 0 || costItems > 0 || forecast > 0 || kpis > 0;
}

function feasibilityScore(study: ProjectFeasibilityKpiRow | null | undefined) {
  return study ? clampPercent(toNum(study.feasibility_score)) : null;
}

function feasibilityIncomplete(study: ProjectFeasibilityKpiRow | null | undefined) {
  if (!study) return true;
  return (feasibilityScore(study) ?? 0) < 50 || String(study.feasibility_status ?? '') === 'incomplete';
}

function actualProjectExpenseRows(rows: ActualExpenseRow[], projectId: string) {
  return rows.filter(row => {
    const enhanced = parseRecord(row.enhanced);
    const linkedProjectExpenseId = String(enhanced.project_expense_id ?? enhanced.projectExpenseId ?? '').trim();
    if (linkedProjectExpenseId) return false;
    return [enhanced.project_id, enhanced.projectId, parseRecord(enhanced.project).id, enhanced.linked_project_id].some(value => value === projectId);
  });
}

function buildRiskFlags({
  project,
  financialModel,
  feasibilityStudy,
  tasks,
  documentsCount,
  actualExpenses,
}: {
  project: ProjectKpiProject | null;
  financialModel: ProjectFinancialModelKpiRow | null;
  feasibilityStudy: ProjectFeasibilityKpiRow | null;
  tasks: ProjectTaskRow[];
  documentsCount: number;
  actualExpenses: number;
}) {
  const flags: ProjectRiskCode[] = [];
  const financial = getFinancialKpis(financialModel);
  const dates = projectDates(project);
  const endPassed = dates.end && dates.end < todayStart() && !['completed', 'مكتمل', 'terminé'].includes(dates.status.toLowerCase());

  if (!hasFinancialModel(financialModel)) flags.push('financial_model_missing');
  if (feasibilityIncomplete(feasibilityStudy)) flags.push('feasibility_incomplete');
  if (tasks.filter(isTaskLate).length > 0) flags.push('overdue_tasks');
  if (documentsCount === 0) flags.push('no_documents');
  if (endPassed) flags.push('project_end_passed');
  if (dates.budget > 0 && actualExpenses > dates.budget) flags.push('expenses_exceed_budget');
  if (financial.negativeCashBalance) flags.push('negative_cash');
  if ((financial.paybackPeriod ?? 0) > 36) flags.push('payback_too_long');

  const actualProgress = taskProgress(tasks);
  const plannedProgress = timelineProgress(project);
  if (actualProgress !== null && plannedProgress !== null && actualProgress + 15 < plannedProgress) flags.push('behind_schedule');

  return flags;
}

export function buildProjectKpiSummary({
  project,
  financialModel,
  feasibilityStudy,
  tasks,
  documentsCount,
  actualIncome = 0,
  actualExpenses = 0,
}: {
  project: ProjectKpiProject | null;
  financialModel: ProjectFinancialModelKpiRow | null;
  feasibilityStudy: ProjectFeasibilityKpiRow | null;
  tasks: ProjectTaskRow[];
  milestones?: ProjectMilestoneRow[];
  documentsCount: number;
  actualIncome?: number;
  actualExpenses?: number;
}): ProjectKpiSummary {
  const financial = getFinancialKpis(financialModel);
  const taskProgressValue = taskProgress(tasks);
  const feasibility = feasibilityScore(feasibilityStudy);
  const lateTasks = tasks.filter(isTaskLate).length;
  const score =
    (hasFinancialModel(financialModel) ? 20 : 0) +
    ((financial.totalProfit ?? 0) > 0 ? 20 : 0) +
    (taskProgressValue !== null ? (taskProgressValue / 100) * 20 : 0) +
    (tasks.length > 0 && lateTasks === 0 ? 15 : 0) +
    (feasibility !== null ? (feasibility / 100) * 15 : 0) +
    (documentsCount > 0 ? 10 : 0);
  const rounded = Math.round(clampPercent(score));
  const hasAnyData = hasFinancialModel(financialModel) || feasibility !== null || tasks.length > 0 || documentsCount > 0 || actualIncome > 0 || actualExpenses > 0;
  const status: ProjectKpiStatus = !hasAnyData
    ? 'insufficient'
    : rounded >= 80
      ? 'strong'
      : rounded >= 60
        ? 'good'
        : rounded >= 35
          ? 'needs_review'
          : 'high_risk';

  return {
    score: hasAnyData ? rounded : null,
    status,
    topRiskCode: buildRiskFlags({ project, financialModel, feasibilityStudy, tasks, documentsCount, actualExpenses })[0] ?? null,
    taskProgress: taskProgressValue === null ? null : Math.round(taskProgressValue),
    lateTasks,
  };
}

function getLocale(lang?: string): Lang {
  return lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar';
}

function uniqueDocumentCount(rows: any[] = []) {
  const grouped = new Map<string, any>();
  const timestamp = (row: any) => new Date(String(row?.updated_at ?? row?.uploaded_at ?? row?.created_at ?? '')).getTime() || 0;
  for (const row of rows) {
    const fileUrl = String(row?.file_url ?? '').trim().toLowerCase();
    const filePath = String(row?.file_path ?? '').trim().toLowerCase();
    const title = String(row?.title ?? '').trim().toLowerCase();
    const category = String(row?.category ?? '').trim().toLowerCase();
    const uploadedDate = String(row?.uploaded_at ?? row?.created_at ?? '').slice(0, 10);
    const key = fileUrl
      ? `file-url|${fileUrl}`
      : filePath
        ? `file-path|${filePath}`
        : title && category
          ? `title-category-project|${title}|${category}`
          : title
            ? `title-project-date|${title}|${uploadedDate}`
            : `record|${row?.id ?? uploadedDate}`;
    const current = grouped.get(key);
    if (!current || timestamp(row) >= timestamp(current)) grouped.set(key, row);
  }
  return grouped.size;
}

export function ProjectKpisTab({
  userId,
  projectId,
  project,
  lang = 'ar',
  currency = 'KWD',
  onSummaryChange,
}: {
  userId: string;
  projectId: string;
  project: ProjectKpiProject | null;
  lang?: string;
  currency?: string;
  onSummaryChange?: (summary: ProjectKpiSummary) => void;
}) {
  const locale = getLocale(lang);
  const t = TEXT[locale] as KpiTranslation;
  const [loading, setLoading] = useState(true);
  const [financialModel, setFinancialModel] = useState<ProjectFinancialModelKpiRow | null>(null);
  const [feasibilityStudy, setFeasibilityStudy] = useState<ProjectFeasibilityKpiRow | null>(null);
  const [tasks, setTasks] = useState<ProjectTaskRow[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestoneRow[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [linkedIncome, setLinkedIncome] = useState<ActualIncomeRow[]>([]);
  const [linkedExpenses, setLinkedExpenses] = useState<ActualExpenseRow[]>([]);

  const money = useCallback((amount: number | null) => {
    if (amount === null || !Number.isFinite(amount)) return t.na;
    return formatMoney(amount, currency || 'KWD', locale);
  }, [currency, locale, t.na]);

  const percent = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}%`;
  }, [locale, t.na]);

  const monthLabel = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value);
  }, [locale, t.na]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [financialRes, feasibilityRes, taskRes, milestoneRes, documentRes, projectIncomeRes, projectExpenseRes, legacyExpenseRes] = await Promise.all([
      supabase.from('project_financial_models').select('*').eq('user_id', userId).eq('project_id', projectId).maybeSingle(),
      supabase.from('project_feasibility_studies').select('*').eq('user_id', userId).eq('project_id', projectId).maybeSingle(),
      supabase.from('project_tasks').select('*').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_milestones').select('*').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_documents').select('id,title,category,file_url,file_path,uploaded_at,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_income').select('id, amount, currency, project_id, income_date, created_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_expenses').select('id, amount, currency, project_id, expense_date, created_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('expense_items').select('id, amount, currency, enhanced, created_at').eq('user_id', userId),
    ]);
    setFinancialModel(financialRes.error ? null : financialRes.data as ProjectFinancialModelKpiRow | null);
    setFeasibilityStudy(feasibilityRes.error ? null : feasibilityRes.data as ProjectFeasibilityKpiRow | null);
    setTasks(taskRes.error ? [] : (taskRes.data ?? []) as ProjectTaskRow[]);
    setMilestones(milestoneRes.error ? [] : (milestoneRes.data ?? []) as ProjectMilestoneRow[]);
    setDocumentsCount(documentRes.error ? 0 : uniqueDocumentCount(documentRes.data ?? []));
    setLinkedIncome(projectIncomeRes.error ? [] : (projectIncomeRes.data ?? []) as ActualIncomeRow[]);
    const projectExpenseRows = projectExpenseRes.error ? [] : (projectExpenseRes.data ?? []) as ActualExpenseRow[];
    const legacyExpenseRows = legacyExpenseRes.error ? [] : actualProjectExpenseRows((legacyExpenseRes.data ?? []) as ActualExpenseRow[], projectId);
    setLinkedExpenses([...projectExpenseRows, ...legacyExpenseRows]);
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const actualIncomeTotal = useMemo(() => linkedIncome.reduce((sum, row) => sum + toNum(row.amount), 0), [linkedIncome]);
  const actualExpenseTotal = useMemo(() => linkedExpenses.reduce((sum, row) => sum + toNum(row.amount), 0), [linkedExpenses]);
  const financial = useMemo(() => getFinancialKpis(financialModel), [financialModel]);
  const summary = useMemo(() => buildProjectKpiSummary({
    project,
    financialModel,
    feasibilityStudy,
    tasks,
    milestones,
    documentsCount,
    actualIncome: actualIncomeTotal,
    actualExpenses: actualExpenseTotal,
  }), [actualExpenseTotal, actualIncomeTotal, documentsCount, feasibilityStudy, financialModel, milestones, project, tasks]);
  const riskFlags = useMemo(() => buildRiskFlags({
    project,
    financialModel,
    feasibilityStudy,
    tasks,
    documentsCount,
    actualExpenses: actualExpenseTotal,
  }), [actualExpenseTotal, documentsCount, feasibilityStudy, financialModel, project, tasks]);
  const taskProgressValue = useMemo(() => taskProgress(tasks), [tasks]);
  const milestoneProgressValue = useMemo(() => milestoneProgress(milestones), [milestones]);
  const timelineProgressValue = useMemo(() => timelineProgress(project), [project]);
  const actualProgressValue = taskProgressValue ?? milestoneProgressValue;
  const behindSchedule = actualProgressValue !== null && timelineProgressValue !== null && actualProgressValue + 15 < timelineProgressValue;
  const completedMilestones = milestones.filter(completedMilestone).length;
  const upcomingDeadlines = tasks.filter(task => {
    const due = safeDate(task.due_date);
    return due && due >= todayStart() && !isTaskDone(task) && !isTaskCancelled(task);
  }).length;
  const plannedBudget = projectDates(project).budget;
  const hasActualIncomeData = linkedIncome.length > 0;
  const hasActualExpenseData = linkedExpenses.length > 0;
  const hasAnyKpiData = hasFinancialModel(financialModel) || tasks.length > 0 || milestones.length > 0 || documentsCount > 0 || feasibilityScore(feasibilityStudy) !== null || hasActualIncomeData || hasActualExpenseData;

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [onSummaryChange, summary]);

  return (
    <section className="project-kpis-tab" role="tabpanel" aria-label={t.kpis}>
      <article className={`kpi-health-card ${summary.status}`}>
        <div
          className="health-score-ring"
          role="img"
          aria-label={`${t.projectHealthScore}: ${summary.score ?? 0}/100`}
        >
          <strong>{summary.score === null ? t.na : summary.score}</strong>
          <span>/100</span>
        </div>
        <div className="health-copy">
          <span>{t.projectHealthScore}</span>
          <h2>{t[summary.status]}</h2>
          <p>{t.planningDisclaimer}</p>
          <small>{t.healthFormula}</small>
        </div>
        {loading ? <span className="health-loading">{t.kpis}</span> : null}
      </article>

      {!hasAnyKpiData && !loading ? <div className="kpi-empty-note">{t.insufficientData}</div> : null}

      <div className="kpi-section-grid">
        <article className="kpi-card financial-kpi-card">
          <SectionTitle title={t.financialKpis} icon={<BarChart3 size={20} />} />
          {!hasFinancialModel(financialModel) ? <p className="kpi-hint">{t.addFinancialModel}</p> : null}
          <div className="kpi-metric-grid">
            <KpiMetric label={t.roi} value={percent(financial.roi)} />
            <KpiMetric label={t.paybackPeriod} value={monthLabel(financial.paybackPeriod)} />
            <KpiMetric label={t.breakEvenMonth} value={monthLabel(financial.breakEvenMonth)} />
            <KpiMetric label={t.netMargin} value={percent(financial.netMargin)} />
            <KpiMetric label={t.grossMargin} value={percent(financial.grossMargin)} />
            <KpiMetric label={t.burnRate} value={money(financial.burnRate)} />
            <KpiMetric label={t.runway} value={monthLabel(financial.runway)} />
            <KpiMetric label={t.totalProjectedRevenue} value={money(financial.totalRevenue)} />
            <KpiMetric label={t.totalProjectedProfit} value={money(financial.totalProfit)} />
          </div>
        </article>

        <article className="kpi-card">
          <SectionTitle title={t.operationalKpis} icon={<ClipboardList size={20} />} />
          <div className="kpi-metric-grid compact">
            <KpiMetric label={t.taskCompletionRate} value={percent(taskProgressValue)} />
            <KpiMetric label={t.overdueTasks} value={String(tasks.filter(isTaskLate).length)} />
            <KpiMetric label={t.milestonesCompleted} value={milestones.length ? `${completedMilestones}/${milestones.length}` : t.na} />
            <KpiMetric label={t.upcomingDeadlines} value={String(upcomingDeadlines)} />
            <KpiMetric label={t.documentsCount} value={String(documentsCount)} />
            <KpiMetric label={t.openIssues} value={t.na} />
          </div>
        </article>
      </div>

      <div className="kpi-section-grid">
        <article className="kpi-card">
          <SectionTitle title={t.progressKpis} icon={<Activity size={20} />} />
          <ProgressRow label={t.taskProgress} value={taskProgressValue} fallback={t.na} />
          <ProgressRow label={t.milestoneProgress} value={milestoneProgressValue} fallback={t.na} />
          <ProgressRow label={t.timelineProgress} value={timelineProgressValue} fallback={t.na} />
          <ProgressRow label={t.actualProgress} value={actualProgressValue} fallback={t.na} />
          {behindSchedule ? <div className="kpi-warning"><AlertTriangle size={16} />{t.behindSchedule}</div> : null}
        </article>

        <article className="kpi-card">
          <SectionTitle title={t.actualVsPlanned} icon={<Target size={20} />} />
          {!hasActualExpenseData && !hasActualIncomeData ? <p className="kpi-hint">{t.actualVsPlannedHint}</p> : null}
          <div className="actual-grid">
            <ComparisonItem label={t.plannedBudget} planned={money(plannedBudget > 0 ? plannedBudget : null)} actual={hasActualExpenseData ? money(actualExpenseTotal) : t.na} actualLabel={t.actualCost} />
            <ComparisonItem label={t.plannedTimeline} planned={percent(timelineProgressValue)} actual={percent(actualProgressValue)} actualLabel={t.actualProgress} />
            <ComparisonItem label={t.projectedRevenue} planned={money(financial.totalRevenue)} actual={hasActualIncomeData ? money(actualIncomeTotal) : t.na} actualLabel={t.actualIncome} />
            <ComparisonItem label={t.projectedCosts} planned={money(financial.totalCosts)} actual={hasActualExpenseData ? money(actualExpenseTotal) : t.na} actualLabel={t.actualExpenses} />
          </div>
        </article>
      </div>

      <article className="kpi-card">
        <SectionTitle title={t.riskFlags} icon={<AlertTriangle size={20} />} />
        {riskFlags.length === 0 ? <p className="kpi-hint">{t.noRiskFlags}</p> : null}
        <div className="risk-flag-list">
          {riskFlags.map(flag => (
            <span className="risk-flag" key={flag}>{t[flag]}</span>
          ))}
        </div>
      </article>

      <style jsx global>{`
        .project-kpis-tab{display:grid;gap:16px;min-width:0}.kpi-health-card,.kpi-card,.kpi-empty-note{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:18px;box-shadow:var(--shadow-card);min-width:0}.kpi-health-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;background:var(--primary-soft);color:var(--foreground)}.health-score-ring{width:118px;height:118px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary-soft);border:3px solid var(--primary);box-shadow:var(--shadow-xs)}.health-score-ring strong{font-family:var(--font-data);font-size:30px;color:var(--foreground)}.health-score-ring span{font-size:12px;color:var(--foreground-muted);font-weight:600}.health-copy span,.health-loading{color:var(--foreground-muted);font-weight:600;font-size:12px}.health-copy h2{margin:6px 0;color:var(--foreground);font-size:28px}.health-copy p{margin:0;color:var(--foreground-muted);line-height:1.7}.health-copy small{display:block;margin-top:8px;color:var(--foreground-muted);line-height:1.6}.kpi-empty-note,.kpi-hint{color:var(--foreground-muted);line-height:1.7;font-weight:600}.kpi-section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.financial-kpi-card{grid-column:1 / -1}.kpi-section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.kpi-section-title h2{margin:0;color:var(--foreground);font-size:19px}.kpi-section-title svg{color:var(--primary)}.kpi-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kpi-metric-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi-metric,.comparison-item{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;min-width:0}.kpi-metric small,.comparison-item small{display:block;color:var(--foreground-muted);font-weight:600}.kpi-metric strong,.comparison-item strong{display:block;margin-top:6px;color:var(--foreground);font-family:var(--font-data);font-size:18px;overflow-wrap:anywhere}.progress-row{display:grid;gap:8px;margin-top:12px}.progress-label{display:flex;justify-content:space-between;gap:12px;color:var(--foreground-muted);font-weight:600}.progress-track{height:11px;border-radius:var(--radius-pill);background:var(--primary-soft);overflow:hidden}.progress-track span{display:block;height:100%;border-radius:var(--radius-pill);background:var(--primary)}.kpi-warning{margin-top:14px;border:1px solid var(--danger-soft);background:var(--danger-soft);color:var(--danger);border-radius:var(--radius-control);padding:11px 12px;font-weight:600;display:flex;align-items:center;gap:8px}.actual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.comparison-values{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.comparison-values div{border-radius:var(--radius-control);background:var(--surface);padding:9px}.risk-flag-list{display:flex;flex-wrap:wrap;gap:8px}.risk-flag{display:inline-flex;border-radius:var(--radius-pill);background:var(--danger-soft);color:var(--danger);border:1px solid var(--danger-soft);padding:7px 11px;font-size:12px;font-weight:600}.kpi-health-card.strong .health-score-ring{background:var(--success-soft);border-color:var(--success)}.kpi-health-card.good .health-score-ring{background:var(--primary-soft);border-color:var(--primary)}.kpi-health-card.needs_review .health-score-ring{background:var(--warning-soft);border-color:var(--warning)}.kpi-health-card.high_risk .health-score-ring{background:var(--danger-soft);border-color:var(--danger)}.kpi-health-card.insufficient .health-score-ring{background:var(--surface-muted);border-color:var(--foreground-muted)}@media(max-width:1180px){.kpi-section-grid{grid-template-columns:1fr}.kpi-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.kpi-health-card{grid-template-columns:1fr;text-align:start}.health-score-ring{width:102px;height:102px}.kpi-metric-grid,.kpi-metric-grid.compact,.actual-grid,.comparison-values{grid-template-columns:1fr}.kpi-card,.kpi-health-card{padding:16px}.risk-flag-list{display:grid}}
      `}</style>
    </section>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return <div className="kpi-section-title"><h2>{title}</h2>{icon}</div>;
}

function KpiMetric({ label, value }: { label: string; value: string }) {
  return <div className="kpi-metric"><small>{label}</small><strong>{value}</strong></div>;
}

function ProgressRow({ label, value, fallback }: { label: string; value: number | null; fallback: string }) {
  const percent = value === null ? 0 : clampPercent(value);
  return (
    <div className="progress-row">
      <div className="progress-label"><span>{label}</span><strong>{value === null ? fallback : `${Math.round(percent)}%`}</strong></div>
      <div className="progress-track" aria-label={label} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ComparisonItem({ label, planned, actual, actualLabel }: { label: string; planned: string; actual: string; actualLabel: string }) {
  return (
    <div className="comparison-item">
      <small>{label}</small>
      <div className="comparison-values">
        <div><small>{label}</small><strong>{planned}</strong></div>
        <div><small>{actualLabel}</small><strong>{actual}</strong></div>
      </div>
    </div>
  );
}

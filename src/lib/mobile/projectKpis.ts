import { toNum } from './projectModel';
export { toNum } from './projectModel';
import type { ProjectMilestoneRow, ProjectTaskRow } from './projectTaskTypes';
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

export type ActualExpenseRow = {
  id: string;
  amount: string | number | null;
  project_id?: string | null;
  expense_date?: string | null;
  enhanced?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type ActualIncomeRow = {
  id: string;
  amount: string | number | null;
  project_id?: string | null;
  income_date?: string | null;
  created_at?: string | null;
};

export type FinancialKpis = {
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

export const emptyProjectKpiSummary: ProjectKpiSummary = {
  score: null,
  status: 'insufficient',
  topRiskCode: null,
  taskProgress: null,
  lateTasks: 0,
};

export function numOrNull(value: unknown) {
  const number = toNum(value);
  if (!Number.isFinite(number)) return null;
  return value === null || value === undefined || value === '' ? null : number;
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function parseRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
}

export function safeDate(value?: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isTaskDone(task: ProjectTaskRow) {
  return String(task.status ?? '') === 'done';
}

export function isTaskCancelled(task: ProjectTaskRow) {
  return String(task.status ?? '') === 'cancelled';
}

export function isTaskLate(task: ProjectTaskRow) {
  if (isTaskDone(task) || isTaskCancelled(task)) return false;
  const due = safeDate(task.due_date);
  return !!due && due < todayStart();
}

export function completedMilestone(milestone: ProjectMilestoneRow) {
  return String(milestone.status ?? '') === 'completed' || toNum(milestone.progress_percent) >= 100;
}

export function taskProgress(tasks: ProjectTaskRow[]) {
  return tasks.length ? (tasks.filter(isTaskDone).length / tasks.length) * 100 : null;
}

export function milestoneProgress(milestones: ProjectMilestoneRow[]) {
  return milestones.length ? (milestones.filter(completedMilestone).length / milestones.length) * 100 : null;
}

export function projectDates(project: ProjectKpiProject | null | undefined) {
  const notes = parseRecord(project?.notes);
  return {
    start: safeDate(notes.startDate ?? notes.start_date ?? project?.created_at),
    end: safeDate(notes.endDate ?? notes.end_date),
    status: String(notes.status ?? ''),
    budget: toNum(notes.capital ?? notes.capital_amount ?? notes.budget ?? project?.budget),
  };
}

export function timelineProgress(project: ProjectKpiProject | null | undefined) {
  const { start, end } = projectDates(project);
  if (!start || !end || end <= start) return null;
  const elapsed = todayStart().getTime() - start.getTime();
  const total = end.getTime() - start.getTime();
  return clampPercent((elapsed / total) * 100);
}

export function getFinancialKpis(model: ProjectFinancialModelKpiRow | null | undefined): FinancialKpis {
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

export function hasFinancialModel(model: ProjectFinancialModelKpiRow | null | undefined) {
  if (!model) return false;
  const assumptions = Object.keys(parseRecord(model.assumptions)).length;
  const revenueStreams = Array.isArray(model.revenue_streams) ? model.revenue_streams.length : 0;
  const costItems = Array.isArray(model.cost_items) ? model.cost_items.length : 0;
  const forecast = Array.isArray(model.forecast) ? model.forecast.length : 0;
  const kpis = Object.keys(parseRecord(model.kpis)).length;
  return assumptions > 0 || revenueStreams > 0 || costItems > 0 || forecast > 0 || kpis > 0;
}

export function feasibilityScore(study: ProjectFeasibilityKpiRow | null | undefined) {
  return study ? clampPercent(toNum(study.feasibility_score)) : null;
}

export function feasibilityIncomplete(study: ProjectFeasibilityKpiRow | null | undefined) {
  if (!study) return true;
  return (feasibilityScore(study) ?? 0) < 50 || String(study.feasibility_status ?? '') === 'incomplete';
}

export function actualProjectExpenseRows(rows: ActualExpenseRow[], projectId: string) {
  return rows.filter(row => {
    const enhanced = parseRecord(row.enhanced);
    const linkedProjectExpenseId = String(enhanced.project_expense_id ?? enhanced.projectExpenseId ?? '').trim();
    if (linkedProjectExpenseId) return false;
    return [enhanced.project_id, enhanced.projectId, parseRecord(enhanced.project).id, enhanced.linked_project_id].some(value => value === projectId);
  });
}

export function buildRiskFlags({
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


export function uniqueDocumentCount(rows: Record<string,unknown>[] = []) {
  const grouped = new Map<string, Record<string,unknown>>();
  const timestamp = (row: Record<string,unknown>) => new Date(String(row?.updated_at ?? row?.uploaded_at ?? row?.created_at ?? '')).getTime() || 0;
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


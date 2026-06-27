// Lightweight types + empty constants used eagerly by /projects/[id] page.
// Extracted so the heavy ProjectKpisTab / ProjectTasksTab components can be
// loaded lazily via next/dynamic without forcing the whole tab module into
// the page's initial bundle.

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

export const emptyProjectKpiSummary: ProjectKpiSummary = {
  score: null,
  status: 'insufficient',
  topRiskCode: null,
  taskProgress: null,
  lateTasks: 0,
};

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'late' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskPhase = 'idea' | 'study' | 'setup' | 'launch' | 'growth';
export type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'late';

export type ProjectTaskRow = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus | string | null;
  priority: TaskPriority | string | null;
  phase: TaskPhase | string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  estimated_cost: string | number | null;
  actual_cost: string | number | null;
  sort_order: number | null;
  created_at?: string | null;
};

export type ProjectMilestoneRow = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: MilestoneStatus | string | null;
  progress_percent: string | number | null;
  related_task_ids?: unknown;
};

export type ProjectTasksSummary = {
  totalTasks: number;
  completedTasks: number;
  lateTasks: number;
  progressPercent: number;
  upcomingDeadline: string | null;
  nextMilestone: string | null;
  estimatedTaskCosts: number;
};

export const emptyProjectTasksSummary: ProjectTasksSummary = {
  totalTasks: 0,
  completedTasks: 0,
  lateTasks: 0,
  progressPercent: 0,
  upcomingDeadline: null,
  nextMilestone: null,
  estimatedTaskCosts: 0,
};

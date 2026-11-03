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


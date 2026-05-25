export const PROJECTS_TABLE = 'projects';
export const PROJECT_FEASIBILITY_TABLE = 'project_feasibility_studies';
export const PROJECT_FINANCIAL_MODELS_TABLE = 'project_financial_models';
export const PROJECT_TASKS_TABLE = 'project_tasks';
export const PROJECT_MILESTONES_TABLE = 'project_milestones';
export const PROJECT_DOCUMENTS_TABLE = 'project_documents';

export function projectTaskProgress(tasks: any[] = []) {
  if (!tasks.length) return null;
  const completed = tasks.filter(task => ['done', 'completed'].includes(String(task?.status ?? '').toLowerCase())).length;
  return Math.round((completed / tasks.length) * 100);
}

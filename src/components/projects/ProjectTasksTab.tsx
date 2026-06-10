'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Flag, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { AppModal } from '@/components/ui/AppModal';

type Lang = 'ar' | 'en' | 'fr';
type TaskStatus = 'todo' | 'in_progress' | 'done' | 'late' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskPhase = 'idea' | 'study' | 'setup' | 'launch' | 'growth';
type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'late';

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

type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  phase: TaskPhase;
  start_date: string;
  due_date: string;
  assigned_to: string;
  estimated_cost: string;
};

type MilestoneForm = {
  title: string;
  description: string;
  target_date: string;
  status: MilestoneStatus;
  progress_percent: string;
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

const TEXT = {
  ar: {
    taskBoard: 'لوحة المهام',
    timeline: 'الخط الزمني',
    ganttTitle: 'الخط الزمني للمشروع',
    milestones: 'المعالم',
    progressSummary: 'ملخص التقدم',
    addTask: '+ إضافة مهمة',
    addMilestone: '+ إضافة معلم',
    editTask: 'تعديل المهمة',
    editMilestone: 'تعديل المعلم',
    taskTitle: 'عنوان المهمة',
    description: 'الوصف',
    status: 'الحالة',
    priority: 'الأولوية',
    phase: 'المرحلة',
    startDate: 'تاريخ البداية',
    dueDate: 'تاريخ الاستحقاق',
    assignedTo: 'المسؤول',
    estimatedCost: 'التكلفة المتوقعة',
    saveTask: 'حفظ المهمة',
    saveMilestone: 'حفظ المعلم',
    delete: 'حذف',
    edit: 'تعديل',
    markDone: 'تم',
    cancel: 'إلغاء',
    close: 'إغلاق',
    todo: 'لم تبدأ',
    in_progress: 'قيد التنفيذ',
    done: 'مكتملة',
    late: 'متأخرة',
    cancelled: 'ملغية',
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'عاجلة',
    idea: 'فكرة',
    study: 'دراسة',
    setup: 'تأسيس',
    launch: 'إطلاق',
    growth: 'نمو',
    planned: 'مخطط',
    completed: 'مكتمل',
    projectProgress: 'تقدم المشروع',
    totalTasks: 'إجمالي المهام',
    completedTasks: 'المهام المكتملة',
    lateTasks: 'المهام المتأخرة',
    upcomingDeadlines: 'المواعيد القادمة',
    nextMilestone: 'المعلم القادم',
    estimatedTaskCosts: 'تكلفة المهام المتوقعة',
    noTasks: 'لا توجد مهام بعد.',
    noMilestones: 'لا توجد معالم بعد.',
    noTimeline: 'أضف تواريخ البداية والاستحقاق لعرض الخط الزمني.',
    targetDate: 'التاريخ المستهدف',
    progressPercent: 'نسبة التقدم %',
    savedTask: 'تم حفظ المهمة.',
    savedMilestone: 'تم حفظ المعلم.',
    deletedTask: 'تم حذف المهمة.',
    deletedMilestone: 'تم حذف المعلم.',
    saveError: 'تعذر حفظ البيانات حالياً.',
    confirmDeleteTask: 'هل تريد حذف هذه المهمة؟',
    confirmDeleteMilestone: 'هل تريد حذف هذا المعلم؟',
    titleRequired: 'عنوان المهمة مطلوب.',
  },
  en: {
    taskBoard: 'Task Board',
    timeline: 'Timeline',
    ganttTitle: 'Project Timeline',
    milestones: 'Milestones',
    progressSummary: 'Project Progress Summary',
    addTask: '+ Add Task',
    addMilestone: '+ Add Milestone',
    editTask: 'Edit Task',
    editMilestone: 'Edit Milestone',
    taskTitle: 'Task title',
    description: 'Description',
    status: 'Status',
    priority: 'Priority',
    phase: 'Phase',
    startDate: 'Start date',
    dueDate: 'Due date',
    assignedTo: 'Assigned to',
    estimatedCost: 'Estimated cost',
    saveTask: 'Save Task',
    saveMilestone: 'Save Milestone',
    delete: 'Delete',
    edit: 'Edit',
    markDone: 'Mark done',
    cancel: 'Cancel',
    close: 'Close',
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
    late: 'Late',
    cancelled: 'Cancelled',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    idea: 'Idea',
    study: 'Study',
    setup: 'Setup',
    launch: 'Launch',
    growth: 'Growth',
    planned: 'Planned',
    completed: 'Completed',
    projectProgress: 'Project Progress',
    totalTasks: 'Total tasks',
    completedTasks: 'Completed tasks',
    lateTasks: 'Late tasks',
    upcomingDeadlines: 'Upcoming deadlines',
    nextMilestone: 'Next milestone',
    estimatedTaskCosts: 'Estimated Task Costs',
    noTasks: 'No tasks yet.',
    noMilestones: 'No milestones yet.',
    noTimeline: 'Add start and due dates to view the timeline.',
    targetDate: 'Target date',
    progressPercent: 'Progress %',
    savedTask: 'Task saved.',
    savedMilestone: 'Milestone saved.',
    deletedTask: 'Task deleted.',
    deletedMilestone: 'Milestone deleted.',
    saveError: 'Could not save right now.',
    confirmDeleteTask: 'Do you want to delete this task?',
    confirmDeleteMilestone: 'Do you want to delete this milestone?',
    titleRequired: 'Task title is required.',
  },
  fr: {
    taskBoard: 'Tableau des tâches',
    timeline: 'Chronologie',
    ganttTitle: 'Chronologie du projet',
    milestones: 'Jalons',
    progressSummary: 'Résumé de progression',
    addTask: '+ Ajouter une tâche',
    addMilestone: '+ Ajouter un jalon',
    editTask: 'Modifier la tâche',
    editMilestone: 'Modifier le jalon',
    taskTitle: 'Titre de la tâche',
    description: 'Description',
    status: 'Statut',
    priority: 'Priorité',
    phase: 'Phase',
    startDate: 'Date de début',
    dueDate: 'Date d’échéance',
    assignedTo: 'Responsable',
    estimatedCost: 'Coût estimé',
    saveTask: 'Enregistrer la tâche',
    saveMilestone: 'Enregistrer le jalon',
    delete: 'Supprimer',
    edit: 'Modifier',
    markDone: 'Marquer comme terminée',
    cancel: 'Annuler',
    close: 'Fermer',
    todo: 'À faire',
    in_progress: 'En cours',
    done: 'Terminée',
    late: 'En retard',
    cancelled: 'Annulée',
    low: 'Basse',
    medium: 'Moyenne',
    high: 'Élevée',
    urgent: 'Urgente',
    idea: 'Idée',
    study: 'Étude',
    setup: 'Mise en place',
    launch: 'Lancement',
    growth: 'Croissance',
    planned: 'Planifié',
    completed: 'Terminé',
    projectProgress: 'Progression du projet',
    totalTasks: 'Total des tâches',
    completedTasks: 'Tâches terminées',
    lateTasks: 'Tâches en retard',
    upcomingDeadlines: 'Échéances à venir',
    nextMilestone: 'Prochain jalon',
    estimatedTaskCosts: 'Coûts estimés des tâches',
    noTasks: 'Aucune tâche pour le moment.',
    noMilestones: 'Aucun jalon pour le moment.',
    noTimeline: 'Ajoutez les dates de début et d’échéance pour afficher la chronologie.',
    targetDate: 'Date cible',
    progressPercent: 'Progression %',
    savedTask: 'Tâche enregistrée.',
    savedMilestone: 'Jalon enregistré.',
    deletedTask: 'Tâche supprimée.',
    deletedMilestone: 'Jalon supprimé.',
    saveError: 'Impossible d’enregistrer pour le moment.',
    confirmDeleteTask: 'Voulez-vous supprimer cette tâche ?',
    confirmDeleteMilestone: 'Voulez-vous supprimer ce jalon ?',
    titleRequired: 'Le titre de la tâche est obligatoire.',
  },
} as const;

type TaskTranslation = Record<keyof typeof TEXT.ar, string>;

const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'done', 'late', 'cancelled'];
const editableTaskStatuses: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled'];
const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const phases: TaskPhase[] = ['idea', 'study', 'setup', 'launch', 'growth'];
const milestoneStatuses: MilestoneStatus[] = ['planned', 'in_progress', 'completed', 'late'];

function toNum(value: unknown) {
  const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isLateTask(task: ProjectTaskRow) {
  const status = String(task.status ?? 'todo');
  if (status === 'done' || status === 'cancelled') return false;
  const due = parseDate(task.due_date);
  return !!due && due < todayStart();
}

function visualTaskStatus(task: ProjectTaskRow): TaskStatus {
  if (isLateTask(task)) return 'late';
  const status = String(task.status ?? 'todo') as TaskStatus;
  return taskStatuses.includes(status) ? status : 'todo';
}

function sortByDate<T extends { due_date?: string | null; target_date?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = parseDate(a.due_date ?? a.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = parseDate(b.due_date ?? b.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function buildProjectTasksSummary(tasks: ProjectTaskRow[], milestones: ProjectMilestoneRow[]): ProjectTasksSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => String(task.status ?? '') === 'done').length;
  const lateTasks = tasks.filter(isLateTask).length;
  const upcomingDeadline = sortByDate(tasks.filter(task => parseDate(task.due_date) && visualTaskStatus(task) !== 'done' && visualTaskStatus(task) !== 'cancelled'))[0]?.due_date ?? null;
  const nextMilestone = sortByDate(milestones.filter(milestone => parseDate(milestone.target_date) && String(milestone.status ?? '') !== 'completed'))[0]?.target_date ?? null;
  return {
    totalTasks,
    completedTasks,
    lateTasks,
    progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    upcomingDeadline,
    nextMilestone,
    estimatedTaskCosts: tasks.reduce((sum, task) => sum + toNum(task.estimated_cost), 0),
  };
}

function defaultTaskForm(): TaskForm {
  return {
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    phase: 'idea',
    start_date: '',
    due_date: '',
    assigned_to: '',
    estimated_cost: '',
  };
}

function defaultMilestoneForm(): MilestoneForm {
  return {
    title: '',
    description: '',
    target_date: '',
    status: 'planned',
    progress_percent: '0',
  };
}

export function ProjectTasksTab({
  userId,
  projectId,
  lang = 'ar',
  currency = 'KWD',
  onSummaryChange,
}: {
  userId: string;
  projectId: string;
  lang?: string;
  currency?: string;
  onSummaryChange?: (summary: ProjectTasksSummary) => void;
}) {
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const t = TEXT[locale] as TaskTranslation;
  const [tasks, setTasks] = useState<ProjectTaskRow[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestoneRow[]>([]);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTaskRow | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestoneRow | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(() => defaultTaskForm());
  const [milestoneForm, setMilestoneForm] = useState<MilestoneForm>(() => defaultMilestoneForm());

  const money = useCallback((amount: number) => formatMoney(amount, currency || 'KWD', locale), [currency, locale]);
  const dateLabel = useCallback((value?: string | null) => {
    const date = parseDate(value);
    return date ? date.toLocaleDateString(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US') : '—';
  }, [locale]);

  const summary = useMemo(() => buildProjectTasksSummary(tasks, milestones), [tasks, milestones]);
  const datedTasks = useMemo(() => tasks.filter(task => parseDate(task.start_date) || parseDate(task.due_date)), [tasks]);
  const timelineBounds = useMemo(() => {
    const dates = [
      ...datedTasks.flatMap(task => [parseDate(task.start_date), parseDate(task.due_date)]),
      ...milestones.map(milestone => parseDate(milestone.target_date)),
    ].filter(Boolean) as Date[];
    if (!dates.length) return null;
    const min = new Date(Math.min(...dates.map(date => date.getTime())));
    const max = new Date(Math.max(...dates.map(date => date.getTime())));
    const span = Math.max(1, max.getTime() - min.getTime());
    return { min, max, span };
  }, [datedTasks, milestones]);

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [onSummaryChange, summary]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTaskModalOpen(false);
        setMilestoneModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [taskRes, milestoneRes] = await Promise.all([
      supabase
        .from('project_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('project_milestones')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('target_date', { ascending: true }),
    ]);
    if (!taskRes.error) setTasks((taskRes.data ?? []) as ProjectTaskRow[]);
    if (!milestoneRes.error) setMilestones((milestoneRes.data ?? []) as ProjectMilestoneRow[]);
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openTaskModal = (task?: ProjectTaskRow) => {
    setNotice('');
    setEditingTask(task ?? null);
    setTaskForm(task ? {
      title: task.title ?? '',
      description: task.description ?? '',
      status: editableTaskStatuses.includes(task.status as TaskStatus) ? task.status as TaskStatus : 'todo',
      priority: priorities.includes(task.priority as TaskPriority) ? task.priority as TaskPriority : 'medium',
      phase: phases.includes(task.phase as TaskPhase) ? task.phase as TaskPhase : 'idea',
      start_date: task.start_date ?? '',
      due_date: task.due_date ?? '',
      assigned_to: task.assigned_to ?? '',
      estimated_cost: String(task.estimated_cost ?? ''),
    } : defaultTaskForm());
    setTaskModalOpen(true);
  };

  const openMilestoneModal = (milestone?: ProjectMilestoneRow) => {
    setNotice('');
    setEditingMilestone(milestone ?? null);
    setMilestoneForm(milestone ? {
      title: milestone.title ?? '',
      description: milestone.description ?? '',
      target_date: milestone.target_date ?? '',
      status: milestoneStatuses.includes(milestone.status as MilestoneStatus) ? milestone.status as MilestoneStatus : 'planned',
      progress_percent: String(milestone.progress_percent ?? 0),
    } : defaultMilestoneForm());
    setMilestoneModalOpen(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) {
      setNotice(t.titleRequired);
      return;
    }
    setSaving(true);
    const statusChangedToDone = taskForm.status === 'done' && editingTask?.status !== 'done';
    const payload = {
      user_id: userId,
      project_id: projectId,
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      status: taskForm.status,
      priority: taskForm.priority,
      phase: taskForm.phase,
      start_date: taskForm.start_date || null,
      due_date: taskForm.due_date || null,
      completed_at: taskForm.status === 'done' ? (editingTask?.completed_at && !statusChangedToDone ? editingTask.completed_at : new Date().toISOString()) : null,
      assigned_to: taskForm.assigned_to.trim() || null,
      estimated_cost: Math.max(0, toNum(taskForm.estimated_cost)),
      sort_order: editingTask?.sort_order ?? tasks.length,
      updated_at: new Date().toISOString(),
    };
    const query = editingTask
      ? supabase.from('project_tasks').update(payload).eq('id', editingTask.id).eq('user_id', userId).select('*').single()
      : supabase.from('project_tasks').insert(payload).select('*').single();
    const { data, error } = await query;
    setSaving(false);
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setTasks(prev => editingTask ? prev.map(task => task.id === editingTask.id ? data as ProjectTaskRow : task) : [...prev, data as ProjectTaskRow]);
    setTaskModalOpen(false);
    setNotice(t.savedTask);
  };

  const saveMilestone = async () => {
    if (!milestoneForm.title.trim()) {
      setNotice(t.titleRequired);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      project_id: projectId,
      title: milestoneForm.title.trim(),
      description: milestoneForm.description.trim() || null,
      target_date: milestoneForm.target_date || null,
      status: milestoneForm.status,
      progress_percent: Math.max(0, Math.min(100, toNum(milestoneForm.progress_percent))),
      updated_at: new Date().toISOString(),
    };
    const query = editingMilestone
      ? supabase.from('project_milestones').update(payload).eq('id', editingMilestone.id).eq('user_id', userId).select('*').single()
      : supabase.from('project_milestones').insert(payload).select('*').single();
    const { data, error } = await query;
    setSaving(false);
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setMilestones(prev => editingMilestone ? prev.map(item => item.id === editingMilestone.id ? data as ProjectMilestoneRow : item) : [...prev, data as ProjectMilestoneRow]);
    setMilestoneModalOpen(false);
    setNotice(t.savedMilestone);
  };

  const markTaskDone = async (task: ProjectTaskRow) => {
    const { data, error } = await supabase
      .from('project_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setTasks(prev => prev.map(item => item.id === task.id ? data as ProjectTaskRow : item));
  };

  const deleteTask = async (task: ProjectTaskRow) => {
    if (!window.confirm(t.confirmDeleteTask)) return;
    const { error } = await supabase.from('project_tasks').delete().eq('id', task.id).eq('user_id', userId);
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setTasks(prev => prev.filter(item => item.id !== task.id));
    setNotice(t.deletedTask);
  };

  const deleteMilestone = async (milestone: ProjectMilestoneRow) => {
    if (!window.confirm(t.confirmDeleteMilestone)) return;
    const { error } = await supabase.from('project_milestones').delete().eq('id', milestone.id).eq('user_id', userId);
    if (error) {
      setNotice(t.saveError);
      return;
    }
    setMilestones(prev => prev.filter(item => item.id !== milestone.id));
    setNotice(t.deletedMilestone);
  };

  const timelinePosition = (value?: string | null) => {
    if (!timelineBounds) return 0;
    const date = parseDate(value) ?? timelineBounds.min;
    return Math.max(0, Math.min(100, ((date.getTime() - timelineBounds.min.getTime()) / timelineBounds.span) * 100));
  };

  return (
    <section className="project-tasks-tab" role="tabpanel" aria-label={t.taskBoard}>
      <div className="tasks-summary-grid">
        <SummaryCard label={t.projectProgress} value={`${summary.progressPercent}%`} icon={<CheckCircle2 size={18} />} />
        <SummaryCard label={t.totalTasks} value={String(summary.totalTasks)} icon={<Clock3 size={18} />} />
        <SummaryCard label={t.completedTasks} value={String(summary.completedTasks)} icon={<CheckCircle2 size={18} />} />
        <SummaryCard label={t.lateTasks} value={String(summary.lateTasks)} icon={<AlertTriangle size={18} />} />
        <SummaryCard label={t.upcomingDeadlines} value={dateLabel(summary.upcomingDeadline)} icon={<CalendarDays size={18} />} />
        <SummaryCard label={t.estimatedTaskCosts} value={money(summary.estimatedTaskCosts)} icon={<Flag size={18} />} />
      </div>
      <div className="tasks-progress-bar" aria-label={t.projectProgress}><span style={{ width: `${summary.progressPercent}%` }} /></div>
      {notice ? <div className="tasks-notice" role="status">{notice}</div> : null}

      <div className="tasks-actions">
        <button type="button" onClick={() => openTaskModal()} aria-label={t.addTask}><Plus size={16} />{t.addTask}</button>
        <button type="button" onClick={() => openMilestoneModal()} aria-label={t.addMilestone}><Plus size={16} />{t.addMilestone}</button>
      </div>

      <article className="tasks-card">
        <SectionTitle title={t.taskBoard} icon={<Clock3 size={20} />} />
        {loading ? <p className="empty-copy">{t.taskBoard}</p> : null}
        {tasks.length === 0 && !loading ? <p className="empty-copy">{t.noTasks}</p> : null}
        <div className="task-board">
          {taskStatuses.map(status => {
            const grouped = tasks.filter(task => visualTaskStatus(task) === status);
            return (
              <div className="task-column" key={status}>
                <h3>{t[status]}</h3>
                <div className="task-card-list">
                  {grouped.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status={visualTaskStatus(task)}
                      t={t}
                      money={money}
                      dateLabel={dateLabel}
                      onEdit={() => openTaskModal(task)}
                      onDone={() => markTaskDone(task)}
                      onDelete={() => deleteTask(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="tasks-layout">
        <article className="tasks-card">
          <SectionTitle title={t.ganttTitle} icon={<CalendarDays size={20} />} />
          {!timelineBounds ? (
            <p className="empty-copy">{t.noTimeline}</p>
          ) : (
            <div className="gantt-view">
              {datedTasks.map(task => {
                const start = task.start_date || task.due_date;
                const end = task.due_date || task.start_date;
                const left = timelinePosition(start);
                const right = timelinePosition(end);
                const width = Math.max(4, right - left);
                return (
                  <div className="timeline-lane" key={task.id}>
                    <div className="timeline-meta">
                      <strong>{task.title}</strong>
                      <small>{dateLabel(start)} - {dateLabel(end)}</small>
                    </div>
                    <div className="timeline-track">
                      <span className={`timeline-bar ${visualTaskStatus(task)}`} style={{ insetInlineStart: `${left}%`, width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {milestones.filter(milestone => milestone.target_date).map(milestone => (
                <div className="timeline-lane milestone-lane" key={milestone.id}>
                  <div className="timeline-meta">
                    <strong>{milestone.title}</strong>
                    <small>{dateLabel(milestone.target_date)}</small>
                  </div>
                  <div className="timeline-track">
                    <span className={`milestone-marker ${milestone.status ?? 'planned'}`} style={{ insetInlineStart: `${timelinePosition(milestone.target_date)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="tasks-card">
          <SectionTitle title={t.milestones} icon={<Flag size={20} />} />
          {milestones.length === 0 ? <p className="empty-copy">{t.noMilestones}</p> : null}
          <div className="milestone-list">
            {milestones.map(milestone => (
              <div className="milestone-card" key={milestone.id}>
                <div>
                  <strong>{milestone.title}</strong>
                  <span className={`status-badge ${milestone.status ?? 'planned'}`}>{t[(milestone.status as MilestoneStatus) ?? 'planned'] ?? t.planned}</span>
                </div>
                <p>{milestone.description}</p>
                <small>{t.targetDate}: {dateLabel(milestone.target_date)}</small>
                <div className="milestone-progress"><span style={{ width: `${Math.max(0, Math.min(100, toNum(milestone.progress_percent)))}%` }} /></div>
                <small>{t.progressPercent}: {toNum(milestone.progress_percent).toFixed(0)}%</small>
                <div className="card-actions">
                  <button type="button" onClick={() => openMilestoneModal(milestone)} aria-label={t.edit}><Pencil size={14} />{t.edit}</button>
                  <button type="button" onClick={() => deleteMilestone(milestone)} aria-label={t.delete}><Trash2 size={14} />{t.delete}</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {taskModalOpen && (
        <Modal
          title={editingTask ? t.editTask : t.addTask}
          closeLabel={t.close}
          onClose={() => setTaskModalOpen(false)}
          footer={(
            <>
              <button type="button" onClick={() => setTaskModalOpen(false)}>{t.cancel}</button>
              <button type="button" className="primary-modal-btn" disabled={saving} onClick={saveTask}><Save size={16} />{t.saveTask}</button>
            </>
          )}
        >
          <TaskFormFields
            form={taskForm}
            t={t}
            onChange={(field, value) => setTaskForm(prev => ({ ...prev, [field]: value }))}
          />
        </Modal>
      )}

      {milestoneModalOpen && (
        <Modal
          title={editingMilestone ? t.editMilestone : t.addMilestone}
          closeLabel={t.close}
          onClose={() => setMilestoneModalOpen(false)}
          footer={(
            <>
              <button type="button" onClick={() => setMilestoneModalOpen(false)}>{t.cancel}</button>
              <button type="button" className="primary-modal-btn" disabled={saving} onClick={saveMilestone}><Save size={16} />{t.saveMilestone}</button>
            </>
          )}
        >
          <MilestoneFormFields
            form={milestoneForm}
            t={t}
            onChange={(field, value) => setMilestoneForm(prev => ({ ...prev, [field]: value }))}
          />
        </Modal>
      )}

      <style jsx global>{`
        .project-tasks-tab{display:grid;gap:16px;min-width:0}.tasks-summary-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}.summary-card,.tasks-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}.summary-card{background:var(--sfm-light-card);display:flex;align-items:center;justify-content:space-between;gap:12px}.summary-card small{display:block;color:var(--sfm-muted);font-weight:900}.summary-card strong{display:block;margin-top:6px;color:var(--sfm-primary-dark);font-size:20px}.summary-card svg,.tasks-section-title svg{color:var(--sfm-primary)}.tasks-progress-bar{height:11px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden}.tasks-progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary))}.tasks-notice{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:15px;padding:12px 14px;font-weight:900}.tasks-actions{display:flex;gap:10px;flex-wrap:wrap}.tasks-actions button,.primary-modal-btn{min-height:42px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:0 14px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.tasks-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.tasks-section-title h2{margin:0;color:var(--sfm-midnight);font-size:20px}.task-board{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:12px;overflow-x:auto;padding-bottom:4px}.task-column{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:16px;padding:12px;min-width:220px}.task-column h3{margin:0 0 10px;color:var(--sfm-midnight);font-size:15px}.task-card-list{display:grid;gap:10px}.task-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:15px;padding:12px;display:grid;gap:9px}.task-card h4{margin:0;color:var(--sfm-primary-dark)}.task-card p{margin:0;color:var(--sfm-muted);line-height:1.55}.badge-row{display:flex;gap:6px;flex-wrap:wrap}.status-badge,.priority-badge,.phase-badge{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:950}.status-badge.todo,.status-badge.planned{background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.status-badge.in_progress{background:#E7F0FF;color:#244F8F}.status-badge.done,.status-badge.completed{background:#ECFDF5;color:#047857}.status-badge.late{background:#FEF2F2;color:#B91C1C}.status-badge.cancelled{background:#EFEAE2;color:#6E6258}.priority-badge.low{background:#ECFDF5;color:#047857}.priority-badge.medium{background:#FFF7ED;color:#B45309}.priority-badge.high{background:#FEF2F2;color:#B91C1C}.priority-badge.urgent{background:var(--sfm-midnight);color:var(--sfm-soft-cyan)}.phase-badge{background:var(--sfm-background);color:var(--sfm-muted)}.task-meta{display:grid;gap:4px;color:var(--sfm-muted);font-size:12px;font-weight:800}.card-actions{display:flex;gap:6px;flex-wrap:wrap}.card-actions button{min-height:34px;border:1px solid rgba(29,140,255,.16);border-radius:10px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 9px;font-family:inherit;font-weight:900;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.tasks-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.8fr);gap:16px}.empty-copy{margin:0;color:var(--sfm-muted);line-height:1.7}.gantt-view{display:grid;gap:12px}.timeline-lane{display:grid;grid-template-columns:minmax(150px,.34fr) minmax(0,1fr);gap:12px;align-items:center}.timeline-meta strong{display:block;color:var(--sfm-primary-dark)}.timeline-meta small{display:block;color:var(--sfm-muted);margin-top:4px}.timeline-track{position:relative;height:28px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden}.timeline-bar{position:absolute;top:6px;height:16px;border-radius:999px;background:var(--sfm-primary)}.timeline-bar.in_progress{background:#3B73C8}.timeline-bar.done{background:#3E7B22}.timeline-bar.late{background:#B3261E}.timeline-bar.cancelled{background:var(--sfm-muted)}.milestone-marker{position:absolute;top:5px;width:18px;height:18px;border-radius:50%;background:var(--sfm-primary);border:3px solid var(--sfm-card);transform:translateX(-50%)}[dir="rtl"] .milestone-marker{transform:translateX(50%)}.milestone-list{display:grid;gap:10px}.milestone-card{display:grid;gap:8px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:15px;padding:12px}.milestone-card div:first-child{display:flex;justify-content:space-between;gap:10px;align-items:center}.milestone-card strong{color:var(--sfm-primary-dark)}.milestone-card p{margin:0;color:var(--sfm-muted);line-height:1.55}.milestone-card small{color:var(--sfm-muted);font-weight:800}.milestone-progress{height:8px;background:rgba(29,140,255,.10);border-radius:999px;overflow:hidden}.milestone-progress span{display:block;height:100%;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary))}.tasks-modal-backdrop{position:fixed;inset:0;z-index:140;background:rgba(3,18,37,.48);display:grid;place-items:center;padding:18px}.tasks-modal{width:min(760px,100%);max-height:min(86dvh,820px);overflow:auto;background:var(--sfm-card);border:1px solid rgba(29,140,255,.2);border-radius:22px;padding:18px;box-shadow:0 24px 70px rgba(3,18,37,.25)}.modal-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.modal-heading h2{margin:0;color:var(--sfm-midnight)}.modal-heading button{width:38px;height:38px;border:1px solid rgba(29,140,255,.16);border-radius:12px;background:var(--sfm-light-card);color:var(--sfm-midnight);display:grid;place-items:center;cursor:pointer}.modal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tasks-field{display:grid;gap:7px;min-width:0}.tasks-field span{font-weight:900;color:var(--sfm-muted)}.tasks-field input,.tasks-field textarea,.tasks-field select{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}.tasks-field textarea{resize:vertical;line-height:1.6}.tasks-field input:focus,.tasks-field textarea:focus,.tasks-field select:focus,.tasks-actions button:focus-visible,.card-actions button:focus-visible,.modal-heading button:focus-visible,.modal-actions button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16);border-color:var(--sfm-accent)}.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.modal-actions button{min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 14px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;gap:8px;cursor:pointer}.modal-actions .primary-modal-btn{border:0;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}@media(max-width:1280px){.tasks-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.tasks-layout{grid-template-columns:1fr}}@media(max-width:760px){.tasks-summary-grid,.modal-grid{grid-template-columns:1fr}.task-board{grid-template-columns:1fr;overflow:visible}.task-column{min-width:0}.timeline-lane{grid-template-columns:1fr}.timeline-track{height:22px}.tasks-actions,.modal-actions{display:grid;grid-template-columns:1fr}.tasks-actions button,.modal-actions button{width:100%}.tasks-card,.summary-card{padding:16px}.tasks-modal-backdrop{align-items:end;padding:10px}.tasks-modal{max-height:88dvh;border-radius:20px 20px 0 0}}
      `}</style>
    </section>
  );
}

function TaskCard({
  task,
  status,
  t,
  money,
  dateLabel,
  onEdit,
  onDone,
  onDelete,
}: {
  task: ProjectTaskRow;
  status: TaskStatus;
  t: TaskTranslation;
  money: (amount: number) => string;
  dateLabel: (value?: string | null) => string;
  onEdit: () => void;
  onDone: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="task-card">
      <h4>{task.title}</h4>
      {task.description ? <p>{task.description}</p> : null}
      <div className="badge-row">
        <span className={`status-badge ${status}`}>{t[status]}</span>
        <span className={`priority-badge ${task.priority ?? 'medium'}`}>{t[(task.priority as TaskPriority) ?? 'medium'] ?? t.medium}</span>
        <span className="phase-badge">{t[(task.phase as TaskPhase) ?? 'idea'] ?? t.idea}</span>
      </div>
      <div className="task-meta">
        <span>{t.dueDate}: {dateLabel(task.due_date)}</span>
        <span>{t.assignedTo}: {task.assigned_to || '—'}</span>
        <span>{t.estimatedCost}: {money(toNum(task.estimated_cost))}</span>
      </div>
      <div className="card-actions">
        <button type="button" onClick={onEdit} aria-label={t.edit}><Pencil size={14} />{t.edit}</button>
        {status !== 'done' && status !== 'cancelled' ? <button type="button" onClick={onDone} aria-label={t.markDone}><CheckCircle2 size={14} />{t.markDone}</button> : null}
        <button type="button" onClick={onDelete} aria-label={t.delete}><Trash2 size={14} />{t.delete}</button>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="summary-card"><div><small>{label}</small><strong>{value}</strong></div>{icon}</div>;
}

function SectionTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return <div className="tasks-section-title"><h2>{title}</h2>{icon}</div>;
}

function Modal({
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <AppModal
      open
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      size="md"
      className="tasks-modal"
      bodyClassName="tasks-modal-body"
      footerClassName="modal-actions"
      footer={footer}
    >
      {children}
    </AppModal>
  );
}

function TaskFormFields({ form, t, onChange }: { form: TaskForm; t: TaskTranslation; onChange: (field: keyof TaskForm, value: string) => void }) {
  return (
    <div className="modal-grid">
      <Field id="task-title" label={t.taskTitle} value={form.title} onChange={value => onChange('title', value)} />
      <SelectField id="task-status" label={t.status} value={form.status} options={editableTaskStatuses.map(status => ({ value: status, label: t[status] }))} onChange={value => onChange('status', value)} />
      <SelectField id="task-priority" label={t.priority} value={form.priority} options={priorities.map(priority => ({ value: priority, label: t[priority] }))} onChange={value => onChange('priority', value)} />
      <SelectField id="task-phase" label={t.phase} value={form.phase} options={phases.map(phase => ({ value: phase, label: t[phase] }))} onChange={value => onChange('phase', value)} />
      <Field id="task-start" label={t.startDate} value={form.start_date} type="date" onChange={value => onChange('start_date', value)} />
      <Field id="task-due" label={t.dueDate} value={form.due_date} type="date" onChange={value => onChange('due_date', value)} />
      <Field id="task-assigned" label={t.assignedTo} value={form.assigned_to} onChange={value => onChange('assigned_to', value)} />
      <Field id="task-cost" label={t.estimatedCost} value={form.estimated_cost} type="number" onChange={value => onChange('estimated_cost', value)} />
      <Field id="task-description" label={t.description} value={form.description} multiline onChange={value => onChange('description', value)} />
    </div>
  );
}

function MilestoneFormFields({ form, t, onChange }: { form: MilestoneForm; t: TaskTranslation; onChange: (field: keyof MilestoneForm, value: string) => void }) {
  return (
    <div className="modal-grid">
      <Field id="milestone-title" label={t.taskTitle} value={form.title} onChange={value => onChange('title', value)} />
      <SelectField id="milestone-status" label={t.status} value={form.status} options={milestoneStatuses.map(status => ({ value: status, label: t[status] }))} onChange={value => onChange('status', value)} />
      <Field id="milestone-target" label={t.targetDate} value={form.target_date} type="date" onChange={value => onChange('target_date', value)} />
      <Field id="milestone-progress" label={t.progressPercent} value={form.progress_percent} type="number" onChange={value => onChange('progress_percent', value)} />
      <Field id="milestone-description" label={t.description} value={form.description} multiline onChange={value => onChange('description', value)} />
    </div>
  );
}

function Field({ id, label, value, type = 'text', multiline = false, onChange }: { id: string; label: string; value: string; type?: string; multiline?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="tasks-field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea id={id} rows={3} value={value} onChange={event => onChange(event.target.value)} />
      ) : (
        <input id={id} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={value} onChange={event => onChange(event.target.value)} />
      )}
    </label>
  );
}

function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="tasks-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

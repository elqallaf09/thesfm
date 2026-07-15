export type DailyWorkflowPriority = 'urgent' | 'high' | 'medium' | 'low';
export type DailyWorkflowKind = 'task' | 'notification' | 'report' | 'account';
export type DailySourceStatus = 'loading' | 'ready' | 'partial' | 'empty' | 'failed' | 'unauthorized' | 'unavailable';

type DailySourceDiagnostic = {
  status: 'ok_with_data' | 'ok_empty' | 'failed';
  errorCodes?: string[];
};

export function resolveDailySourceStatus({
  loading,
  authenticated,
  diagnostics,
}: {
  loading: boolean;
  authenticated: boolean;
  diagnostics: DailySourceDiagnostic[];
}): DailySourceStatus {
  if (loading) return 'loading';
  if (!authenticated) return 'unauthorized';
  if (diagnostics.length === 0) return 'unavailable';

  const failed = diagnostics.filter(item => item.status === 'failed');
  if (failed.length === diagnostics.length) {
    const onlyMissingRelations = failed.every(item =>
      (item.errorCodes?.length ?? 0) > 0 && item.errorCodes?.every(code => code === 'relation_missing'),
    );
    return onlyMissingRelations ? 'unavailable' : 'failed';
  }
  if (failed.length > 0) return 'partial';
  return diagnostics.some(item => item.status === 'ok_with_data') ? 'ready' : 'empty';
}

export type DailyWorkflowItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  source: string;
  sourceModule?: string;
  sourceId?: string | null;
  priority: DailyWorkflowPriority;
  dueDate?: string | null;
  createdAt?: string | null;
  actionLabel: string;
  kind: DailyWorkflowKind;
  unread?: boolean;
};

const DAY_MS = 86_400_000;
const PRIORITY_WEIGHT: Record<DailyWorkflowPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysFromToday(value: string | null | undefined, today: Date) {
  const date = parseDate(value);
  if (!date) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((target - base) / DAY_MS);
}

function normalizedSource(value = '') {
  const source = value.toLowerCase();
  if (source.includes('income')) return 'income';
  if (source.includes('expense')) return 'expense';
  if (source.includes('goal')) return 'goal';
  if (source.includes('market') || source.includes('watchlist')) return 'market';
  if (source.includes('project') || source.includes('task') || source.includes('milestone')) return 'project';
  if (source.includes('zakat')) return 'zakat';
  if (source.includes('charity') || source.includes('beneficiary') || source.includes('contributor')) return 'charity';
  if (source.includes('report')) return 'report';
  if (source.includes('security') || source.includes('account') || source.includes('profile')) return 'account';
  return source || 'general';
}

function logicalKey(item: DailyWorkflowItem) {
  const generatedId = item.id.match(/^(?:task|dynamic):(.+)$/)?.[1];
  if (generatedId) return `generated:${generatedId}`;
  if (item.sourceId) {
    return `${normalizedSource(item.sourceModule || item.source)}:${item.sourceId}:${item.dueDate ?? ''}`;
  }
  return `${item.kind}:${normalizedSource(item.sourceModule || item.source)}:${item.title.trim().toLowerCase()}:${item.dueDate ?? ''}`;
}

function categoryRank(item: DailyWorkflowItem, today: Date) {
  const days = daysFromToday(item.dueDate, today);
  if (item.kind === 'task' && item.priority === 'urgent' && days !== null && days < 0) return 0;
  if (item.kind === 'task' && item.priority === 'urgent' && days === 0) return 1;
  if (item.kind === 'task' && item.priority === 'high' && days === 0) return 2;
  if (item.kind === 'account' || normalizedSource(item.sourceModule || item.source) === 'account') return 3;
  if (item.kind === 'task' && days === 0 && ['income', 'expense', 'zakat', 'charity'].includes(normalizedSource(item.sourceModule || item.source))) return 4;
  if (item.kind === 'task' && days === 0 && normalizedSource(item.sourceModule || item.source) === 'project') return 5;
  if (item.kind === 'notification' && item.unread !== false && (item.priority === 'urgent' || item.priority === 'high')) return 6;
  if (item.kind === 'report') return 7;
  if (days !== null && days >= 0 && days <= 3) return 8;
  return 9;
}

export function compareDailyWorkflowItems(a: DailyWorkflowItem, b: DailyWorkflowItem, today = new Date()) {
  const categoryDifference = categoryRank(a, today) - categoryRank(b, today);
  if (categoryDifference !== 0) return categoryDifference;
  const priorityDifference = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (priorityDifference !== 0) return priorityDifference;
  const aDue = parseDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bDue = parseDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  const aCreated = parseDate(a.createdAt)?.getTime() ?? 0;
  const bCreated = parseDate(b.createdAt)?.getTime() ?? 0;
  if (aCreated !== bCreated) return bCreated - aCreated;
  return a.id.localeCompare(b.id);
}

export function prioritizeDailyWorkflow(items: DailyWorkflowItem[], today = new Date()) {
  const sorted = [...items].sort((a, b) => compareDailyWorkflowItems(a, b, today));
  const unique = new Map<string, DailyWorkflowItem>();
  sorted.forEach(item => {
    const key = logicalKey(item);
    if (!unique.has(key)) unique.set(key, item);
  });
  const ordered = Array.from(unique.values());
  const todayKey = localDateKey(today);
  const dueToday = (item: DailyWorkflowItem) => {
    const date = parseDate(item.dueDate);
    return date ? localDateKey(date) === todayKey : false;
  };

  const topAction = ordered[0] ?? null;
  const displayed = new Set(topAction ? [logicalKey(topAction)] : []);
  const takeUnique = (candidates: DailyWorkflowItem[], limit: number) => {
    const selected: DailyWorkflowItem[] = [];
    for (const item of candidates) {
      const key = logicalKey(item);
      if (displayed.has(key)) continue;
      displayed.add(key);
      selected.push(item);
      if (selected.length === limit) break;
    }
    return selected;
  };
  const urgentAndHighTasks = takeUnique(
    ordered.filter(item => item.kind === 'task' && (item.priority === 'urgent' || item.priority === 'high')),
    5,
  );
  const dueTodayItems = takeUnique(ordered.filter(item => item.kind === 'task' && dueToday(item)), 3);
  const importantNotifications = takeUnique(
    ordered.filter(item => item.kind === 'notification' && item.unread !== false && (item.priority === 'urgent' || item.priority === 'high')),
    3,
  );

  return { ordered, topAction, urgentAndHighTasks, dueToday: dueTodayItems, importantNotifications };
}

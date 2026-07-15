import { describe, expect, it } from 'vitest';
import {
  prioritizeDailyWorkflow,
  resolveDailySourceStatus,
  type DailyWorkflowItem,
} from '@/lib/daily-workflow/prioritizeDailyItems';

const TODAY = new Date('2026-07-15T12:00:00');

function item(overrides: Partial<DailyWorkflowItem> & Pick<DailyWorkflowItem, 'id' | 'title'>): DailyWorkflowItem {
  return {
    description: 'A real source-backed item',
    href: '/tasks',
    source: 'Tasks',
    priority: 'medium',
    actionLabel: 'Open',
    kind: 'task',
    ...overrides,
  };
}

describe('daily workflow prioritization', () => {
  it('uses the documented deterministic priority order', () => {
    const result = prioritizeDailyWorkflow([
      item({ id: 'low', title: 'Low follow-up', priority: 'low' }),
      item({ id: 'notice', title: 'Important notice', kind: 'notification', priority: 'high', unread: true }),
      item({ id: 'due-high', title: 'High due today', priority: 'high', dueDate: '2026-07-15' }),
      item({ id: 'overdue', title: 'Overdue urgent', priority: 'urgent', dueDate: '2026-07-14' }),
      item({ id: 'account', title: 'Account warning', kind: 'account', priority: 'high', sourceModule: 'account' }),
    ], TODAY);

    expect(result.ordered.map(entry => entry.id)).toEqual(['overdue', 'due-high', 'account', 'notice', 'low']);
    expect(result.topAction?.id).toBe('overdue');
  });

  it('deduplicates the same generated logical item across task and notification sources', () => {
    const task = item({ id: 'task:income-late:abc:2026-07-15', title: 'Income needs attention', priority: 'high', dueDate: '2026-07-15', sourceId: 'abc', sourceModule: 'income' });
    const notification = item({ id: 'dynamic:income-late:abc:2026-07-15', title: 'Income notification', kind: 'notification', priority: 'high', dueDate: '2026-07-15', sourceId: 'abc', sourceModule: 'income', unread: true });

    const result = prioritizeDailyWorkflow([notification, task], TODAY);
    expect(result.ordered).toHaveLength(1);
    expect(result.ordered[0].kind).toBe('task');
  });

  it('is stable regardless of source arrival order and enforces display limits', () => {
    const tasks = Array.from({ length: 10 }, (_, index) => item({
      id: `task-${index}`,
      title: `Task ${index}`,
      priority: 'high',
      dueDate: '2026-07-15',
    }));
    const notices = Array.from({ length: 5 }, (_, index) => item({
      id: `notice-${index}`,
      title: `Notice ${index}`,
      kind: 'notification',
      priority: 'high',
      unread: true,
    }));

    const forward = prioritizeDailyWorkflow([...tasks, ...notices], TODAY);
    const reverse = prioritizeDailyWorkflow([...tasks, ...notices].reverse(), TODAY);
    expect(forward.ordered.map(entry => entry.id)).toEqual(reverse.ordered.map(entry => entry.id));
    expect(forward.urgentAndHighTasks).toHaveLength(5);
    expect(forward.dueToday).toHaveLength(3);
    expect(forward.importantNotifications).toHaveLength(3);
    const displayedIds = [
      forward.topAction?.id,
      ...forward.urgentAndHighTasks.map(entry => entry.id),
      ...forward.dueToday.map(entry => entry.id),
      ...forward.importantNotifications.map(entry => entry.id),
    ].filter(Boolean);
    expect(new Set(displayedIds).size).toBe(displayedIds.length);
  });
});

describe('daily source diagnostics', () => {
  const empty = { status: 'ok_empty' as const, errorCodes: [] };
  const ready = { status: 'ok_with_data' as const, errorCodes: [] };
  const failed = { status: 'failed' as const, errorCodes: ['load_failed'] };

  it('distinguishes loading, unauthorized, ready, empty, partial and failed states', () => {
    expect(resolveDailySourceStatus({ loading: true, authenticated: true, diagnostics: [ready] })).toBe('loading');
    expect(resolveDailySourceStatus({ loading: false, authenticated: false, diagnostics: [empty] })).toBe('unauthorized');
    expect(resolveDailySourceStatus({ loading: false, authenticated: true, diagnostics: [ready] })).toBe('ready');
    expect(resolveDailySourceStatus({ loading: false, authenticated: true, diagnostics: [empty] })).toBe('empty');
    expect(resolveDailySourceStatus({ loading: false, authenticated: true, diagnostics: [ready, failed] })).toBe('partial');
    expect(resolveDailySourceStatus({ loading: false, authenticated: true, diagnostics: [failed] })).toBe('failed');
  });

  it('distinguishes a missing optional feature from an ordinary load failure', () => {
    expect(resolveDailySourceStatus({
      loading: false,
      authenticated: true,
      diagnostics: [{ status: 'failed', errorCodes: ['relation_missing'] }],
    })).toBe('unavailable');
  });
});

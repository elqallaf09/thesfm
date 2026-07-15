import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSmartTasks } from '@/lib/tasks/generateSmartTasks';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('unified Today operational workflow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reuses the production task generator for bill, debt, and subscription reminders', () => {
    const tasks = generateSmartTasks({
      profile: { display_name: 'Sam', default_currency: 'KWD', onboarding_completed: true },
      lang: 'en',
      data: {
        income: [{ id: 'income-1', status: 'received', amount: 1000 }],
        expenses: [
          { id: 'bill-1', description: 'Electricity', category: 'utilities', status: 'pending', due_date: '2026-07-15' },
          { id: 'sub-1', description: 'Cloud', category: 'subscriptions', enhanced: { source: 'subscription', status: 'active', service_name: 'Cloud', next_renewal_date: '2026-07-16' } },
          { id: 'sub-cancelled', name: 'Old service', category: 'subscriptions', enhanced: { source: 'subscription', subscription_status: 'cancelled', next_renewal_date: '2026-07-16' } },
        ],
        debts: [{ id: 'debt-1', name: 'Home loan', status: 'active', original_amount: 1000, monthly_payment: 100, start_date: '2026-07-01', first_payment_date: '2026-07-15', payment_day: 15, interest_type: 'none' }],
        debtPayments: [],
        goals: [{}], savings: [{}], investments: [{}],
      },
    });

    expect(tasks.some(task => task.sourceModule === 'bill' && task.dueDate === '2026-07-15')).toBe(true);
    expect(tasks.some(task => task.sourceModule === 'subscription' && task.dueDate === '2026-07-16')).toBe(true);
    expect(tasks.some(task => task.sourceId === 'sub-cancelled')).toBe(false);
    expect(tasks.some(task => task.sourceModule === 'debt' && task.dueDate === '2026-07-15')).toBe(true);
  });

  it('keeps Today as the operational surface and Tasks as advanced management', () => {
    const today = read('src/app/today/page.tsx');
    const tasks = read('src/app/tasks/page.tsx');

    for (const contract of ['Today Center', "Today's priorities", 'Bills & subscriptions', 'Debts', 'Goals', 'Savings', 'Investments', 'Projects', 'AI operational suggestions', 'Recent important activity', 'Quick actions']) {
      expect(today).toContain(contract);
    }
    expect(today).toContain("setTaskStatus(item.id, 'done')");
    expect(today).toContain("setTaskStatus(item.id, 'dismissed')");
    expect(tasks).toContain('Advanced management');
    expect(tasks).toContain('setQuery');
    expect(tasks).toContain('sourceDiagnostics');
  });

  it('loads Notifications from notification-only sources', () => {
    const page = read('src/components/finance/NotificationsPage.tsx');
    const hook = read('src/hooks/useNotificationEvents.ts');

    expect(page).toContain('useNotificationEvents()');
    expect(page).not.toContain('loadUserDataTables');
    expect(page).not.toContain('generateSmartNotifications');
    expect(hook).toContain("from('notifications')");
    expect(hook).toContain("fetch('/api/market/signal-alerts?limit=50'");
    for (const duplicateSource of ['monthly_income_sources', 'expense_items', 'financial_goals', 'project_tasks', 'zakat_assets', 'charity_projects']) {
      expect(hook).not.toContain(duplicateSource);
    }
  });

  it('keeps notifications header-only and moves Tasks behind the core navigation order', () => {
    const navigation = read('src/components/navigationConfig.ts');
    const home = navigation.indexOf("id: 'home'");
    const today = navigation.indexOf("id: 'today'");
    const reports = navigation.indexOf("id: 'reports-center'");
    const tasks = navigation.indexOf("id: 'tasks'");
    expect(home).toBeLessThan(today);
    expect(today).toBeLessThan(reports);
    expect(reports).toBeLessThan(tasks);
    expect(navigation).not.toContain("id: 'notif'");
    expect(read('src/components/AppHeader.tsx')).toContain('className="sfm-global-notifications"');
  });

  it('deduplicates route-to-route data loading with short-lived shared caches', () => {
    expect(read('src/hooks/useSmartTasks.ts')).toContain('SMART_TASK_CACHE_TTL_MS');
    expect(read('src/hooks/useNotificationEvents.ts')).toContain('CACHE_TTL_MS');
    expect(read('src/hooks/useRecentAccountActivity.ts')).toContain('CACHE_TTL_MS');
  });
});

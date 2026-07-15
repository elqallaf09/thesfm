import { describe, expect, it } from 'vitest';
import { generateSmartNotifications } from '@/lib/notifications/generateNotifications';
import { generateSmartTasks } from '@/lib/tasks/generateSmartTasks';

const completeProfile = {
  display_name: 'Test',
  default_currency: 'KWD',
  onboarding_completed: true,
};

describe('smart task and notification report workflow', () => {
  it('uses the same real readiness rule for report tasks and notifications', () => {
    const data = {
      income: [{ id: 'income-1', status: 'received', received_date: '2026-07-15', amount: 10 }],
      expenses: [],
      savings: [],
      investments: [],
    };
    const tasks = generateSmartTasks({ profile: completeProfile, data, lang: 'en' });
    const notifications = generateSmartNotifications(data, 'en');

    expect(tasks.filter(item => item.id.includes('report-ready:financial'))).toHaveLength(1);
    expect(notifications.filter(item => item.id.includes('report-ready:financial'))).toHaveLength(1);
  });

  it('does not fabricate a ready report when its source was not loaded', () => {
    const tasks = generateSmartTasks({ profile: completeProfile, data: {}, lang: 'en' });
    const notifications = generateSmartNotifications({}, 'en');

    expect(tasks.some(item => item.id.includes('report-ready'))).toBe(false);
    expect(notifications.some(item => item.id.includes('report-ready'))).toBe(false);
  });
});

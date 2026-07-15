import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Phase 3.5 route and navigation consolidation', () => {
  it('preserves old bookmarks with server redirects and no client flash or loop', () => {
    const commandCenter = read('src/app/command-center/page.tsx');
    const reports = read('src/app/reports/page.tsx');
    expect(commandCenter).toContain("redirect('/today')");
    expect(commandCenter).not.toContain("'use client'");
    expect(commandCenter).not.toContain("redirect('/command-center')");
    expect(reports).toContain("redirect('/reports-center')");
    expect(reports).not.toContain("'use client'");
  });

  it('removes the general Command Center from shared desktop, mobile and command navigation', () => {
    const navigation = read('src/components/navigationConfig.ts');
    const sidebar = read('src/components/Sidebar.tsx');
    const mobile = read('src/components/MobileMenu.tsx');
    const commandMenu = read('src/components/CommandMenu.tsx');
    expect(navigation).not.toContain("href: '/command-center'");
    expect(navigation).toContain("href: '/today'");
    expect(navigation).toContain("href: '/tasks'");
    expect(navigation).toContain("href: '/reports-center'");
    expect(sidebar).toContain('NAV_GROUPS');
    expect(mobile).toMatch(/NAV_GROUPS|flattenNavigationItems/);
    expect(commandMenu).toContain('flattenNavigationItems');
  });

  it('keeps Today lightweight and source-backed', () => {
    const today = read('src/app/today/page.tsx');
    expect(today).toContain('useSmartTasks()');
    expect(today).toContain('prioritizeDailyWorkflow');
    expect(today).toContain('summarizeReportReadiness');
    expect(today).not.toContain('loadUserDataTables');
    expect(today).not.toContain("@/integrations/supabase/client");
    expect(today).not.toContain("@/app/reports-center");
    expect(today).toContain('href="/tasks"');
    expect(today).toContain('href="/reports-center"');
    expect(today).toContain("task.status === 'open'");
    expect(today).toContain("notice.status === 'unread'");
    expect(today).toContain("hasReportReadinessFailure ? '—' : `${reportSummary.ready}`");
  });

  it('preserves the complete Tasks Center controls and actions', () => {
    const tasks = read('src/app/tasks/page.tsx');
    expect(tasks).toContain("'thisWeek'");
    expect(tasks).toContain("'completed'");
    expect(tasks).toContain('setQuery');
    expect(tasks).toContain("setTaskStatus(task.id, 'done')");
    expect(tasks).toContain("setTaskStatus(task.id, 'dismissed')");
    expect(tasks).toContain('sourceDiagnostics');
    expect(tasks).toContain('reload');
  });

  it('keeps the full Reports Center and the Market Command Center identity intact', () => {
    const reports = read('src/app/reports-center/page.tsx');
    const market = read('src/lib/translations/market.ts');
    expect(reports).toContain('evaluateReportReadiness');
    expect(reports).toContain('exportCsv');
    expect(reports).toContain('printReport');
    expect(reports).toContain('preview');
    expect(market).toContain('Market Command Center');
    expect(market).toContain('Centre de commande des marchés');
  });
});

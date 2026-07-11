import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const reportsCenterPage = readFileSync(join(projectRoot, 'src/app/reports-center/page.tsx'), 'utf8');

describe('reports center workspace layout regression guard', () => {
  it('uses the exact seven peer views with URL-backed accessible tabs', () => {
    expect(reportsCenterPage).toContain(
      "const REPORT_WORKSPACE_TAB_IDS = ['recent', 'financial', 'markets', 'business', 'charity', 'ai-generated', 'archived'] as const;",
    );
    expect(reportsCenterPage).toContain('useUrlTabState<ReportWorkspaceTab>');
    expect(reportsCenterPage).toContain("param: 'tab'");
    expect(reportsCenterPage).toContain('idBase="reports-center-tabs"');
    expect(reportsCenterPage).toContain('<PageTabs');
    expect(reportsCenterPage).toContain('<PageTabPanel');
    expect(reportsCenterPage).toContain('sticky');
    expect(reportsCenterPage).toContain('mobileMode="auto"');
  });

  it('keeps status and report filters in one compact native disclosure', () => {
    expect(reportsCenterPage).toContain('<details className="report-filter-drawer no-print">');
    expect(reportsCenterPage).toContain('className="status-filter"');
    expect(reportsCenterPage).toContain('aria-pressed={statusFilter === option.id}');
    expect(reportsCenterPage).not.toContain('REPORT_VIEW_TABS');
    expect(reportsCenterPage).not.toContain('className="category-tabs no-print"');
    expect(reportsCenterPage).not.toContain('className="ready-panel no-print"');
  });

  it('mounts the heavy report preview only on demand and keeps print behavior intact', () => {
    expect(reportsCenterPage).toContain('{previewOpen && (');
    expect(reportsCenterPage).toContain('setPreviewOpen(true);');
    expect(reportsCenterPage).toContain('onClick={() => setPreviewOpen(false)}');
    expect(reportsCenterPage).toContain('window.print();');
  });

  it('shows honest empty states for views without stored data', () => {
    expect(reportsCenterPage).toContain("workspaceTab === 'ai-generated' || workspaceTab === 'archived'");
    expect(reportsCenterPage).toContain('extra.aiEmptyBody');
    expect(reportsCenterPage).toContain('extra.archivedEmptyBody');
  });
});

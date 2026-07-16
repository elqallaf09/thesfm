import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveWorkspacePageContainerVariant } from '@/config/workspaces/workspace-page-layout';
import { TR } from '@/lib/translations';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const traderTools = read('src/components/market-analysis/TraderToolsDashboard.tsx');
const marketPage = read('src/app/market-analysis/page.tsx');
const marketCommandCenter = read('src/components/market-analysis/marketCommandCenter.ts');
const marketTraderStyles = read('src/components/market-analysis/MarketTraderStyles.tsx');
const marketBaseStyles = read('src/components/market-analysis/MarketBaseStyles.tsx');
const marketPageStyles = read('src/components/market-analysis/market-page.css');
const economicCalendar = read('src/components/market-analysis/EconomicCalendarPanel.tsx');

describe('Phase 3.2 workspace width and layout consistency', () => {
  it('keeps the canonical Trading Tools deep link full-width and consistently translated', () => {
    expect(resolveWorkspacePageContainerVariant('/market-analysis?tab=traderTools')).toBe('full');
    expect(resolveWorkspacePageContainerVariant('/market-analysis#trader-tools')).toBe('full');
    expect(TR.market_trader_tools).toEqual({
      ar: 'أدوات التداول',
      en: 'Trading Tools',
      fr: 'Outils de trading',
    });
    expect(marketCommandCenter).toContain("tabs: ['traderTools', 'assetReport']");
    expect(marketCommandCenter).toContain("traderTools: 'market_trader_tools'");
    expect(marketPage).toContain("activeTab === 'traderTools'");
  });

  it('lets the shared full container own every Market Analysis outer measure', () => {
    const widthOwners = [
      traderTools,
      marketPage,
      marketTraderStyles,
      marketBaseStyles,
      marketPageStyles,
      economicCalendar,
    ];

    expect(marketPage).toContain('<WorkspacePageContainer as="main" variant="full" className="market-main">');
    for (const source of widthOwners) {
      expect(source).not.toMatch(/max-width:\s*1400px|max-inline-size:\s*1400px/);
    }
    expect(traderTools).toContain('max-inline-size: none');
    expect(traderTools).toContain('margin-inline: 0');
    expect(traderTools).toContain('container: trading-tools / inline-size');
    expect(traderTools).toContain('@container trading-tools (max-width: 1180px)');
    expect(traderTools).not.toMatch(/100vw|calc\(\s*100vw|--sidebar-(?:w|width)/);
  });

  it('keeps task-first DOM order aligned with the responsive visual order', () => {
    expect(traderTools.indexOf('<article className="trader-premium-main-card">'))
      .toBeLessThan(traderTools.indexOf('<aside className="trader-support-column"'));
    expect(traderTools).toMatch(/grid-template-areas:\s*"settings result"/);
    expect(traderTools).toMatch(/grid-template-areas:\s*"settings"\s*"result"/);
    expect(traderTools).toContain('role="tablist"');
    expect(traderTools).toContain('role="tabpanel"');
    expect(traderTools).not.toMatch(/<Sidebar\b|components\/Sidebar/);
  });

  it('removes local caps and stale sidebar compensation from dense active pages', () => {
    const educationExpenses = read('src/app/education/expenses/page.tsx');
    const educationHub = read('src/app/education/page.tsx');
    const educationInvestments = read('src/app/education/investments/page.tsx');
    const educationSavings = read('src/app/education/savings/page.tsx');
    const subscriptions = read('src/components/business-subscriptions/SubscriptionManagerPage.tsx');
    const charity = read('src/app/charity/charity.module.css');
    const projects = read('src/app/projects/page.tsx');
    const adminPages = [
      read('src/app/sfm-admin-control/AdminAnalyticsClient.tsx'),
      read('src/app/sfm-admin-control/admin-permissions/AdminPermissionsClient.tsx'),
      read('src/app/sfm-admin-control/companies/CompanyAdminClient.tsx'),
      read('src/app/sfm-admin-control/news-providers/NewsProvidersAdminClient.tsx'),
      read('src/app/sfm-admin-control/shariah/ShariahAdminClient.tsx'),
      read('src/app/sfm-admin-control/instagram-automation/InstagramAutomationClient.tsx'),
    ];

    expect(educationExpenses).not.toContain("maxWidth: '1000px'");
    expect(educationExpenses).not.toMatch(/(?:^|\n)\s*\*\s*\{/);
    expect(educationExpenses).toContain('className="expense-table-scroll" role="region" tabIndex={0}');
    expect(educationHub).not.toMatch(/max-width:\s*var\(--workspace-page-max-standard\)/);
    expect(educationHub).not.toMatch(/(?:^|\n)\s*header(?:\s|\{|button)/);
    for (const source of [educationInvestments, educationSavings]) {
      expect(source).not.toMatch(/width:\s*min\(1120px,\s*100%\)/);
      expect(source).toMatch(/-wrap\{width:100%;max-width:none;min-width:0;margin:0/);
    }
    expect(subscriptions).not.toMatch(/max-width:\s*1480px/);
    expect(charity).not.toContain('width: min(100%, 1480px)');
    expect(projects).not.toMatch(/main-ml|\.sidebar\s*\{/);
    expect(projects).not.toMatch(/(?:^|\n)\s*\*\s*\{/);
    for (const source of adminPages) {
      expect(source).not.toMatch(/max-width:\s*(?:1440|1480|1500)px|max-width:\s*min\(1500px/);
    }
  });

  it('preserves reading width and the shell-owned sidebar geometry', () => {
    const workspaceShell = read('src/components/WorkspaceShell.tsx');
    const containerStyles = read('src/components/layout/WorkspacePageContainer.module.css');
    const tokens = read('src/styles/tokens.css');

    expect(resolveWorkspacePageContainerVariant('/ebooks/candlestick-analysis')).toBe('reading');
    expect(resolveWorkspacePageContainerVariant('/ebooks')).toBe('wide');
    expect(tokens).toMatch(/--workspace-page-max-reading:\s*52rem;/);
    expect(containerStyles).toContain('max-inline-size: var(--workspace-page-max-reading)');
    expect(workspaceShell).toContain('grid-template-columns: var(--sidebar-w) minmax(0, 1fr)');
    expect(workspaceShell).not.toMatch(/100vw|calc\(\s*100vw|translateX\(/);

    for (const legalPage of ['src/app/terms/page.tsx', 'src/app/privacy/page.tsx']) {
      const source = read(legalPage);
      expect(source, legalPage).toMatch(/\.legal-hero,\.legal-content\{width:min\(100%,960px\)/);
      expect(source, legalPage).toMatch(/\.legal-hero p\{max-width:760px/);
    }
  });

  it('keeps data-table overflow contained and keyboard accessible', () => {
    const accessibleAdminScrollers = [
      ['src/app/sfm-admin-control/AdminAnalyticsClient.tsx', '.admin-table-wrap:focus-visible'],
      ['src/app/sfm-admin-control/admin-permissions/AdminPermissionsClient.tsx', '.ap-table-wrap:focus-visible'],
      ['src/app/sfm-admin-control/companies/CompanyAdminClient.tsx', '.ca-card:focus-visible'],
      ['src/app/sfm-admin-control/shariah/ShariahAdminClient.tsx', '.sharia-admin-table-shell:focus-visible'],
    ] as const;

    expect(traderTools).toContain('className="trader-table-wrap performance-table-wrap"');
    expect(traderTools).toContain('role="region"');
    expect(traderTools).toContain('tabIndex={0}');
    expect(marketPageStyles).toMatch(/\.performance-table-wrap\s*\{[\s\S]*?overflow-x:\s*auto/);
    expect(marketPageStyles).toMatch(/\.performance-table-wrap:focus-visible\s*\{[\s\S]*?var\(--focus-ring\)/);
    for (const [path, focusSelector] of accessibleAdminScrollers) {
      const source = read(path);
      expect(source, path).toContain('role="region"');
      expect(source, path).toMatch(/tabIndex=\{(?:0|filtered\.length > 0 \? 0 : undefined)\}/);
      expect(source, path).toContain(focusSelector);
    }
  });
});

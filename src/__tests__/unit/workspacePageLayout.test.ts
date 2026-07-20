import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_PAGE_LAYOUT_RULES,
  resolveWorkspacePageContainerVariant,
} from '@/config/workspaces/workspace-page-layout';

const root = process.cwd();

describe('workspace page layout policy', () => {
  it.each([
    ['/dashboard', 'full'],
    ['/setup', 'full'],
    ['/ai-analyst', 'full'],
    ['/ai-analyst/overview', 'full'],
    ['/ai-analyst/analyze/AAPL', 'full'],
    ['/ai-analyst/history?view=accuracy', 'full'],
    ['/symbol-details/AAPL', 'full'],
    ['/market-analysis', 'full'],
    ['/market-analysis?tab=traderTools', 'full'],
    ['/market-analysis#trader-tools', 'full'],
    ['/market-watchlist', 'full'],
    ['/market-alerts', 'full'],
    ['/watchlist', 'full'],
    ['/alerts', 'full'],
    ['/sfm-admin-control/companies', 'full'],
    ['/thesfm-trader-own/market-analysis/us', 'full'],
    ['/business-operations', 'full'],
    ['/business/subscriptions/client-a', 'full'],
    ['/business', 'full'],
    ['/charity', 'full'],
    ['/charity/donations', 'full'],
    ['/projects/project-a', 'full'],
    ['/projects/ad-calculator', 'standard'],
    ['/education/expenses', 'full'],
    ['/expenses/add', 'standard'],
    ['/income/add', 'standard'],
    ['/invest/add', 'standard'],
    ['/goals/add', 'standard'],
    ['/projects', 'wide'],
    ['/sharia-stocks', 'wide'],
    ['/banking-stocks', 'wide'],
    ['/energy-stocks', 'wide'],
    ['/growth-stocks', 'wide'],
    ['/defensive-stocks', 'wide'],
    ['/cyclical-stocks', 'wide'],
    ['/dividend-stocks', 'wide'],
    ['/tech-news', 'wide'],
    ['/gulf-news', 'wide'],
    ['/europe-news', 'wide'],
    ['/crypto-news', 'wide'],
    ['/investment-companies', 'wide'],
    ['/business-hub', 'wide'],
    ['/profile/companies', 'wide'],
    ['/education/investments', 'wide'],
    ['/education/savings', 'wide'],
    ['/site-map', 'wide'],
    ['/services/investment-firms', 'wide'],
    ['/profile', 'standard'],
    ['/mfa/verify', 'standard'],
    ['/wakeel', 'standard'],
    ['/guest', 'standard'],
    ['/company-listing/submit', 'standard'],
    ['/ebooks/candlestick-analysis', 'reading'],
  ])('assigns %s to the %s container', (pathname, expected) => {
    expect(resolveWorkspacePageContainerVariant(pathname)).toBe(expected);
  });

  it('uses a standard container for an unmapped authenticated route', () => {
    expect(resolveWorkspacePageContainerVariant('/future-workspace-route')).toBe('standard');
  });

  it('matches route segments without leaking prefixes into unrelated routes', () => {
    expect(resolveWorkspacePageContainerVariant('/business-tools')).toBe('standard');
    expect(resolveWorkspacePageContainerVariant('/ebookstore')).toBe('standard');
    expect(resolveWorkspacePageContainerVariant('/projects/')).toBe('wide');
    expect(resolveWorkspacePageContainerVariant('/projects/example')).toBe('full');
    expect(resolveWorkspacePageContainerVariant('/projects/ad-calculator')).toBe('standard');
  });

  it('keeps every route rule on the shared variant contract', () => {
    expect(WORKSPACE_PAGE_LAYOUT_RULES.length).toBeGreaterThan(40);
    expect(new Set(WORKSPACE_PAGE_LAYOUT_RULES.map(rule => rule.prefix)).size)
      .toBe(WORKSPACE_PAGE_LAYOUT_RULES.length);
    expect(new Set(WORKSPACE_PAGE_LAYOUT_RULES.map(rule => rule.variant)))
      .toEqual(new Set(['full', 'wide', 'standard', 'reading']));
  });

  it('makes WorkspaceShell the only application-shell width owner', () => {
    const source = readFileSync(resolve(root, 'src/components/WorkspaceShell.tsx'), 'utf8');
    expect(source).toContain('data-workspace-shell="true"');
    expect(source).toContain('<WorkspacePageContainer');
    expect(source).toContain('<Sidebar />');
    expect(source).toContain('grid-template-columns: minmax(0, 1fr) var(--app-sidebar-width)');
    expect(source).not.toMatch(/100vw|calc\(100vw|translateX\(/);
  });

  it('keeps active route hosts parent-relative instead of masking legacy shell geometry', () => {
    const activeRouteHostFiles = [
      'src/app/globals.css',
      'src/app/profile/page.tsx',
      'src/app/financial-theories/financial-theories.css',
      'src/components/energy-stocks/EnergyNewsPage.tsx',
    ];

    for (const file of activeRouteHostFiles) {
      const source = readFileSync(resolve(root, file), 'utf8');
      expect(source, file).not.toMatch(/100vw|calc\(\s*100v[wi]/i);
      expect(source, file).not.toMatch(
        /(?:margin|padding)-inline-start:\s*(?:230px|var\(--sidebar-w|calc\(\s*var\(--sidebar-w)/i,
      );
      expect(source, file).not.toMatch(/--sidebar-width:\s*var\(--sidebar-w/i);
    }
  });

  it('documents viewport sizing only in true fixed-overlay components', () => {
    const fixedOverlayFiles = [
      'src/components/ui/AppModal.tsx',
      'src/components/ui/LanguageSwitcher.tsx',
    ];

    for (const file of fixedOverlayFiles) {
      const source = readFileSync(resolve(root, file), 'utf8');
      expect(source, file).toMatch(/position:\s*['"]?fixed/i);
    }
  });

  it('keeps the active shared news shell parent-relative', () => {
    const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
    const start = css.indexOf('.news-page-shell[data-news-page-shell="true"] > main {');
    const end = css.indexOf('.news-page-shell[data-news-page-shell="true"] :is(', start);
    const newsLayoutContract = css.slice(start, end);
    expect(newsLayoutContract).toContain('width: 100% !important');
    expect(newsLayoutContract).not.toMatch(/100vw|--news-sidebar-width|margin-inline-start:\s*calc/);
  });

  it('migrates major news, screening, research, and directory surfaces to shared wide containers', () => {
    const wideSources = [
      'src/components/gulf-news/GulfNewsPage.tsx',
      'src/components/europe-news/EuropeNewsPage.tsx',
      'src/components/tech-news/TechNewsPage.tsx',
      'src/components/crypto-news/CryptoNewsPage.tsx',
      'src/components/banking-stocks/BankNewsPage.tsx',
      'src/components/cyclical-stocks/CyclicalStocksNewsPage.tsx',
      'src/components/defensive-stocks/DefensiveStocksNewsPage.tsx',
      'src/components/dividend-stocks/DividendStocksNewsPage.tsx',
      'src/components/energy-stocks/EnergyNewsPage.tsx',
      'src/components/growth-stocks/GrowthStocksNewsPage.tsx',
      'src/components/shariah-stocks/ShariahStocksNewsPage.tsx',
      'src/components/company-listings/CompanyCategoryPage.tsx',
      'src/components/company-listings/OwnerCompaniesPage.tsx',
      'src/components/company-listings/CompanyDetailsPage.tsx',
      'src/app/business-hub/page.tsx',
    ];

    for (const file of wideSources) {
      const source = readFileSync(resolve(root, file), 'utf8');
      expect(source, file).toContain('WorkspacePageContainer');
      expect(source, file).toContain('variant="wide"');
      expect(source, file).not.toMatch(/<Sidebar\b|from ['"]@\/components\/Sidebar['"]/);
      expect(source, file).not.toMatch(/calc\(\s*100vw|--sidebar-(?:w|width)/);
    }
  });

  it('keeps Market Analysis full-width without route-owned shell geometry', () => {
    const source = readFileSync(resolve(root, 'src/app/market-analysis/page.tsx'), 'utf8');
    expect(source).toContain('variant="full"');
    expect(source).not.toMatch(/<Sidebar\b|from ['"]@\/components\/Sidebar['"]/);
    expect(source).not.toMatch(/calc\(\s*100vw|--sidebar-(?:w|width)/);
  });

  it('does not let Energy override the shared header or shell', () => {
    const css = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
    const source = readFileSync(resolve(root, 'src/components/energy-stocks/EnergyNewsPage.tsx'), 'utf8');
    expect(css).not.toContain('body.energy-route-active .sfm-global-header');
    expect(css).not.toContain('body.energy-route-active .sfm-app-layout');
    expect(source).not.toContain('energy-route-active');
  });

  it('keeps Debts parent-relative inside the shared shell', () => {
    const source = readFileSync(resolve(root, 'src/app/debts/_components.tsx'), 'utf8');
    const start = source.indexOf('.debts-main {');
    const end = source.indexOf('.debts-main > *', start);
    const contract = source.slice(start, end);
    expect(contract).toContain('width: 100%');
    expect(contract).toContain('margin-inline: 0');
    expect(contract).not.toMatch(/--sidebar-w|calc\(/);
  });

  it('keeps the trader canvas inside the shared header and sidebar tracks', () => {
    const source = readFileSync(resolve(root, 'src/app/thesfm-trader-own/TraderShellPage.tsx'), 'utf8');
    expect(source).toContain('width: 100%');
    expect(source).toContain('var(--app-header-height)');
    expect(source).toContain('var(--workspace-page-padding-block');
    expect(source).not.toMatch(/position:\s*fixed|inset:\s*0|100vw|2147483000/);
    expect(source).not.toMatch(/html,\s*\n\s*body\s*\{/);
  });
});

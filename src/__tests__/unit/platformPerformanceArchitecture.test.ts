import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('platform performance architecture', () => {
  it('keeps the public shell out of the full translation and workspace graphs', () => {
    const layout = read('src/app/layout.tsx');
    const adaptiveLanguage = read('src/components/AdaptiveLanguageProvider.tsx');
    const publicLanguage = read('src/components/PublicLanguageProvider.tsx');
    const appLayout = read('src/components/AppLayout.tsx');

    expect(layout).toContain('<AdaptiveLanguageProvider>');
    expect(adaptiveLanguage).toContain('const WorkspaceLanguageProvider = dynamic(');
    expect(adaptiveLanguage).toContain("import('@/components/LanguageProvider')");
    expect(publicLanguage).not.toContain('import { t as translate, TR }');
    expect(publicLanguage).toContain('TR_AUTH');
    expect(publicLanguage).toContain('TR_COMMON');
    expect(publicLanguage).toContain('TR_NAV');
    expect(appLayout).toContain("import('@/components/WorkspaceShell')");
    expect(appLayout).not.toContain("from '@/components/Sidebar'");
    expect(appLayout).not.toContain("from '@/components/AppHeader'");
  });

  it('stabilizes global context values and reuses the initialized auth session for analytics', () => {
    const currencyProvider = read('src/lib/useCurrency.tsx');
    const tracker = read('src/components/AnalyticsTracker.tsx');
    const analytics = read('src/lib/analytics.ts');

    expect(currencyProvider).toContain('useCallback((code: string)');
    expect(currencyProvider).toContain('useMemo(() => ({ currency, setCurrency })');
    expect(tracker).toContain('accessToken: session?.access_token ?? null');
    expect(analytics).toContain("'accessToken' in payload");
  });

  it('does not auto-prefetch every route exposed by the deferred workspace shell', () => {
    const workspaceNavigation = [
      read('src/components/AppHeader.tsx'),
      read('src/components/Sidebar.tsx'),
      read('src/components/WorkspaceSwitcher.tsx'),
    ].join('\n');
    const links = workspaceNavigation.match(/<Link\b[\s\S]*?>/g) ?? [];

    expect(links.length).toBeGreaterThan(0);
    expect(links.every(link => link.includes('prefetch={false}'))).toBe(true);
  });

  it('loads only font weights used by the production UI and enforces CI budgets', () => {
    const layout = read('src/app/layout.tsx');
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const workflow = read('.github/workflows/ci.yml');
    const lighthouse = JSON.parse(read('.lighthouserc.json')) as { ci: { collect: { numberOfRuns: number } } };

    expect(layout).toContain("weight: ['400', '500', '600', '700']");
    expect(layout).not.toContain("weight: ['300'");
    expect(packageJson.scripts['check:performance-budget']).toBe('node scripts/check-performance-budget.mjs');
    expect(workflow).toContain('pnpm check:performance-budget');
    expect(lighthouse.ci.collect.numberOfRuns).toBe(3);
  });
});

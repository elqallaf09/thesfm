import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('saved-record ownership and failure-state recovery', () => {
  it.each([
    ['route dashboard mutations', 'src/components/finance/RouteDashboardPage.tsx'],
    ['project mutations', 'src/app/projects/page.tsx'],
    ['notification mutations', 'src/components/finance/NotificationsPage.tsx'],
    ['legacy charity donation deletes', 'src/app/charity/donations/page.tsx'],
    ['education expense mutations', 'src/app/education/expenses/page.tsx'],
  ])('%s retain explicit user ownership filters', (_label, path) => {
    const source = readSource(path);
    const mutations = source.match(/\.from\(['"][^'"]+['"]\)[\s\S]{0,260}?\.(?:update|delete)\([\s\S]{0,500}?(?=;|\n\s*(?:if|const|set|return)\b)/g) ?? [];
    expect(mutations.length).toBeGreaterThan(0);
    for (const mutation of mutations) {
      expect(mutation, `${path} has an unscoped user mutation`).toMatch(/\.eq\(['"]user_id['"]/);
    }
  });

  it('does not remove income from the UI when the persisted delete fails', () => {
    const source = readSource('src/app/income/page.tsx');
    expect(source).toContain("const { error } = await supabase.from('monthly_income_sources').delete().eq('id', row.id).eq('user_id', user.id)");
    expect(source).toContain('if (error) throw error');
    expect(source).toContain("showToast(tr('deleteFailed', lang))");
  });

  it('never treats an unresolved authenticated session as guest income', () => {
    const source = readSource('src/app/income/page.tsx');
    expect(source).toContain('const { user, isGuest, loading: authLoading } = useAuth()');
    expect(source).toContain('if (authLoading) return;');
    expect(source).toContain('if (isGuest) {');
    expect(source).not.toContain('if (isGuest || !user) {');
    expect(source).toContain(".insert({ ...payload, user_id: user.id })");
    expect(source.indexOf('if (error) throw error')).toBeLessThan(source.indexOf('const parent = data as IncomeRow'));
  });

  it('distinguishes project loading and provider failure from a real empty account', () => {
    const source = readSource('src/app/projects/page.tsx');
    expect(source).toContain("const [projectsLoading, setProjectsLoading] = useState(false)");
    expect(source).toContain("const [projectsLoadError, setProjectsLoadError] = useState('')");
    expect(source).toContain('!projectsLoading && !projectsLoadError && projects.length === 0');
    expect(source).toContain('role="alert"');
    expect(source).toContain('onClick={() => void loadProjects()}');
  });

  it('only commits project progress to local state after the owned database update succeeds', () => {
    const source = readSource('src/app/projects/page.tsx');
    const progressHandler = source.match(/const toggleProgress[\s\S]*?\n  };/)?.[0] ?? '';
    expect(progressHandler).toContain(".eq('user_id', user.id)");
    expect(progressHandler.indexOf('if (error)')).toBeLessThan(progressHandler.indexOf('setProjects('));
  });
});

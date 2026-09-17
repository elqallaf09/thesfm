import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('anonymous workspace shell behavior', () => {
  it('keeps intentionally public product pages out of authenticated chrome for visitors', () => {
    const routes = read('src/config/workspaces/public-shell-routes.ts');
    const layout = read('src/components/AppLayout.tsx');

    expect(routes).toContain("'/global-markets'");
    expect(routes).toContain("'/ai-analyst/overview'");
    expect(routes).toContain('isAnonymousPublicWorkspaceRoute');
    expect(layout).toContain('isAnonymousPublicWorkspaceRoute(pathname)');
    expect(layout).toContain('isAnonymousWorkspacePage && (authLoading || (!user && !isGuest))');
  });

  it('shows a sign-in action instead of profile/logout controls when no user exists', () => {
    const chip = read('src/components/UserChip.tsx');

    expect(chip).toContain('const showSignIn = !authLoading && !user');
    expect(chip).toContain('href="/login"');
    expect(chip).toContain("t('login_sign_in')");
    expect(chip).toContain('open && mounted && user ? createPortal');
  });
});

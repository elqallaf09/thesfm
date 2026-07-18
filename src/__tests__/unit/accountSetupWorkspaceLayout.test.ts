import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { NAV_GROUPS } from '@/components/navigationConfig';
import { resolveWorkspacePageContainerVariant } from '@/config/workspaces/workspace-page-layout';
import { SHARED_NAV_GROUP_IDS } from '@/config/workspaces/workspace-registry';
import { resolveActiveWorkspace } from '@/config/workspaces/workspace-resolver';
import { findSelectedNavigationItemId } from '@/lib/navigation/workspaceNavigationState';

const setupPage = readFileSync(join(process.cwd(), 'src/app/setup/page.tsx'), 'utf8');

describe('Account Setup workspace layout', () => {
  it('uses the shared full-width workspace page shell', () => {
    expect(resolveWorkspacePageContainerVariant('/setup')).toBe('full');
    expect(setupPage).toContain('<DashboardPageShell');
    expect(setupPage).toContain('className="account-setup-workspace-page"');
    expect(setupPage).toContain('contentClassName="setup-content"');
    expect(setupPage).toContain('.setup-content{display:grid;inline-size:100%;max-inline-size:none;margin-inline:0');
    expect(setupPage).not.toMatch(/max-w-(?:4xl|5xl)|max-(?:inline-size|width):(?:1024|1120|1280)px/);
  });

  it('keeps the form flexible and the progress panel bounded on desktop', () => {
    expect(setupPage).toContain(
      '.step-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,320px)',
    );
    expect(setupPage.indexOf('<div className="step-main">'))
      .toBeLessThan(setupPage.indexOf('<aside className="step-side"'));
    expect(setupPage).toContain('@media(max-width:960px)');
    expect(setupPage).toContain('.setup-hero,.step-layout,.financial-snapshot-card{grid-template-columns:minmax(0,1fr)}');
  });

  it('uses logical direction and keeps the desktop sticky panel below shared chrome', () => {
    expect(setupPage).toContain('<div className="setup-page" dir={dir}>');
    expect(setupPage).toContain('text-align:start');
    expect(setupPage).toContain(
      'top:calc(var(--app-header-height) + var(--workspace-page-padding-block))',
    );
    expect(setupPage).toContain('.step-side{position:static;top:auto}');
    expect(setupPage).not.toMatch(/100vw|calc\([^)]*(?:sidebar|100vw)|translateX\(/i);
  });

  it('preserves Personal Finance navigation and the shared Account group', () => {
    expect(resolveActiveWorkspace('/setup').id).toBe('personal-finance');
    expect(findSelectedNavigationItemId('/setup', NAV_GROUPS)).toBeNull();
    expect(SHARED_NAV_GROUP_IDS).toEqual(['account']);
  });
});

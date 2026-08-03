import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const header = read('src/components/AppHeader.tsx');
const switcher = read('src/components/WorkspaceSwitcher.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const mobile = read('src/components/MobileMenu.tsx');
const shell = read('src/components/WorkspaceShell.tsx');
const tokens = read('src/styles/tokens.css');
const themes = read('src/styles/themes.css');
const commandCluster = read('src/components/header/CommandCluster.tsx');

describe('global header workspace navigation contract', () => {
  it('renders workspace switching only in the sticky global header', () => {
    expect(header).toContain('<WorkspaceSwitcher adminAccess={adminAccess}');
    expect(header).toContain('position: sticky');
    expect(header).toContain("grid-template-areas: 'brand workspaces actions'");
    expect(sidebar).not.toMatch(/WorkspaceSwitcher|sfm-workspace/);
    expect(mobile).not.toMatch(/WorkspaceSwitcher|sfm-mobile-workspace/);
  });

  it('derives the active workspace from the current route without selected state', () => {
    expect(switcher).toContain("const pathname = usePathname() || '/'");
    expect(switcher).toContain('resolveActiveWorkspace(pathname)');
    expect(switcher).toContain("aria-current={current ? 'page' : undefined}");
    expect(switcher).toContain('href={destination}');
    expect(switcher).not.toMatch(/useState|localStorage|sessionStorage|router\.push/);
  });

  it('permission-filters Administration and routes limited admins to an accessible entry', () => {
    expect(switcher).toContain('getFirstAccessibleAdminRoute(adminAccess)');
    expect(switcher).toContain('availableWorkspaces({ isAdmin: Boolean(administrationEntryRoute) })');
    expect(switcher).toContain("workspace.id === 'administration'");
    expect(switcher).toContain('administrationEntryRoute!');
    expect(switcher).not.toContain("resolveActiveWorkspace('/dashboard')");
  });

  it('keeps full registry labels at every width and scrolls the active tab into view', () => {
    expect(switcher).toContain('{workspace.labels[locale]}');
    expect(switcher).toContain('className="sfm-workspace-label-full"');
    expect(switcher).not.toMatch(/MOBILE_WORKSPACE_LABELS|sfm-workspace-label-mobile/);
    expect(switcher).toContain("@media (max-width: 900px)");
    expect(switcher).toContain('min-height: 52px');
    // 'center' (not 'nearest') guarantees the active destination clears both
    // rail edges with margin instead of landing flush against one.
    expect(switcher).toContain("activeLink.scrollIntoView({ block: 'nearest', inline: 'center' })");
    expect(switcher).toContain('overflow-x: auto');
    expect(header).not.toMatch(/\.sfm-global-menu-button\s*\{[^}]*(?:width|min-width|height):\s*40px/);
  });

  it('keeps the required global controls in a predictable header order', () => {
    // Top-level composition: brand, workspace navigation, command cluster.
    const brandIndex = header.indexOf('<BrandLockup');
    const workspaceIndex = header.indexOf('<WorkspaceSwitcher');
    const commandClusterIndex = header.indexOf('<CommandCluster');

    expect([brandIndex, workspaceIndex, commandClusterIndex])
      .toEqual([...new Set([brandIndex, workspaceIndex, commandClusterIndex])].sort((a, b) => a - b));
    expect(brandIndex).toBeGreaterThanOrEqual(0);

    // Command cluster's own internal order: search anchors it, followed by
    // language/theme/density and the account/notifications entry points.
    const searchIndex = commandCluster.indexOf('<CommandSearchTrigger');
    const languageIndex = commandCluster.indexOf('<LanguageSwitcher');
    const themeIndex = commandCluster.indexOf('<ThemeToggle />');
    const notificationsIndex = commandCluster.indexOf('<HeaderIconAction');
    const accountIndex = commandCluster.indexOf('<AccountMenuTrigger');

    expect([searchIndex, languageIndex, themeIndex, notificationsIndex, accountIndex])
      .toEqual([...new Set([searchIndex, languageIndex, themeIndex, notificationsIndex, accountIndex])].sort((a, b) => a - b));
    expect(searchIndex).toBeGreaterThanOrEqual(0);
  });

  it('keeps the mobile drawer modal lifecycle keyboard- and focus-safe', () => {
    expect(mobile).toContain("document.body.style.overflow = 'hidden'");
    expect(mobile).toContain("document.body.classList.add('sfm-mobile-lock')");
    expect(mobile).toContain("document.body.classList.remove('sfm-mobile-lock')");
    expect(mobile).toContain("if (event.key === 'Escape')");
    expect(mobile).toContain('onCloseRef.current()');
    expect(mobile).toContain("if (event.key !== 'Tab') return");
    expect(mobile).toContain("element.setAttribute('inert', '')");
    expect(mobile).toContain('isVisibleFocusable(previouslyFocused)');
    expect(mobile).toContain('focusTarget?.focus({ preventScroll: true })');
    expect(mobile).toContain("aria-modal={open ? 'true' : undefined}");
  });

  it('defines the reserved-band and z-index layer tokens once in the foundation', () => {
    for (const token of [
      '--app-header-height',
      '--app-header-inset-block',
      '--app-header-inset-inline',
      '--app-header-gap-block',
      '--z-header',
      '--z-sidebar',
    ]) {
      expect(tokens.includes(`${token}:`), token).toBe(true);
    }
  });

  it('renders the header as a sticky, rounded, glowing floating card via tokens', () => {
    expect(header).toContain('position: sticky');
    expect(header).toContain('inset-block-start: var(--app-header-inset-block)');
    expect(header).toContain('z-index: var(--z-header');
    expect(header).toContain('border-radius: var(--radius-card)');
    expect(header).toContain('background: var(--header-surface');
    expect(header).toContain('box-shadow: var(--header-shadow), var(--header-edge-glow)');
    // Floating margin uses the inset tokens on all sides.
    expect(header).toContain('margin: var(--app-header-inset-block) var(--app-header-inset-inline) var(--app-header-gap-block)');
    // Header surface + edge glow are themed for both light and dark.
    expect(themes.match(/--header-surface:/g)).toHaveLength(2);
    expect(themes.match(/--header-edge-glow:/g)).toHaveLength(2);
  });

  it('collapses to an edge-to-edge bar on mobile so it never overflows the viewport', () => {
    expect(header).toMatch(/@media \(max-width: 767px\)/);
    expect(header).toContain('--app-header-inset-block: 0px');
    expect(header).toContain('border-radius: 0');
  });

  it('groups utility controls without heavy per-control borders', () => {
    expect(header).toContain('border: 1px solid var(--header-control-border, transparent)');
    expect(header).toContain('background: var(--header-control-bg');
  });

  it('reserves the full header band in the shell and offsets the sidebar below it', () => {
    expect(shell).toContain('min-height: calc(100dvh - var(--app-header-height))');
    expect(sidebar).toContain('inset-block-start:var(--app-header-height)');
    expect(sidebar).toContain('z-index:var(--z-sidebar');
    // Sidebar height also derives from the reserved band (no overlap with the header).
    expect(sidebar).toContain('height:calc(100dvh - var(--app-header-height)');
  });
});

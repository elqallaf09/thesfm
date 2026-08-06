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
const globals = read('src/app/globals.css');

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
    expect(switcher).toContain('min-height: 44px');
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

  it('renders the header as a sticky, flush navy dock with a single teal accent rule (institutional-fintech treatment)', () => {
    expect(header).toContain('position: sticky');
    expect(header).toContain('inset-block-start: 0');
    expect(header).toContain('z-index: var(--z-header');
    expect(header).toContain('border-block-end: 2px solid var(--accent)');
    expect(header).toContain('border-radius: 0');
    expect(header).toContain('background: var(--header-surface)');
    expect(header).toContain('color: var(--header-dock-text)');
    // No floating-card treatment: no rounded corners, no drop shadow, no
    // inset margin — the dock is flush and edge-to-edge, not a capped card.
    expect(header).not.toMatch(/border-radius:\s*var\(--radius-card\)/);
    expect(header).not.toMatch(/box-shadow:\s*var\(--header-shadow\)/);
    expect(themes.match(/--header-surface:/g)).toHaveLength(2);
    expect(themes.match(/--header-dock-bg:/g)).toHaveLength(2);
    expect(themes.match(/--header-dock-text:/g)).toHaveLength(2);
  });

  it('is a flush, full-width bar at every viewport (not a mobile-only edge-to-edge override)', () => {
    expect(header).toContain('--app-header-inset-block: 0px');
    expect(header).toContain('--app-header-inset-inline: 0px');
    expect(header).toContain('--app-header-gap-block: 0px');
    expect(header).toContain('margin: 0');
    expect(header).toMatch(/@media \(max-width: 767px\)/);
  });

  it('groups utility controls as a ghost cluster — transparent until hovered, no shared chip background', () => {
    expect(header).toContain("border-color: transparent");
    expect(header).toContain('color: var(--header-dock-icon)');
    expect(header).toContain('background: var(--header-dock-hover-bg)');
    // No shared command-bar chip/box behind the cluster anymore.
    expect(header).not.toMatch(/--header-control-bg/);
    expect(header).not.toMatch(/--header-control-border/);
  });

  it('gives the higher-priority .sfm-global-actions guard the header-aware ghost-cluster tokens, not the page-general ones', () => {
    // globals.css carries an !important :where(...) guard scoped to
    // .sfm-global-actions controls (language trigger, theme toggle, density
    // toggle, user chip, notifications). Because it's !important, it wins
    // the cascade over AppHeader.tsx's own (non-!important) ghost-cluster
    // rule above regardless of specificity - so it must independently carry
    // the header's own --header-dock-*/--accent tokens itself. Using the
    // page-general --foreground/--primary tokens here made every one of
    // these controls nearly invisible in light mode specifically:
    // --foreground resolves to a near-black page-text color, rendered
    // against the header's own permanently-dark-navy surface regardless of
    // page theme. It only looked fine in dark mode by coincidence, since
    // dark mode's --foreground happens to be light too.
    const guardMatch = globals.match(
      /:where\(\.sfm-global-actions \.sfm-command-trigger\.compact,[^)]*\)\s*\{([^}]*)\}/,
    );
    expect(guardMatch, '.sfm-global-actions ghost-cluster guard must exist in globals.css').not.toBeNull();
    const guardBody = guardMatch![1];
    expect(guardBody).toContain('color: var(--header-dock-icon) !important');
    expect(guardBody).not.toMatch(/color:\s*var\(--foreground\)/);

    const hoverMatch = globals.match(
      /:where\(\.sfm-global-actions \.sfm-command-trigger\.compact,[^)]*\):is\(:hover, :focus-visible\)\s*\{([^}]*)\}/,
    );
    expect(hoverMatch, '.sfm-global-actions ghost-cluster hover guard must exist in globals.css').not.toBeNull();
    const hoverBody = hoverMatch![1];
    expect(hoverBody).toContain('background: var(--header-dock-hover-bg) !important');
    expect(hoverBody).toContain('color: var(--accent) !important');
    expect(hoverBody).not.toMatch(/color:\s*var\(--primary\)/);
    // --header-control-hover was referenced only as a fallback here and
    // never actually defined anywhere - a dead reference that silently
    // always fell back to --primary-soft. Guard against it coming back.
    expect(globals).not.toMatch(/--header-control-hover/);
  });

  it('reserves the full header band in the shell and offsets the sidebar below it', () => {
    expect(shell).toContain('min-height: calc(100dvh - var(--app-header-height))');
    expect(sidebar).toContain('inset-block-start:var(--app-header-height)');
    expect(sidebar).toContain('z-index:var(--z-sidebar');
    // Sidebar height also derives from the reserved band (no overlap with the header).
    expect(sidebar).toContain('height:calc(100dvh - var(--app-header-height)');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const header = read('src/components/AppHeader.tsx');
const switcher = read('src/components/WorkspaceSwitcher.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const mobile = read('src/components/MobileMenu.tsx');

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
    expect(switcher).toContain("aria-current={current ? 'true' : undefined}");
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

  it('provides responsive trilingual labels and keeps the active tab visible', () => {
    expect(switcher).toContain("'personal-finance': { ar: 'المالية', en: 'Finance', fr: 'Finances' }");
    expect(switcher).toContain("'markets-trading': { ar: 'الأسواق', en: 'Markets', fr: 'Marchés' }");
    expect(switcher).toContain("'business-projects': { ar: 'الأعمال', en: 'Business', fr: 'Affaires' }");
    expect(switcher).toContain("administration: { ar: 'الإدارة', en: 'Admin', fr: 'Admin' }");
    expect(switcher).toContain("@media (max-width: 900px)");
    expect(switcher).toContain('min-height: 44px');
    expect(switcher).toContain("activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' })");
    expect(switcher).toContain('overflow-x: auto');
    expect(header).not.toMatch(/\.sfm-global-menu-button\s*\{[^}]*(?:width|min-width|height):\s*40px/);
  });

  it('keeps the required global controls in a predictable header order', () => {
    const brandIndex = header.indexOf('className="sfm-global-brand"');
    const workspaceIndex = header.indexOf('<WorkspaceSwitcher');
    const searchIndex = header.indexOf('<CommandMenuButton />');
    const languageIndex = header.indexOf('<LanguageSwitcher');
    const themeIndex = header.indexOf('<ThemeToggle />');
    const notificationsIndex = header.indexOf('className="sfm-global-notifications"');
    const accountIndex = header.indexOf('<UserChip />');

    expect([brandIndex, workspaceIndex, searchIndex, languageIndex, themeIndex, notificationsIndex, accountIndex])
      .toEqual([...new Set([brandIndex, workspaceIndex, searchIndex, languageIndex, themeIndex, notificationsIndex, accountIndex])].sort((a, b) => a - b));
    expect(brandIndex).toBeGreaterThanOrEqual(0);
  });
});

import { expect, test, type Locator, type Page } from '@playwright/test';
import { authenticateBrowserRole } from './authenticated-browser';

const adminAuthConfigured = Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);

const ENGLISH_WORKSPACES = [
  { id: 'personal-finance', label: 'Personal Finance' },
  { id: 'markets-trading', label: 'Markets & Trading' },
  { id: 'business-projects', label: 'Business & Projects' },
  { id: 'administration', label: 'Administration' },
] as const;

// The optional credentialed assertion must not place account identifiers in
// Playwright artifacts. The guest assertions remain fully observable in CI.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

async function enterGuestDashboard(page: Page) {
  const response = await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);

  const guestButton = page.locator('button.guest-btn').first();
  await expect(guestButton).toBeVisible();
  await expect(guestButton).toBeEnabled({ timeout: 20_000 });
  await guestButton.press('Enter');
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await expect(page.locator('header.sfm-global-header')).toBeVisible();
  await expect(page.locator('main[data-dashboard-executive="true"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await setLanguage(page, 'en');
}

async function setLanguage(page: Page, language: 'ar' | 'en' | 'fr') {
  await page.evaluate(nextLanguage => {
    window.localStorage.setItem('sfm_lang', nextLanguage);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
  }, language);

  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.sfmLang)).toBe(language);
  await expect.poll(async () => page.evaluate(() => document.documentElement.lang)).toBe(language);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth, body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

async function computedTypography(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      family: style.fontFamily,
      size: Number.parseFloat(style.fontSize),
      weight: Number.parseInt(style.fontWeight, 10),
      lineHeight: Number.parseFloat(style.lineHeight),
    };
  });
}

function expectUiFont(family: string) {
  const normalized = family.replace(/[^a-z]/gi, '').toLowerCase();
  expect(normalized).toContain('ibmplexsansarabic');
  expect(normalized).not.toContain('ibmplexmono');
}

async function expectGuestWorkspaceTabs(page: Page) {
  const workspaceNavigation = page.locator('header.sfm-global-header .sfm-workspace-navigation');
  await expect(workspaceNavigation).toHaveCount(1);
  await expect(page.locator('.sfm-workspace-navigation')).toHaveCount(1);
  await expect(page.locator('aside.sfm-shared-sidebar .sfm-workspace-navigation')).toHaveCount(0);

  for (const workspace of ENGLISH_WORKSPACES.slice(0, 3)) {
    const tab = workspaceNavigation.locator(`[data-workspace-id="${workspace.id}"]`);
    await expect(tab).toHaveCount(1);
    await expect(tab).toContainText(workspace.label);
  }

  // Administration is intentionally absent for guests. The credentialed test
  // below verifies its fourth label for authorized administrators.
  await expect(workspaceNavigation.locator('[data-workspace-id="administration"]')).toHaveCount(0);
}

test.describe('Phase 3.1 global header and typography', () => {
  test('desktop has one authoritative global-controls row and header-only workspaces', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop chrome coverage runs in the desktop project.');
    await enterGuestDashboard(page);

    const header = page.locator('header.sfm-global-header');
    const sidebar = page.locator('aside.sfm-shared-sidebar');
    await expect(header).toBeVisible();
    await expect(sidebar).toBeVisible();

    await expect(page.locator('.sfm-language-trigger:visible')).toHaveCount(1);
    await expect(page.locator('.sfm-user-chip:visible')).toHaveCount(1);
    await expect(header.locator('.sfm-language-trigger:visible')).toHaveCount(1);
    await expect(header.locator('.sfm-user-chip:visible')).toHaveCount(1);
    await expect(page.locator('main .sfm-language-trigger, main .sfm-user-chip')).toHaveCount(0);
    await expect(page.locator('main[data-dashboard-executive="true"] > .topbar')).toHaveCount(0);

    await expectGuestWorkspaceTabs(page);
    await expect(page.getByRole('button', { name: /^(Basic View|Advanced View)$/i })).toHaveCount(0);
    await expect(page.locator('[data-view-mode], [data-navigation-mode]')).toHaveCount(0);

    const layoutPosition = await page.evaluate(() => {
      const headerElement = document.querySelector<HTMLElement>('header.sfm-global-header');
      const shell = document.querySelector<HTMLElement>('.sfm-app-shell-grid');
      return {
        headerBottom: headerElement?.getBoundingClientRect().bottom ?? -1,
        shellTop: shell?.getBoundingClientRect().top ?? -2,
      };
    });
    // Variant 03: the floating header keeps --app-header-gap-block (10px)
    // of intentional breathing room before the shell grid begins.
    const headerShellGap = layoutPosition.shellTop - layoutPosition.headerBottom;
    expect(headerShellGap).toBeGreaterThanOrEqual(-1);
    expect(headerShellGap).toBeLessThanOrEqual(12);

    const bodyTypography = await computedTypography(page.locator('body'));
    const workspaceTypography = await computedTypography(header.locator('.sfm-workspace-tab').first());
    const sidebarTypography = await computedTypography(sidebar.locator('.sfm-shared-item:visible, .sfm-shared-subitem:visible').first());
    const languageTypography = await computedTypography(header.locator('.sfm-language-trigger'));
    const accountTypography = await computedTypography(header.locator('.sfm-user-chip'));

    for (const typography of [bodyTypography, workspaceTypography, sidebarTypography, languageTypography, accountTypography]) {
      expectUiFont(typography.family);
    }
    expect(bodyTypography.size).toBeGreaterThanOrEqual(15);
    expect(workspaceTypography.size).toBeGreaterThanOrEqual(14);
    expect(sidebarTypography.size).toBeGreaterThanOrEqual(14);
    expect(languageTypography.size).toBeGreaterThanOrEqual(14);
    expect(accountTypography.size).toBeGreaterThanOrEqual(14);
    expect(workspaceTypography.weight).toBeGreaterThanOrEqual(500);
    expect(workspaceTypography.weight).toBeLessThanOrEqual(600);
    expect(sidebarTypography.lineHeight).toBeGreaterThanOrEqual(20);
    await expectNoHorizontalOverflow(page);
  });

  test('mobile adapts global controls into one drawer without moving workspace tabs', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile drawer coverage runs in mobile projects.');
    await enterGuestDashboard(page);

    const header = page.locator('header.sfm-global-header');
    const workspaceNavigation = header.locator('.sfm-workspace-navigation');
    const menuButton = header.locator('.sfm-global-menu-button');
    await expect(menuButton).toBeVisible();
    await expect(workspaceNavigation).toBeVisible();
    await expectGuestWorkspaceTabs(page);

    // Header-owned controls are hidden at the mobile breakpoint; no page-level
    // fallback is allowed to recreate the removed second row.
    await expect(page.locator('.sfm-language-trigger:visible')).toHaveCount(0);
    await expect(page.locator('.sfm-user-chip:visible')).toHaveCount(0);
    await expect(page.locator('main .sfm-language-trigger, main .sfm-user-chip')).toHaveCount(0);
    await expect(page.locator('main[data-dashboard-executive="true"] > .topbar')).toHaveCount(0);

    await menuButton.click();
    const drawer = page.locator('#sfm-mobile-menu');
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.sfm-language-trigger:visible')).toHaveCount(1);
    await expect(drawer.locator('.sfm-user-chip:visible')).toHaveCount(1);
    await expect(page.locator('.sfm-language-trigger:visible')).toHaveCount(1);
    await expect(page.locator('.sfm-user-chip:visible')).toHaveCount(1);
    await expect(drawer.locator('.sfm-workspace-navigation')).toHaveCount(0);
    await expect(page.locator('.sfm-workspace-navigation')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /^(Basic View|Advanced View)$/i })).toHaveCount(0);

    const navItems = drawer.locator('.sfm-mobile-nav-item:visible, .sfm-mobile-parent-item:visible, .sfm-mobile-subitem:visible');
    await expect(navItems.first()).toBeVisible();
    const navTypography = await computedTypography(navItems.first());
    const drawerLanguageTypography = await computedTypography(drawer.locator('.sfm-language-trigger'));
    const drawerAccountTypography = await computedTypography(drawer.locator('.sfm-user-chip'));
    for (const typography of [navTypography, drawerLanguageTypography, drawerAccountTypography]) {
      expectUiFont(typography.family);
      expect(typography.size).toBeGreaterThanOrEqual(14);
    }

    const mobileGeometry = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('#sfm-mobile-menu');
      const workspaceTabs = document.querySelector<HTMLElement>('header.sfm-global-header .sfm-workspace-tabs');
      const controls = Array.from(panel?.querySelectorAll<HTMLElement>('.sfm-language-trigger, .sfm-user-chip') ?? []);
      return {
        panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 999,
        tabsOverflowX: workspaceTabs ? getComputedStyle(workspaceTabs).overflowX : '',
        controlHeights: controls.map(control => control.getBoundingClientRect().height),
      };
    });
    expect(mobileGeometry.panelOverflow).toBeLessThanOrEqual(1);
    expect(['auto', 'scroll']).toContain(mobileGeometry.tabsOverflowX);
    expect(mobileGeometry.controlHeights.every(height => height >= 44)).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test('Arabic is RTL while English and French remain LTR', async ({ page }) => {
    test.setTimeout(60_000);
    await enterGuestDashboard(page);

    for (const [language, direction] of [
      ['ar', 'rtl'],
      ['en', 'ltr'],
      ['fr', 'ltr'],
    ] as const) {
      await setLanguage(page, language);
      await expect.poll(async () => page.evaluate(() => document.documentElement.dir)).toBe(direction);
      const headerTypography = await computedTypography(page.locator('header.sfm-global-header'));
      expectUiFont(headerTypography.family);
      await expectNoHorizontalOverflow(page);
    }
  });
});

test.describe('Phase 3.1 permission-gated Administration workspace', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    if (adminAuthConfigured && !isMobile) await authenticateBrowserRole(page, 'admin');
  });

  test('authorized administrators see all four full workspace labels in the header', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The full authorized label set is asserted once in the desktop project.');
    test.skip(!adminAuthConfigured, 'Configure E2E admin credentials to exercise the permission-gated fourth workspace.');

    const response = await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page.locator('header.sfm-global-header')).toBeVisible();
    await setLanguage(page, 'en');

    const workspaceNavigation = page.locator('header.sfm-global-header .sfm-workspace-navigation');
    await expect(workspaceNavigation.locator('.sfm-workspace-tab')).toHaveCount(4);
    for (const workspace of ENGLISH_WORKSPACES) {
      const tab = workspaceNavigation.locator(`[data-workspace-id="${workspace.id}"]`);
      await expect(tab).toHaveCount(1);
      await expect(tab).toContainText(workspace.label);
    }
    await expect(page.locator('aside.sfm-shared-sidebar .sfm-workspace-navigation')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});

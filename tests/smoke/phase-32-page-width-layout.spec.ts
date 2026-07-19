import { expect, test, type Page } from '@playwright/test';

const VIEWPORT_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1600, 1920] as const;

async function enterGuestWorkspace(page: Page) {
  const response = await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const guestButton = page.locator('button.guest-btn').first();
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
}

async function setLanguage(page: Page, language: 'ar' | 'en' | 'fr') {
  await page.evaluate(nextLanguage => {
    window.localStorage.setItem('sfm_lang', nextLanguage);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
  }, language);
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.sfmLang),
    { timeout: 20_000 },
  ).toBe(language);
}

async function openTradingTools(page: Page) {
  const response = await page.goto('/ai-analyst/overview?legacy=market&tab=traderTools', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).toHaveURL(/\/ai-analyst\/overview\?legacy=market&tab=traderTools/);
  await expect(page.locator('.sfm-app-main[data-workspace-page-variant="full"]')).toBeVisible();
  await expect(page.locator('.trader-premium-dashboard')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => document.fonts.ready);
}

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

test.describe('Phase 3.2 desktop geometry', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'The desktop geometry checks run once in desktop Chromium.');

  test.beforeEach(async ({ page }) => {
    await enterGuestWorkspace(page);
    await setLanguage(page, 'en');
    await openTradingTools(page);
  });

  test('Trading Tools fills the market workspace at representative widths', async ({ page }) => {
    test.setTimeout(90_000);

    for (const width of VIEWPORT_WIDTHS) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
      await expect(page.locator('.trader-premium-dashboard h2')).toContainText('Trading Tools');
      await expectNoPageOverflow(page);

      const geometry = await page.evaluate(() => {
        const dashboard = document.querySelector<HTMLElement>('.trader-premium-dashboard');
        const activeDashboard = document.querySelector<HTMLElement>('.market-active-dashboard');
        const marketMain = document.querySelector<HTMLElement>('.market-main');
        const appMain = document.querySelector<HTMLElement>('.sfm-app-main');
        const contentWidth = (element: HTMLElement | null) => {
          if (!element) return 0;
          const style = getComputedStyle(element);
          return element.clientWidth
            - Number.parseFloat(style.paddingInlineStart || '0')
            - Number.parseFloat(style.paddingInlineEnd || '0');
        };
        return {
          dashboardWidth: dashboard?.getBoundingClientRect().width ?? 0,
          activeDashboardContentWidth: contentWidth(activeDashboard),
          activeDashboardOuterWidth: activeDashboard?.getBoundingClientRect().width ?? 0,
          marketMainContentWidth: contentWidth(marketMain),
          marketMainOuterWidth: marketMain?.getBoundingClientRect().width ?? 0,
          appMainContentWidth: contentWidth(appMain),
          maxWidth: dashboard ? getComputedStyle(dashboard).maxWidth : '',
          appMainMaxWidth: appMain ? getComputedStyle(appMain).maxWidth : '',
          appMainVariant: appMain?.dataset.workspacePageVariant,
          clipped: dashboard ? dashboard.scrollWidth > dashboard.clientWidth + 1 : true,
        };
      });

      expect(geometry.maxWidth).toBe('none');
      expect(geometry.appMainMaxWidth).toBe('none');
      expect(geometry.appMainVariant).toBe('full');
      expect(Math.abs(geometry.dashboardWidth - geometry.activeDashboardContentWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.activeDashboardOuterWidth - geometry.marketMainContentWidth)).toBeLessThanOrEqual(2);
      expect(Math.abs(geometry.marketMainOuterWidth - geometry.appMainContentWidth)).toBeLessThanOrEqual(2);
      expect(geometry.clipped).toBe(false);
    }
  });

  test('expanded and collapsed sidebars resize the same full-width dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const dashboard = page.locator('.trader-premium-dashboard');
    const expandedWidth = await dashboard.evaluate(element => element.getBoundingClientRect().width);
    const collapseButton = page.getByRole('button', { name: 'Collapse sidebar' });
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();
    await expect(page.locator('aside.sfm-shared-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await expect.poll(() => dashboard.evaluate(element => element.getBoundingClientRect().width))
      .toBeGreaterThan(expandedWidth + 100);
    await expectNoPageOverflow(page);
  });
});

test.describe('Phase 3.2 multilingual and contextual navigation', () => {
  test.beforeEach(async ({ page }) => {
    await enterGuestWorkspace(page);
    await setLanguage(page, 'en');
    await openTradingTools(page);
  });

  test('contextual tools stay accessible and multilingual without duplicate page navigation', async ({ page, isMobile }) => {
    test.setTimeout(90_000);
    const toolTabs = page.locator('.trader-tool-switcher[role="tablist"]');
    const selectedTab = toolTabs.getByRole('tab', { selected: true });
    await expect(selectedTab).toHaveCount(1);
    await expect(selectedTab).toHaveAttribute('aria-controls', 'trader-active-tool-panel');
    await expect(page.locator('#trader-active-tool-panel[role="tabpanel"]')).toBeVisible();
    const initialTabLabel = await selectedTab.innerText();
    const nextTool = page.locator('.trader-switcher-arrow').last();
    await nextTool.focus();
    await expect(nextTool).toBeFocused();
    await nextTool.press('Enter');
    await expect.poll(async () => toolTabs.getByRole('tab', { selected: true }).innerText())
      .not.toBe(initialTabLabel);

    const translations = [
      ['ar', 'rtl', 'أدوات التداول'],
      ['en', 'ltr', 'Trading Tools'],
      ['fr', 'ltr', 'Outils de trading'],
    ] as const;

    for (const [language, direction, label] of translations) {
      await setLanguage(page, language);
      await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(direction);
      await expect(page.locator('.trader-premium-dashboard')).toHaveAttribute('dir', direction);
      await expect(page.locator('.trader-premium-dashboard h2')).toContainText(label);
      await expect(page.locator('.trader-tool-switcher[role="tablist"]')).toHaveCount(1);
      await expect(page.locator('.trader-active-workspace[role="tabpanel"]')).toHaveCount(1);
      await expect(page.locator('aside.sfm-shared-sidebar')).toHaveCount(isMobile ? 0 : 1);
      const mobileMenuTrigger = page.locator('.sfm-global-menu-button');
      await expect(mobileMenuTrigger).toHaveCount(1);
      if (isMobile) await expect(mobileMenuTrigger).toBeVisible();
      else await expect(mobileMenuTrigger).toBeHidden();
      await expect(page.locator('.market-active-dashboard aside nav, .trader-premium-dashboard aside nav')).toHaveCount(0);
      await expect(page.locator('.market-active-dashboard :is(.market-sidebar, .trader-sidebar, .page-local-sidebar, [data-page-navigation="global"])')).toHaveCount(0);
      await expectNoPageOverflow(page);
    }
  });
});

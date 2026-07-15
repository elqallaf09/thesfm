import { expect, test, type Page } from '@playwright/test';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(60_000);

async function enterGuestDashboard(page: Page) {
  const response = await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const guestButton = page.locator('button.guest-btn').first();
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await expect(page.locator('header.sfm-global-header')).toBeVisible();
  await setLanguage(page, 'en');
}

async function setLanguage(page: Page, language: 'ar' | 'en' | 'fr') {
  await page.evaluate(nextLanguage => {
    window.localStorage.setItem('sfm_lang', nextLanguage);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
  }, language);
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(language);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

test.describe('Phase 3.3 premium desktop sidebar', () => {
  test('uses grouped route navigation, one active page, and an accessible collapsed rail', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop rail coverage runs in the desktop project.');
    await enterGuestDashboard(page);

    const marketsTab = page.locator('[data-workspace-id="markets-trading"]');
    await expect(marketsTab).toBeVisible();
    await marketsTab.click();
    await page.waitForURL(/\/market-analysis(?:\?|$)/);

    const sidebar = page.locator('aside.sfm-shared-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(sidebar.locator('[aria-current="page"]')).toContainText('Market Analysis');
    await expect(sidebar.locator('.sfm-workspace-navigation')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Basic View|Advanced View)$/i })).toHaveCount(0);

    const newsToggle = sidebar.getByRole('button', { name: 'Market News' });
    const categoriesToggle = sidebar.getByRole('button', { name: 'Stock Categories' });
    await expect(newsToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(categoriesToggle).toHaveAttribute('aria-expanded', 'false');
    await categoriesToggle.click();
    await expect(categoriesToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(sidebar.getByRole('link', { name: 'Energy News' })).toBeVisible();

    await page.goto('/dividend-stocks', { waitUntil: 'domcontentloaded' });
    const deepCategoriesToggle = sidebar.getByRole('button', { name: 'Stock Categories' });
    await expect(deepCategoriesToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(deepCategoriesToggle).not.toHaveAttribute('aria-current', 'page');
    const deepActiveLink = sidebar.getByRole('link', { name: 'High Income Stocks News' });
    await expect(deepActiveLink).toHaveAttribute('aria-current', 'page');
    await expect.poll(() => deepActiveLink.evaluate(element => {
      const scroll = element.closest('.sfm-shared-primary-scroll');
      if (!scroll) return false;
      const itemRect = element.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      return itemRect.top >= scrollRect.top - 1 && itemRect.bottom <= scrollRect.bottom + 1;
    })).toBe(true);

    const parentAndActiveStates = await Promise.all([
      deepCategoriesToggle.evaluate(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, weight: Number.parseInt(style.fontWeight, 10) };
      }),
      deepActiveLink.evaluate(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, weight: Number.parseInt(style.fontWeight, 10) };
      }),
    ]);
    expect(parentAndActiveStates[0].background).not.toBe(parentAndActiveStates[1].background);
    expect(parentAndActiveStates[0].weight).toBeLessThan(parentAndActiveStates[1].weight);

    const normalState = await sidebar.locator('[aria-current="page"]').evaluate(element => {
      const style = getComputedStyle(element);
      const before = getComputedStyle(element, '::before');
      return {
        background: style.backgroundColor,
        weight: Number.parseInt(style.fontWeight, 10),
        indicatorWidth: Number.parseFloat(before.width),
      };
    });
    expect(normalState.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(normalState.weight).toBeGreaterThanOrEqual(600);
    expect(normalState.indicatorWidth).toBeGreaterThanOrEqual(3);

    const collapse = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    await collapse.focus();
    await collapse.click();
    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await expect(sidebar.getByRole('button', { name: 'Expand sidebar' })).toBeFocused();
    const activeLink = sidebar.locator('[aria-current="page"]');
    await activeLink.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(activeLink).toBeFocused();
    await expect(page.getByRole('tooltip', { name: 'High Income Stocks News' })).toBeVisible();
    await expect(sidebar.locator('#sfm-sidebar-group-support a')).not.toHaveCount(0);

    await expect.poll(() => sidebar.evaluate(element => element.getBoundingClientRect().width))
      .toBeLessThanOrEqual(73.5);
    const railGeometry = await sidebar.evaluate(element => ({
      width: element.getBoundingClientRect().width,
      overflow: element.scrollWidth - element.clientWidth,
    }));
    expect(railGeometry.width).toBeGreaterThanOrEqual(72);
    expect(railGeometry.overflow).toBeLessThanOrEqual(16);
    await expectNoHorizontalOverflow(page);
  });

  test('stays unclipped across the required responsive widths and French LTR', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The full responsive-width matrix runs once in desktop Chromium.');
    test.setTimeout(90_000);
    await enterGuestDashboard(page);

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await expectNoHorizontalOverflow(page);

      if (width < 768) {
        await expect(page.locator('.sfm-global-menu-button')).toBeVisible();
        await expect(page.locator('aside.sfm-shared-sidebar')).toHaveCount(0);
        continue;
      }

      const sidebar = page.locator('aside.sfm-shared-sidebar');
      await expect(sidebar).toBeVisible();
      await expect(sidebar.locator('[aria-current="page"]')).toHaveCount(1);
      const clippedLabels = await sidebar.locator('.sfm-shared-label:visible').evaluateAll(elements =>
        elements.filter(element => element.scrollWidth > element.clientWidth + 1).length);
      expect(clippedLabels).toBe(0);
    }

    await setLanguage(page, 'fr');
    const sidebar = page.locator('aside.sfm-shared-sidebar');
    await expect(sidebar).toHaveAttribute('dir', 'ltr');
    await expect(sidebar.getByRole('link', { name: "Page d'accueil" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Phase 3.3 premium mobile drawer', () => {
  test('traps and restores focus, locks the page, and exposes semantic navigation links', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Drawer coverage runs in mobile projects.');
    await enterGuestDashboard(page);

    const trigger = page.locator('.sfm-global-menu-button');
    await trigger.focus();
    await trigger.click();

    const drawer = page.locator('#sfm-mobile-menu');
    const close = drawer.locator('.sfm-mobile-close');
    await expect(drawer).toBeVisible({ timeout: 20_000 });
    await expect(close).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(page.locator('.sfm-app-shell-grid')).toHaveAttribute('inert', '');
    await expect(drawer.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(drawer.getByRole('link', { name: 'Home Page' })).toHaveAttribute('href', '/dashboard');
    await expect(drawer.getByText('Administration', { exact: true })).toHaveCount(0);

    const targetHeights = await drawer.locator(
      '.sfm-mobile-close, .sfm-command-trigger, .sfm-theme-toggle, .sfm-density-toggle, .sfm-language-trigger, .sfm-user-chip, .sfm-mobile-nav-item:visible, .sfm-mobile-parent-item:visible, .sfm-mobile-subitem:visible, .sfm-mobile-support-link:visible, .sfm-mobile-group-toggle:visible, .sfm-mobile-global-toggle:visible',
    ).evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
    expect(targetHeights.length).toBeGreaterThan(3);
    expect(targetHeights.every(height => height >= 43.5)).toBe(true);

    const tabbable = drawer.locator(
      'a[href]:visible, button:not([disabled]):visible, input:not([disabled]):visible, [tabindex]:not([tabindex="-1"]):visible',
    );
    const firstTabbable = tabbable.first();
    const lastTabbable = tabbable.last();
    await lastTabbable.focus();
    await page.keyboard.press('Tab');
    await expect(firstTabbable).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');

    await trigger.click();
    await expect(drawer).toBeVisible({ timeout: 20_000 });
    await drawer.getByRole('link', { name: 'Home Page' }).click();
    await expect(drawer).toBeHidden();

    await trigger.click();
    await expect(drawer).toBeVisible({ timeout: 20_000 });
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(drawer).toBeHidden();
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement
        && (active.matches('.sfm-global-header .sfm-command-trigger') || active.id === 'main-content');
    })).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test('closes before command search and keeps account/support reachable on short screens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Drawer coverage runs in mobile projects.');
    await page.setViewportSize({ width: 390, height: 620 });
    await enterGuestDashboard(page);
    await page.goto('/dividend-stocks', { waitUntil: 'domcontentloaded' });

    const trigger = page.locator('.sfm-global-menu-button');
    await trigger.click();
    const drawer = page.locator('#sfm-mobile-menu');
    await expect(drawer).toBeVisible({ timeout: 20_000 });

    const utilities = drawer.locator('.sfm-mobile-utilities');
    await expect(utilities).toBeVisible();
    const stockCategories = drawer.locator('#sfm-mobile-group-stock-categories-heading');
    await expect(stockCategories).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.getByRole('link', { name: 'High Income Stocks News' }))
      .toHaveAttribute('aria-current', 'page');
    const accountToggle = utilities.getByRole('button', { name: 'Account' });
    await expect(accountToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(utilities.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(utilities.getByRole('link', { name: 'Security & Privacy' })).toBeVisible();
    await expect(utilities.getByRole('button', { name: 'Logout' })).toBeVisible();
    const supportToggle = utilities.getByRole('button', { name: 'Support' });
    await supportToggle.click();
    await expect(supportToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(utilities.getByRole('link', { name: 'Help Center' })).toBeVisible();
    const utilityGeometry = await utilities.evaluate(element => ({
      bottom: element.getBoundingClientRect().bottom,
      viewport: window.innerHeight,
      overflow: element.scrollWidth - element.clientWidth,
    }));
    expect(utilityGeometry.bottom).toBeLessThanOrEqual(utilityGeometry.viewport + 1);
    expect(utilityGeometry.overflow).toBeLessThanOrEqual(1);

    await drawer.locator('.sfm-mobile-search .sfm-command-trigger').click();
    await expect(drawer).toBeHidden();
    const commandDialog = page.locator('.sfm-command-dialog');
    await expect(commandDialog).toBeVisible();
    await expect(commandDialog).not.toHaveAttribute('inert', '');
    await expect(commandDialog.locator('[cmdk-input]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(commandDialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expectNoHorizontalOverflow(page);
  });

  test('preserves the premium drawer hierarchy in Arabic RTL dark mode', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Drawer coverage runs in mobile projects.');
    await enterGuestDashboard(page);
    await page.evaluate(() => window.localStorage.setItem('the-sfm-theme', 'dark'));
    await setLanguage(page, 'ar');
    await page.goto('/dividend-stocks', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await page.locator('.sfm-global-menu-button').click();

    const drawer = page.locator('#sfm-mobile-menu');
    await expect(drawer).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => drawer.evaluate(element => getComputedStyle(element).direction)).toBe('rtl');
    await expect(drawer.locator('#sfm-mobile-group-stock-categories-heading'))
      .toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.locator('[aria-current="page"]')).toHaveCount(1);

    const panelGeometry = await drawer.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        leftGap: Math.abs(rect.left),
        rightGap: Math.abs(window.innerWidth - rect.right),
        background: style.backgroundColor,
        overflow: element.scrollWidth - element.clientWidth,
      };
    });
    expect(panelGeometry.rightGap).toBeLessThan(panelGeometry.leftGap);
    expect(panelGeometry.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(panelGeometry.overflow).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  });
});

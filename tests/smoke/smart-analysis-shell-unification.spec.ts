import { expect, test, type Page } from '@playwright/test';

const qaEnabled = process.env.SFM_LOCAL_TRADER_QA === '1';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(90_000);

const TERMINAL_DASHBOARD = '/thesfm-trader-own/dashboard';

function terminalFrame(page: Page) {
  return page.frameLocator('iframe[title="SFM Smart Analyzer"]');
}

async function openTerminal(page: Page, path = TERMINAL_DASHBOARD) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(400);
  await expect(page.locator('header.sfm-global-header')).toBeVisible();
  await expect(page.locator('iframe[title="SFM Smart Analyzer"]')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

test.describe('Smart Analysis shell unification', () => {
  test.skip(!qaEnabled, 'Set SFM_LOCAL_TRADER_QA=1 for the authenticated terminal shell.');

  test('desktop shows one shared sticky sidebar below the header and no terminal sidebar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop shell coverage runs in the desktop project.');
    await openTerminal(page);

    // Exactly one navigation column: the shared shell sidebar.
    const sharedSidebar = page.locator('aside.sfm-shared-sidebar');
    await expect(sharedSidebar).toHaveCount(1);
    await expect(sharedSidebar).toBeVisible();
    await expect(terminalFrame(page).locator('.terminal-sidebar')).toBeHidden();

    // Shared sidebar carries the terminal navigation with the active route.
    await expect(sharedSidebar.locator(`a[href="${TERMINAL_DASHBOARD}"]`)).toHaveAttribute('aria-current', 'page');
    await expect(sharedSidebar.locator('a[href="/thesfm-trader-own/markets"]')).toBeVisible();
    await expect(sharedSidebar.locator('a[href="/thesfm-trader-own/watchlist"]')).toBeVisible();

    // Sticky below the global header, no overlap.
    await expect.poll(() => page.evaluate(() => {
      const sidebar = document.querySelector('aside.sfm-shared-sidebar');
      return sidebar ? getComputedStyle(sidebar).position : '';
    })).toBe('sticky');
    const headerBox = await page.locator('header.sfm-global-header').boundingBox();
    const sidebarBox = await sharedSidebar.boundingBox();
    expect(headerBox && sidebarBox && sidebarBox.y >= headerBox.y + headerBox.height - 1).toBeTruthy();

    await expectNoHorizontalOverflow(page);
  });

  test('sidebar navigation keeps the terminal iframe alive and in sync', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop shell coverage runs in the desktop project.');
    await openTerminal(page);

    // Mark the terminal window; a reload would lose the marker.
    const frame = terminalFrame(page);
    await expect(frame.locator('#terminal-content')).toBeVisible();
    await frame.locator('body').evaluate(() => {
      (window as Window & { __sfmShellMarker?: number }).__sfmShellMarker = 1;
    });

    await page.locator(`aside.sfm-shared-sidebar a[href="/thesfm-trader-own/markets"]`).click();
    await page.waitForURL(/\/thesfm-trader-own\/markets(?:\?|$)/);
    await expect(page.locator(`aside.sfm-shared-sidebar a[href="/thesfm-trader-own/markets"]`))
      .toHaveAttribute('aria-current', 'page');

    const marker = await frame.locator('body').evaluate(() =>
      (window as Window & { __sfmShellMarker?: number }).__sfmShellMarker ?? 0);
    expect(marker).toBe(1);
  });

  test('terminal-internal navigation updates the parent URL and active state', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop shell coverage runs in the desktop project.');
    await openTerminal(page);

    const frame = terminalFrame(page);
    const alertsChip = frame.locator('.topbar-actions a[data-route="alerts"]');
    await expect(alertsChip).toBeVisible();
    await alertsChip.click();

    await page.waitForURL(/\/thesfm-trader-own\/alerts(?:\?|$)/);
    await expect(page.locator('aside.sfm-shared-sidebar a[href="/thesfm-trader-own/alerts"]'))
      .toHaveAttribute('aria-current', 'page');
  });

  test('no horizontal overflow or header overlap from 320px to 1920px', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Viewport sweep runs in the desktop project.');
    await openTerminal(page);
    for (const width of [320, 375, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('header.sfm-global-header')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test('mobile keeps the shell drawer and the terminal bottom navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTerminal(page);

    await expect(page.locator('aside.sfm-shared-sidebar')).toBeHidden();
    const menuButton = page.locator('header.sfm-global-header button.sfm-global-menu-button');
    await expect(menuButton).toBeVisible();

    const frame = terminalFrame(page);
    await expect(frame.locator('.terminal-sidebar')).toBeHidden();
    await expect(frame.locator('nav.mobile-nav')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('terminal follows the shell theme in light and dark', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Theme parity runs in the desktop project.');
    await openTerminal(page);
    const frame = terminalFrame(page);

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate(value => window.localStorage.setItem('the-sfm-theme', value), theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('iframe[title="SFM Smart Analyzer"]')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
        .toBe(theme === 'dark');
      await expect.poll(() => frame.locator('html').getAttribute('data-theme')).toBe(theme);
    }
  });

  test('RTL and LTR both render the unified shell without a second navigation column', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Direction sweep runs in the desktop project.');
    await openTerminal(page);

    for (const [language, dir] of [['ar', 'rtl'], ['en', 'ltr']] as const) {
      await page.evaluate(nextLanguage => {
        window.localStorage.setItem('sfm_lang', nextLanguage);
        window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLanguage } }));
      }, language);
      await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(dir);
      await expect(page.locator('aside.sfm-shared-sidebar')).toHaveCount(1);
      await expect(terminalFrame(page).locator('.terminal-sidebar')).toBeHidden();
      await expectNoHorizontalOverflow(page);
    }
  });
});

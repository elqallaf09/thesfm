import { expect, test, type Locator, type Page } from '@playwright/test';

type Locale = 'ar' | 'en' | 'fr';
type Theme = 'light' | 'dark';

const WORKSPACES = [
  { id: 'personal-finance', labels: { ar: 'الإدارة المالية', en: 'Personal Finance', fr: 'Finances personnelles' } },
  { id: 'markets-trading', labels: { ar: 'الأسواق والتداول', en: 'Markets & Trading', fr: 'Marchés et trading' } },
  { id: 'business-projects', labels: { ar: 'الأعمال والمشاريع', en: 'Business & Projects', fr: 'Affaires et projets' } },
] as const;

const MOBILE_WIDTHS = [320, 375, 390, 430, 768, 1024] as const;
const transparent = 'rgba(0, 0, 0, 0)';

test.use({ trace: 'off', video: 'off' });

async function enterGuestDashboard(page: Page, theme: Theme = 'light') {
  await page.addInitScript(nextTheme => {
    window.localStorage.setItem('the-sfm-theme', nextTheme);
    window.localStorage.setItem('theme', nextTheme);
  }, theme);

  const response = await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const guestButton = page.locator('button.guest-btn').first();
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await expect(page.locator('header.sfm-global-header .sfm-workspace-navigation')).toBeVisible();
  await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /\blight\b/);
}

async function setLanguage(page: Page, locale: Locale) {
  await page.evaluate(nextLocale => {
    window.localStorage.setItem('sfm_lang', nextLocale);
    window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: nextLocale } }));
  }, locale);
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(locale);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(locale === 'ar' ? 'rtl' : 'ltr');
}

async function styleSnapshot(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    const icon = element.querySelector('svg');
    const indicator = getComputedStyle(element, '::after');
    return {
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      border: style.borderColor,
      color: style.color,
      cursor: style.cursor,
      height: element.getBoundingClientRect().height,
      iconColor: icon ? getComputedStyle(icon).color : '',
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      shadow: style.boxShadow,
      transform: style.transform,
      indicatorContent: indicator.content,
      indicatorHeight: Number.parseFloat(indicator.height),
    };
  });
}

async function expectNoPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

test.describe('mobile workspace switcher affordance', () => {
  test.beforeEach(({ browserName }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-desktop' || browserName !== 'chromium',
      'Focused state matrix runs once in desktop Chromium.',
    );
  });

  test('all destinations have persistent button surfaces and complete pointer and keyboard states', async ({ page }) => {
    await enterGuestDashboard(page);
    await setLanguage(page, 'en');

    const navigation = page.locator('header.sfm-global-header .sfm-workspace-navigation');
    const tabs = navigation.locator('.sfm-workspace-tab');
    await expect(tabs).toHaveCount(3);

    for (const workspace of WORKSPACES) {
      const tab = navigation.locator(`[data-workspace-id="${workspace.id}"]`);
      await expect(tab).toHaveAttribute('href', /\/.+/);
      await expect(tab).toContainText(workspace.labels.en);
      const state = await styleSnapshot(tab);
      expect(state.background !== transparent || state.backgroundImage !== 'none').toBe(true);
      expect(state.border).not.toBe(transparent);
      expect(state.shadow).not.toBe('none');
      expect(state.cursor).toBe('pointer');
      expect(state.height).toBeGreaterThanOrEqual(44);
      expect(state.iconColor).not.toBe(transparent);
    }

    const selected = navigation.locator('[aria-current="page"]');
    const inactive = navigation.locator('[data-workspace-id="markets-trading"]');
    await expect(selected).toHaveCount(1);
    const selectedState = await styleSnapshot(selected);
    const inactiveState = await styleSnapshot(inactive);
    expect(`${selectedState.background}|${selectedState.backgroundImage}`).not.toBe(`${inactiveState.background}|${inactiveState.backgroundImage}`);
    expect(selectedState.indicatorContent).not.toBe('none');
    expect(selectedState.indicatorHeight).toBeGreaterThanOrEqual(3);

    await inactive.hover();
    const hoverState = await styleSnapshot(inactive);
    expect(`${hoverState.background}|${hoverState.border}|${hoverState.shadow}`)
      .not.toBe(`${inactiveState.background}|${inactiveState.border}|${inactiveState.shadow}`);

    const box = await inactive.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    const pressedState = await styleSnapshot(inactive);
    expect(pressedState.shadow).not.toBe(hoverState.shadow);
    expect(pressedState.transform).not.toBe('none');
    await page.mouse.move(0, 0);
    await page.mouse.up();

    await page.locator('.sfm-global-brand').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(inactive).toBeFocused();
    const focusState = await styleSnapshot(inactive);
    expect(focusState.outlineStyle).not.toBe('none');
    expect(focusState.outlineWidth).toBeGreaterThanOrEqual(2);
  });

  test('light and dark modes retain distinct inactive surfaces and a dominant selected item', async ({ page }) => {
    await enterGuestDashboard(page, 'light');
    await setLanguage(page, 'fr');
    const inactive = page.locator('[data-workspace-id="markets-trading"]');
    const active = page.locator('.sfm-workspace-navigation [aria-current="page"]');
    const lightInactive = await styleSnapshot(inactive);
    const lightActive = await styleSnapshot(active);

    await page.locator('.sfm-global-header .sfm-theme-toggle:not(.sfm-density-toggle)').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    const darkInactive = await styleSnapshot(page.locator('[data-workspace-id="markets-trading"]'));
    const darkActive = await styleSnapshot(page.locator('.sfm-workspace-navigation [aria-current="page"]'));

    for (const state of [lightInactive, lightActive, darkInactive, darkActive]) {
      expect(state.background !== transparent || state.backgroundImage !== 'none').toBe(true);
      expect(state.border).not.toBe(transparent);
      expect(state.color).not.toBe(state.background);
    }
    expect(`${darkInactive.background}|${darkInactive.border}`).not.toBe(`${lightInactive.background}|${lightInactive.border}`);
    expect(`${lightActive.background}|${lightActive.backgroundImage}`).not.toBe(`${lightInactive.background}|${lightInactive.backgroundImage}`);
    expect(`${darkActive.background}|${darkActive.backgroundImage}`).not.toBe(`${darkInactive.background}|${darkInactive.backgroundImage}`);
  });

  test('Arabic, English, and French stay aligned and reachable at every required width', async ({ page }) => {
    test.setTimeout(90_000);
    await enterGuestDashboard(page);
    const navigation = page.locator('header.sfm-global-header .sfm-workspace-navigation');

    for (const width of MOBILE_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const locale of ['ar', 'en', 'fr'] as const) {
        await setLanguage(page, locale);
        await expect(navigation).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');

        for (const workspace of WORKSPACES) {
          const tab = navigation.locator(`[data-workspace-id="${workspace.id}"]`);
          await expect(tab).toContainText(workspace.labels[locale]);
          await tab.scrollIntoViewIfNeeded();
          const geometry = await tab.evaluate(element => {
            const icon = element.querySelector('svg');
            const label = element.querySelector('span');
            const itemRect = element.getBoundingClientRect();
            const iconRect = icon?.getBoundingClientRect();
            const labelRect = label?.getBoundingClientRect();
            return {
              height: itemRect.height,
              iconCenter: iconRect ? iconRect.top + iconRect.height / 2 : 0,
              labelCenter: labelRect ? labelRect.top + labelRect.height / 2 : 999,
              text: element.textContent,
            };
          });
          expect(geometry.height).toBeGreaterThanOrEqual(44);
          expect(Math.abs(geometry.iconCenter - geometry.labelCenter)).toBeLessThanOrEqual(2);
          expect(geometry.text).not.toMatch(/^[a-z0-9_.-]+$/i);
        }
        await expectNoPageOverflow(page);
      }
    }
  });

  test('the full link area switches routes exactly once and updates the current workspace', async ({ page }) => {
    await enterGuestDashboard(page);
    await setLanguage(page, 'en');

    const navigations: string[] = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname);
    });

    const marketTab = page.locator('[data-workspace-id="markets-trading"]');
    const marketBox = await marketTab.boundingBox();
    expect(marketBox).not.toBeNull();
    await page.mouse.click(marketBox!.x + 2, marketBox!.y + marketBox!.height / 2);
    await page.waitForURL(/\/market-analysis(?:\?|$)/);
    await expect(page.locator('[data-workspace-id="markets-trading"]')).toHaveAttribute('aria-current', 'page');
    expect(navigations.filter(path => path === '/market-analysis')).toHaveLength(1);

    const businessTab = page.locator('[data-workspace-id="business-projects"]');
    const businessBox = await businessTab.boundingBox();
    expect(businessBox).not.toBeNull();
    await page.mouse.click(businessBox!.x + businessBox!.width - 2, businessBox!.y + businessBox!.height / 2);
    await page.waitForURL(/\/investment-companies(?:\?|$)/);
    await expect(page.locator('[data-workspace-id="business-projects"]')).toHaveAttribute('aria-current', 'page');
    expect(navigations.filter(path => path === '/investment-companies')).toHaveLength(1);
  });
});

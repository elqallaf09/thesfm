import { expect, test, type Page } from '@playwright/test';

import { TR_MARKET } from '../../src/lib/translations/market';

type Locale = 'ar' | 'en' | 'fr';

const GROUP_TRANSLATION_KEYS = [
  'market_command_group_overview',
  'market_command_group_analyze',
  'market_command_group_intelligence',
  'market_command_group_calendar_sessions',
  'market_command_group_watchlist_alerts',
  'market_command_group_tools_reports',
] as const;

const HEAVY_PANEL_SELECTOR = [
  '.trader-premium-dashboard',
  '.economic-calendar-dashboard',
  '.trading-sessions-dashboard',
  '.technical-analysis-panel',
  '.technical-dashboard',
  '.news-sentiment-section',
].join(', ');

const LAZY_API_PATHS = [
  '/api/market/performance',
  '/api/market/economic-calendar',
  '/api/market/sentiment',
  '/api/market/sentiment/health',
  '/api/market/technical-analysis',
  '/api/market/compare',
] as const;

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.setTimeout(120_000);

async function stubMarketApis(page: Page) {
  const requestedPaths: string[] = [];
  const synchronizedAt = new Date().toISOString();

  await page.route('**/api/market-state/system**', async route => {
    requestedPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        feature: 'system',
        status: 'fresh',
        provider: {
          selected: null,
          attempted: [],
          fallbackUsed: false,
          reason: null,
          context: 'general',
          timestamp: synchronizedAt,
          cached: false,
          delayed: false,
        },
        freshness: {
          asOf: synchronizedAt,
          ageSeconds: 0,
          isStale: false,
          isDelayed: false,
          thresholdSeconds: 60,
        },
        completeness: { requested: 1, returned: 1, missing: 0, percentage: 100 },
        data: {
          generatedAt: synchronizedAt,
          overall: 'connected',
          providers: {},
          capabilityMatrix: [],
          providerProfiles: [{
            provider: 'fmp',
            role: 'primary',
            status: 'connected',
            configured: true,
            latencyMs: 1,
            successRatePercent: 100,
            lastSuccessAt: synchronizedAt,
            lastErrorAt: null,
            rateLimitedUntil: null,
          }],
          configuration: null,
          featuresSucceeded: ['quotes'],
          featuresDegraded: [],
          featuresFailed: [],
          catalog: {
            discovered: 0,
            metadataAvailable: 0,
            liveQuoteAvailable: null,
            delayedQuoteAvailable: null,
            staleRecords: 0,
            duplicates: 0,
            malformed: 0,
            failed: 0,
            lastSyncAt: synchronizedAt,
          },
          lastSynchronizedAt: synchronizedAt,
          delivery: { source: 'live', cached: false, delayed: false, reason: null },
        },
        warnings: [],
        errors: [],
      }),
    });
  });

  await page.route('**/api/market/**', async route => {
    requestedPaths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        success: false,
        available: false,
        code: 'PROVIDER_UNAVAILABLE',
        message: '',
        results: [],
        items: [],
        events: [],
        data: [],
      }),
    });
  });

  return requestedPaths;
}

async function enterGuestWorkspace(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('sfm_lang')) localStorage.setItem('sfm_lang', 'en');
    if (!localStorage.getItem('the-sfm-theme')) localStorage.setItem('the-sfm-theme', 'light');
  });

  const response = await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  const guestButton = page.locator('button.guest-btn').first();
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await expect(page.locator('main[data-dashboard-executive="true"]')).toBeVisible();
  await expect(page.locator('header.sfm-global-header')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sfm_guest_mode')))
    .toBe('true');
  await expect.poll(async () => (await page.context().cookies())
    .some(cookie => cookie.name === 'sfm_guest' && cookie.value === 'true'))
    .toBe(true);
}

async function openMarketCommandCenter(page: Page, path = '/market-analysis') {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page).toHaveURL(new RegExp(`/market-analysis(?:[?#]|$)`));
  await expect(page.locator('#market-command-center-title')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('nav[data-command-group][data-active-tab]')).toBeVisible();
}

async function prepareGuestMarket(page: Page, path = '/market-analysis') {
  const requests = await stubMarketApis(page);
  await enterGuestWorkspace(page);
  await openMarketCommandCenter(page, path);
  return requests;
}

async function setLanguage(page: Page, language: Locale) {
  await page.evaluate(nextLanguage => {
    localStorage.setItem('sfm_lang', nextLanguage);
    window.dispatchEvent(new CustomEvent('sfm-language-change', {
      detail: { lang: nextLanguage },
    }));
  }, language);

  await expect.poll(() => page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }))).toEqual({ lang: language, dir: language === 'ar' ? 'rtl' : 'ltr' });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement;
    return Math.max(root.scrollWidth, document.body.scrollWidth) - root.clientWidth;
  })).toBeLessThanOrEqual(4);
}

async function semanticSurfaceSnapshot(page: Page) {
  return page.evaluate(() => {
    const title = document.querySelector<HTMLElement>('#market-command-center-title');
    const header = title?.closest<HTMLElement>('header');
    const strip = document.querySelector<HTMLElement>('section[aria-label="Market and data status"]');
    const indicator = strip?.querySelector<HTMLElement>('[role="status"]');
    if (!header || !strip || !indicator) throw new Error('Command-center semantic surfaces are missing.');

    const headerStyle = getComputedStyle(header);
    const stripStyle = getComputedStyle(strip);
    const indicatorStyle = getComputedStyle(indicator);
    return {
      headerBackground: headerStyle.backgroundColor,
      headerColor: headerStyle.color,
      headerBorder: headerStyle.borderColor,
      stripBackground: stripStyle.backgroundColor,
      stripBorder: stripStyle.borderColor,
      indicatorBackground: indicatorStyle.backgroundColor,
      indicatorColor: indicatorStyle.color,
    };
  });
}

test.describe('Phase 4.1A Market Command Center foundation', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(Boolean(isMobile), 'Phase 4.1A uses desktop Chromium with an explicit 320px viewport check.');
  });

  test('renders the command-center header, six groups, status strip, and one set of global controls', async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|react error #418|server rendered html/i.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });
    page.on('pageerror', error => {
      if (/hydration|react error #418|server rendered html/i.test(error.message)) {
        hydrationErrors.push(error.message);
      }
    });

    await prepareGuestMarket(page);

    await expect(page.getByRole('heading', {
      level: 1,
      name: TR_MARKET.market_command_center_title.en,
    })).toBeVisible();

    const navigation = page.getByRole('navigation', {
      name: TR_MARKET.market_command_primary_navigation.en,
    });
    const primaryTabs = navigation.getByRole('tab');
    await expect(primaryTabs).toHaveCount(6);
    expect((await primaryTabs.allTextContents()).map(label => label.trim())).toEqual(
      GROUP_TRANSLATION_KEYS.map(key => TR_MARKET[key].en),
    );
    await expect(navigation).toHaveAttribute('data-command-group', 'overview');
    await expect(navigation).toHaveAttribute('data-active-tab', 'overview');
    await expect(navigation.getByRole('tab', { selected: true })).toHaveCount(1);
    await expect(navigation.getByRole('tab', { selected: true }))
      .toHaveText(TR_MARKET.market_command_group_overview.en);

    const statusRegion = page.getByRole('region', {
      name: TR_MARKET.market_command_status_title.en,
    });
    await expect(statusRegion).toBeVisible();
    await expect(statusRegion.getByRole('status'))
      .toContainText(TR_MARKET.market_command_data_state_ready.en);
    await expect(statusRegion.getByRole('button', {
      name: TR_MARKET.market_command_refresh_status.en,
    })).toBeVisible();
    expect(hydrationErrors).toEqual([]);

    const globalHeader = page.locator('header.sfm-global-header');
    await expect(globalHeader).toHaveCount(1);
    await expect(page.locator('.sfm-theme-toggle:not(.sfm-density-toggle):visible')).toHaveCount(1);
    await expect(page.locator('.sfm-language-trigger:visible')).toHaveCount(1);
    await expect(page.locator('.sfm-user-chip:visible')).toHaveCount(1);
    await expect(page.locator(
      'main.market-main :is(.sfm-theme-toggle, .sfm-language-trigger, .sfm-user-chip, [data-workspace-id])',
    )).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Basic View|Advanced View)$/i })).toHaveCount(0);

    const light = await semanticSurfaceSnapshot(page);
    const transparent = 'rgba(0, 0, 0, 0)';
    expect(light.headerBackground).not.toBe(transparent);
    expect(light.stripBackground).not.toBe(transparent);
    expect(light.indicatorBackground).not.toBe(transparent);
    expect(light.headerColor).not.toBe(light.headerBackground);

    await globalHeader.locator('.sfm-theme-toggle:not(.sfm-density-toggle)').click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    const dark = await semanticSurfaceSnapshot(page);
    expect(dark.headerBackground).not.toBe(transparent);
    expect(dark.stripBackground).not.toBe(transparent);
    expect(dark.indicatorBackground).not.toBe(transparent);
    expect(dark.headerColor).not.toBe(dark.headerBackground);
    expect(dark.headerBackground).not.toBe(light.headerBackground);
    expect(dark.stripBackground).not.toBe(light.stripBackground);
    expect(dark.indicatorBackground).not.toBe(light.indicatorBackground);
  });

  test('canonicalizes legacy tab query and hash URLs without losing unrelated URL state', async ({ page }) => {
    await prepareGuestMarket(page, '/market-analysis?tab=tools&symbol=AAPL#coverage');

    await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('traderTools');
    expect(new URL(page.url()).searchParams.get('symbol')).toBe('AAPL');
    expect(new URL(page.url()).hash).toBe('#coverage');
    const navigation = page.locator('nav[data-command-group][data-active-tab]');
    await expect(navigation).toHaveAttribute('data-command-group', 'toolsReports');
    await expect(navigation).toHaveAttribute('data-active-tab', 'traderTools');

    for (const tab of ['economicCalendar', 'technicalAnalysis', 'newsSentiment'] as const) {
      await openMarketCommandCenter(page, `/market-analysis?symbol=AAPL&tab=${tab}`);
      await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe(tab);
      expect(new URL(page.url()).searchParams.get('symbol')).toBe('AAPL');
      await expect(navigation).toHaveAttribute('data-active-tab', tab);
    }

    await openMarketCommandCenter(page, '/market-analysis?symbol=AAPL#watchlist');
    await expect.poll(() => ({
      tab: new URL(page.url()).searchParams.get('tab'),
      hash: new URL(page.url()).hash,
    })).toEqual({ tab: 'watchlist', hash: '' });
    expect(new URL(page.url()).searchParams.get('symbol')).toBe('AAPL');
    await expect(navigation).toHaveAttribute('data-command-group', 'watchlistAlerts');
    await expect(navigation).toHaveAttribute('data-active-tab', 'watchlist');

    await openMarketCommandCenter(page, '/market-analysis?symbol=MSFT');
    await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('analyze');
    expect(new URL(page.url()).searchParams.get('symbol')).toBe('MSFT');
    await expect(navigation).toHaveAttribute('data-command-group', 'analyze');
    await expect(navigation).toHaveAttribute('data-active-tab', 'analyze');
  });

  test('keeps Arabic RTL and English/French LTR command navigation coherent', async ({ page }) => {
    await prepareGuestMarket(page);

    const locales: readonly Locale[] = ['ar', 'en', 'fr'];
    const navigation = page.locator('nav[data-command-group][data-active-tab]');

    for (const locale of locales) {
      await setLanguage(page, locale);
      await expect(page.getByRole('heading', {
        level: 1,
        name: TR_MARKET.market_command_center_title[locale],
      })).toBeVisible();
      await expect(navigation).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      expect((await navigation.getByRole('tab').allTextContents()).map(label => label.trim())).toEqual(
        GROUP_TRANSLATION_KEYS.map(key => TR_MARKET[key][locale]),
      );
      await expect(navigation.getByRole('tab', { selected: true })).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
    }
  });

  test('fits 320px and leaves heavy market panels and provider calls lazy on overview', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    const requestedPaths = await prepareGuestMarket(page);

    const navigation = page.locator('nav[data-command-group][data-active-tab]');
    await expect(navigation).toHaveAttribute('data-command-group', 'overview');
    await expect(navigation).toHaveAttribute('data-active-tab', 'overview');
    await expect(page.locator(HEAVY_PANEL_SELECTOR)).toHaveCount(0);
    await expect.poll(() => requestedPaths.includes('/api/market-state/system')).toBe(true);
    await page.waitForTimeout(500);
    for (const path of LAZY_API_PATHS) expect(requestedPaths, path).not.toContain(path);

    await expectNoHorizontalOverflow(page);
    const geometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
        - document.documentElement.clientWidth,
      commandNavigationOverflow: (() => {
        const navigationElement = document.querySelector<HTMLElement>('nav[data-command-group]');
        return navigationElement
          ? navigationElement.scrollWidth - navigationElement.clientWidth
          : Number.POSITIVE_INFINITY;
      })(),
    }));
    expect(geometry.viewport).toBe(320);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(4);
    expect(geometry.commandNavigationOverflow).toBeLessThanOrEqual(1);
  });

  test('remains overflow-safe across the required viewport matrix and both sidebar widths', async ({ page }) => {
    await prepareGuestMarket(page);

    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await expect(page.locator('#market-command-center-title')).toBeVisible();
      await expect(page.locator('#market-asset-search')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const sidebar = page.locator('aside.sfm-shared-sidebar');
    await expect(sidebar).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const collapse = sidebar.getByRole('button', { name: 'Collapse sidebar' });
    if (await collapse.isVisible()) {
      await collapse.click();
      await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
      await expectNoHorizontalOverflow(page);
      await sidebar.getByRole('button', { name: 'Expand sidebar' }).click();
      await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      await expectNoHorizontalOverflow(page);
    }
  });
});

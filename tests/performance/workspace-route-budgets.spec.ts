import { expect, test, type Page } from '@playwright/test';

type WorkspacePerformanceMetrics = {
  cls: number;
  lcp: number;
  longestTask: number;
  longTaskCount: number;
};

const workspaceRoutes = [
  '/today',
  '/invest',
  '/business-hub',
  '/ai-analyst/overview',
  '/market-analysis',
  '/reports-center',
] as const;

const projectLocale = {
  'chromium-desktop': 'ar',
  'mobile-chrome': 'en',
  'mobile-webkit': 'fr',
} as const;

async function prepareWorkspaceSession(page: Page, locale: 'ar' | 'en' | 'fr') {
  await page.context().addCookies([{
    name: 'sfm_guest',
    value: 'true',
    url: 'http://127.0.0.1:3002',
    sameSite: 'Lax',
  }]);
  await page.addInitScript(value => {
    localStorage.setItem('sfm_guest_mode', 'true');
    localStorage.setItem('sfm_guest_started_at', new Date().toISOString());
    localStorage.setItem('sfm_lang', value);
    localStorage.setItem('the-sfm-theme', 'dark');

    const metrics: WorkspacePerformanceMetrics = { cls: 0, lcp: 0, longestTask: 0, longTaskCount: 0 };
    Object.defineProperty(window, '__sfmWorkspacePerformance', { value: metrics, configurable: true });

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.lcp = Math.max(metrics.lcp, entry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Some engines do not expose every performance entry type.
    }

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) metrics.cls += shift.value ?? 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // Layout Shift is not exposed by every WebKit build.
    }

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          metrics.longTaskCount += 1;
          metrics.longestTask = Math.max(metrics.longestTask, entry.duration);
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Tasks are Chromium-only in this test matrix.
    }
  }, locale);
}

for (const route of workspaceRoutes) {
  test(`${route} stays inside the authenticated workspace route budget`, async ({ page }, testInfo) => {
    const locale = projectLocale[testInfo.project.name as keyof typeof projectLocale] ?? 'en';
    const consoleProblems: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleProblems.push(message.text().slice(0, 300));
    });
    await prepareWorkspaceSession(page, locale);

    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}(?:[?#]|$)`));
    await expect(page.locator('main').first()).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const profile = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return {
        metrics: (window as typeof window & { __sfmWorkspacePerformance: WorkspacePerformanceMetrics }).__sfmWorkspacePerformance,
        domInteractive: navigation?.domInteractive ?? 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
        loadEvent: navigation?.loadEventEnd ?? 0,
        resourceCount: resources.length,
        transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    expect(profile.horizontalOverflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(profile.metrics.cls, `${route} CLS`).toBeLessThanOrEqual(0.05);
    if (profile.metrics.lcp > 0) expect(profile.metrics.lcp, `${route} LCP`).toBeLessThanOrEqual(8_000);
    if (testInfo.project.name.startsWith('chromium')) {
      expect(profile.metrics.longestTask, `${route} longest task`).toBeLessThanOrEqual(400);
    }

    await testInfo.attach(`workspace-performance-${route.slice(1).replaceAll('/', '-') || 'home'}`, {
      body: JSON.stringify({ route, locale, project: testInfo.project.name, consoleProblems, ...profile }, null, 2),
      contentType: 'application/json',
    });
  });
}

declare global {
  interface Window {
    __sfmWorkspacePerformance: WorkspacePerformanceMetrics;
  }
}

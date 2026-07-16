import { expect, test } from '@playwright/test';

type BrowserMetric = {
  cls: number;
  lcp: number;
  longestTask: number;
  longTaskCount: number;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const metrics: BrowserMetric = { cls: 0, lcp: 0, longestTask: 0, longTaskCount: 0 };
    Object.defineProperty(window, '__sfmPerformanceMetrics', { value: metrics, configurable: true });

    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) metrics.lcp = Math.max(metrics.lcp, entry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) metrics.cls += shift.value ?? 0;
      }
    }).observe({ type: 'layout-shift', buffered: true });

    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        metrics.longTaskCount += 1;
        metrics.longestTask = Math.max(metrics.longestTask, entry.duration);
      }
    }).observe({ type: 'longtask', buffered: true });
  });
});

test('public shell has no duplicate API requests, console regressions, or layout overflow', async ({ page }, testInfo) => {
  const consoleProblems: string[] = [];
  const apiRequests: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') consoleProblems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:3002' && url.pathname.startsWith('/api/')) {
      apiRequests.push(`${request.method()} ${url.pathname}${url.search}`);
    }
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleProblems).toEqual([]);

  const duplicateRequests = [...new Set(apiRequests)].filter(request => apiRequests.filter(item => item === request).length > 1);
  expect(duplicateRequests).toEqual([]);

  const profile = await page.evaluate(requests => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return {
      browserMetrics: (window as typeof window & { __sfmPerformanceMetrics: BrowserMetric }).__sfmPerformanceMetrics,
      domInteractive: navigation.domInteractive,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      loadEvent: navigation.loadEventEnd,
      resourceCount: resources.length,
      transferBytes: resources.reduce((sum, resource) => sum + resource.transferSize, 0),
      apiRequests: requests,
    };
  }, apiRequests);
  await testInfo.attach('browser-performance-profile', {
    body: JSON.stringify(profile, null, 2),
    contentType: 'application/json',
  });
});

test('responsive, language, theme, and offline states remain stable', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  if (testInfo.project.name === 'chromium-desktop') {
    for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  }

  for (const [lang, dir] of [['ar', 'rtl'], ['en', 'ltr'], ['fr', 'ltr']] as const) {
    await page.evaluate(value => localStorage.setItem('sfm_lang', value), lang);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
  }

  for (const theme of ['dark', 'light'] as const) {
    await page.evaluate(value => localStorage.setItem('the-sfm-theme', value), theme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(new RegExp(`(^|\\s)${theme}(\\s|$)`));
  }

  await page.context().setOffline(true);
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('footer')).toBeVisible();
  await page.context().setOffline(false);
});

declare global {
  interface Window {
    __sfmPerformanceMetrics: BrowserMetric;
  }
}

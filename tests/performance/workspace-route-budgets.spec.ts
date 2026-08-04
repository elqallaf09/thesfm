import { expect, test, type Page } from '@playwright/test';
import { userAuthStatePath } from '../smoke/auth-state';

type WorkspacePerformanceMetrics = {
  cls: number;
  lcp: number;
  longestTask: number;
  longTaskCount: number;
  layoutShifts: Array<{
    value: number;
    startTime: number;
    sources: Array<{
      node: string;
      previous: { x: number; y: number; width: number; height: number };
      current: { x: number; y: number; width: number; height: number };
    }>;
  }>;
};

const workspaceRoutes = [
  '/today',
  '/invest',
  '/business-hub',
  '/ai-analyst/overview',
  '/ai-analyst/market-leadership',
  '/reports-center',
] as const;

const projectLocale = {
  'chromium-desktop': 'ar',
  'mobile-chrome': 'en',
  'mobile-webkit': 'fr',
} as const;

async function prepareWorkspaceSession(page: Page, locale: 'ar' | 'en' | 'fr') {
  await page.addInitScript(value => {
    localStorage.setItem('sfm_lang', value);
    localStorage.setItem('the-sfm-theme', 'dark');

    const metrics: WorkspacePerformanceMetrics = {
      cls: 0,
      lcp: 0,
      longestTask: 0,
      longTaskCount: 0,
      layoutShifts: [],
    };
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
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
            sources?: Array<{
              node?: Node | null;
              previousRect?: DOMRectReadOnly;
              currentRect?: DOMRectReadOnly;
            }>;
          };
          if (shift.hadRecentInput) continue;
          const value = shift.value ?? 0;
          metrics.cls += value;
          if (value <= 0 || metrics.layoutShifts.length >= 12) continue;
          metrics.layoutShifts.push({
            value,
            startTime: shift.startTime,
            sources: (shift.sources ?? []).slice(0, 5).map(source => {
              const node = source.node instanceof Element ? source.node : null;
              const nodeLabel = node
                ? `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${Array.from(node.classList).slice(0, 2).map(name => `.${name}`).join('')}`
                : 'unknown';
              const previous = source.previousRect ?? new DOMRectReadOnly();
              const current = source.currentRect ?? new DOMRectReadOnly();
              return {
                node: nodeLabel,
                previous: { x: previous.x, y: previous.y, width: previous.width, height: previous.height },
                current: { x: current.x, y: current.y, width: current.width, height: current.height },
              };
            }),
          });
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

test.use({ storageState: userAuthStatePath });

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

    await testInfo.attach(`workspace-performance-${route.slice(1).replaceAll('/', '-') || 'home'}`, {
      body: JSON.stringify({ route, locale, project: testInfo.project.name, consoleProblems, ...profile }, null, 2),
      contentType: 'application/json',
    });

    expect(profile.horizontalOverflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(profile.metrics.cls, `${route} CLS`).toBeLessThanOrEqual(0.05);
    if (profile.metrics.lcp > 0) expect(profile.metrics.lcp, `${route} LCP`).toBeLessThanOrEqual(8_000);
    if (testInfo.project.name.startsWith('chromium')) {
      expect(profile.metrics.longestTask, `${route} longest task`).toBeLessThanOrEqual(400);
    }
  });
}

// Regression coverage for a deterministic CLS failure on /invest: the header's
// BrandLockup and UserChip both rendered content whose width could differ
// between an early render and a later, settled one (a raw SSR snapshot vs.
// the fully-hydrated DOM), and neither had a reserved footprint - so once
// that content resolved, the header's max-content grid tracks (brand,
// actions) reflowed and dragged the workspace nav and even the page content
// below it along with them. See AppHeader.tsx's ".sfm-global-brand-copy" and
// ".sfm-global-header .sfm-user-identity" rules for the fix (a reserved
// min-width on both, so nothing needs to move once real content resolves).
const brandStabilityCases = [
  { locale: 'ar' as const, theme: 'light' as const },
  { locale: 'en' as const, theme: 'dark' as const },
];

for (const { locale, theme } of brandStabilityCases) {
  test(`/invest header brand/identity stay geometrically stable through hydration (${locale}/${theme})`, async ({ page }) => {
    await page.addInitScript(value => {
      localStorage.setItem('sfm_lang', value.locale);
      localStorage.setItem('the-sfm-theme', value.theme);
    }, { locale, theme });

    // The raw server response, independent of any client-side JS - what a
    // user's browser paints before React ever runs. page.request shares the
    // authenticated context's cookies with page, so this is the same
    // authenticated response the subsequent page.goto() below will hydrate.
    const ssrResponse = await page.request.get('/invest');
    const ssrHtml = await ssrResponse.text();
    const ssrCrumbMatch = ssrHtml.match(/sfm-global-brand-copy"[^>]*><strong>([^<]*)<\/strong><span>([^<]*)<\/span>/);
    expect(ssrCrumbMatch, 'SSR brand markup must be present in the raw response').not.toBeNull();
    const [, ssrBrandName, ssrCrumbText] = ssrCrumbMatch!;

    // A translation key that failed to resolve reads as an unmistakable
    // snake_case/dot-path token (e.g. "nav_invest_workspace") - real display
    // strings in every supported locale never take that shape.
    const looksLikeRawKey = (value: string) => /^[a-z][a-z0-9]*(?:[._][a-z0-9]+)+$/.test(value);
    expect(looksLikeRawKey(ssrBrandName), `SSR brand name "${ssrBrandName}" must not be a raw translation key`).toBe(false);
    expect(looksLikeRawKey(ssrCrumbText), `SSR crumb "${ssrCrumbText}" must not be a raw translation key`).toBe(false);

    const problems = watchRuntimeErrors(page);
    await prepareWorkspaceSession(page, locale);
    await page.goto('/invest', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main').first()).toBeVisible();

    // First readable snapshot: right after the DOM parses, before the page
    // has had time to settle (fonts, async profile fetch, etc.).
    const firstPaint = await page.evaluate(() => {
      const brandCopy = document.querySelector('.sfm-global-brand-copy');
      const strong = brandCopy?.querySelector('strong');
      const span = brandCopy?.querySelector('span');
      return {
        brandWidth: document.querySelector('.sfm-global-brand')?.getBoundingClientRect().width ?? 0,
        actionsWidth: document.querySelector('.sfm-global-actions')?.getBoundingClientRect().width ?? 0,
        workspaceLeft: document.querySelector('.sfm-workspace-navigation')?.getBoundingClientRect().left ?? 0,
        brandName: strong?.textContent ?? '',
        crumbText: span?.textContent ?? '',
      };
    });

    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const settled = await page.evaluate(() => {
      const brandCopy = document.querySelector('.sfm-global-brand-copy');
      const strong = brandCopy?.querySelector('strong');
      const span = brandCopy?.querySelector('span');
      return {
        brandWidth: document.querySelector('.sfm-global-brand')?.getBoundingClientRect().width ?? 0,
        actionsWidth: document.querySelector('.sfm-global-actions')?.getBoundingClientRect().width ?? 0,
        workspaceLeft: document.querySelector('.sfm-workspace-navigation')?.getBoundingClientRect().left ?? 0,
        brandName: strong?.textContent ?? '',
        crumbText: span?.textContent ?? '',
        cls: (window as typeof window & { __sfmWorkspacePerformance: WorkspacePerformanceMetrics }).__sfmWorkspacePerformance.cls,
      };
    });

    expect(problems, `console/page errors: ${problems.join('; ')}`).toHaveLength(0);
    expect(looksLikeRawKey(settled.brandName), `hydrated brand name "${settled.brandName}" must not be a raw translation key`).toBe(false);
    expect(looksLikeRawKey(settled.crumbText), `hydrated crumb "${settled.crumbText}" must not be a raw translation key`).toBe(false);
    // SSR and the fully-settled client render must agree - no wide fallback
    // that later swaps to a narrower (or wider) resolved string.
    expect(settled.brandName, 'brand name must match between SSR and hydrated render').toBe(ssrBrandName);
    expect(settled.crumbText, 'crumb text must match between SSR and hydrated render').toBe(ssrCrumbText);

    expect(Math.abs(settled.brandWidth - firstPaint.brandWidth), 'BrandLockup width must stay stable through hydration').toBeLessThanOrEqual(1);
    expect(Math.abs(settled.actionsWidth - firstPaint.actionsWidth), '.sfm-global-actions width must stay stable through hydration').toBeLessThanOrEqual(1);
    expect(Math.abs(settled.workspaceLeft - firstPaint.workspaceLeft), 'workspace navigation position must stay stable through hydration').toBeLessThanOrEqual(1);
    // Stricter than the CI-wide 0.05 budget in the loop above - this route's
    // specific regression should have real margin now, not just scrape by.
    expect(settled.cls, '/invest CLS').toBeLessThanOrEqual(0.03);
  });
}

function watchRuntimeErrors(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  return problems;
}

declare global {
  interface Window {
    __sfmWorkspacePerformance: WorkspacePerformanceMetrics;
  }
}

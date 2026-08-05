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

    const expectedDir = locale === 'ar' ? 'rtl' : 'ltr';

    // ---- Phase A: pre-contract architecture diagnostic (NOT asserted against
    // PR #111's header budget). Captures the state of the world before the
    // requested locale/direction contract exists - this is where the
    // pre-existing, application-wide root-layout issue lives (src/app/layout.tsx
    // hardcodes lang="ar" dir="rtl" unconditionally; hydration corrects it
    // afterward; tracked separately as issue #117). Recorded and logged, never
    // silently discarded, but not something PR #111 owns or is held to.
    const preContract = await page.evaluate(() => ({
      dir: document.documentElement.dir,
      lang: document.documentElement.lang,
      cls: (window as typeof window & { __sfmWorkspacePerformance: WorkspacePerformanceMetrics }).__sfmWorkspacePerformance.cls,
    }));
    const directionTransitionDetected = preContract.dir !== expectedDir;
    if (directionTransitionDetected) {
      console.log(`KNOWN-ISSUE #117: root layout first-paint dir="${preContract.dir}" before hydration corrects it to "${expectedDir}" for locale "${locale}" (preContractCls=${preContract.cls}).`);
    }

    // ---- Phase B: the PR #111-owned header stability contract. Wait until
    // the requested locale/direction is actually observable AND every header
    // element this test measures is present, rather than an arbitrary
    // timeout, all network activity, or all visual movement settling. This is
    // the boundary PR #111's header is held accountable from - not before.
    await page.waitForFunction(
      expected => document.documentElement.dir === expected.dir
        && document.documentElement.lang === expected.lang
        && document.querySelector('.sfm-global-header') !== null
        && document.querySelector('.sfm-global-brand') !== null
        && document.querySelector('.sfm-workspace-navigation') !== null
        && document.querySelector('.sfm-global-actions') !== null,
      { dir: expectedDir, lang: locale },
      { timeout: 5_000 },
    );

    // Reset the layout-shift accumulator exactly at the phase-B contract
    // boundary, so `cls` from this point on reflects only shifts PR #111's
    // header could plausibly cause - not whatever the pre-existing root-
    // direction transition (issue #117) contributed before this point.
    const early = await page.evaluate(() => {
      const perf = (window as typeof window & { __sfmWorkspacePerformance: WorkspacePerformanceMetrics }).__sfmWorkspacePerformance;
      const contractEstablishedAt = performance.now();
      perf.cls = 0;
      const brandCopy = document.querySelector('.sfm-global-brand-copy');
      const strong = brandCopy?.querySelector('strong');
      const span = brandCopy?.querySelector('span');
      return {
        contractEstablishedAt,
        headerHeight: document.querySelector('.sfm-global-header')?.getBoundingClientRect().height ?? 0,
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
        headerHeight: document.querySelector('.sfm-global-header')?.getBoundingClientRect().height ?? 0,
        brandWidth: document.querySelector('.sfm-global-brand')?.getBoundingClientRect().width ?? 0,
        actionsWidth: document.querySelector('.sfm-global-actions')?.getBoundingClientRect().width ?? 0,
        workspaceLeft: document.querySelector('.sfm-workspace-navigation')?.getBoundingClientRect().left ?? 0,
        brandName: strong?.textContent ?? '',
        crumbText: span?.textContent ?? '',
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        ownedContractCls: (window as typeof window & { __sfmWorkspacePerformance: WorkspacePerformanceMetrics }).__sfmWorkspacePerformance.cls,
      };
    });

    console.log(`PHASE-REPORT ${JSON.stringify({
      route: '/invest', locale, theme, project: test.info().project.name,
      viewport: page.viewportSize(),
      initialLangDir: { lang: preContract.lang, dir: preContract.dir },
      settledLangDir: { lang: settled.lang, dir: settled.dir },
      directionTransitionDetected,
      preContractCls: preContract.cls,
      ownedContractCls: settled.ownedContractCls,
      contractEstablishedAt: early.contractEstablishedAt,
      early: { brandWidth: early.brandWidth, actionsWidth: early.actionsWidth, workspaceLeft: early.workspaceLeft, headerHeight: early.headerHeight },
      settledGeometry: { brandWidth: settled.brandWidth, actionsWidth: settled.actionsWidth, workspaceLeft: settled.workspaceLeft, headerHeight: settled.headerHeight },
      deltas: {
        brandWidth: Math.abs(settled.brandWidth - early.brandWidth),
        actionsWidth: Math.abs(settled.actionsWidth - early.actionsWidth),
        workspaceLeft: Math.abs(settled.workspaceLeft - early.workspaceLeft),
        headerHeight: Math.abs(settled.headerHeight - early.headerHeight),
      },
    })}`);

    expect(problems, `console/page errors: ${problems.join('; ')}`).toHaveLength(0);
    expect(looksLikeRawKey(settled.brandName), `hydrated brand name "${settled.brandName}" must not be a raw translation key`).toBe(false);
    expect(looksLikeRawKey(settled.crumbText), `hydrated crumb "${settled.crumbText}" must not be a raw translation key`).toBe(false);
    // SSR and the fully-settled client render must agree - no wide fallback
    // that later swaps to a narrower (or wider) resolved string.
    expect(settled.brandName, 'brand name must match between SSR and hydrated render').toBe(ssrBrandName);
    expect(settled.crumbText, 'crumb text must match between SSR and hydrated render').toBe(ssrCrumbText);

    // BrandLockup's crumb never changes (it's a hardcoded literal for this
    // route - asserted above), so its width stays essentially exact.
    // .sfm-global-actions and the workspace nav's position still carry a
    // small residual: UserChip's real display name (unbounded, real user
    // data) legitimately differs in rendered width from its loading-state
    // placeholder even with a fixed identity slot, because a single long
    // unbroken name can still push against that slot's own min-content
    // floor. 20px comfortably covers that legitimate variance while still
    // catching the actual regression this guards against, which was a
    // hundred-plus-pixel reflow (a stale, unsynced critical-CSS breakpoint),
    // not sub-pixel noise.
    expect(Math.abs(settled.brandWidth - early.brandWidth), 'BrandLockup width must stay stable through hydration').toBeLessThanOrEqual(3);
    expect(Math.abs(settled.actionsWidth - early.actionsWidth), '.sfm-global-actions width must stay stable through hydration').toBeLessThanOrEqual(20);
    expect(Math.abs(settled.workspaceLeft - early.workspaceLeft), 'workspace navigation position must stay stable through hydration').toBeLessThanOrEqual(20);
    // The header's min-height is a fixed CSS custom property per breakpoint
    // (--global-header-height) - it should not move at all once the phase-B
    // contract is established; 1px covers only sub-pixel rounding.
    expect(Math.abs(settled.headerHeight - early.headerHeight), 'header shell height must stay stable through hydration').toBeLessThanOrEqual(1);
    // This is entirely PR #111's own responsibility now: the accumulator was
    // reset at the phase-B contract boundary, so this CLS reflects only
    // shifts that happened after the requested locale/direction was already
    // established on the document - it can no longer be inflated by the
    // pre-existing, unrelated root-direction transition (issue #117),
    // regardless of whether that transition occurred in this run.
    expect(settled.ownedContractCls, '/invest header-owned CLS (post phase-B contract)').toBeLessThanOrEqual(0.03);
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

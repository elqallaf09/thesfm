import { expect, test, type Page } from '@playwright/test';
import { installLayoutShiftProbe, readLayoutShiftProbe } from './helpers/layoutShiftProbe';

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function paint(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function boxes(page: Page) {
  return page.locator('.gm-strip, .gm-strip-heading, .gm-data-status, .gm-news, .gm-news-results, .gm-explorer').evaluateAll(elements =>
    elements.map(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { selector: element.className, x, y: y + scrollY, width, height };
    }),
  );
}

function expectStable(before: Awaited<ReturnType<typeof boxes>>, after: Awaited<ReturnType<typeof boxes>>) {
  expect(after).toHaveLength(before.length);
  before.forEach((box, index) => {
    expect(after[index].selector).toBe(box.selector);
    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(Math.abs(after[index][key] - box[key]), box.selector + '.' + key).toBeLessThanOrEqual(1);
  });
}

for (const locale of ['ar', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test('Global Markets stable async geometry ' + locale + '/' + theme, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: testInfo.project.name === 'chromium-desktop' ? 1440 : 390, height: 900 });
      await page.addInitScript(({ locale, theme }) => {
        localStorage.setItem('sfm_lang', locale);
        localStorage.setItem('the-sfm-theme', theme);
      }, { locale, theme });
      await installLayoutShiftProbe(page);
      let stripsGate = gate();
      let newsGate = gate();
      const gates = [stripsGate, newsGate];
      const fixtures = Array.from({ length: 6 }, (_, index) => ({
        id: 'cls-fixture-' + index,
        title: 'QA market headline ' + index + ' with enough text to exercise the two-line editorial area',
        sourceName: 'QA fixture',
        url: 'https://example.com/cls-fixture-' + index,
        publishedAt: '2026-01-01T12:00:00.000Z',
        relatedSymbols: index % 2 ? ['AAPL'] : [],
      }));
      let newsStatus = 200;
      let newsItems = fixtures;
      let stripsRequests = 0;
      let newsRequests = 0;
      await page.route('**/api/market-strips**', async route => {
        stripsRequests++;
        await stripsGate.promise;
        await route.fulfill({ json: {
          success: true, lastUpdated: '2026-01-01T12:00:00.000Z',
          prices: { 'NBK.KW': { symbol: 'NBK.KW', price: 1.02, changePercent: 0.99, delayed: true, available: true } },
        } });
      });
      await page.route('**/api/market-news**', async route => {
        newsRequests++;
        const pending = newsGate;
        const status = newsStatus;
        const items = newsItems;
        await pending.promise;
        await route.fulfill({ status, json: { success: status === 200, items, partialFailure: true } });
      });

      try {
        // Repeat the cold-response transition: both runs hold providers until the
        // real shell is observed, not an uncontrolled timeout-based sample.
        for (let run = 0; run < 2; run++) {
          if (run) {
            stripsGate = gate(); newsGate = gate();
            gates.push(stripsGate, newsGate);
          }
          await page.goto('/global-markets');
          await expect(page.locator('.gm-shell')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
          await expect.poll(() => stripsRequests).toBeGreaterThan(run);
          await expect.poll(() => newsRequests).toBeGreaterThan(run);
          await expect(page.locator('.gm-strips > .gm-strip')).toHaveCount(4);
          await expect(page.locator('.gm-strip[aria-busy="true"]')).toHaveCount(4);
          await expect(page.locator('.gm-news-skeleton li')).toHaveCount(6);
          await paint(page);
          const before = await boxes(page);
          const beforeProbe = await readLayoutShiftProbe(page);
          stripsGate.release(); newsGate.release();
          await expect(page.locator('.gm-strip[aria-busy="false"]')).toHaveCount(4);
          await expect(page.locator('.gm-news-results')).toHaveAttribute('aria-busy', 'false');
          await expect(page.locator('.gm-news-list:not(.gm-news-skeleton) li')).toHaveCount(6);
          await paint(page);
          const after = await boxes(page);
          // Status classes change with truthfully delayed/unavailable data;
          // compare structural selectors and their boxes, not status names.
          const structural = (entries: typeof before) => entries.map(box => ({
            ...box, selector: box.selector.replace(/is-(loading|delayed|unavailable)/g, 'state'),
          }));
          expectStable(structural(before), structural(after));
          const afterProbe = await readLayoutShiftProbe(page);
          await testInfo.attach('layout-geometry-' + run, {
            body: JSON.stringify({ before, after, beforeProbe, afterProbe }, null, 2),
            contentType: 'application/json',
          });
          // Full-route observations are attached without suppressing the known
          // root SSR-direction issue (#117). This assertion isolates provider
          // completion after the stable shell, owned by this component fix.
          const providerShifts = afterProbe.entries.slice(beforeProbe.entries.length);
          expect(Math.max(0, ...providerShifts.map(entry => entry.value))).toBeLessThanOrEqual(0.01);
        }

        // A filter change is deliberate layout expansion, but slow/refused
        // news requests must keep the previous six rows visible.
        newsGate = gate(); gates.push(newsGate);
        newsStatus = 503;
        const beforeRefreshCount = newsRequests;
        await page.getByRole('button', { name: locale === 'ar' ? 'تخصيص يدوي' : 'Manual customization', exact: true }).click();
        await expect.poll(() => newsRequests).toBeGreaterThan(beforeRefreshCount);
        await expect(page.locator('.gm-news-results')).toHaveAttribute('aria-busy', 'true');
        await expect(page.locator('.gm-news-skeleton')).toHaveCount(0);
        await expect(page.locator('.gm-news-list li')).toHaveCount(6);
        const refreshingBox = await page.locator('.gm-news-results').boundingBox();
        await page.screenshot({ path: testInfo.outputPath('global-markets-slow-refresh.png'), fullPage: true });
        newsGate.release();
        await expect(page.locator('.gm-news-results')).toHaveAttribute('aria-busy', 'false');
        await expect(page.locator('.gm-news-list li')).toHaveCount(6);
        await expect(page.locator('.gm-news-notice')).toContainText(locale === 'ar' ? 'تعذر التحديث' : 'Refresh failed');
        const failedBox = await page.locator('.gm-news-results').boundingBox();
        expect(failedBox?.height).toBe(refreshingBox?.height);

        // Empty replacement uses the same six-row reservation.
        newsGate = gate(); gates.push(newsGate);
        newsStatus = 200; newsItems = [];
        const beforeEmptyRequest = newsRequests;
        await page.getByRole('combobox', { name: locale === 'ar' ? 'الدولة' : 'Country', exact: true }).selectOption('US');
        await page.getByRole('button', { name: locale === 'ar' ? 'تطبيق الفلاتر' : 'Apply filters', exact: true }).click();
        await expect.poll(() => newsRequests).toBeGreaterThan(beforeEmptyRequest);
        await expect(page.locator('.gm-news-list li')).toHaveCount(6);
        newsGate.release();
        await expect(page.locator('.gm-news-results')).toHaveAttribute('aria-busy', 'false');
        await expect(page.locator('.gm-news-empty')).toBeVisible();
        const emptyBox = await page.locator('.gm-news-results').boundingBox();
        expect(emptyBox?.height).toBe(refreshingBox?.height);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        await testInfo.attach('layout-shift-trace', {
          body: JSON.stringify(await readLayoutShiftProbe(page), null, 2),
          contentType: 'application/json',
        });
      } finally {
        gates.forEach(pending => pending.release());
        await page.unrouteAll({ behavior: 'wait' });
      }
    });
  }
}

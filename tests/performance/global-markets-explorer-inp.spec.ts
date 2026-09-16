import { expect, test, type Locator } from '@playwright/test';
import { mockMarketDirectory } from '../smoke/helpers/global-market-directory';

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY;
}

async function preparePointerTarget(target: Locator) {
  await expect(target).toBeEnabled();
  // The failed mobile-WebKit trace shows repeated auto-scrolls alternating
  // between the sticky header and the news panel, then a click with the
  // explorer still collapsed and no directory request. Position the real
  // control before measuring; do not force-click or invoke a DOM handler.
  await target.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await expect.poll(() => target.evaluate(element => {
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const hit = document.elementFromPoint(x, y);
    return box.width > 0 && box.height > 0 && x >= 0 && x < innerWidth && y >= 0 && y < innerHeight
      && Boolean(hit && (hit === element || element.contains(hit)));
  }), { message: 'The real explorer control must receive pointer events before the measured click' }).toBe(true);
}

test('Global Markets Explorer Load More stays within the controlled interaction budget', async ({ page }, testInfo) => {
  await mockMarketDirectory(page);
  await page.addInitScript(() => {
    localStorage.setItem('sfm_lang', 'ar');
    localStorage.setItem('sfm_theme', 'dark');
  });
  await page.route('**/api/market-strips**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, lastUpdated: new Date().toISOString(), requestedIds: [], strips: [], prices: {} }),
  }));
  await page.route('**/api/market-news**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, items: [], total: 0 }),
  }));

  if (process.env.E2E_BOOTSTRAP_URL) await page.goto(process.env.E2E_BOOTSTRAP_URL);
  await page.goto('/global-markets');
  const explorer = page.locator('.gm-explorer');
  // The accessible name changes from Show to Hide after the click. Keep the
  // control identity stable while asserting both labels and expanded state.
  const toggle = explorer.locator('button.gm-explorer-toggle');
  await expect(toggle).toHaveAccessibleName('عرض مستكشف الأصول');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await preparePointerTarget(toggle);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAccessibleName('إخفاء مستكشف الأصول');
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(12);

  const increment = testInfo.project.name.startsWith('mobile') ? 6 : 12;
  let expectedCount = 12;
  async function appendAndMeasure() {
    const loadMore = explorer.getByRole('button', { name: /تحميل المزيد/ });
    await preparePointerTarget(loadMore);
    await loadMore.click();
    expectedCount += increment;
    await expect(explorer.locator('.gm-strip-item')).toHaveCount(expectedCount);
    await page.waitForFunction(() => performance.getEntriesByName('gm-explorer-append', 'measure').length > 0);
    await expect(loadMore).toBeEnabled();
    return page.evaluate(() => performance.getEntriesByName('gm-explorer-append', 'measure').at(-1)?.duration ?? Number.POSITIVE_INFINITY);
  }

  // One warm-up append is excluded so font/style initialization does not
  // masquerade as steady-state interaction work. All six clicks stay real.
  await appendAndMeasure();
  const samples: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    samples.push(await appendAndMeasure());
    counts.push(await explorer.locator('.gm-strip-item')).count());
  }

  const result = { project: testInfo.project.name, samples, median: median(samples), worst: Math.max(...samples), counts };
  await testInfo.attach('global-markets-explorer-interactions', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  });

  for (let index = 1; index < counts.length; index += 1) {
    expect(counts[index] - counts[index - 1]).toBe(increment);
  }
  expect(result.median).toBeLessThan(100);
  expect(result.worst).toBeLessThan(150);
});

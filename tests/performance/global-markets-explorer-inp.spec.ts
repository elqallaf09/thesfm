import { expect, test, type Locator } from '@playwright/test';
import { mockMarketDirectory } from '../smoke/helpers/global-market-directory';

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY;
}

async function prepareNativeClick(control: Locator) {
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  // Position setup is outside the measured append. Keep a single native click.
  await control.evaluate(element => element.scrollIntoView({
    behavior: 'instant', block: 'center', inline: 'nearest',
  }));
  await expect.poll(() => control.evaluate(async element => {
    const before = element.getBoundingClientRect();
    await new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const after = element.getBoundingClientRect();
    const x = after.left + after.width / 2;
    const y = after.top + after.height / 2;
    const hit = document.elementFromPoint(x, y);
    return element.isConnected
      && before.top === after.top && before.left === after.left
      && before.width === after.width && before.height === after.height
      && after.width > 0 && after.height > 0
      && x > 0 && x < innerWidth && y > 0 && y < innerHeight
      && hit !== null && (hit === element || element.contains(hit));
  })).toBe(true);
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
  const shell = page.locator('.gm-shell:visible');
  // This existing control requires hydration and the initial strips response.
  await expect(shell.locator('.gm-header-refresh')).toBeEnabled();
  const explorer = shell.locator('.gm-explorer');
  const toggle = explorer.locator('.gm-explorer-toggle');
  await expect(toggle).toHaveAccessibleName('عرض مستكشف الأصول');
  await prepareNativeClick(toggle);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const items = explorer.locator('.gm-strip-item');
  await expect(items).toHaveCount(12);

  const increment = testInfo.project.name.startsWith('mobile') ? 6 : 12;
  let expectedCount = 12;
  async function append() {
    const loadMore = explorer.getByRole('button', { name: /تحميل المزيد/ });
    await prepareNativeClick(loadMore);
    // An ignored click must not reuse the previous performance sample.
    await page.evaluate(() => performance.clearMeasures('gm-explorer-append'));
    await loadMore.click();
    expectedCount += increment;
    await expect(items).toHaveCount(expectedCount);
    await page.waitForFunction(() =>
      performance.getEntriesByName('gm-explorer-append', 'measure').length > 0);
    await expect(loadMore).toBeEnabled();
    return page.evaluate(() =>
      performance.getEntriesByName('gm-explorer-append', 'measure').at(-1)?.duration
        ?? Number.POSITIVE_INFINITY);
  }

  // One warm-up append is excluded so font/style initialization does not
  // masquerade as steady-state interaction work.
  await append();

  const samples: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    samples.push(await append());
    counts.push(await items.count());
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

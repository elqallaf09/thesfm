import { expect, test } from '@playwright/test';

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.POSITIVE_INFINITY;
}

test('Global Markets Explorer Load More stays within the controlled interaction budget', async ({ page }, testInfo) => {
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
  await explorer.getByRole('button', { name: 'عرض مستكشف الأصول' }).click();
  await expect(explorer.locator('.gm-strip-item')).toHaveCount(12);

  // One warm-up append is excluded so font/style initialization does not
  // masquerade as steady-state interaction work.
  let loadMore = explorer.getByRole('button', { name: /تحميل المزيد/ });
  await loadMore.click();
  await page.waitForFunction(() => performance.getEntriesByName('gm-explorer-append', 'measure').length > 0);

  const samples: number[] = [];
  const counts: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    loadMore = explorer.getByRole('button', { name: /تحميل المزيد/ });
    await loadMore.click();
    await page.waitForFunction(() => performance.getEntriesByName('gm-explorer-append', 'measure').length > 0);
    samples.push(await page.evaluate(() => performance.getEntriesByName('gm-explorer-append', 'measure').at(-1)?.duration ?? Number.POSITIVE_INFINITY));
    counts.push(await explorer.locator('.gm-strip-item').count());
  }

  const result = { project: testInfo.project.name, samples, median: median(samples), worst: Math.max(...samples), counts };
  await testInfo.attach('global-markets-explorer-interactions', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  });

  const increment = testInfo.project.name.startsWith('mobile') ? 6 : 12;
  for (let index = 1; index < counts.length; index += 1) {
    expect(counts[index] - counts[index - 1]).toBe(increment);
  }
  expect(result.median).toBeLessThan(100);
  expect(result.worst).toBeLessThan(150);
});

import { expect, test } from '@playwright/test';

test('IPO cards retain the publisher, original link and date with provider, missing and broken images', async ({ page }) => {
  const topic = 'ipo-gulf-news';
  const fallback = '/markets-tv/sfm-news-fallback.webp';
  const photo = 'https://images.example.org/ipo.webp';
  const publishedAt = '2026-11-01T12:30:00Z';
  const items = [photo, null, 'https://images.example.org/broken.webp'].map((imageUrl, index) => ({
    id: String(index), title: `IPO display test ${index}`, source: 'Test publisher',
    url: `https://example.org/article/${index}`, publishedAt, imageUrl,
  }));
  await page.route('**/api/market/special-news?**', route => route.fulfill({ json: { topic, success: true, items } }));
  await page.route(photo, route => route.fulfill({ path: 'public/markets-tv/sfm-news-fallback.webp', contentType: 'image/webp' }));
  await page.route('**/broken.webp', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/ipo-gulf-news');
  for (const [index, item] of items.entries()) {
    const card = page.locator('article').filter({ has: page.getByRole('heading', { name: item.title, exact: true }) });
    await expect(card).toContainText(item.source);
    await expect(card.locator('time')).toHaveAttribute('datetime', publishedAt);
    await expect(card.getByRole('link')).toHaveAttribute('href', item.url);
    const image = card.locator('img');
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveAttribute('src', index === 0 ? photo : fallback);
    await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});

import { expect, type Page } from '@playwright/test';

export async function expectNewsPage(page: Page, total: number, capacity?: number) {
  const desk = page.locator('.tv-news-desk');
  await expect(desk).toHaveAttribute('data-news-count', String(total));
  if (capacity) await expect(desk).toHaveAttribute('data-news-page-size', String(capacity));
  await expect.poll(() => desk.evaluate((element, total) => {
    const count = Number(element.getAttribute('data-news-page-size'));
    const current = Number(element.getAttribute('data-news-page')) - 1;
    return count >= 1 && count <= 6 && current >= 0 && current < Math.ceil(total / count)
      && element.querySelectorAll('.tv-news-card').length === Math.min(count, total - current * count);
  }, total)).toBe(true);
  await expect(desk.locator('.tv-news-pager')).toBeVisible();
}

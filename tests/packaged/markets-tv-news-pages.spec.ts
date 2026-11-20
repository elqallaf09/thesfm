import { expect, test, type Locator, type Page } from '@playwright/test';
import { openAndroidTvPackage, openTvMenu, closeTvMenu } from './packageHarness';
import { expectNewsPage } from '../helpers/tv-news-pages';

const stories = Array.from({ length: 56 }, (_, index) => ({
  id: `story-${index}`, title: `${index + 1} · Stock Market Today: Companies report results as investors assess the outlook for global markets`,
  source: 'SFM QA newsroom', publishedAt: '2026-11-19T09:26:00Z', url: `https://example.com/news/${index}`,
}));
async function openFeed(page: Page, language: string, theme: string, channel: string, playing = false) {
  await page.addInitScript(({ language, theme, channel, playing }) => {
    sessionStorage.setItem('sfm-tv-welcome-shown', '1');
    localStorage.setItem('sfm-markets-tv-settings-v1', JSON.stringify({ language, theme, broadcastChannel: channel, sessionAutoRotate: playing }));
  }, { language, theme, channel, playing });
  await page.route('**/api/**', route => route.fulfill({ json: { items: stories, stories, success: true,
    topic: new URL(route.request().url()).searchParams.get('topic'), lastSuccessfulUpdate: '2026-11-20T12:00:00Z' } }));
  await openAndroidTvPackage(page);
  await page.evaluate(() => document.fonts.ready);
}
async function readableCards(cards: Locator) {
  await expect.poll(() => cards.evaluateAll(elements => elements.flatMap(card => {
    const failures: string[] = [], bounds = card.getBoundingClientRect();
    if (bounds.height < 170 || bounds.bottom > innerHeight + 1 || bounds.left < -1 || bounds.right > innerWidth + 1) failures.push('card outside readable bounds');
    if (card.scrollHeight > card.clientHeight + 2 || card.scrollWidth > card.clientWidth + 2) failures.push('card overflow');
    const image = card.querySelector('.tv-news-thumbnail')!.getBoundingClientRect();
    if (image.width < 95 || image.height < 71) failures.push('thumbnail too small');
    for (const selector of ['.tv-news-title', '.tv-news-evidence > bdi', '.tv-news-evidence time']) {
      const element = card.querySelector(selector)!, rect = element.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(element).fontSize);
      if (size < (selector === '.tv-news-title' ? 18 : 14) || rect.height < size || rect.width < size
        || rect.left < bounds.left || rect.right > bounds.right || rect.top < bounds.top || rect.bottom > bounds.bottom) failures.push(selector + ' unreadable');
    }
    return failures;
  })), 'a 56-article feed keeps large thumbnails, headlines, sources and full dates').toEqual([]);
}

for (const [language, theme, channel] of [['ar', 'light', 'earningsNews'], ['en', 'dark', 'unusualNews'], ['fr', 'light', 'unusualNews']]) {
  test(`long news feed ${language}/${theme}/${channel}: every article remains reachable at Huawei and TV sizes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1536, height: 872 });
    await openFeed(page, language, theme, channel);
    const cards = page.locator('.tv-news-desk-grid > button');
    for (const [width, height, capacity] of [[960, 540, 2], [1280, 720, 4], [1920, 1080, 6], [1536, 872, 6]]) {
      await page.setViewportSize({ width, height });
      await expectNewsPage(page, 56, capacity);
      await readableCards(cards);
      await expect(page.locator('.tv-news-pager')).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: testInfo.outputPath(`news-${channel}-${language}-${width}.png`) });
    }
    const firstHeight = await cards.first().evaluate(card => card.getBoundingClientRect().height);
    const collected: string[] = [];
    for (let current = 0; current < 10; current++) {
      await expect(page.locator('.tv-news-desk')).toHaveAttribute('data-news-page', String(current + 1));
      await expect(cards.locator('.tv-news-title')).toHaveText(stories.slice(current * 6, current * 6 + 6).map(story => story.title));
      collected.push(...await cards.locator('.tv-news-title').allTextContents());
      await readableCards(cards);
      if (current === 9) expect(await cards.first().evaluate(card => card.getBoundingClientRect().height)).toBeCloseTo(firstHeight, 0);
      // The visible label and Enter work with a TV remote; focus stays on the pager.
      const next = page.locator('[data-tv-focus-key="news-next"]');
      await next.focus(); await page.keyboard.press('Enter'); await expect(next).toBeFocused();
    }
    expect(collected).toEqual(stories.map(story => story.title));
    await expect(page.locator('.tv-news-desk')).toHaveAttribute('data-news-page', '1');
    await expect(page.locator('.tv-news-pager')).toContainText('1–6 / 56');
    await page.locator('[data-tv-focus-key="news-previous"]').click();
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.tv-news-pager')).toContainText('55–56 / 56');
  });
}

test('news pages rotate every 40 seconds and pause for the remote, story dialog, menu and playback control', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 872 });
  await page.clock.install({ time: new Date('2026-11-20T14:00:00Z') });
  await openFeed(page, 'ar', 'dark', 'earningsNews', true);
  const desk = page.locator('.tv-news-desk'), cards = desk.locator('.tv-news-card');
  await expectNewsPage(page, 56, 6);
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
  await page.clock.runFor(40001);
  await expect(desk).toHaveAttribute('data-news-page', '2');
  const headlines = await cards.locator('.tv-news-title').allTextContents();
  await cards.first().focus();
  await page.clock.runFor(80000);
  await expect(cards.locator('.tv-news-title')).toHaveText(headlines);
  await page.keyboard.press('Enter');
  // The clock is paused: let React settle the lazy story dialog's fallback.
  await page.clock.runFor(500);
  await expect(page.getByRole('dialog')).toContainText(headlines[0]);
  await page.clock.runFor(80000);
  await expect(desk).toHaveAttribute('data-news-page', '2');
  await page.keyboard.press('Escape'); await expect(cards.first()).toBeFocused();
  await openTvMenu(page); await page.clock.runFor(80000);
  await expect(desk).toHaveAttribute('data-news-page', '2');
  await closeTvMenu(page);
  const playback = page.locator('.tv-receiver-actions button').first();
  await playback.focus(); await playback.press('Enter');
  await expect(playback).toHaveAttribute('aria-pressed', 'false');
  await page.clock.runFor(80000); await expect(desk).toHaveAttribute('data-news-page', '2');
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlay', bubbles: true })));
  await expect(playback).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(40001); await expect(desk).toHaveAttribute('data-news-page', '3');
});

import { expect, test, type Page } from '@playwright/test';

async function mockNews(page: Page, category: 'tech' | 'gulf') {
  const items = Array.from({ length: 8 }, (_, index) => {
    const title = `خبر السوق ${index + 1}: Cybersecurity companies announce long-term growth plans`;
    return {
      id: `layout-story-${index}`,
      headline: title,
      title,
      titleOriginal: title,
      summary: 'تفاصيل الخبر والإفصاح الرسمي وأثره المحتمل على الشركات والأسواق.',
      summaryOriginal: 'تفاصيل الخبر والإفصاح الرسمي وأثره المحتمل على الشركات والأسواق.',
      languageOriginal: 'ar',
      publishedAt: new Date(Date.now() - index * 60_000).toISOString(),
      source: index % 2 ? 'Yahoo Finance — Company Disclosures' : 'إفصاحات الشركات الرسمية',
      url: `https://example.com/layout-story-${index}`,
      ticker: ['NVDA', 'MSFT', 'AAPL'][index % 3],
      companyName: ['NVIDIA', 'Microsoft', 'Apple'][index % 3],
      sector: 'software',
      sectors: ['software'],
      market: 'kuwait',
      verificationStatus: 'official',
      isOfficial: true,
      independentSourceCount: 1,
      importanceScore: 100,
      eventType: 'trading_halt',
      expectedImpact: 'high',
      sentiment: 'negative',
      price: null,
      changePercent: null,
      change: null,
      supportingSources: [],
    };
  });
  await page.route(`**/api/${category}-news**`, route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      success: true,
      lastUpdated: new Date().toISOString(),
      items,
      prices: [],
      marketData: {},
      providerCoverage: [],
      language: 'ar',
      liveUpdatesAvailable: true,
    }),
  }));
  await page.route('**/api/markets/movers**', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, data: null, code: 'MARKET_MOVERS_UNAVAILABLE' }),
  }));
}

async function expectReadableLayout(page: Page, category: 'tech' | 'gulf') {
  const layout = page.locator(category === 'tech' ? '.tech-news-layout' : '.gulf-news-content-layout');
  const feed = page.locator(category === 'tech' ? '.tech-news-content-column' : '.gulf-news-news-column');
  const side = page.locator(category === 'tech' ? '.tech-news-side-panel' : '.gulf-news-side-panel');
  const mainWidth = await page.locator('[data-news-page-shell] > main').evaluate(element => element.clientWidth);
  const feedBox = await feed.boundingBox();
  const sideBox = await side.boundingBox();
  expect(feedBox).not.toBeNull();
  expect(sideBox).not.toBeNull();
  if (mainWidth < 1240) {
    expect(sideBox!.y).toBeGreaterThanOrEqual(feedBox!.y + feedBox!.height - 1);
    expect(Math.abs(sideBox!.width - feedBox!.width)).toBeLessThanOrEqual(2);
  }
  const overflow = await layout.locator(
    `${category === 'tech' ? '.tech-news-card, .tech-side-card, .tech-side-ranked-list li' : '.gulf-news-card'}, h2, p, a, .gulf-news-card-body, .gulf-news-meta`,
  ).evaluateAll(elements => elements
    .filter(element => element.getBoundingClientRect().width > 0)
    .filter(element => element.scrollWidth > element.clientWidth + 2)
    .map(element => ({ className: element.className, width: element.clientWidth, scrollWidth: element.scrollWidth })));
  expect(overflow).toEqual([]);
  const minimumCardWidth = await layout.locator(category === 'tech' ? '.tech-news-card' : '.gulf-news-card')
    .evaluateAll(elements => Math.min(...elements.map(element => element.getBoundingClientRect().width)));
  expect(minimumCardWidth).toBeGreaterThanOrEqual(250);
}

test.describe('News geometry with workspace navigation', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'Runs the tablet and desktop matrix once in Chromium.');

  for (const category of ['tech', 'gulf'] as const) {
    test(`${category} news fits MatePad, desktop, and phone widths in every language`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        localStorage.setItem('sfm_guest_mode', 'true');
        localStorage.setItem('sfm_guest_started_at', new Date().toISOString());
        localStorage.setItem('sfm_lang', 'ar');
        localStorage.setItem('the-sfm-theme', 'dark');
        localStorage.setItem('sfm.sidebar.collapsed.v1', '0');
      });
      await mockNews(page, category);
      await page.setViewportSize({ width: 1536, height: 1010 });
      await page.goto(`/${category}-news`);
      if (category === 'gulf') await page.locator('.gulf-news-exchange-grid button', { hasText: 'KW' }).click();
      await expect(page.locator(`.${category}-news-card`).first()).toBeVisible();
      await expect(page.locator('aside.sfm-shared-sidebar')).toHaveAttribute('data-collapsed', 'false');

      for (const width of [1536, 1440, 1280, 1024, 768, 390, 1920]) {
        await page.setViewportSize({ width, height: 1010 });
        await expectReadableLayout(page, category);
      }

      for (const language of ['en', 'fr']) {
        await page.evaluate(lang => {
          localStorage.setItem('sfm_lang', lang);
          window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang } }));
        }, language);
        await expect.poll(() => page.evaluate(() => document.documentElement.dataset.sfmLang)).toBe(language);
        await page.setViewportSize({ width: 1536, height: 1010 });
        await expectReadableLayout(page, category);
      }

      await page.evaluate(() => {
        localStorage.setItem('sfm_lang', 'en');
        window.dispatchEvent(new CustomEvent('sfm-language-change', { detail: { lang: 'en' } }));
      });
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await expect(page.locator('aside.sfm-shared-sidebar')).toHaveAttribute('data-collapsed', 'true');
      await expectReadableLayout(page, category);
    });
  }
});
